(()=>{
  const UNIT_LIST=['Stück','g','kg','ml','l','Packung','Beutel','Flasche','Dose','Glas','Rolle','Tube','Schachtel','Bund','Paar'];

  function ensureDatalist(){
    if(document.getElementById('unitOptionsList')) return;
    const list=document.createElement('datalist');
    list.id='unitOptionsList';
    list.innerHTML=UNIT_LIST.map(u=>`<option value="${u}"></option>`).join('');
    document.body.appendChild(list);
  }

  function replaceUnitSelect(id){
    const old=document.getElementById(id);
    if(!old || old.tagName==='INPUT') return old;
    const input=document.createElement('input');
    input.id=id;
    input.type='text';
    input.setAttribute('list','unitOptionsList');
    input.setAttribute('autocomplete','off');
    input.placeholder='optional';
    input.className=old.className||'';
    old.replaceWith(input);
    return input;
  }

  function setText(){
    const qLabel=document.querySelector('label[for="quantityUnit"]');
    if(qLabel) qLabel.innerHTML='Masseinheit <span class="small-muted">(optional)</span>';
    const qDialog=document.getElementById('quantityDialog');
    const qHint=qDialog?.querySelector('.quantity-input-grid + .small-muted');
    if(qHint) qHint.textContent='Einheit aus der Liste auswählen oder eine eigene Einheit eingeben. Das Feld darf leer bleiben.';

    const newUnit=document.getElementById('newProductDefaultUnit');
    const step=newUnit?.closest('.selection-step');
    const mainLabel=step?.querySelector('.step-content > label');
    if(mainLabel) mainLabel.innerHTML='Menge und Masseinheit <span class="small-muted">(optional)</span>';
    const hint=step?.querySelector('.quantity-input-grid + .small-muted');
    if(hint) hint.textContent='Einheit aus der Liste auswählen oder frei eingeben. Menge und Masseinheit dürfen beide leer bleiben.';

    const edit=document.getElementById('editProductDefaultUnit');
    if(edit){
      const label=document.querySelector('label[for="editProductDefaultUnit"]');
      if(label) label.hidden=true;
      edit.hidden=true;
      const next=edit.nextElementSibling;
      if(next?.classList?.contains('small-muted')) next.hidden=true;
    }
  }

  ensureDatalist();
  replaceUnitSelect('quantityUnit');
  replaceUnitSelect('newProductDefaultUnit');
  setText();

  if(typeof fillUnitSelect==='function'){
    fillUnitSelect=function(field,selected=''){
      if(!field) return;
      if(field.id==='editProductDefaultUnit' && field.tagName==='SELECT'){
        if(!field.options.length) field.innerHTML=UNIT_LIST.map(u=>`<option value="${u}">${u}</option>`).join('');
        field.value=UNIT_LIST.includes(selected)?selected:'Stück';
        return;
      }
      field.value=String(selected??'').trim();
    };
  }

  if(typeof suggestDefaultUnit==='function') suggestDefaultUnit=()=>'';
  if(typeof productDefaultUnit==='function') productDefaultUnit=()=>'';
  if(typeof updateSuggestedNewProductUnit==='function') updateSuggestedNewProductUnit=()=>{};

  if(typeof quantityLabel==='function'){
    quantityLabel=function(quantity,unit=''){
      const formatted=typeof formatQuantity==='function'?formatQuantity(quantity):String(quantity??'').trim();
      const cleanUnit=String(unit||'').trim();
      if(formatted && cleanUnit) return `${formatted} ${cleanUnit}`;
      if(formatted) return formatted;
      return cleanUnit;
    };
  }

  if(typeof saveCatalogProduct==='function'){
    saveCatalogProduct=async function(name,category,subgroup){
      if(!db) return false;
      const existing=cloudProducts.find(p=>
        normalizeProductName(p.product_name)===normalizeProductName(name) &&
        p.category.toLowerCase()===category.toLowerCase() &&
        p.subcategory.toLowerCase()===subgroup.toLowerCase()
      );
      if(existing) return existing;

      const {error}=await db.from('catalog_products').insert({
        product_name:String(name).trim().replace(/\s+/g,' '),
        category,
        subcategory:subgroup,
        default_unit:'',
        created_by:currentPerson||'Unbekannt'
      });

      if(error){
        const msg=String(error.message||'');
        if(/default_unit|column/i.test(msg)) toast('Bitte zuerst die v21-Supabase-Datei ausführen');
        else if(msg.includes('catalog_products')||msg.includes('relation')) toast('Produktdatenbank muss zuerst in Supabase aktiviert werden');
        else if(msg.includes('duplicate')||msg.includes('unique')){
          await loadCatalogProducts();
          return cloudProducts.find(p=>
            normalizeProductName(p.product_name)===normalizeProductName(name) &&
            p.category.toLowerCase()===category.toLowerCase() &&
            p.subcategory.toLowerCase()===subgroup.toLowerCase()
          )||false;
        }else toast('Produkt konnte nicht gespeichert werden');
        console.warn(error);
        return false;
      }

      await loadCatalogProducts();
      const saved=cloudProducts.find(p=>
        normalizeProductName(p.product_name)===normalizeProductName(name) &&
        p.category.toLowerCase()===category.toLowerCase() &&
        p.subcategory.toLowerCase()===subgroup.toLowerCase()
      );
      toast(`${name} in Datenbank aufgenommen`);
      return saved||false;
    };
  }

  if(typeof toast==='function'){
    const originalToast=toast;
    toast=function(msg,...rest){
      if(typeof msg==='string') msg=msg.replace(/\s·\s*hinzugefügt$/,' hinzugefügt');
      return originalToast(msg,...rest);
    };
  }

  function cleanRenderedUi(){
    setText();
    document.querySelectorAll('.quantity-chip.quantity-edit').forEach(el=>{
      if(!String(el.textContent||'').trim()) el.textContent='Menge';
    });
    document.querySelectorAll('.product-btn-meta,.admin-product-copy span').forEach(el=>{
      const t=String(el.textContent||'');
      if(t.includes('Standard:')) el.textContent=t.replace(/\s*·\s*Standard:\s*[^·]*/,'').trim();
    });
  }

  cleanRenderedUi();
  const observer=new MutationObserver(cleanRenderedUi);
  observer.observe(document.body,{childList:true,subtree:true});
})();
