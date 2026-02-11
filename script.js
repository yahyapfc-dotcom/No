// Soodazon (سودازون) - client-side app
const WA_NUMBER = '201556569749';
const STORAGE_PRODUCTS = 'soodazon_products';
const STORAGE_CART = 'soodazon_cart';
const STORAGE_ORDERS = 'soodazon_orders';
const ADMIN_SESSION = 'soodazon_admin_logged';
const ADMIN_PWD_KEY = 'soodazon_admin_pwd';

function initApp() {
    // ensure default admin password exists (changeable via console/localStorage)
    if (!localStorage.getItem(ADMIN_PWD_KEY)) localStorage.setItem(ADMIN_PWD_KEY, 'sudazone2026');
    // initialize storages if missing
    if (!localStorage.getItem(STORAGE_PRODUCTS)) localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_CART)) localStorage.setItem(STORAGE_CART, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_ORDERS)) localStorage.setItem(STORAGE_ORDERS, JSON.stringify([]));

    // push history state to intercept back button
    history.replaceState({page: 'home'}, '');
    window.addEventListener('popstate', (e) => {
        // prevent leaving the site accidentally: ask user
        const stay = confirm('هل تريد الخروج من سودازون؟ اضغط موافق للخروج، إلغاء للبقاء.');
        if (!stay) {
            history.pushState({page: currentPage()}, '');
        }
    });

    // wire forms
    document.getElementById('searchInput').addEventListener('input', debounce(searchProducts, 300));
    document.getElementById('addProductForm').addEventListener('submit', handleAddProductForm);
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckoutSubmit);
    document.getElementById('sellerForm').addEventListener('submit', handleSellerForm);
    document.getElementById('contactForm').addEventListener('submit', handleContactForm);
    document.getElementById('partnerForm').addEventListener('submit', handlePartnerForm);

    loadProducts();
    renderProducts();
    renderAdminProducts();
    updateCartCount();
    renderOrders();
}

function debounce(fn, ms){let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a), ms);};}

function currentPage(){
    const active = document.querySelector('.page.active');
    return active ? active.id.replace('-page','') : 'home';
}

function navigateTo(page) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    const el = document.getElementById(page + '-page');
    if (el) el.classList.add('active');
    // update nav active
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    const navBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b=>b.textContent.trim().includes(capitalize(page)) || b.getAttribute('onclick')?.includes(page));
    if (navBtn) navBtn.classList.add('active');
    history.pushState({page}, '');
    if (page === 'cart') renderCart();
    if (page === 'checkout') renderCheckoutSummary();
}

function capitalize(s){ if(!s) return ''; return s.charAt(0).toUpperCase()+s.slice(1);} 

// PRODUCTS
function loadProducts(){
    return JSON.parse(localStorage.getItem(STORAGE_PRODUCTS) || '[]');
}

function saveProducts(products){
    localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(products));
}

function renderProducts(){
    const list = document.getElementById('productsList');
    list.innerHTML = '';
    const products = loadProducts();
    if (!products.length) {
        list.innerHTML = '<p>لا توجد منتجات حالياً. تواصل مع الإدارة لإضافة منتجات.</p>';
        return;
    }
    products.forEach(p=>{
        const card = document.createElement('div'); card.className='product-card';
        card.innerHTML = `
            <div class="product-image-container"><img src="${p.image || ''}" alt="${escapeHtml(p.name)}"></div>
            <div class="product-info-card">
                <div class="product-name">${escapeHtml(p.name)}</div>
                <div class="product-category">${escapeHtml(p.category)}</div>
                <div class="product-price">${p.price} جنيه</div>
                <div class="product-description">${escapeHtml(truncate(p.description, 120))}</div>
                <div class="product-buttons">
                    <button class="product-btn-view" onclick="viewProduct('${p.id}')">عرض</button>
                    <button class="product-btn-add" onclick="addToCartById('${p.id}')">أضف إلى السلة</button>
                </div>
            </div>`;
        list.appendChild(card);
    });
}

function truncate(s,n){ return s.length>n? s.slice(0,n)+'...':s; }
function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function viewProduct(id){
    const products = loadProducts();
    const p = products.find(x=>x.id===id); if(!p) return alert('المنتج غير موجود');
    document.getElementById('detailProductImage').src = p.image || '';
    document.getElementById('detailProductName').textContent = p.name;
    document.getElementById('detailProductPrice').textContent = p.price + ' جنيه';
    document.getElementById('detailProductDescription').textContent = p.description;
    document.getElementById('productQuantity').value = 1;
    // store current viewed product id
    window._soodazon_current = id;
    navigateTo('product-detail');
}

