const PEOPLE = ["Leon", "Papi", "Mami", "Anouk"];
const config = window.APP_CONFIG;
let db = null;
let currentPerson = localStorage.getItem("family-shop-person") || "";
let items = [];
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

function buildCatalog() {
  const categories = Object.keys(PRODUCT_CATALOG);
  $("categorySelect").innerHTML = categories.map(c => `<option>${c}</option>`).join("");
  $("customCategory").innerHTML = categories.map(c => `<option>${c}</option>`).join("");
  $("categorySelect").addEventListener("change", refreshSubgroups);
  $("subgroupSelect").addEventListener("change", renderProducts);
  $("productSearch").addEventListener("input", renderProducts);
  refreshSubgroups();
}

function refreshSubgroups() {
  const cat = $("categorySelect").value;
  const groups = Object.keys(PRODUCT_CATALOG[cat]);
  $("subgroupSelect").innerHTML = [`<option value="__all">Alle Untergruppen</option>`, ...groups.map(g => `<option>${g}</option>`)].join("");
  renderProducts();
}

function renderProducts() {
  const cat = $("categorySelect").value;
  const subgroup = $("subgroupSelect").value;
  const q = $("productSearch").value.trim().toLowerCase();
  let products = [];
  for (const [sg, arr] of Object.entries(PRODUCT_CATALOG[cat])) {
    if (subgroup !== "__all" && subgroup !== sg) continue;
    for (const name of arr) products.push({name, subgroup: sg});
  }
  if (q) products = products.filter(p => p.name.toLowerCase().includes(q));
  $("productGrid").innerHTML = products.map(p => `<button class="product-btn" data-name="${escapeAttr(p.name)}" data-subgroup="${escapeAttr(p.subgroup)}">${escapeHtml(p.name)}</button>`).join("");
}

$("productGrid").addEventListener("click", e => {
  const b = e.target.closest(".product-btn");
  if (!b) return;
  addItem(b.dataset.name, $("categorySelect").value, b.dataset.subgroup);
});

$("customToggle").onclick = () => {
  $("catalogMode").classList.toggle("hidden");
  $("customMode").classList.toggle("hidden");
  $("customToggle").textContent = $("customMode").classList.contains("hidden") ? "Eigenes Produkt" : "Katalog anzeigen";
};

$("addCustomBtn").onclick = () => {
  const name = $("customName").value.trim();
  if (!name) return toast("Bitte Produktname eingeben");
  const cat = $("customCategory").value;
  const subgroup = $("customSubgroup").value.trim() || "Eigene Produkte";
  addItem(name, cat, subgroup);
  $("customName").value = "";
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

$("clearPurchasedBtn").onclick = () => { hidePurchased = !hidePurchased; renderList(); };
$("refreshBtn").onclick = loadItems;
$("closeSetup").onclick = () => $("setupDialog").close();

function formatDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
function escapeHtml(s="") { return s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
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
    await loadItems();
    db.channel("family-shopping-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, loadItems)
      .subscribe(status => {
        if (status === "SUBSCRIBED") $("syncState").textContent = "Live synchronisiert";
      });
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
start();
