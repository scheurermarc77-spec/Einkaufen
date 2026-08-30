const PEOPLE = ["Leon", "Papi", "Mami", "Anouk"];
const config = window.APP_CONFIG;
let db = null;
let currentPerson = localStorage.getItem("family-shop-person") || "";
let items = [];
let customGroups = [];
let cloudProducts = [];
let pendingNewProductName = "";
let hidePurchased = false;

const $ = (id) => document.getElementById(id);

function configured() {
  return config.SUPABASE_URL.startsWith("http") && !config.SUPABASE_ANON_KEY.startsWith("HIER_");
}

function initProfile() {
  $("profileGrid").innerHTML = PEOPLE.map(p => `<button type="button" class="profile-choice" data-person="${p}">${p}</button>`).join("");
  $("profileGrid").addEventListener("click", e => {
    const btn = e.target.closest("[data-person]");
    if (!btn) return;
    currentPerson = btn.dataset.person;
    localStorage.setItem("family-shop-person", currentPerson);
    $("profileBtn").textContent = currentPerson;
    $("profileDialog").close();
    toast(`Profil: ${currentPerson}`);
  });
  $("profileBtn").textContent = currentPerson || "Profil wählen";
  $("profileBtn").onclick = () => $("profileDialog").showModal();
  if (!currentPerson) $("profileDialog").showModal();
}

function getAllCategories() {
  const categories = new Set(Object.keys(PRODUCT_CATALOG));
  for (const g of customGroups) if (g.category) categories.add(g.category);
  for (const p of cloudProducts) if (p.category) categories.add(p.category);
  return [...categories].sort((a, b) => a.localeCompare(b, "de"));
}

function getSubgroups(category) {
  const groups = new Set(Object.keys(PRODUCT_CATALOG[category] || {}));
  for (const g of customGroups) {
    if (g.category === category && g.subcategory) groups.add(g.subcategory);
  }
  for (const p of cloudProducts) {
    if (p.category === category && p.subcategory) groups.add(p.subcategory);
  }
  return [...groups].sort((a, b) => a.localeCompare(b, "de"));
}

function preserveSelectValue(select, options, fallback = "") {
  const old = select.value;
  select.innerHTML = options.join("");
  if ([...select.options].some(o => o.value === old)) select.value = old;
  else if (fallback && [...select.options].some(o => o.value === fallback)) select.value = fallback;
}

function buildCatalog() {
  refreshCategorySelectors();
  $("categorySelect").addEventListener("change", refreshSubgroups);
  $("subgroupSelect").addEventListener("change", renderProducts);
  $("productSearch").addEventListener("input", renderProducts);

  $("newProductCategory").addEventListener("change", handleNewProductCategoryChange);
  $("newProductCategoryName").addEventListener("input", handleNewProductCategoryNameInput);
  $("newProductSubgroup").addEventListener("change", handleNewProductSubgroupChange);
  $("newProductSubgroupName").addEventListener("input", updateNewProductSaveState);

  refreshSubgroups();
}