// CART
function addToCartById(id){
    const qty = 1;
    const cart = JSON.parse(localStorage.getItem(STORAGE_CART) || '[]');
    const found = cart.find(i=>i.id===id);
    if(found) found.qty += qty; else cart.push({id, qty});
    localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
    updateCartCount();
    alert('تمت إضافة المنتج إلى السلة');
}

function addToCart(){
    const id = window._soodazon_current; if(!id) return;
    const qty = parseInt(document.getElementById('productQuantity').value || '1');
    const cart = JSON.parse(localStorage.getItem(STORAGE_CART) || '[]');
    const found = cart.find(i=>i.id===id);
    if(found) found.qty += qty; else cart.push({id, qty});
    localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
    updateCartCount();
    alert('تمت إضافة المنتج إلى السلة');
}

function updateCartCount(){
    const cart = JSON.parse(localStorage.getItem(STORAGE_CART) || '[]');
    const count = cart.reduce((s,i)=>s+i.qty,0);
    document.getElementById('cartCount').textContent = count;
}

function renderCart(){
    const container = document.getElementById('cartItems'); container.innerHTML='';
    const cart = JSON.parse(localStorage.getItem(STORAGE_CART) || '[]');
    const products = loadProducts();
    if(!cart.length) { container.innerHTML = '<p>السلة فارغة</p>'; return; }
    cart.forEach((item, idx)=>{
        const p = products.find(pp=>pp.id===item.id) || {};
        const div = document.createElement('div'); div.className='cart-item';
        div.innerHTML = `
            <img class="cart-item-image" src="${p.image||''}" />
            <div class="cart-item-info">
               <div class="cart-item-name">${escapeHtml(p.name||'')}</div>
               <div class="cart-item-price">${p.price||0} جنيه</div>
            </div>
            <div><input class="cart-item-quantity" type="number" value="${item.qty}" min="1" onchange="changeCartQty(${idx}, this.value)"></div>
            <div class="cart-item-total">${(p.price||0) * item.qty} جنيه<br><button class="remove-item-btn" onclick="removeCartItem(${idx})">إزالة</button></div>
        `;
        container.appendChild(div);
    });
    calculateTotals();
}

function changeCartQty(index, val){
    const cart = JSON.parse(localStorage.getItem(STORAGE_CART) || '[]');
    cart[index].qty = Math.max(1, parseInt(val)||1);
    localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
    renderCart(); updateCartCount();
}

function removeCartItem(index){
    const cart = JSON.parse(localStorage.getItem(STORAGE_CART) || '[]');
    cart.splice(index,1); localStorage.setItem(STORAGE_CART, JSON.stringify(cart)); renderCart(); updateCartCount();
}

function calculateTotals(){
    const cart = JSON.parse(localStorage.getItem(STORAGE_CART) || '[]');
    const products = loadProducts();
    const subtotal = cart.reduce((s,i)=>{
        const p = products.find(pp=>pp.id===i.id) || {price:0};
        return s + (p.price||0) * i.qty;
    },0);
    const tax = Math.round(subtotal * 0.0); // no tax by default
    const total = subtotal + tax;
    document.getElementById('subtotalDisplay').textContent = subtotal + ' جنيه';
    document.getElementById('taxDisplay').textContent = tax + ' جنيه';
    document.getElementById('totalDisplay').textContent = total + ' جنيه';
    document.getElementById('checkoutTotal').textContent = total + ' جنيه';
}

// CHECKOUT
function renderCheckoutSummary(){
    const checkoutItems = document.getElementById('checkoutItems'); checkoutItems.innerHTML='';
    const cart = JSON.parse(localStorage.getItem(STORAGE_CART) || '[]');
    const products = loadProducts();
    cart.forEach(i=>{
        const p = products.find(pp=>pp.id===i.id) || {};
        const div = document.createElement('div'); div.className='checkout-item';
        div.textContent = `${p.name || ''} x ${i.qty} - ${(p.price||0)*i.qty} جنيه`;
        checkoutItems.appendChild(div);
    });
    calculateTotals();
}

