// === UTIL & STORAGE ===
const fmt = n => Number(n||0).toLocaleString('id-ID');
const now = () => new Date().toISOString();
const uid = (p='TX') => p + Math.random().toString(36).slice(2,8).toUpperCase();

const store = {
  get(k, d){try{return JSON.parse(localStorage.getItem(k)) ?? d}catch{ return d}},
  set(k, v){localStorage.setItem(k, JSON.stringify(v))}
}

// Default seed
if(!store.get('users')) store.set('users',[{u:'kasir',p:'1234',name:'Kasir Najar Putra'}]);
if(!store.get('products')) store.set('products',[]);
if(!store.get('stockIn')) store.set('stockIn',[]);
if(!store.get('stockOut')) store.set('stockOut',[]);
if(!store.get('sales')) store.set('sales',[]);

let session = store.get('session', null);

function setLoginState(){
  const el = document.getElementById('loginState');
  const btn = document.getElementById('btnLogout');
  if(session){ el.textContent = `Login: ${session.name}`; btn.style.display='inline-flex'; }
  else { el.textContent = 'Belum login'; btn.style.display='none'; }
}

// === NAVIGATION ===
function go(id){
  document.querySelectorAll('section').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // refresh dropdowns/tables when entering a page
  if(id==='sec-menu'){}
  if(id==='sec-products') renderProducts();
  if(id==='sec-in'){fillProductSelect('inProd'); renderIn();}
  if(id==='sec-out'){fillProductSelect('outProd'); renderOut();}
  if(id==='sec-pos'){fillProductSelect('posProd'); resetCartUI();}
  if(id==='sec-sales') renderSales();
  if(id==='sec-opname') renderOpname();
  window.scrollTo(0,0);
}

// === AUTH ===
function login(){
  const u = document.getElementById('inUser').value.trim();
  const p = document.getElementById('inPass').value.trim();
  const users = store.get('users',[]);
  const found = users.find(x=>x.u===u && x.p===p);
  if(!found){ alert('Username atau password salah'); return; }
  session = {u:found.u,name:found.name||found.u,ts:now()};
  store.set('session', session);
  setLoginState();
  document.getElementById('sec-login').classList.remove('active');
  document.getElementById('sec-menu').classList.add('active');
}
function logout(){ session=null; localStorage.removeItem('session'); setLoginState(); go('sec-login'); }

// === PRODUCTS ===
function renderProducts(){
  const q = (document.getElementById('pSearch').value||'').toLowerCase();
  const rows = store.get('products',[])
    .filter(p=>!q || p.name.toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q))
    .map(p=>`<tr>
      <td>${p.name}</td>
      <td>${p.sku||''}</td>
      <td class='right'>${fmt(p.price)}</td>
      <td class='right'>${fmt(p.stock||0)}</td>
      <td class='row'><button class='btn-ghost' onclick="editProduct('${p.id}')">Edit</button>
          <button class='btn-bad' onclick="delProduct('${p.id}')">Hapus</button></td>
    </tr>`).join('');
  document.getElementById('tblProducts').innerHTML = rows || `<tr><td colspan='5' class='muted'>Belum ada data</td></tr>`;
}
function addProduct(){
  let name = document.getElementById('pName').value.trim();
  let sku  = document.getElementById('pSku').value.trim();
  let price= Number(document.getElementById('pPrice').value||0);
  if(!name){alert('Nama produk wajib');return}
  const list = store.get('products',[]);
  // update if exists by name or sku
  let p = list.find(x=>x.name.toLowerCase()===name.toLowerCase() || (sku && x.sku===sku));
  if(p){ p.name=name; p.sku=sku; p.price=price; }
  else { p={id:uid('PRD'),name,sku,price,stock:0}; list.push(p); }
  store.set('products',list);
  document.getElementById('pName').value=''; document.getElementById('pSku').value=''; document.getElementById('pPrice').value='';
  renderProducts();
  alert('Produk disimpan');
}
function editProduct(id){
  const p = store.get('products',[]).find(x=>x.id===id); if(!p) return;
  document.getElementById('pName').value=p.name;
  document.getElementById('pSku').value=p.sku||'';
  document.getElementById('pPrice').value=p.price||0;
  window.scrollTo(0,0);
}
function delProduct(id){
  if(!confirm('Hapus produk ini?')) return;
  let list = store.get('products',[]).filter(p=>p.id!==id);
  store.set('products',list); renderProducts();
}
function fillProductSelect(selId){
  const sel = document.getElementById(selId);
  const list = store.get('products',[]);
  sel.innerHTML = list.map(p=>`<option value='${p.id}' data-price='${p.price||0}'>${p.name}</option>`).join('');
  // auto fill price when used in POS
  if(selId==='posProd'){
    const priceEl = document.getElementById('posPrice');
    sel.onchange = () => { priceEl.value = Number(sel.selectedOptions[0]?.dataset.price||0) };
    priceEl.value = Number(sel.selectedOptions[0]?.dataset.price||0);
  }
}
function openNewProductFrom(backSel){
  go('sec-products');
  setTimeout(()=>document.getElementById('pName').focus(),100);
}