function refreshCategorySelectors() {
  const categories = getAllCategories();
  const options = categories.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`);
  preserveSelectValue($("categorySelect"), options);
  preserveSelectValue($("manageCategorySelect"), options);
  refreshManageSubgroupList();
}

function refreshSubgroups() {
  const cat = $("categorySelect").value;
  const groups = getSubgroups(cat);
  const options = [`<option value="__all">Alle Untergruppen</option>`, ...groups.map(g => `<option value="${escapeAttr(g)}">${escapeHtml(g)}</option>`)];
  preserveSelectValue($("subgroupSelect"), options, "__all");
  renderProducts();
}


function allCatalogProducts() {
  const all = [];

  for (const [category, subgroups] of Object.entries(PRODUCT_CATALOG)) {
    for (const [subgroup, arr] of Object.entries(subgroups)) {
      for (const name of arr) all.push({ name, category, subgroup, source: "standard" });
    }
  }

  for (const p of cloudProducts) {
    all.push({
      name: p.product_name,
      category: p.category,
      subgroup: p.subcategory,
      source: "cloud"
    });
  }

  // Doppelte Einträge zusammenfassen
  const seen = new Set();
  return all.filter(p => {
    const key = `${p.name}|||${p.category}|||${p.subgroup}`.toLocaleLowerCase("de-CH");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeProductName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("de-CH");
}

function renderProducts() {
  const selectedCategory = $("categorySelect").value;
  const selectedSubgroup = $("subgroupSelect").value;
  const rawQuery = $("productSearch").value.trim().replace(/\s+/g, " ");
  const q = rawQuery.toLocaleLowerCase("de-CH");
  const all = allCatalogProducts();
  let products = [];

  // Bei einer Suche immer ALLE Kategorien und Untergruppen berücksichtigen.
  if (q) {
    products = all.filter(p => {
      const haystack = `${p.name} ${p.category} ${p.subgroup}`.toLocaleLowerCase("de-CH");
      return haystack.includes(q);
    });
  } else {
    products = all.filter(p => {
      if (p.category !== selectedCategory) return false;
      if (selectedSubgroup !== "__all" && p.subgroup !== selectedSubgroup) return false;
      return true;
    });
  }

  products.sort((a, b) => a.name.localeCompare(b.name, "de"));

  const exactExists = q && all.some(p => normalizeProductName(p.name) === normalizeProductName(rawQuery));

  const productButtons = products.map(p =>
    `<button class="product-btn" data-name="${escapeAttr(p.name)}" data-category="${escapeAttr(p.category)}" data-subgroup="${escapeAttr(p.subgroup)}">
      <span class="product-btn-name">${escapeHtml(p.name)}</span>
      ${q ? `<span class="product-btn-meta">${escapeHtml(p.category)} · ${escapeHtml(p.subgroup)}</span>` : ""}
    </button>`
  ).join("");

  const addNewOption = q && rawQuery.length >= 2 && !exactExists
    ? `<div class="new-product-suggestion">
        <div class="new-product-copy">
          <strong>„${escapeHtml(rawQuery)}“ noch nicht vorhanden?</strong>
          <span>Nicht gefunden? In die gemeinsame Datenbank aufnehmen und Kategorie sowie Untergruppe festlegen.</span>
        </div>
        <button class="primary-btn compact-btn" id="offerNewProductBtn" type="button">In Datenbank aufnehmen</button>
      </div>`
    : "";

  if (!products.length && !addNewOption) {
    $("productGrid").innerHTML = `<div class="catalog-empty">Kein Produkt gefunden.</div>`;
  } else {
    $("productGrid").innerHTML = productButtons + addNewOption;
  }
}

$("productGrid").addEventListener("click", e => {
  const addNewBtn = e.target.closest("#offerNewProductBtn");
  if (addNewBtn) {
    openNewProductDialog($("productSearch").value.trim());
    return;
  }

  const b = e.target.closest(".product-btn");
  if (!b) return;
  addItem(b.dataset.name, b.dataset.category || $("categorySelect").value, b.dataset.subgroup);
});



function openNewProductDialog(name) {
  if (!currentPerson) return $("profileDialog").showModal();
  if (!db) return $("setupDialog").showModal();

  const cleanName = String(name || "").trim().replace(/\s+/g, " ");
  if (!cleanName) return;

  pendingNewProductName = cleanName;
  $("newProductNameLabel").textContent = cleanName;

  // Schritt 1: Kategorie
  const categories = getAllCategories();
  $("newProductCategory").innerHTML = [
    `<option value="">Kategorie auswählen …</option>`,
    ...categories.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`),
    `<option value="__new__">＋ Neue Kategorie erstellen</option>`
  ].join("");

  $("newProductCategory").value = "";
  $("newProductCategoryName").value = "";
  $("newCategoryInline").classList.add("hidden");

  // Schritt 2 zunächst ausblenden
  $("newProductSubgroupStep").classList.add("hidden");
  $("newProductSubgroup").innerHTML = "";
  $("newProductSubgroupName").value = "";
  $("newSubgroupInline").classList.add("hidden");

  $("newProductChoiceHint").textContent = "Zuerst eine Kategorie auswählen.";
  $("saveNewProductBtn").disabled = true;

  $("newProductDialog").showModal();
}