function handleCheckoutSubmit(e){
    e.preventDefault();
    const form = e.target;
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const state = document.getElementById('state').value.trim();
    const notes = document.getElementById('orderNotes').value.trim();
    const paymentMethod = form.paymentMethod.value;
    const cart = JSON.parse(localStorage.getItem(STORAGE_CART) || '[]');
    if(!cart.length) return alert('سلة التسوق فارغة');

    const products = loadProducts();
    const itemsText = cart.map(i=>{
        const p = products.find(pp=>pp.id===i.id) || {};
        return `${p.name || ''} x ${i.qty} - ${(p.price||0)*i.qty} جنيه`;
    }).join('\n');

    const subtotal = cart.reduce((s,i)=>{ const p = products.find(pp=>pp.id===i.id) || {price:0}; return s + (p.price||0)*i.qty; },0);
    const order = {
        id: 'ORD' + Date.now(), buyer: fullName, phone, email, address, state, notes, paymentMethod, items: cart, subtotal, status: 'قيد الانتظار', createdAt: new Date().toISOString()
    };
    const orders = JSON.parse(localStorage.getItem(STORAGE_ORDERS)||'[]'); orders.push(order); localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));

    // prepare WhatsApp message to site owner
    let message = `طلب جديد من سودازون%0Aرقم الطلب: ${order.id}%0Aالاسم: ${encodeURIComponent(fullName)}%0Aالهاتف: ${encodeURIComponent(phone)}%0Aالبريد: ${encodeURIComponent(email)}%0Aالولاية: ${encodeURIComponent(state)}%0Aالعنوان: ${encodeURIComponent(address)}%0A(ملاحظات) ${encodeURIComponent(notes)}%0A%0Aالمنتجات:%0A`;
    message += encodeURIComponent(itemsText);
    // open WhatsApp chat
    const wa = `https://wa.me/${WA_NUMBER}?text=${message}`;
    // clear cart
    localStorage.setItem(STORAGE_CART, JSON.stringify([])); updateCartCount();
    window.open(wa, '_blank');
    alert('تم إنشاء الطلب وإرساله إلى الواتساب. سيتم التواصل معك قريباً.');
    navigateTo('home');
}

function renderOrders(){
    const list = document.getElementById('ordersList'); if(!list) return;
    const orders = JSON.parse(localStorage.getItem(STORAGE_ORDERS)||'[]');
    list.innerHTML = '';
    if(!orders.length){ document.getElementById('noOrdersMessage').style.display='block'; return; }
    document.getElementById('noOrdersMessage').style.display='none';
    orders.slice().reverse().forEach(o=>{
        const div = document.createElement('div'); div.className='order-card';
        div.innerHTML = `<div class="order-header"><div class="order-id">${o.id}</div><div class="order-status">${o.status}</div></div>
        <div class="order-details"><div class="order-detail-item"><strong>المشتري:</strong> ${escapeHtml(o.buyer)}</div><div class="order-detail-item"><strong>الهاتف:</strong> ${escapeHtml(o.phone)}</div></div>
        <div class="order-items">${o.items.map(it=>{ const p = loadProducts().find(pp=>pp.id===it.id)||{}; return `<div class="order-item">${escapeHtml(p.name||'')} x ${it.qty} - ${(p.price||0)*it.qty} جنيه</div>`}).join('')}</div>
        `;
        list.appendChild(div);
    });
}

// ADMIN
function requireAdmin(action){
    if(sessionStorage.getItem(ADMIN_SESSION)==='1') return action();
    const pwd = prompt('أدخل كلمة مرور لوحة التحكم:');
    const stored = localStorage.getItem(ADMIN_PWD_KEY);
    if(pwd === stored){ sessionStorage.setItem(ADMIN_SESSION,'1'); return action(); }
    alert('كلمة المرور غير صحيحة');
}

function showProductForm(){
    requireAdmin(()=>{ document.getElementById('productForm').style.display='block'; });
}

function hideProductForm(){ document.getElementById('productForm').style.display='none'; }

function handleAddProductForm(e){
    e.preventDefault();
    requireAdmin(()=>{
        const name = document.getElementById('productName').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value) || 0;
        const category = document.getElementById('productCategory').value;
        const description = document.getElementById('productDescription').value.trim();
        const stock = parseInt(document.getElementById('productStock').value) || 0;
        const file = document.getElementById('productImage').files[0];
        if(file && file.size > 2*1024*1024) return alert('الصورة كبيرة جداً');
        if(file){
            const reader = new FileReader();
            reader.onload = function(ev){
                const img = ev.target.result;
                saveNewProduct({name, price, category, description, stock, image: img});
            };
            reader.readAsDataURL(file);
        } else {
            saveNewProduct({name, price, category, description, stock, image: ''});
        }
    });
}