// === STOCK IN ===
function stockIn(){
  const pid = document.getElementById('inProd').value; if(!pid) return alert('Pilih produk');
  const qty = Number(document.getElementById('inQty').value||0); if(qty<=0) return alert('Qty > 0');
  const note= document.getElementById('inNote').value||'';
  const rec = {id:uid('IN'),pid,qty,ts:now(),note};
  const ins = store.get('stockIn',[]); ins.push(rec); store.set('stockIn',ins);
  const prods = store.get('products',[]); const p=prods.find(x=>x.id===pid); if(p){p.stock=(p.stock||0)+qty; store.set('products',prods);} 
  document.getElementById('inQty').value=''; document.getElementById('inNote').value='';
  renderIn(); alert('Barang masuk dicatat');
}
function renderIn(){
  const ins = store.get('stockIn',[]).slice().reverse();
  const prods = store.get('products',[]);
  const rows = ins.map(r=>`<tr><td>${new Date(r.ts).toLocaleString('id-ID')}</td><td>${prods.find(p=>p.id===r.pid)?.name||'?'}</td><td class='right'>${fmt(r.qty)}</td><td>${r.note||''}</td></tr>`).join('');
  document.getElementById('tblIn').innerHTML = rows || `<tr><td colspan='4' class='muted'>Belum ada data</td></tr>`;
}

// === STOCK OUT ===
function stockOut(){
  const pid = document.getElementById('outProd').value; if(!pid) return alert('Pilih produk');
  const qty = Number(document.getElementById('outQty').value||0); if(qty<=0) return alert('Qty > 0');
  const note= document.getElementById('outNote').value||'';
  const prods = store.get('products',[]); const p=prods.find(x=>x.id===pid); if(!p) return; if((p.stock||0)<qty) return alert('Stok tidak cukup');
  const rec = {id:uid('OUT'),pid,qty,ts:now(),note};
  const outs = store.get('stockOut',[]); outs.push(rec); store.set('stockOut',outs);
  p.stock = (p.stock||0) - qty; store.set('products',prods);
  document.getElementById('outQty').value=''; document.getElementById('outNote').value='';
  renderOut(); alert('Barang keluar dicatat');
}
function renderOut(){
  const outs = store.get('stockOut',[]).slice().reverse();
  const prods = store.get('products',[]);
  const rows = outs.map(r=>`<tr><td>${new Date(r.ts).toLocaleString('id-ID')}</td><td>${prods.find(p=>p.id===r.pid)?.name||'?'}</td><td class='right'>${fmt(r.qty)}</td><td>${r.note||''}</td></tr>`).join('');
  document.getElementById('tblOut').innerHTML = rows || `<tr><td colspan='4' class='muted'>Belum ada data</td></tr>`;
}

// === POS ===
let cart = [];
function resetCartUI(){ 
  cart=[]; 
  renderCart(); 
  document.getElementById('payCash').value=''; 
  document.getElementById('payNote').value=''; 
  document.getElementById('posQty').value='';
  document.getElementById('payDiscount').value='';
  updatePaymentSummary();
}

function addToCart(){
  const pid = document.getElementById('posProd').value; if(!pid) return;
  const price = Number(document.getElementById('posPrice').value||0);
  const qty = Number(document.getElementById('posQty').value||0); if(qty<=0) return alert('Qty > 0');
  const p = store.get('products',[]).find(x=>x.id===pid); if(!p) return;
  cart.push({pid,name:p.name,price,qty,sub:price*qty});
  renderCart(); 
  document.getElementById('posQty').value='';
  updatePaymentSummary();
}