function selectedNewProductCategory() {
  const selection = $("newProductCategory").value;
  if (selection === "__new__") return $("newProductCategoryName").value.trim().replace(/\s+/g, " ");
  return selection;
}

function selectedNewProductSubgroup() {
  const selection = $("newProductSubgroup").value;
  if (selection === "__new__") return $("newProductSubgroupName").value.trim().replace(/\s+/g, " ");
  return selection;
}

function handleNewProductCategoryChange() {
  const selection = $("newProductCategory").value;
  const creating = selection === "__new__";

  $("newCategoryInline").classList.toggle("hidden", !creating);

  if (!selection) {
    $("newProductSubgroupStep").classList.add("hidden");
    $("newProductChoiceHint").textContent = "Zuerst eine Kategorie auswählen.";
    updateNewProductSaveState();
    return;
  }

  if (creating) {
    $("newProductCategoryName").focus();
    $("newProductSubgroupStep").classList.toggle("hidden", !$("newProductCategoryName").value.trim());
  } else {
    populateNewProductSubgroups(selection);
    $("newProductSubgroupStep").classList.remove("hidden");
  }

  updateNewProductSaveState();
}

function handleNewProductCategoryNameInput() {
  const category = $("newProductCategoryName").value.trim();

  if (!category) {
    $("newProductSubgroupStep").classList.add("hidden");
    $("newProductChoiceHint").textContent = "Name der neuen Kategorie eingeben.";
    updateNewProductSaveState();
    return;
  }

  // Eine neue Kategorie hat noch keine Untergruppen:
  // deshalb direkt die Möglichkeit zum Erstellen anbieten.
  $("newProductSubgroup").innerHTML = [
    `<option value="">Untergruppe auswählen …</option>`,
    `<option value="__new__">＋ Neue Untergruppe erstellen</option>`
  ].join("");
  $("newProductSubgroup").value = "";
  $("newProductSubgroupName").value = "";
  $("newSubgroupInline").classList.add("hidden");
  $("newProductSubgroupStep").classList.remove("hidden");
  $("newProductChoiceHint").textContent = "Jetzt eine Untergruppe auswählen oder neu erstellen.";
  updateNewProductSaveState();
}

function populateNewProductSubgroups(category) {
  const groups = getSubgroups(category);
  $("newProductSubgroup").innerHTML = [
    `<option value="">Untergruppe auswählen …</option>`,
    ...groups.map(g => `<option value="${escapeAttr(g)}">${escapeHtml(g)}</option>`),
    `<option value="__new__">＋ Neue Untergruppe erstellen</option>`
  ].join("");
  $("newProductSubgroup").value = "";
  $("newProductSubgroupName").value = "";
  $("newSubgroupInline").classList.add("hidden");

  $("newProductChoiceHint").textContent = groups.length
    ? "Untergruppe auswählen. Falls nichts passt, direkt eine neue erstellen."
    : "Noch keine Untergruppe vorhanden. Erstelle direkt eine neue.";
}

function handleNewProductSubgroupChange() {
  const creating = $("newProductSubgroup").value === "__new__";
  $("newSubgroupInline").classList.toggle("hidden", !creating);

  if (creating) {
    $("newProductSubgroupName").focus();
    $("newProductChoiceHint").textContent = "Name der neuen Untergruppe eingeben.";
  } else if ($("newProductSubgroup").value) {
    $("newProductChoiceHint").textContent = "Kategorie und Untergruppe gewählt.";
  }

  updateNewProductSaveState();
}

function updateNewProductSaveState() {
  const category = selectedNewProductCategory();
  const subgroup = selectedNewProductSubgroup();

  const categoryValid = Boolean(category);
  const subgroupValid = Boolean(subgroup);

  $("saveNewProductBtn").disabled = !(categoryValid && subgroupValid);

  if (categoryValid && subgroupValid) {
    $("newProductChoiceHint").textContent = `Wird gespeichert unter: ${category} · ${subgroup}`;
  }
}

$("closeNewProductDialog").onclick = () => $("newProductDialog").close();
$("cancelNewProductBtn").onclick = () => $("newProductDialog").close();