function saveNewProduct(p){
    const products = loadProducts();
    const id = 'P' + Date.now();
    products.push({id, ...p});
    saveProducts(products);
    hideProductForm();
    document.getElementById('addProductForm').reset();
    renderProducts(); renderAdminProducts();
    alert('تم إضافة المنتج');
}

function renderAdminProducts(){
    const tbody = document.getElementById('adminProductsList'); if(!tbody) return;
    const products = loadProducts(); tbody.innerHTML='';
    products.forEach(p=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img class="product-img-thumb" src="${p.image||''}"/></td>
            <td>${escapeHtml(p.name)}</td>
            <td>${p.price} جنيه</td>
            <td>${escapeHtml(p.category)}</td>
            <td>${p.stock}</td>
            <td class="action-buttons-admin">
                <button class="edit-btn" onclick="editProduct('${p.id}')">تعديل</button>
                <button class="delete-btn" onclick="deleteProduct('${p.id}')">حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    document.getElementById('totalProducts').textContent = products.length;
}

function editProduct(id){
    requireAdmin(()=>{
        const products = loadProducts(); const p = products.find(x=>x.id===id);
        if(!p) return alert('المنتج غير موجود');
        const name = prompt('اسم المنتج:', p.name); if(name===null) return;
        const price = prompt('السعر:', p.price); if(price===null) return;
        p.name = name; p.price = parseFloat(price) || p.price;
        const stock = prompt('الكمية:', p.stock); if(stock!==null) p.stock = parseInt(stock)||p.stock;
        const category = prompt('الفئة:', p.category); if(category!==null) p.category = category;
        const desc = prompt('وصف المنتج:', p.description); if(desc!==null) p.description = desc;
        saveProducts(products); renderProducts(); renderAdminProducts(); alert('تم تحديث المنتج');
    });
}

function deleteProduct(id){
    requireAdmin(()=>{
        if(!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
        let products = loadProducts(); products = products.filter(p=>p.id!==id); saveProducts(products); renderProducts(); renderAdminProducts();
    });
}

// Seller form - open WhatsApp with info
function handleSellerForm(e){
    e.preventDefault();
    const name = document.getElementById('sellerName').value.trim();
    const phone = document.getElementById('sellerPhone').value.trim();
    const email = document.getElementById('sellerEmail').value.trim();
    const address = document.getElementById('sellerAddress').value.trim();
    const category = document.getElementById('sellerCategory').value;
    const desc = document.getElementById('sellerDescription').value.trim();
    const msg = `طلب انضمام بائع%0Aالاسم: ${encodeURIComponent(name)}%0Aالهاتف: ${encodeURIComponent(phone)}%0Aالبريد: ${encodeURIComponent(email)}%0Aالفئة: ${encodeURIComponent(category)}%0Aالوصف: ${encodeURIComponent(desc)}%0Aالعنوان: ${encodeURIComponent(address)}`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
    alert('تم إرسال معلوماتك إلى رقم الواتساب. سنتواصل معك سريعاً.');
    e.target.reset();
}

function handleContactForm(e){
    e.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const subject = document.getElementById('contactSubject').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    // open mail client as fallback
    window.location.href = `mailto:netnookhi@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(name+'\n'+phone+'\n\n'+message)}`;
}

function handlePartnerForm(e){
    e.preventDefault();
    const name = document.getElementById('partnerName').value.trim();
    const email = document.getElementById('partnerEmail').value.trim();
    const phone = document.getElementById('partnerPhone').value.trim();
    const site = document.getElementById('partnerWebsite').value.trim();
    const strat = document.getElementById('partnerStrategy').value.trim();
    const msg = `طلب شريك تابع%0Aالاسم: ${encodeURIComponent(name)}%0Aالهاتف: ${encodeURIComponent(phone)}%0Aالبريد: ${encodeURIComponent(email)}%0Aالموقع: ${encodeURIComponent(site)}%0Aالخطة: ${encodeURIComponent(strat)}`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
    alert('تم إرسال طلب الشراكة إلى الواتساب. سنعاود الاتصال بك.');
    e.target.reset();
}

// UTIL
function loadScriptIfMissing(){ if(!window._soodazonInit){ initApp(); window._soodazonInit = true; } }

window.addEventListener('DOMContentLoaded', ()=>{ try{ loadScriptIfMissing(); }catch(e){ console.error(e); } });
