const PEOPLE = ["Leon", "Papi", "Mami", "Anouk"];
const BUILTIN_CONFIG = Object.freeze({
  SUPABASE_URL: "https://kfpxheegmeupnuzqjqqt.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_vlP2dIHDTK-VY5LK-jeS_w_tN04WaK0",
  HOUSEHOLD_ID: "leon-papi-mami-anouk"
});

function validConfig(candidate) {
  return Boolean(
    candidate &&
    typeof candidate.SUPABASE_URL === "string" &&
    candidate.SUPABASE_URL.startsWith("https://") &&
    typeof candidate.SUPABASE_ANON_KEY === "string" &&
    candidate.SUPABASE_ANON_KEY.startsWith("sb_publishable_")
  );
}

const config = validConfig(window.APP_CONFIG) ? window.APP_CONFIG : BUILTIN_CONFIG;

class RestQuery {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.method = "GET";
    this.body = null;
    this.selectColumns = null;
    this.filters = [];
    this.orders = [];
  }

  select(columns = "*") {
    this.method = "GET";
    this.selectColumns = columns;
    return this;
  }

  insert(payload) {
    this.method = "POST";
    this.body = payload;
    return this;
  }

  update(payload) {
    this.method = "PATCH";
    this.body = payload;
    return this;
  }

  delete() {
    this.method = "DELETE";
    return this;
  }

  eq(column, value) {
    this.filters.push([column, value]);
    return this;
  }

  order(column, options = {}) {
    this.orders.push([column, options.ascending !== false ? "asc" : "desc"]);
    return this;
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    const url = new URL(`${this.client.url}/rest/v1/${encodeURIComponent(this.table)}`);

    if (this.method === "GET") {
      url.searchParams.set("select", this.selectColumns || "*");
    }

    for (const [column, value] of this.filters) {
      let encoded;
      if (value === null) encoded = "null";
      else if (typeof value === "boolean") encoded = value ? "true" : "false";
      else encoded = String(value);
      url.searchParams.append(column, `eq.${encoded}`);
    }

    if (this.orders.length) {
      url.searchParams.set(
        "order",
        this.orders.map(([column, direction]) => `${column}.${direction}`).join(",")
      );
    }

    const headers = {
      "apikey": this.client.key,
      "Accept": "application/json"
    };

    const options = {
      method: this.method,
      headers,
      cache: "no-store"
    };

    if (this.method !== "GET") {
      headers["Content-Type"] = "application/json";
      headers["Prefer"] = "return=minimal";
      if (this.body !== null) options.body = JSON.stringify(this.body);
    }

    try {
      const response = await fetch(url.toString(), options);
      const text = await response.text();

      let payload = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = text;
        }
      }

      if (!response.ok) {
        const message =
          (payload && typeof payload === "object" && (payload.message || payload.error_description || payload.error)) ||
          (typeof payload === "string" && payload) ||
          `HTTP ${response.status}`;

        return {
          data: null,
          error: {
            message: String(message),
            status: response.status,
            details: payload
          }
        };
      }

      return {
        data: this.method === "GET" ? (payload || []) : payload,
        error: null
      };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err?.message || "Netzwerkfehler",
          details: err
        }
      };
    }
  }
}

class RestClient {
  constructor(url, key) {
    this.url = String(url || "").replace(/\/+$/, "");
    this.key = key;
  }

  from(table) {
    return new RestQuery(this, table);
  }
}

function createDatabaseClient(url, key) {
  return new RestClient(url, key);
}
let db = null;
let currentPerson = localStorage.getItem("family-shop-person") || "";
let items = [];
let weeklyItems = [];
let activeListMode = localStorage.getItem("family-shop-list-mode") || "shared";
let customGroups = [];
let cloudProducts = [];
let pendingNewProductName = "";
let hidePurchased = false;
let speechRecognition = null;
let speechListening = false;

const $ = (id) => document.getElementById(id);


async function cleanupOldAppCaches() {
  if (!("caches" in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith("family-shop-") && k !== "family-shop-v17")
      .map(k => caches.delete(k)));
  } catch (_) {}
}

function configured() {
  return validConfig(config);
}


function currentActiveItems() {
  return activeListMode === "weekly" ? weeklyItems : items;
}

function updateListModeUI() {
  const weekly = activeListMode === "weekly";
  $("sharedModeBtn").classList.toggle("active", !weekly);
  $("weeklyModeBtn").classList.toggle("active", weekly);
  $("listTitle").textContent = weekly
    ? `🧾 ${currentPerson || "Meine"} Einkaufsliste`
    : "🛒 Einkaufsliste";
  $("addSectionTitle").textContent = weekly
    ? "➕ Persönliche Liste ergänzen"
    : "➕ Einkaufsliste ergänzen";
  localStorage.setItem("family-shop-list-mode", activeListMode);
  hidePurchased = false;
  renderList();
}