$("saveNewProductBtn").onclick = async () => {
  if (!currentPerson) return $("profileDialog").showModal();

  const name = pendingNewProductName;
  const category = selectedNewProductCategory();
  const subgroup = selectedNewProductSubgroup();

  if (!name) return;
  if (!category) return toast("Bitte Kategorie auswählen oder erstellen");
  if (!subgroup) return toast("Bitte Untergruppe auswählen oder erstellen");

  $("saveNewProductBtn").disabled = true;

  // Neue Kategorie/Untergruppe werden automatisch in der gemeinsamen Cloud angelegt.
  const categoryOk = await ensureCatalogGroup(category, null);
  if (!categoryOk) {
    updateNewProductSaveState();
    return;
  }

  const subgroupOk = await ensureCatalogGroup(category, subgroup);
  if (!subgroupOk) {
    updateNewProductSaveState();
    return;
  }

  await loadCatalogGroups();

  const productOk = await saveCatalogProduct(name, category, subgroup);
  if (!productOk) {
    updateNewProductSaveState();
    return;
  }

  $("newProductDialog").close();
  $("productSearch").value = "";
  await addItem(name, category, subgroup);
  renderProducts();
};


async function saveCatalogProduct(name, category, subgroup) {
  if (!db) return false;

  // Auch die fest eingebauten Produkte gelten als bereits vorhanden.
  const alreadyExists = allCatalogProducts().some(
    p => normalizeProductName(p.name) === normalizeProductName(name)
  );
  if (alreadyExists) {
    // Wenn derselbe Name bereits im Katalog vorhanden ist, nichts doppelt speichern.
    return true;
  }

  const { error } = await db.from("catalog_products").insert({
    product_name: String(name).trim().replace(/\s+/g, " "),
    category,
    subcategory: subgroup,
    created_by: currentPerson || "Unbekannt"
  });

  if (error) {
    const msg = String(error.message || "");
    if (msg.includes("catalog_products") || msg.includes("relation")) {
      toast("Produktdatenbank muss zuerst in Supabase aktiviert werden");
    } else if (msg.includes("duplicate") || msg.includes("unique")) {
      await loadCatalogProducts();
      return true;
    } else {
      toast("Produkt konnte nicht gespeichert werden");
    }
    console.warn(error);
    return false;
  }

  await loadCatalogProducts();
  toast(`${name} in Datenbank aufgenommen`);
  return true;
}

async function loadCatalogProducts() {
  if (!db) return;
  const { data, error } = await db
    .from("catalog_products")
    .select("*")
    .order("product_name");

  if (error) {
    console.warn("catalog_products nicht verfügbar", error.message);
    return;
  }

  cloudProducts = data || [];
  refreshCategorySelectors();
  refreshSubgroups();
  renderProducts();
}

async function addItem(name, category, subgroup) {
  if (!currentPerson) return $("profileDialog").showModal();
  if (!db) return $("setupDialog").showModal();
  const { error } = await db.from("shopping_items").insert({
    product_name: name,
    category,
    subcategory: subgroup,
    added_by: currentPerson,
    purchased: false
  });
  if (error) return toast("Fehler beim Hinzufügen");
  toast(`${name} hinzugefügt`);
}

async function loadItems() {
  if (!db) return;
  $("syncState").textContent = "Synchronisiere …";
  const { data, error } = await db.from("shopping_items")
    .select("*")
    .order("purchased", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    $("syncState").textContent = "Cloud-Verbindung fehlgeschlagen";
    return;
  }
  items = data || [];
  $("syncState").textContent = "Live synchronisiert";
  renderList();
}

function renderList() {
  const visible = hidePurchased ? items.filter(i => !i.purchased) : items;
  $("openCount").textContent = items.filter(i => !i.purchased).length;
  $("doneCount").textContent = items.filter(i => i.purchased).length;
  $("clearPurchasedBtn").textContent = hidePurchased ? "Gekaufte anzeigen" : "Gekaufte ausblenden";
  if (!visible.length) {
    $("shoppingList").innerHTML = `<div class="empty">Die Einkaufsliste ist leer.</div>`;
    return;
  }
  const groups = {};
  for (const item of visible) {
    const key = `${item.category}|||${item.subcategory}`;
    (groups[key] ||= []).push(item);
  }
  $("shoppingList").innerHTML = Object.entries(groups).map(([key, arr]) => {
    const [cat, sub] = key.split("|||");
    return `<div class="group">
      <div class="group-title"><span>${escapeHtml(cat)} · ${escapeHtml(sub)}</span><span>${arr.length}</span></div>
      ${arr.map(renderItem).join("")}
    </div>`;
  }).join("");
}

