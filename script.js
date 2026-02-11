// Soodazon (سودازون) - client-side app
const WA_NUMBER = '201556569749';
const STORAGE_PRODUCTS = 'soodazon_products';
const STORAGE_CART = 'soodazon_cart';
const STORAGE_ORDERS = 'soodazon_orders';
const STORAGE_SELLERS = 'soodazon_sellers';
const STORAGE_SELLER_PRODUCTS = 'soodazon_seller_products';
const ADMIN_SESSION = 'soodazon_admin_logged';
const ADMIN_PWD_KEY = 'soodazon_admin_pwd';
const SELLER_SESSION = 'soodazon_seller_logged';
const SELLER_ID_KEY = 'soodazon_seller_id';

function initApp() {
    // ensure default admin password exists (changeable via console/localStorage)
    if (!localStorage.getItem(ADMIN_PWD_KEY)) localStorage.setItem(ADMIN_PWD_KEY, 'sudazone2026');
    // initialize storages if missing
    if (!localStorage.getItem(STORAGE_PRODUCTS)) localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_CART)) localStorage.setItem(STORAGE_CART, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_ORDERS)) localStorage.setItem(STORAGE_ORDERS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_SELLERS)) localStorage.setItem(STORAGE_SELLERS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_SELLER_PRODUCTS)) localStorage.setItem(STORAGE_SELLER_PRODUCTS, JSON.stringify({}));

    // Check if seller is logged in
    if(isSellerLoggedIn()){
        loadSellerDashboard();
    }

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
    document.getElementById('sellerLoginForm').addEventListener('submit', handleSellerLogin);
    document.getElementById('sellerAddProductForm').addEventListener('submit', handleSellerAddProduct);
    document.getElementById('sellerSettingsForm').addEventListener('submit', handleSellerSettings);

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
    // Load admin products
    const adminProducts = JSON.parse(localStorage.getItem(STORAGE_PRODUCTS) || '[]');
    
    // Load seller products from all sellers
    const sellerProductsData = JSON.parse(localStorage.getItem(STORAGE_SELLER_PRODUCTS) || '{}');
    let allSellerProducts = [];
    
    for(const sellerId in sellerProductsData){
        const sellerProducts = sellerProductsData[sellerId] || [];
        allSellerProducts = allSellerProducts.concat(sellerProducts);
    }
    
    // Combine all products
    return [...adminProducts, ...allSellerProducts];
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
    navigateTo('home');
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
    return handleSellerFormOriginal(e);
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

// MISSING FUNCTIONS
function toggleCart(){
    const cartPage = document.getElementById('cart-page');
    if(cartPage && cartPage.classList.contains('active')){
        navigateTo('home');
    } else {
        navigateTo('cart');
    }
}

function showAdminTab(tab){
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(t=>t.classList.remove('active'));
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(b=>b.classList.remove('active'));
    const activeTab = document.getElementById('admin-' + tab);
    if(activeTab) activeTab.classList.add('active');
    const activeBtn = Array.from(tabBtns).find(b=>b.textContent.includes(tab==='products'?'المنتجات':tab==='stats'?'الإحصائيات':'البائعين'));
    if(activeBtn) activeBtn.classList.add('active');
}

function toggleFAQ(btn){
    const answer = btn.nextElementSibling;
    const icon = btn.querySelector('.faq-icon');
    if(answer && answer.style.display === 'none'){
        answer.style.display = 'block';
        if(icon) icon.textContent = '−';
    } else {
        if(answer) answer.style.display = 'none';
        if(icon) icon.textContent = '+';
    }
}