function removeCart(i){ 
  cart.splice(i,1); 
  renderCart(); 
  updatePaymentSummary();
}

function renderCart(){
  const rows = cart.map((c,i)=>`<tr><td>${c.name}</td><td class='right'>${fmt(c.price)}</td><td class='right'>${fmt(c.qty)}</td><td class='right'>${fmt(c.sub)}</td><td><button class='btn-ghost' onclick='removeCart(${i})'>Hapus</button></td></tr>`).join('');
  document.getElementById('tblCart').innerHTML = rows || `<tr><td colspan='5' class='muted'>Belum ada item</td></tr>`;
  const subtotal = cart.reduce((a,b)=>a+b.sub,0); 
  document.getElementById('cartSubtotal').textContent = fmt(subtotal);
}

function updatePaymentSummary(){
  const subtotal = cart.reduce((a,b)=>a+b.sub,0);
  const discount = Number(document.getElementById('payDiscount').value||0);
  const total = Math.max(0, subtotal - discount);
  const cash = Number(document.getElementById('payCash').value||0);
  const change = Math.max(0, cash - total);
  
  document.getElementById('summarySubtotal').textContent = 'Rp ' + fmt(subtotal);
  document.getElementById('summaryDiscount').textContent = 'Rp ' + fmt(discount);
  document.getElementById('summaryTotal').textContent = 'Rp ' + fmt(total);
  document.getElementById('summaryCash').textContent = 'Rp ' + fmt(cash);
  
  const changeDisplay = document.getElementById('changeDisplay');
  const changeAmount = document.getElementById('changeAmount');
  const checkoutBtn = document.getElementById('checkoutBtn');
  
  if(cash >= total && total > 0){
    changeDisplay.style.display = 'block';
    changeAmount.textContent = 'Rp ' + fmt(change);
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Bayar & Cetak';
  } else if(cash > 0 && cash < total) {
    changeDisplay.style.display = 'none';
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Tunai Kurang Rp ' + fmt(total - cash);
  } else {
    changeDisplay.style.display = 'none';
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Bayar & Cetak';
  }
}

function checkout(){
  if(cart.length===0) return alert('Keranjang kosong');
  if(!session) return alert('Harus login');
  
  const subtotal = cart.reduce((a,b)=>a+b.sub,0);
  const discount = Number(document.getElementById('payDiscount').value||0);
  const total = Math.max(0, subtotal - discount);
  const cash = Number(document.getElementById('payCash').value||0);
  const note = document.getElementById('payNote').value||'';
  
  if(cash < total) return alert('Tunai kurang');
  
  const prods = store.get('products',[]);
  // cek stok cukup
  for(const it of cart){ 
    const p=prods.find(x=>x.id===it.pid); 
    if(!p|| (p.stock||0)<it.qty) return alert('Stok tidak cukup untuk '+it.name) 
  }
  
  // kurangi stok
  for(const it of cart){ 
    const p=prods.find(x=>x.id===it.pid); 
    p.stock -= it.qty; 
  }
  store.set('products',prods);
  
  // simpan transaksi
  const sale = {
    id:uid('SALE'),
    ts:now(),
    cashier:session.name,
    subtotal,
    discount,
    total,
    items:cart,
    note,
    cash
  };
  const sales = store.get('sales',[]); 
  sales.push(sale); 
  store.set('sales',sales);
  
  // cetak
  printSale(sale);
  
  // reset UI
  resetCartUI();
  alert('Transaksi berhasil');
}