function renderItem(i) {
  const added = formatDate(i.added_at || i.created_at);
  const bought = i.purchased_at ? formatDate(i.purchased_at) : "";
  return `<div class="item ${i.purchased ? "done" : ""}" data-id="${i.id}">
    <input class="check" type="checkbox" ${i.purchased ? "checked" : ""} aria-label="Gekauft" />
    <div>
      <div class="item-name">${escapeHtml(i.product_name)}</div>
      <div class="meta">Eingetragen von <strong>${escapeHtml(i.added_by)}</strong> · ${added}${i.purchased ? `<br>Gekauft von <strong>${escapeHtml(i.purchased_by || "?")}</strong> · ${bought}` : ""}</div>
    </div>
    <button class="delete-btn" title="Löschen" aria-label="Löschen">×</button>
  </div>`;
}

$("shoppingList").addEventListener("change", async e => {
  if (!e.target.classList.contains("check")) return;
  if (!currentPerson) { e.target.checked = !e.target.checked; return $("profileDialog").showModal(); }
  const id = e.target.closest(".item").dataset.id;
  const purchased = e.target.checked;
  const payload = purchased
    ? { purchased: true, purchased_by: currentPerson, purchased_at: new Date().toISOString() }
    : { purchased: false, purchased_by: null, purchased_at: null };
  const { error } = await db.from("shopping_items").update(payload).eq("id", id);
  if (error) toast("Änderung konnte nicht gespeichert werden");
});

$("shoppingList").addEventListener("click", async e => {
  if (!e.target.classList.contains("delete-btn")) return;
  const id = e.target.closest(".item").dataset.id;
  const item = items.find(x => String(x.id) === String(id));
  if (!confirm(`„${item?.product_name || "Produkt"}“ wirklich aus der Liste löschen?`)) return;
  const { error } = await db.from("shopping_items").delete().eq("id", id);
  if (error) toast("Löschen fehlgeschlagen");
});

// --- Eigene Kategorien & Untergruppen ---
$("manageCatalogBtn").onclick = () => {
  refreshCategorySelectors();
  renderCustomGroups();
  $("catalogDialog").showModal();
};
$("closeCatalogDialog").onclick = () => $("catalogDialog").close();
$("manageCategorySelect").addEventListener("change", refreshManageSubgroupList);

$("addCategoryBtn").onclick = async () => {
  if (!currentPerson) return $("profileDialog").showModal();
  const category = $("newCategoryName").value.trim();
  if (!category) return toast("Bitte Kategoriename eingeben");
  await ensureCatalogGroup(category, null);
  $("newCategoryName").value = "";
};

$("addSubgroupBtn").onclick = async () => {
  if (!currentPerson) return $("profileDialog").showModal();
  const category = $("manageCategorySelect").value;
  const subgroup = $("newSubgroupName").value.trim();
  if (!category) return toast("Bitte Kategorie wählen");
  if (!subgroup) return toast("Bitte Untergruppe eingeben");
  await ensureCatalogGroup(category, subgroup);
  $("newSubgroupName").value = "";
};

