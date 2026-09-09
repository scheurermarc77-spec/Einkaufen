from pathlib import Path

p = Path('index.html')
s = p.read_text()

s = s.replace('Gemeinsam einkaufen · v28', 'Gemeinsam einkaufen · v30')

old = '''          <label for="quantityUnit">Masseinheit <span class="small-muted">(optional)</span></label>
          <input id="quantityUnit" type="text" list="unitOptionsList" autocomplete="off" placeholder="optional" />'''
new = '''          <label for="quantityUnit">Masseinheit <span class="small-muted">(optional)</span></label>
          <select id="quantityUnit">
            <option value="">Keine Einheit</option>
            <option value="Stück">Stück</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="ml">ml</option>
            <option value="l">l</option>
            <option value="Packung">Packung</option>
            <option value="Beutel">Beutel</option>
            <option value="Flasche">Flasche</option>
            <option value="Dose">Dose</option>
            <option value="Glas">Glas</option>
            <option value="Rolle">Rolle</option>
            <option value="Tube">Tube</option>
            <option value="Schachtel">Schachtel</option>
            <option value="Bund">Bund</option>
            <option value="Paar">Paar</option>
            <option value="__custom__">Andere …</option>
          </select>
          <input id="quantityUnitCustom" class="hidden" type="text" autocomplete="off" placeholder="Eigene Einheit eingeben" />'''
if old not in s:
    raise SystemExit('quantityUnit source not found')
s = s.replace(old, new, 1)

old = '''  <datalist id="unitOptionsList">
    <option value="Stück"></option>
    <option value="g"></option>
    <option value="kg"></option>
    <option value="ml"></option>
    <option value="l"></option>
    <option value="Packung"></option>
    <option value="Beutel"></option>
    <option value="Flasche"></option>
    <option value="Dose"></option>
    <option value="Glas"></option>
    <option value="Rolle"></option>
    <option value="Tube"></option>
    <option value="Schachtel"></option>
    <option value="Bund"></option>
    <option value="Paar"></option>
  </datalist>
'''
if old not in s:
    raise SystemExit('unit datalist source not found')
s = s.replace(old, '', 1)

old = '''              <label for="newProductDefaultUnit">Masseinheit</label>
              <input id="newProductDefaultUnit" type="text" list="unitOptionsList" autocomplete="off" placeholder="optional" />'''
new = '''              <label for="newProductDefaultUnit">Masseinheit</label>
              <select id="newProductDefaultUnit">
                <option value="">Keine Einheit</option>
                <option value="Stück">Stück</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="l">l</option>
                <option value="Packung">Packung</option>
                <option value="Beutel">Beutel</option>
                <option value="Flasche">Flasche</option>
                <option value="Dose">Dose</option>
                <option value="Glas">Glas</option>
                <option value="Rolle">Rolle</option>
                <option value="Tube">Tube</option>
                <option value="Schachtel">Schachtel</option>
                <option value="Bund">Bund</option>
                <option value="Paar">Paar</option>
                <option value="__custom__">Andere …</option>
              </select>
              <input id="newProductDefaultUnitCustom" class="hidden" type="text" autocomplete="off" placeholder="Eigene Einheit eingeben" />'''
if old not in s:
    raise SystemExit('newProductDefaultUnit source not found')
s = s.replace(old, new, 1)

old = '''function fillUnitSelect(input, selected = "") {
  if (!input) return;
  input.value = String(selected ?? "").trim();
}'''
new = '''function fillUnitSelect(select, selected = "", customInputId = "") {
  if (!select) return;
  const clean = String(selected ?? "").trim();
  const custom = customInputId ? $(customInputId) : null;

  if (!clean) {
    select.value = "";
    if (custom) {
      custom.value = "";
      custom.classList.add("hidden");
    }
    return;
  }

  if (UNIT_OPTIONS.includes(clean)) {
    select.value = clean;
    if (custom) {
      custom.value = "";
      custom.classList.add("hidden");
    }
    return;
  }

  select.value = "__custom__";
  if (custom) {
    custom.value = clean;
    custom.classList.remove("hidden");
  }
}

function toggleCustomUnitInput(selectId, customInputId) {
  const select = $(selectId);
  const custom = $(customInputId);
  if (!select || !custom) return;

  const isCustom = select.value === "__custom__";
  custom.classList.toggle("hidden", !isCustom);
  if (!isCustom) custom.value = "";
  if (isCustom) setTimeout(() => custom.focus(), 0);
}

function getUnitValue(selectId, customInputId) {
  const select = $(selectId);
  if (!select) return "";
  if (select.value === "__custom__") {
    return String($(customInputId)?.value || "").trim();
  }
  return String(select.value || "").trim();
}

$("quantityUnit")?.addEventListener("change", () => toggleCustomUnitInput("quantityUnit", "quantityUnitCustom"));
$("newProductDefaultUnit")?.addEventListener("change", () => toggleCustomUnitInput("newProductDefaultUnit", "newProductDefaultUnitCustom"));'''
if old not in s:
    raise SystemExit('fillUnitSelect source not found')
s = s.replace(old, new, 1)

s = s.replace(
    'fillUnitSelect($("quantityUnit"), editItem ? (editItem.unit || "") : "");',
    'fillUnitSelect($("quantityUnit"), editItem ? (editItem.unit || "") : "", "quantityUnitCustom");'
)
s = s.replace(
    'fillUnitSelect($("newProductDefaultUnit"), "");',
    'fillUnitSelect($("newProductDefaultUnit"), "", "newProductDefaultUnitCustom");'
)
s = s.replace(
    'const unit = $("quantityUnit").value.trim();',
    'const unit = getUnitValue("quantityUnit", "quantityUnitCustom");'
)
s = s.replace(
    'const unit = $("newProductDefaultUnit").value.trim();',
    'const unit = getUnitValue("newProductDefaultUnit", "newProductDefaultUnitCustom");'
)

checks = [
    'Gemeinsam einkaufen · v30',
    '<select id="quantityUnit">',
    '<select id="newProductDefaultUnit">',
    'id="quantityUnitCustom"',
    'id="newProductDefaultUnitCustom"',
    'getUnitValue("quantityUnit", "quantityUnitCustom")',
    'getUnitValue("newProductDefaultUnit", "newProductDefaultUnitCustom")',
]
for check in checks:
    if check not in s:
        raise SystemExit(f'missing expected result: {check}')
if 'list="unitOptionsList"' in s:
    raise SystemExit('old datalist reference still present')
if '$("quantityUnit").value.trim()' in s:
    raise SystemExit('old quantity unit read still present')
if '$("newProductDefaultUnit").value.trim()' in s:
    raise SystemExit('old new-product unit read still present')

p.write_text(s)