function printSale(sale){
  const body = document.getElementById('prnBody');
  // baris item (2 baris per produk)
  let rows = sale.items.map(it => `
    <tr>
      <td colspan="3">${it.name}</td>
    </tr>
    <tr>
      <td></td>
      <td class="right">${fmt(it.qty)} x ${fmt(it.price)}</td>
      <td class="right">${fmt(it.sub)}</td>
    </tr>
  `).join('');
  // separator
  rows += `<tr><td colspan="3"><div class="divider"></div></td></tr>`;

  // baris subtotal & lainnya
  rows += `
    <tr><td colspan="2">Subtotal</td><td class="right">${fmt(sale.subtotal)}</td></tr>
    <tr><td colspan="2">Diskon</td><td class="right">${fmt(sale.discount || 0)}</td></tr>
    <tr><td colspan="2"><b>Total</b></td><td class="right"><b>${fmt(sale.total)}</b></td></tr>
    <tr><td colspan="2">Tunai</td><td class="right">${fmt(sale.cash)}</td></tr>
    <tr><td colspan="2">Kembali</td><td class="right">${fmt((sale.cash || 0) - sale.total)}</td></tr>
  `;

  body.innerHTML = rows;

  // meta info
  document.getElementById('prnMeta').textContent =
    `${new Date(sale.ts).toLocaleString('id-ID')} · Kasir: ${sale.cashier} · ID: ${sale.id}`;

  window.print();
}

// === SALES LIST ===
function renderSales(){
  const sales = store.get('sales',[]).slice().reverse();
  const from = document.getElementById('sFrom').value ? new Date(document.getElementById('sFrom').value) : null;
  const to   = document.getElementById('sTo').value   ? new Date(document.getElementById('sTo').value)   : null;
  const rows = sales.filter(s=>{
    const d = new Date(s.ts);
    if(from && d < from) return false;
    if(to){ const tend=new Date(to); tend.setHours(23,59,59,999); if(d>tend) return false; }
    return true;
  }).map(s=>`<tr>
    <td>${new Date(s.ts).toLocaleString('id-ID')}</td>
    <td>${s.id}</td>
    <td class='right'>${fmt(s.items.length)}</td>
    <td class='right'>${fmt(s.total)}</td>
    <td>${s.cashier}</td>
    <td class='row'>
      <button class='btn-ghost' onclick="reprint('${s.id}')">Cetak</button>
      <button class='btn-bad' onclick="removeSale('${s.id}')">Hapus</button>
    </td>
  </tr>`).join('');
  document.getElementById('tblSales').innerHTML = rows || `<tr><td colspan='6' class='muted'>Belum ada transaksi</td></tr>`;
}

function reprint(id){
  const s = store.get('sales',[]).find(x=>x.id===id); 
  if(!s) return;
  printSale(s);
}

function removeSale(id){
  if(!confirm('Hapus transaksi ini? Stok TIDAK otomatis kembali.')) return;
  const list = store.get('sales',[]).filter(x=>x.id!==id); 
  store.set('sales',list); 
  renderSales();
}

// === OPNAME ===
function renderOpname(){
  const prods = store.get('products',[]);
  const rows = prods.map(p=>`<tr>
    <td>${p.name}</td>
    <td class='right'>${fmt(p.stock||0)}</td>
    <td class='right'><input style='width:120px' type='number' id='op_${p.id}' placeholder='Hitung' /></td>
  </tr>`).join('');
  document.getElementById('tblOpname').innerHTML = rows || `<tr><td colspan='3' class='muted'>Belum ada produk</td></tr>`;
}

function applyOpname(){
  const prods = store.get('products',[]);
  let adjCount=0;
  for(const p of prods){
    const el = document.getElementById('op_'+p.id); if(!el) continue;
    const counted = el.value===''?null:Number(el.value);
    if(counted===null || isNaN(counted)) continue;
    const diff = counted - (p.stock||0);
    if(diff===0) continue;
    if(diff>0){ // treat as stock in
      const rec = {id:uid('IN'),pid:p.id,qty:diff,ts:now(),note:'Opname (+)'};
      const ins = store.get('stockIn',[]); ins.push(rec); store.set('stockIn',ins);
    }else{ // stock out
      const rec = {id:uid('OUT'),pid:p.id,qty:Math.abs(diff),ts:now(),note:'Opname (-)'};
      const outs = store.get('stockOut',[]); outs.push(rec); store.set('stockOut',outs);
    }
    p.stock = counted; adjCount++;
  }
  store.set('products',prods);
  if(adjCount===0) alert('Tidak ada perubahan opname'); else alert('Opname diterapkan ke '+adjCount+' produk');
  renderOpname();
}

// === INIT ===
if(store.get('session')){ session = store.get('session'); go('sec-menu'); }
setLoginState();