function filterByCategory(){
    const category = document.getElementById('categoryFilter').value;
    const products = loadProducts();
    const list = document.getElementById('productsList');
    list.innerHTML='';
    const filtered = category ? products.filter(p=>p.category===category) : products;
    if(!filtered.length){
        list.innerHTML = '<p>لا توجد منتجات في هذه الفئة</p>';
        return;
    }
    filtered.forEach(p=>{
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

function filterByPrice(){
    const maxPrice = parseInt(document.getElementById('priceFilter').value) || 10000;
    const products = loadProducts();
    const list = document.getElementById('productsList');
    list.innerHTML='';
    const filtered = products.filter(p=>p.price <= maxPrice);
    if(!filtered.length){
        list.innerHTML = '<p>لا توجد منتجات بهذا السعر</p>';
        return;
    }
    filtered.forEach(p=>{
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

function searchProducts(){
    const query = document.getElementById('searchInput').value.toLowerCase();
    const products = loadProducts();
    const list = document.getElementById('productsList');
    list.innerHTML='';
    const filtered = products.filter(p=>
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
    if(!filtered.length){
        list.innerHTML = '<p>لم يتم العثور على منتجات</p>';
        return;
    }
    filtered.forEach(p=>{
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

// SELLER SYSTEM
function handleSellerLogin(e){
    e.preventDefault();
    const email = document.getElementById('sellerLoginEmail').value.trim();
    const password = document.getElementById('sellerLoginPassword').value.trim();
    
    const sellers = JSON.parse(localStorage.getItem(STORAGE_SELLERS) || '[]');
    const seller = sellers.find(s => s.email === email && s.password === password);
    
    if(!seller){
        return alert('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
    
    sessionStorage.setItem(SELLER_SESSION, '1');
    sessionStorage.setItem(SELLER_ID_KEY, seller.id);
    document.getElementById('sellerLoginForm').reset();
    loadSellerDashboard();
    navigateTo('seller-dashboard');
}

function logoutSeller(){
    if(confirm('هل تريد تسجيل الخروج؟')){
        sessionStorage.removeItem(SELLER_SESSION);
        sessionStorage.removeItem(SELLER_ID_KEY);
        navigateTo('home');
        alert('تم تسجيل الخروج بنجاح');
    }
}

function isSellerLoggedIn(){
    return sessionStorage.getItem(SELLER_SESSION) === '1';
}

function getCurrentSellerId(){
    return sessionStorage.getItem(SELLER_ID_KEY);
}

function getSeller(sellerId){
    const sellers = JSON.parse(localStorage.getItem(STORAGE_SELLERS) || '[]');
    return sellers.find(s => s.id === sellerId);
}

function loadSellerDashboard(){
    if(!isSellerLoggedIn()) return navigateTo('seller-login');
    
    const sellerId = getCurrentSellerId();
    const seller = getSeller(sellerId);
    
    if(!seller) return logoutSeller();
    
    document.getElementById('sellerStoreName').textContent = seller.name;
    document.getElementById('sellerSettingsStoreName').value = seller.name;
    document.getElementById('sellerSettingsPhone').value = seller.phone;
    document.getElementById('sellerSettingsEmail').value = seller.email;
    document.getElementById('sellerSettingsAddress').value = seller.address;
    
    renderSellerProducts();
    renderSellerOrders();
    updateSellerStats();
}

function renderSellerProducts(){
    const sellerId = getCurrentSellerId();
    const sellerProducts = JSON.parse(localStorage.getItem(STORAGE_SELLER_PRODUCTS) || '{}');
    const products = sellerProducts[sellerId] || [];
    const tbody = document.getElementById('sellerProductsList');
    
    if(!tbody) return;
    tbody.innerHTML = '';
    
    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img class="product-img-thumb" src="${p.image||''}"/></td>
            <td>${escapeHtml(p.name)}</td>
            <td>${p.price} جنيه</td>
            <td>${escapeHtml(p.category)}</td>
            <td>${p.stock}</td>
            <td class="action-buttons-admin">
                <button class="edit-btn" onclick="editSellerProduct('${p.id}')">تعديل</button>
                <button class="delete-btn" onclick="deleteSellerProduct('${p.id}')">حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderSellerOrders(){
    const sellerId = getCurrentSellerId();
    const orders = JSON.parse(localStorage.getItem(STORAGE_ORDERS) || '[]');
    const sellerProducts = JSON.parse(localStorage.getItem(STORAGE_SELLER_PRODUCTS) || '{}');
    const myProducts = sellerProducts[sellerId] || [];
    
    const tbody = document.getElementById('sellerOrdersList');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    // Filter orders that contain this seller's products
    const myOrders = orders.filter(o => 
        o.items.some(item => myProducts.some(p => p.id === item.id))
    );
    
    myOrders.reverse().forEach(o => {
        const itemsText = o.items
            .filter(item => myProducts.some(p => p.id === item.id))
            .map(item => {
                const p = myProducts.find(pp => pp.id === item.id) || {};
                return `${escapeHtml(p.name || '')} x ${item.qty}`;
            })
            .join(', ');
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${o.id}</td>
            <td>${escapeHtml(o.buyer)}</td>
            <td>${itemsText}</td>
            <td>${o.subtotal} جنيه</td>
            <td>${o.status}</td>
            <td>${new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateSellerStats(){
    const sellerId = getCurrentSellerId();
    const sellerProducts = JSON.parse(localStorage.getItem(STORAGE_SELLER_PRODUCTS) || '{}');
    const products = sellerProducts[sellerId] || [];
    const orders = JSON.parse(localStorage.getItem(STORAGE_ORDERS) || '[]');
    
    const myOrders = orders.filter(o => 
        o.items.some(item => products.some(p => p.id === item.id))
    );
    
    const totalSales = myOrders.reduce((sum, o) => sum + o.subtotal, 0);
    
    document.getElementById('sellerTotalProducts').textContent = products.length;
    document.getElementById('sellerTotalOrders').textContent = myOrders.length;
    document.getElementById('sellerTotalSales').textContent = totalSales + ' جنيه';
}

function showSellerProductForm(){
    document.getElementById('sellerProductForm').style.display = 'block';
}

function hideSellerProductForm(){
    document.getElementById('sellerProductForm').style.display = 'none';
}

function handleSellerAddProduct(e){
    e.preventDefault();
    const name = document.getElementById('sellerProductName').value.trim();
    const price = parseFloat(document.getElementById('sellerProductPrice').value) || 0;
    const category = document.getElementById('sellerProductCategory').value;
    const description = document.getElementById('sellerProductDescription').value.trim();
    const stock = parseInt(document.getElementById('sellerProductStock').value) || 0;
    const file = document.getElementById('sellerProductImage').files[0];
    const sellerId = getCurrentSellerId();
    
    if(!name || !category || !description){
        return alert('يرجى ملء جميع الحقول المطلوبة');
    }
    
    if(file && file.size > 2*1024*1024){
        return alert('الصورة كبيرة جداً');
    }
    
    if(file){
        const reader = new FileReader();
        reader.onload = function(ev){
            const img = ev.target.result;
            saveSellerProduct({name, price, category, description, stock, image: img}, sellerId);
        };
        reader.readAsDataURL(file);
    } else {
        saveSellerProduct({name, price, category, description, stock, image: ''}, sellerId);
    }
}

function saveSellerProduct(product, sellerId){
    const sellerProducts = JSON.parse(localStorage.getItem(STORAGE_SELLER_PRODUCTS) || '{}');
    if(!sellerProducts[sellerId]) sellerProducts[sellerId] = [];
    
    const id = 'SP' + Date.now();
    sellerProducts[sellerId].push({id, ...product});
    localStorage.setItem(STORAGE_SELLER_PRODUCTS, JSON.stringify(sellerProducts));
    
    hideSellerProductForm();
    document.getElementById('sellerAddProductForm').reset();
    renderSellerProducts();
    updateSellerStats();
    alert('تم إضافة المنتج بنجاح');
}

function editSellerProduct(id){
    const sellerId = getCurrentSellerId();
    const sellerProducts = JSON.parse(localStorage.getItem(STORAGE_SELLER_PRODUCTS) || '{}');
    const products = sellerProducts[sellerId] || [];
    const p = products.find(x => x.id === id);
    
    if(!p) return alert('المنتج غير موجود');
    
    const name = prompt('اسم المنتج:', p.name);
    if(name === null) return;
    
    const price = prompt('السعر:', p.price);
    if(price === null) return;
    
    p.name = name;
    p.price = parseFloat(price) || p.price;
    
    const stock = prompt('الكمية:', p.stock);
    if(stock !== null) p.stock = parseInt(stock) || p.stock;
    
    const category = prompt('الفئة:', p.category);
    if(category !== null) p.category = category;
    
    const desc = prompt('وصف المنتج:', p.description);
    if(desc !== null) p.description = desc;
    
    localStorage.setItem(STORAGE_SELLER_PRODUCTS, JSON.stringify(sellerProducts));
    renderSellerProducts();
    updateSellerStats();
    alert('تم تحديث المنتج');
}

function deleteSellerProduct(id){
    if(!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    const sellerId = getCurrentSellerId();
    const sellerProducts = JSON.parse(localStorage.getItem(STORAGE_SELLER_PRODUCTS) || '{}');
    sellerProducts[sellerId] = (sellerProducts[sellerId] || []).filter(p => p.id !== id);
    localStorage.setItem(STORAGE_SELLER_PRODUCTS, JSON.stringify(sellerProducts));
    renderSellerProducts();
    updateSellerStats();
}

function showSellerTab(tab){
    const tabs = document.querySelectorAll('.seller-tab');
    tabs.forEach(t => t.classList.remove('active'));
    const tabBtns = document.querySelectorAll('.seller-tabs .tab-btn');
    tabBtns.forEach(b => b.classList.remove('active'));
    
    const activeTab = document.getElementById('seller-' + tab);
    if(activeTab) activeTab.classList.add('active');
    
    const tabNames = {'products': 'منتجاتي', 'orders': 'طلباتي', 'stats': 'الإحصائيات', 'settings': 'الإعدادات'};
    const activeBtn = Array.from(tabBtns).find(b => b.textContent.includes(tabNames[tab]));
    if(activeBtn) activeBtn.classList.add('active');
    
    if(tab === 'orders') renderSellerOrders();
}

function handleSellerSettings(e){
    e.preventDefault();
    const sellerId = getCurrentSellerId();
    const sellers = JSON.parse(localStorage.getItem(STORAGE_SELLERS) || '[]');
    const sellerIdx = sellers.findIndex(s => s.id === sellerId);
    
    if(sellerIdx === -1) return;
    
    const name = document.getElementById('sellerSettingsStoreName').value.trim();
    const phone = document.getElementById('sellerSettingsPhone').value.trim();
    const email = document.getElementById('sellerSettingsEmail').value.trim();
    const address = document.getElementById('sellerSettingsAddress').value.trim();
    const password = document.getElementById('sellerSettingsPassword').value.trim();
    
    if(!name || !phone || !email || !address){
        return alert('يرجى ملء جميع الحقول المطلوبة');
    }
    
    sellers[sellerIdx].name = name;
    sellers[sellerIdx].phone = phone;
    sellers[sellerIdx].email = email;
    sellers[sellerIdx].address = address;
    if(password) sellers[sellerIdx].password = password;
    
    localStorage.setItem(STORAGE_SELLERS, JSON.stringify(sellers));
    alert('تم تحديث بيانات متجرك بنجاح');
}

// Update seller registration to save seller account
function handleSellerFormOriginal(e){
    e.preventDefault();
    const name = document.getElementById('sellerName').value.trim();
    const phone = document.getElementById('sellerPhone').value.trim();
    const email = document.getElementById('sellerEmail').value.trim();
    const address = document.getElementById('sellerAddress').value.trim();
    const category = document.getElementById('sellerCategory').value;
    const desc = document.getElementById('sellerDescription').value.trim();
    
    if(!name || !phone || !email || !address || !category || !desc){
        return alert('يرجى ملء جميع الحقول');
    }
    
    // Save seller to database
    const sellers = JSON.parse(localStorage.getItem(STORAGE_SELLERS) || '[]');
    const sellerId = 'SELLER' + Date.now();
    const defaultPassword = 'password123'; // default password - user should change it
    
    sellers.push({
        id: sellerId,
        name,
        phone,
        email,
        address,
        category,
        description: desc,
        password: defaultPassword,
        createdAt: new Date().toISOString()
    });
    
    localStorage.setItem(STORAGE_SELLERS, JSON.stringify(sellers));
    
    // Show WhatsApp message
    const msg = `طلب انضمام بائع%0Aالاسم: ${encodeURIComponent(name)}%0Aالهاتف: ${encodeURIComponent(phone)}%0Aالبريد: ${encodeURIComponent(email)}%0Aالفئة: ${encodeURIComponent(category)}%0Aالوصف: ${encodeURIComponent(desc)}%0Aالعنوان: ${encodeURIComponent(address)}%0A%0A✅ تم إنشاء حساب البائع:تم حفظه في قاعدة البيانات`;
    const waUrl = `https://wa.me/${WA_NUMBER}?text=${msg}`;
    
    e.target.reset();
    window.location.href = waUrl;
    
    setTimeout(() => {
        alert(`تم تسجيل حسابك بنجاح!%0Aبريدك: ${email}%0Aكلمة مرورك المؤقتة: ${defaultPassword}%0Aيمكنك تغييرها من الإعدادات بعد الدخول`);
    }, 500);
}

// UTIL
function loadScriptIfMissing(){ if(!window._soodazonInit){ initApp(); window._soodazonInit = true; } }

window.addEventListener('DOMContentLoaded', ()=>{ try{ loadScriptIfMissing(); }catch(e){ console.error(e); } });