async function switchListMode(mode) {
  activeListMode = mode;
  if (mode === "weekly" && db) await loadWeeklyItems();
  updateListModeUI();
  $("productSearch").value = "";
  renderProducts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initProfile() {
  $("profileGrid").innerHTML = PEOPLE.map(p => `<button type="button" class="profile-choice" data-person="${p}">${p}</button>`).join("");
  $("profileGrid").addEventListener("click", async e => {
    const btn = e.target.closest("[data-person]");
    if (!btn) return;
    currentPerson = btn.dataset.person;
    localStorage.setItem("family-shop-person", currentPerson);
    $("profileBtn").textContent = currentPerson;
    $("profileDialog").close();
    toast(`Profil: ${currentPerson}`);
    if (db) await loadWeeklyItems();
    updateListModeUI();
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
  $("browseDetails").addEventListener("toggle", renderProducts);

  $("newProductCategory").addEventListener("change", handleNewProductCategoryChange);
  $("newProductCategoryName").addEventListener("input", handleNewProductCategoryNameInput);
  $("newProductSubgroup").addEventListener("change", handleNewProductSubgroupChange);
  $("newProductSubgroupName").addEventListener("input", updateNewProductSaveState);

  $("sharedModeBtn").addEventListener("click", () => switchListMode("shared"));
  $("weeklyModeBtn").addEventListener("click", () => switchListMode("weekly"));
  $("resetWeeklyBtn").addEventListener("click", resetWeeklyChecks);

  refreshSubgroups();
  setupSpeechSearch();
  updateListModeUI();
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



function setSpeechState(listening, hint = "") {
  speechListening = listening;
  const btn = $("speechBtn");
  if (!btn) return;
  btn.classList.toggle("listening", listening);
  btn.textContent = listening ? "⏹" : "🎤";
  btn.setAttribute("aria-label", listening ? "Spracheingabe stoppen" : "Spracheingabe starten");
  $("speechHint").textContent = hint || (listening ? "Ich höre zu … sprich jetzt den Suchbegriff." : "Tipp: Mit 🎤 kannst du den Suchtext mündlich eingeben.");
}

function setupSpeechSearch() {
  const btn = $("speechBtn");
  if (!btn) return;
  const SpeechApi = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechApi) {
    btn.disabled = true;
    $("speechHint").textContent = "Spracheingabe wird auf diesem Gerät/Browser leider nicht unterstützt.";
    return;
  }

  speechRecognition = new SpeechApi();
  speechRecognition.lang = "de-CH";
  speechRecognition.interimResults = false;
  speechRecognition.maxAlternatives = 1;
  speechRecognition.continuous = false;

  speechRecognition.onstart = () => setSpeechState(true);
  speechRecognition.onend = () => setSpeechState(false);
  speechRecognition.onerror = () => {
    setSpeechState(false, "Spracheingabe konnte nicht gestartet werden. Bitte nochmals versuchen.");
  };
  speechRecognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript?.trim() || "";
    if (text) {
      $("productSearch").value = text;
      renderProducts();
      setSpeechState(false, `Gesucht nach: ${text}`);
      toast(`Suche: ${text}`);
    }
  };

  btn.onclick = () => {
    try {
      if (speechListening) speechRecognition.stop();
      else speechRecognition.start();
    } catch (err) {
      setSpeechState(false, "Spracheingabe konnte nicht gestartet werden. Bitte nochmals versuchen.");
    }
  };
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
  const browsing = Boolean($("browseDetails")?.open);
  let products = [];

  // 1) Suche: immer über den gesamten Katalog.
  if (q) {
    products = all.filter(p => {
      const haystack = `${p.name} ${p.category} ${p.subgroup}`.toLocaleLowerCase("de-CH");
      return haystack.includes(q);
    });
  }
  // 2) Stöbern: Vorschläge erst anzeigen, wenn «Nach Kategorie stöbern»
  //    vom User bewusst geöffnet wurde.
  else if (browsing) {
    products = all.filter(p => {
      if (p.category !== selectedCategory) return false;
      if (selectedSubgroup !== "__all" && p.subgroup !== selectedSubgroup) return false;
      return true;
    });
  }
  // 3) Weder Suche noch Stöbern: keine Vorschläge anzeigen.
  else {
    $("productGrid").innerHTML = "";
    return;
  }

  products.sort((a, b) => a.name.localeCompare(b.name, "de"));

  const exactExists = q && all.some(p => normalizeProductName(p.name) === normalizeProductName(rawQuery));

  const productButtons = products.map(p =>
    `<button class="product-btn" data-name="${escapeAttr(p.name)}" data-category="${escapeAttr(p.category)}" data-subgroup="${escapeAttr(p.subgroup)}">
      <span class="product-btn-name">➕ ${escapeHtml(p.name)}</span>
      ${q ? `<span class="product-btn-meta">${escapeHtml(p.category)} · ${escapeHtml(p.subgroup)}</span>` : ""}
    </button>`
  ).join("");

  const addNewOption = q && rawQuery.length >= 2 && !exactExists
    ? `<div class="new-product-suggestion">
        <div class="new-product-copy">
          <strong>„${escapeHtml(rawQuery)}“ noch nicht vorhanden?</strong>
          <span>Nicht gefunden? In die gemeinsame Datenbank aufnehmen und Kategorie sowie Untergruppe festlegen.</span>
        </div>
        <button class="primary-btn compact-btn" id="offerNewProductBtn" type="button">➕ In Datenbank aufnehmen</button>
      </div>`
    : "";

  if (!products.length && !addNewOption) {
    $("productGrid").innerHTML = q
      ? `<div class="catalog-empty">Kein Produkt gefunden.</div>`
      : `<div class="catalog-empty">In dieser Auswahl sind keine Produkte vorhanden.</div>`;
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

  if (activeListMode === "weekly") {
    // Die persönliche Einkaufsliste ist eine dauerhafte Grundliste.
    // Gleiche Produkte werden nicht doppelt angelegt.
    const duplicate = weeklyItems.some(i =>
      normalizeProductName(i.product_name) === normalizeProductName(name)
    );
    if (duplicate) return toast(`${name} ist bereits in deiner Grundliste`);

    const { error } = await db.from("weekly_shopping_items").insert({
      owner: currentPerson,
      product_name: name,
      category,
      subcategory: subgroup,
      purchased: false
    });
    if (error) {
      console.warn(error);
      return toast("Persönliche Liste konnte nicht ergänzt werden");
    }
    toast(`${name} zur persönlichen Liste hinzugefügt`);
    return;
  }

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
    console.warn("shopping_items:", error);
    return;
  }
  items = data || [];
  $("syncState").textContent = "Live synchronisiert";
  renderList();
}

async function loadWeeklyItems() {
  if (!db || !currentPerson) {
    weeklyItems = [];
    if (activeListMode === "weekly") renderList();
    return;
  }

  if (activeListMode === "weekly") $("syncState").textContent = "Synchronisiere …";

  const { data, error } = await db.from("weekly_shopping_items")
    .select("*")
    .eq("owner", currentPerson)
    .order("purchased", { ascending: true })
    .order("added_at", { ascending: false });

  if (error) {
    console.warn("weekly_shopping_items nicht verfügbar", error.message);
    weeklyItems = [];
    if (activeListMode === "weekly") {
      $("syncState").textContent = "Persönliche Liste noch nicht eingerichtet";
      renderList();
    }
    return;
  }

  weeklyItems = data || [];
  if (activeListMode === "weekly") {
    $("syncState").textContent = "Persönliche Liste synchronisiert";
    renderList();
  }
}

function renderList() {
  const source = currentActiveItems();
  const visible = hidePurchased ? source.filter(i => !i.purchased) : source;
  const open = source.filter(i => !i.purchased).length;

  $("openCount").textContent = `${open} offen`;
  $("clearPurchasedBtn").textContent = hidePurchased ? "Gekaufte anzeigen" : "Gekaufte ausblenden";

  if (!visible.length) {
    const text = activeListMode === "weekly"
      ? "🧾 Deine persönliche Grundliste ist noch leer."
      : "🧺 Die Einkaufsliste ist leer.";
    $("shoppingList").innerHTML = `<div class="empty">${text}</div>`;
    return;
  }

  const sorted = [...visible].sort((a, b) => {
    if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;
    const ad = a.created_at || a.added_at || 0;
    const bd = b.created_at || b.added_at || 0;
    return new Date(bd) - new Date(ad);
  });

  $("shoppingList").innerHTML = `<div class="flat-shopping-list">${sorted.map(renderItem).join("")}</div>`;
}

function renderItem(i) {
  if (activeListMode === "weekly") {
    return `<div class="item weekly-item ${i.purchased ? "done" : ""}" data-id="${i.id}">
      <input class="check" type="checkbox" ${i.purchased ? "checked" : ""} aria-label="Gekauft" />
      <div class="item-name weekly-item-name">${escapeHtml(i.product_name)}</div>
      <button class="delete-btn" title="Löschen" aria-label="Löschen">🗑</button>
    </div>`;
  }

  const added = formatDate(i.added_at || i.created_at);
  const bought = i.purchased_at ? formatDate(i.purchased_at) : "";
  return `<div class="item ${i.purchased ? "done" : ""}" data-id="${i.id}">
    <input class="check" type="checkbox" ${i.purchased ? "checked" : ""} aria-label="Gekauft" />
    <div>
      <div class="item-name">${escapeHtml(i.product_name)}</div>
      <div class="meta">📝 Eingetragen von <strong>${escapeHtml(i.added_by)}</strong> · ${added}${i.purchased ? `<br>✅ Gekauft von <strong>${escapeHtml(i.purchased_by || "?")}</strong> · ${bought}` : ""}</div>
    </div>
    <button class="delete-btn" title="Löschen" aria-label="Löschen">🗑</button>
  </div>`;
}

$("shoppingList").addEventListener("change", async e => {
  if (!e.target.classList.contains("check")) return;
  if (!currentPerson) {
    e.target.checked = !e.target.checked;
    return $("profileDialog").showModal();
  }

  const id = e.target.closest(".item").dataset.id;
  const purchased = e.target.checked;

  if (activeListMode === "weekly") {
    const payload = purchased
      ? { purchased: true, purchased_at: new Date().toISOString() }
      : { purchased: false, purchased_at: null };
    const { error } = await db.from("weekly_shopping_items")
      .update(payload)
      .eq("id", id)
      .eq("owner", currentPerson);
    if (error) toast("Änderung konnte nicht gespeichert werden");
    return;
  }

  const payload = purchased
    ? { purchased: true, purchased_by: currentPerson, purchased_at: new Date().toISOString() }
    : { purchased: false, purchased_by: null, purchased_at: null };
  const { error } = await db.from("shopping_items").update(payload).eq("id", id);
  if (error) toast("Änderung konnte nicht gespeichert werden");
});

$("shoppingList").addEventListener("click", async e => {
  if (!e.target.classList.contains("delete-btn")) return;

  const id = e.target.closest(".item").dataset.id;
  const source = currentActiveItems();
  const item = source.find(x => String(x.id) === String(id));
  if (!confirm(`„${item?.product_name || "Produkt"}“ wirklich aus der Liste löschen?`)) return;

  if (activeListMode === "weekly") {
    const { error } = await db.from("weekly_shopping_items")
      .delete()
      .eq("id", id)
      .eq("owner", currentPerson);
    if (error) toast("Löschen fehlgeschlagen");
    return;
  }

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


async function resetWeeklyChecks() {
  if (!db || !currentPerson) return;
  if (!weeklyItems.some(i => i.purchased)) {
    return toast("Es gibt keine Häkchen zum Zurücksetzen");
  }

  if (!confirm("Alle Häkchen deiner persönlichen Einkaufsliste zurücksetzen? Die Produkte bleiben erhalten.")) return;

  const { error } = await db.from("weekly_shopping_items")
    .update({ purchased: false, purchased_at: null })
    .eq("owner", currentPerson)
    .eq("purchased", true);

  if (error) {
    console.warn(error);
    return toast("Häkchen konnten nicht zurückgesetzt werden");
  }

  toast("Bereit für den nächsten Wocheneinkauf");
  await loadWeeklyItems();
}

$("clearPurchasedBtn").onclick = () => { hidePurchased = !hidePurchased; renderList(); };
$("refreshBtn").onclick = async () => { await Promise.all([loadItems(), loadWeeklyItems(), loadCatalogGroups(), loadCatalogProducts()]); };
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
  await cleanupOldAppCaches();
  initProfile();
  buildCatalog();
  if (!configured()) {
    $("syncState").textContent = "Cloud-Verbindung konnte nicht gestartet werden";
    $("setupDialog").showModal();
  } else {
    db = createDatabaseClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

    const results = await Promise.all([
      loadItems(),
      loadWeeklyItems(),
      loadCatalogGroups(),
      loadCatalogProducts()
    ]);

    // Statt einer externen Realtime-Bibliothek wird regelmässig synchronisiert.
    window.setInterval(async () => {
      if (document.hidden || !db) return;
      await Promise.all([
        loadItems(),
        loadWeeklyItems(),
        loadCatalogGroups(),
        loadCatalogProducts()
      ]);
    }, 4000);

    document.addEventListener("visibilitychange", async () => {
      if (!document.hidden && db) {
        await Promise.all([
          loadItems(),
          loadWeeklyItems(),
          loadCatalogGroups(),
          loadCatalogProducts()
        ]);
      }
    });
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
start();
