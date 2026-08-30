const PEOPLE = ["Leon", "Papi", "Mami", "Anouk"];
const config = window.APP_CONFIG;
let db = null;
let currentPerson = localStorage.getItem("family-shop-person") || "";
let items = [];
let customGroups = [];
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
  return [...categories].sort((a, b) => a.localeCompare(b, "de"));
}

function getSubgroups(category) {
  const groups = new Set(Object.keys(PRODUCT_CATALOG[category] || {}));
  for (const g of customGroups) {
    if (g.category === category && g.subcategory) groups.add(g.subcategory);
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
  $("customCategory").addEventListener("change", refreshCustomSubgroups);
  refreshSubgroups();
}

function refreshCategorySelectors() {
  const categories = getAllCategories();
  const options = categories.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`);
  preserveSelectValue($("categorySelect"), options);
  preserveSelectValue($("customCategory"), options);
  preserveSelectValue($("manageCategorySelect"), options);
  refreshCustomSubgroups();
  refreshManageSubgroupList();
}

function refreshSubgroups() {
  const cat = $("categorySelect").value;
  const groups = getSubgroups(cat);
  const options = [`<option value="__all">Alle Untergruppen</option>`, ...groups.map(g => `<option value="${escapeAttr(g)}">${escapeHtml(g)}</option>`)];
  preserveSelectValue($("subgroupSelect"), options, "__all");
  renderProducts();
}

function refreshCustomSubgroups() {
  const cat = $("customCategory").value;
  const groups = getSubgroups(cat);
  $("customSubgroupList").innerHTML = groups.map(g => `<option value="${escapeAttr(g)}"></option>`).join("");
  if (!$("customSubgroup").value && groups.length) $("customSubgroup").placeholder = `z. B. ${groups[0]}`;
}

function renderProducts() {
  const selectedCategory = $("categorySelect").value;
  const selectedSubgroup = $("subgroupSelect").value;
  const q = $("productSearch").value.trim().toLocaleLowerCase("de-CH");
  let products = [];

  // Sobald gesucht wird, immer den gesamten Katalog durchsuchen –
  // unabhängig von der aktuell gewählten Kategorie oder Untergruppe.
  if (q) {
    for (const [category, subgroups] of Object.entries(PRODUCT_CATALOG)) {
      for (const [subgroup, arr] of Object.entries(subgroups)) {
        for (const name of arr) {
          const haystack = `${name} ${category} ${subgroup}`.toLocaleLowerCase("de-CH");
          if (haystack.includes(q)) products.push({ name, category, subgroup });
        }
      }
    }
  } else {
    for (const [subgroup, arr] of Object.entries(PRODUCT_CATALOG[selectedCategory] || {})) {
      if (selectedSubgroup !== "__all" && selectedSubgroup !== subgroup) continue;
      for (const name of arr) products.push({ name, category: selectedCategory, subgroup });
    }
  }

  products.sort((a, b) => a.name.localeCompare(b.name, "de"));

  $("productGrid").innerHTML = products.length
    ? products.map(p => `<button class="product-btn" data-name="${escapeAttr(p.name)}" data-category="${escapeAttr(p.category)}" data-subgroup="${escapeAttr(p.subgroup)}"><span class="product-btn-name">${escapeHtml(p.name)}</span>${q ? `<span class="product-btn-meta">${escapeHtml(p.category)} · ${escapeHtml(p.subgroup)}</span>` : ""}</button>`).join("")
    : `<div class="catalog-empty">Kein Produkt gefunden. Die Suche berücksichtigt alle Kategorien und Untergruppen. Über „Eigenes Produkt“ kannst du einen neuen Artikel hinzufügen.</div>`;
}

$("productGrid").addEventListener("click", e => {
  const b = e.target.closest(".product-btn");
  if (!b) return;
  addItem(b.dataset.name, b.dataset.category || $("categorySelect").value, b.dataset.subgroup);
});

$("customToggle").onclick = () => {
  $("catalogMode").classList.toggle("hidden");
  $("customMode").classList.toggle("hidden");
  $("customToggle").textContent = $("customMode").classList.contains("hidden") ? "Eigenes Produkt" : "Katalog anzeigen";
};

$("addCustomBtn").onclick = async () => {
  const name = $("customName").value.trim();
  if (!name) return toast("Bitte Produktname eingeben");
  const cat = $("customCategory").value;
  const subgroup = $("customSubgroup").value.trim() || "Eigene Produkte";
  await ensureCatalogGroup(cat, subgroup);
  await addItem(name, cat, subgroup);
  $("customName").value = "";
  $("customSubgroup").value = "";
};

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
  const normalizedSub = subcategory?.trim() || null;
  const exists = customGroups.some(g => g.category.toLowerCase() === category.toLowerCase() && (g.subcategory || "").toLowerCase() === (normalizedSub || "").toLowerCase());
  const staticExists = normalizedSub && Object.keys(PRODUCT_CATALOG[category] || {}).some(g => g.toLowerCase() === normalizedSub.toLowerCase());
  if (exists || staticExists) return true;
  const { error } = await db.from("catalog_groups").insert({
    category: category.trim(),
    subcategory: normalizedSub,
    created_by: currentPerson || "Unbekannt"
  });
  if (error) {
    if (String(error.message || "").includes("catalog_groups")) toast("Kategorien-Funktion muss zuerst in Supabase aktiviert werden");
    else toast("Kategorie konnte nicht gespeichert werden");
    return false;
  }
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
$("refreshBtn").onclick = async () => { await Promise.all([loadItems(), loadCatalogGroups()]); };
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
    await Promise.all([loadItems(), loadCatalogGroups()]);
    db.channel("family-shopping-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, loadItems)
      .on("postgres_changes", { event: "*", schema: "public", table: "catalog_groups" }, loadCatalogGroups)
      .subscribe(status => {
        if (status === "SUBSCRIBED") $("syncState").textContent = "Live synchronisiert";
      });
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
start();