async function ensureCatalogGroup(category, subcategory = null) {
  if (!db || !category) return false;

  const cleanCategory = category.trim().replace(/\s+/g, " ");
  const normalizedSub = subcategory?.trim().replace(/\s+/g, " ") || null;

  const exists = customGroups.some(
    g => g.category.toLowerCase() === cleanCategory.toLowerCase() &&
      (g.subcategory || "").toLowerCase() === (normalizedSub || "").toLowerCase()
  );

  const matchingStaticCategory = Object.keys(PRODUCT_CATALOG)
    .find(c => c.toLowerCase() === cleanCategory.toLowerCase());

  const staticCategoryExists = Boolean(matchingStaticCategory) && !normalizedSub;
  const staticSubgroupExists = normalizedSub && matchingStaticCategory &&
    Object.keys(PRODUCT_CATALOG[matchingStaticCategory] || {})
      .some(g => g.toLowerCase() === normalizedSub.toLowerCase());

  if (exists || staticCategoryExists || staticSubgroupExists) return true;

  const { error } = await db.from("catalog_groups").insert({
    category: cleanCategory,
    subcategory: normalizedSub,
    created_by: currentPerson || "Unbekannt"
  });

  if (error) {
    const msg = String(error.message || "");
    // Ein paralleles Gerät könnte denselben Eintrag gerade erstellt haben.
    if (msg.includes("duplicate") || msg.includes("unique")) {
      await loadCatalogGroups();
      return true;
    }
    if (msg.includes("catalog_groups") || msg.includes("relation")) {
      toast("Kategorien-Funktion muss zuerst in Supabase aktiviert werden");
    } else {
      toast("Kategorie oder Untergruppe konnte nicht gespeichert werden");
    }
    return false;
  }

  await loadCatalogGroups();
  return true;
}

async function loadCatalogGroups() {
  if (!db) return;
  const { data, error } = await db.from("catalog_groups").select("*").order("category").order("subcategory");
  if (error) {
    console.warn("catalog_groups nicht verfügbar", error.message);
    return;
  }
  customGroups = data || [];
  refreshCategorySelectors();
  refreshSubgroups();
  renderCustomGroups();
}

function refreshManageSubgroupList() {
  const category = $("manageCategorySelect").value;
  const groups = getSubgroups(category);
  $("manageSubgroupHint").textContent = groups.length ? `Vorhanden: ${groups.join(", ")}` : "Noch keine Untergruppen vorhanden.";
}

function renderCustomGroups() {
  if (!$("customGroupList")) return;
  if (!customGroups.length) {
    $("customGroupList").innerHTML = `<div class="catalog-empty">Noch keine eigenen Kategorien oder Untergruppen erstellt.</div>`;
    return;
  }
  const byCategory = {};
  for (const g of customGroups) (byCategory[g.category] ||= []).push(g);
  $("customGroupList").innerHTML = Object.entries(byCategory).map(([category, rows]) => {
    const subgroups = rows.filter(r => r.subcategory).map(r => r.subcategory);
    const creators = [...new Set(rows.map(r => r.created_by).filter(Boolean))].join(", ");
    return `<div class="custom-group-row">
      <div><strong>${escapeHtml(category)}</strong>${subgroups.length ? `<div class="small-muted">${subgroups.map(escapeHtml).join(" · ")}</div>` : `<div class="small-muted">Kategorie ohne Untergruppe</div>`}${creators ? `<div class="small-muted">Erstellt von ${escapeHtml(creators)}</div>` : ""}</div>
    </div>`;
  }).join("");
}

$("clearPurchasedBtn").onclick = () => { hidePurchased = !hidePurchased; renderList(); };
$("refreshBtn").onclick = async () => { await Promise.all([loadItems(), loadCatalogGroups(), loadCatalogProducts()]); };
$("closeSetup").onclick = () => $("setupDialog").close();

function formatDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
function escapeHtml(s="") { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeAttr(s="") { return escapeHtml(s); }
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

async function start() {
  initProfile();
  buildCatalog();
  if (!configured()) {
    $("syncState").textContent = "Cloud noch nicht eingerichtet";
    $("setupDialog").showModal();
  } else {
    db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    await Promise.all([loadItems(), loadCatalogGroups(), loadCatalogProducts()]);
    db.channel("family-shopping-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, loadItems)
      .on("postgres_changes", { event: "*", schema: "public", table: "catalog_groups" }, loadCatalogGroups)
      .on("postgres_changes", { event: "*", schema: "public", table: "catalog_products" }, loadCatalogProducts)
      .subscribe(status => {
        if (status === "SUBSCRIBED") $("syncState").textContent = "Live synchronisiert";
      });
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
start();
