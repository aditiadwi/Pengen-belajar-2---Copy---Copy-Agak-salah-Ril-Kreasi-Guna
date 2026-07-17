const API_KEY = '[REDACTED_NEWSAPI_KEY]';

// SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://cdlirubbmeayfwklnnyu.supabase.co';
const SUPABASE_ANON_KEY = '[REDACTED_SUPABASE_ANON_KEY]';
// Change variable name to avoid shadowing the global 'supabase' object from CDN
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** UTILS & SMART CONTRAST */
function getContrastColor(rgbString) {
    if (!rgbString || rgbString === 'rgba(0, 0, 0, 0)' || rgbString === 'transparent') return 'var(--coffee-black)';
    const rgb = rgbString.match(/\d+/g);
    if (!rgb || rgb.length < 3) return 'var(--coffee-black)';
    const r = parseInt(rgb[0]);
    const g = parseInt(rgb[1]);
    const b = parseInt(rgb[2]);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'var(--coffee-black)' : 'var(--white)';
}

window.autoAdjustContrast = () => {
    const elements = document.querySelectorAll('.auto-contrast');
    elements.forEach(el => {
        const bg = window.getComputedStyle(el).backgroundColor;
        el.style.color = getContrastColor(bg);
    });
};

/** 1. SHOP & CART */
// ... (omitting intermediate functions for clarity in turn, but I will provide the full block in the actual call)

/** ARTICLES */
const MOCK_COFFEE_NEWS = [
    { title: "The Art of the Perfect Pour-Over", description: "Discover the secrets to mastering the pour-over technique.", urlToImage: "https://images.unsplash.com/photo-1544787210-2211d64b565a?w=600&auto=format", url: "https://www.bluebottlecoffee.com/us/en/brew-guides/pour-over" },
    { title: "Sustainable Sourcing: From Farm to Cup", description: "Learn how we work with small-scale farmers.", urlToImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format", url: "https://www.fairtrade.org.uk/farmers-and-workers/coffee/" },
    { title: "Understanding Coffee Roast Profiles", description: "Light, medium, or dark? Explore roasting levels.", urlToImage: "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600&auto=format", url: "https://www.ncausa.org/about-coffee/coffee-roasts-guide" },
    { title: "Cold Brew vs. Iced Coffee", description: "What's the difference? We break down the brewing methods.", urlToImage: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format", url: "https://www.foodnetwork.com/fn-dish/news/2015/06/cold-brew-vs-iced-coffee" },
    { title: "The Rise of Oat Milk in Coffee", description: "Why oat milk has become the favorite dairy alternative.", urlToImage: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format", url: "https://www.bonappetit.com/story/oat-milk-coffee-shops" },
    { title: "Coffee Brewing Essentials", description: "The must-have tools for your home coffee station.", urlToImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format", url: "https://www.nytimes.com/wirecutter/reviews/best-coffee-maker/" }
];

const PRODUCTS = [
    { id: 'p1', name: 'BOX PREMIUM — ARABICA', price: 40000, stock: 25, image: 'Images/Arabika Drip Box.png', description: 'Mandailing Origin, Medium Roast. Smooth and balanced with hints of chocolate and caramel. (50g / 5 Sachets)' },
    { id: 'p2', name: 'BOX PREMIUM — ROBUSTA', price: 35000, stock: 30, image: 'Images/Robusta Drip Box.png', description: '100% Robusta Single Origin, Dark Roast. Bold and strong character with complex bitterness, full body, and smoky aftertaste. (50g / 5 Sachets)' },
    { id: 'p3', name: 'DRIP BAG — ARABICA', price: 8000, stock: 100, image: 'Images/Arabika Sachet.png', description: '100% Arabica Single Origin, Medium Roast. Practical sachet format with a signature aroma. (10g / 1 Sachet)' },
    { id: 'p4', name: 'DRIP BAG — ROBUSTA', price: 7000, stock: 120, image: 'Images/Robusta Sachet.png', description: '100% Robusta, Dark Roast. Intense aroma and bold body, fresh roasted for a "kick." (10g / 1 Sachet)' },
    { id: 'p5', name: 'ESPRESSO POUCH', price: 8000, stock: 50, image: 'Images/Espresso Pouch.png', description: 'Arabica & Robusta Signature Shot. Ready-to-drink espresso in a standing pouch; bold, smooth, and consistent. (30ml)' },
    { id: 'p6', name: 'COFFEE DIP', price: 27000, stock: 0, image: 'Images/Coffee Dip .png', description: 'Kopi Celup (Coffee Bag). Quick and easy "dip" style coffee. (12 pcs)' }
];

const SHIPPING_FEES = {
    jakarta: { reg: 15000, sameday: 25000, instant: 45000 },
    bandung: { reg: 20000, sameday: 35000, instant: 60000 },
    surabaya: { reg: 25000, sameday: 45000, instant: 75000 },
    medan: { reg: 35000, sameday: 60000, instant: 90000 },
    bali: { reg: 30000, sameday: 55000, instant: 85000 }
};

let cart = {};
let currentShippingFee = 0;
let directSelectedRating = 0;
let customStandItems = [];

/** 1. SHOP & CART */
function initShop() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    const reviews = JSON.parse(localStorage.getItem('coffee_reviews') || '[]');
    grid.innerHTML = PRODUCTS.map(p => {
        const out = p.stock <= 0;
        const prodReviews = reviews.filter(r => r.items && r.items.includes(p.name));
        const avg = prodReviews.length > 0 ? (prodReviews.reduce((a, b) => a + b.rating, 0) / prodReviews.length).toFixed(1) : '0.0';
        
        // Determine image class for CSS scaling
        const imgClass = p.name.includes('BOX') ? 'img-box' : 'img-sachet';
        
        return `
            <div class="product-card ${out ? 'out-of-stock' : ''}">
                <img src="${p.image}" class="${imgClass}">
                <h3>${p.name}</h3>
                <div class="product-rating">${'&#9733;'.repeat(Math.round(avg))} (${avg})</div>
                <div class="product-price">Rp ${p.price.toLocaleString('id-ID')}</div>
                <div class="product-stock">Stock: ${p.stock} units</div>
                <button class="btn-primary w-100" onclick="addToCart('${p.id}')" ${out ? 'disabled' : ''}>${out ? 'Sold Out' : 'Add to Cart'}</button>
            </div>
        `;
    }).join('');
}

window.addToCart = (id) => {
    const p = PRODUCTS.find(prod => prod.id === id);
    if ((cart[id] || 0) >= p.stock) return alert("Out of stock!");
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
    document.getElementById('checkout').scrollIntoView({ behavior: 'smooth' });
};

window.updateQty = (id, delta) => {
    const p = PRODUCTS.find(prod => prod.id === id);
    const next = (cart[id] || 0) + delta;
    if (next > p.stock) return alert("Stock limit!");
    cart[id] = next;
    if (cart[id] <= 0) delete cart[id];
    renderCart();
};

function renderCart() {
    const cont = document.getElementById('cart-items');
    let sub = 0;
    const ids = Object.keys(cart);
    if (ids.length === 0) { cont.innerHTML = '<p>Your cart is empty.</p>'; }
    else {
        cont.innerHTML = ids.map(id => {
            const p = PRODUCTS.find(prod => prod.id === id);
            sub += p.price * cart[id];
            return `<div class="cart-item"><div><h4>${p.name}</h4><span>Rp ${p.price.toLocaleString('id-ID')} x ${cart[id]}</span></div><div class="quantity-controls"><button class="btn-qty" onclick="updateQty('${id}',-1)">-</button><span>${cart[id]}</span><button class="btn-qty" onclick="updateQty('${id}',1)">+</button></div></div>`;
        }).join('');
    }
    document.getElementById('subtotal').innerText = `Rp ${sub.toLocaleString('id-ID')}`;
    const total = sub > 0 ? sub + currentShippingFee : 0;
    document.getElementById('grand-total').innerText = `Rp ${total.toLocaleString('id-ID')}`;
}

window.handleShippingUpdate = () => {
    const city = document.getElementById('shipping-city').value;
    const serv = document.getElementById('delivery-service').value;
    currentShippingFee = (city && SHIPPING_FEES[city]) ? SHIPPING_FEES[city][serv] : 0;
    document.getElementById('shipping-fee').innerText = `Rp ${currentShippingFee.toLocaleString('id-ID')}`;
    renderCart();
};

window.handleProceedToPayment = () => {
    const name = document.getElementById('customer-name').value;
    if (!name || Object.keys(cart).length === 0) return alert("Fill in details & add items!");
    const payArea = document.getElementById('payment-area');
    payArea.classList.remove('hidden');
    document.getElementById('btn-checkout').classList.add('hidden');
    const total = document.getElementById('grand-total').innerText;
    document.getElementById('payment-grand-total').innerText = total;
    const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=BREW_PAY_${total.replace(/\D/g,'')}`;
    document.getElementById('qrcode').innerHTML = `<img src="${qrUrl}">`;
    payArea.scrollIntoView({ behavior: 'smooth' }); // SCROLL TO PAYMENT
};

window.handlePlaceOrder = async () => {
    const btn = document.getElementById('btn-place-order');
    const receiptFile = document.getElementById('payment-receipt').files[0];
    if (!receiptFile) return alert("Upload proof first!");
    
    if (!supabaseClient) return alert("Database service not available. Please contact us via WhatsApp.");

    // Disable button & show loading state
    const originalBtnText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Processing Order...";

    try {
        // 1. UPLOAD TO CLOUDINARY
        const formData = new FormData();
        formData.append('file', receiptFile);
        formData.append('upload_preset', 'unsigned_123'); 

        const cloudResponse = await fetch(`https://api.cloudinary.com/v1_1/dzwv7azwx/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!cloudResponse.ok) throw new Error("Cloudinary upload failed");
        
        const cloudData = await cloudResponse.json();
        const receiptUrl = cloudData.secure_url; 
        
        const orderId = 'ORD-'+Date.now();
        const customerName = document.getElementById('customer-name').value;
        const customerPhone = document.getElementById('customer-phone').value;
        const customerEmail = document.getElementById('customer-email').value;
        const location = `${document.getElementById('shipping-city').value}, ${document.getElementById('customer-address').value}`;
        const itemsList = Object.keys(cart).map(id => `${PRODUCTS.find(p => p.id === id).name} (x${cart[id]})`).join(', ');
        const total = document.getElementById('grand-total').innerText;
        const delivery = document.getElementById('delivery-service').options[document.getElementById('delivery-service').selectedIndex].text;
        const note = document.getElementById('order-note').value;

        // 2. EMAIL API INTEGRATION (EmailJS)
        if (typeof emailjs !== 'undefined') {
            const templateParams = {
                order_id: orderId,
                from_name: customerName,
                phone: customerPhone,
                customer_email: customerEmail,
                shipping_address: location,
                order_items: itemsList,
                total_amount: total,
                delivery_method: delivery,
                customer_note: note,
                receipt_image: receiptUrl 
            };
            await emailjs.send('service_k151d3t', 'template_32knsih', templateParams);
        }

        // 3. SUPABASE INTEGRATION
        const { error: sbError } = await supabaseClient
            .from('orders')
            .insert([
                {
                    order_id: orderId,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    customer_email: customerEmail,
                    shipping_address: location,
                    items: itemsList,
                    total_amount: total,
                    receipt_url: receiptUrl,
                    status: 'PENDING'
                }
            ]);

        if (sbError) throw sbError;

        // Update Stock Local
        Object.keys(cart).forEach(id => PRODUCTS.find(p => p.id === id).stock -= cart[id]);
        saveStockToLocal();

        const order = {
            id: orderId,
            customer: customerName,
            phone: customerPhone,
            email: customerEmail,
            location: location,
            items: itemsList,
            total: total,
            delivery: delivery,
            note: note,
            receipt: receiptUrl, 
            status: 'PENDING'
        };

        const history = JSON.parse(localStorage.getItem('coffee_orders') || '[]');
        history.unshift(order);
        localStorage.setItem('coffee_orders', JSON.stringify(history));
        
        cart = {}; 
        renderCart(); 
        renderOrderHistory(); 
        initShop();
        
        alert("Order Submitted Successfully! Check your email for confirmation.");
        
        document.getElementById('payment-area').classList.add('hidden');
        document.getElementById('btn-checkout').classList.remove('hidden');

    } catch (error) {
        console.error("FAILED...", error);
        alert("Order submission failed. Please try again or contact us via WhatsApp.");
    } finally {
        btn.disabled = false;
        btn.innerText = originalBtnText;
    }
};

/** 2. STAND & REVIEWS */
function initStars() {
    const stars = document.querySelectorAll('.star-d');
    stars.forEach(s => {
        s.onclick = (e) => {
            directSelectedRating = parseInt(e.target.dataset.value);
            stars.forEach(st => st.classList.toggle('active', parseInt(st.dataset.value) <= directSelectedRating));
        };
    });
}

window.submitDirectReview = () => {
    const name = document.getElementById('direct-review-name').value || 'Anonymous';
    const text = document.getElementById('direct-review-text').value;
    if (directSelectedRating === 0) return alert("Rating required!");
    const review = { id: Date.now(), author: name, rating: directSelectedRating, text, date: new Date().toLocaleDateString() };
    const reviews = JSON.parse(localStorage.getItem('coffee_reviews') || '[]');
    reviews.unshift(review);
    localStorage.setItem('coffee_reviews', JSON.stringify(reviews));
    document.getElementById('direct-review-name').value = '';
    document.getElementById('direct-review-text').value = '';
    directSelectedRating = 0;
    document.querySelectorAll('.star-d').forEach(s => s.classList.remove('active'));
    renderTestimonials(); initShop(); alert("Thanks!");
};

function renderTestimonials() {
    const cont = document.getElementById('testimonials-grid');
    if (!cont) return;
    const revs = JSON.parse(localStorage.getItem('coffee_reviews') || '[]');
    cont.innerHTML = revs.length ? revs.map(r => `<div class="testimonial-card"><button class="btn-delete" onclick="deleteTestimonial(${r.id})">&times;</button><div style="color:#f1c40f">${'&#9733;'.repeat(r.rating)}</div><p class="testimonial-text">"${r.text}"</p><strong>${r.author}</strong></div>`).join('') : '<p>No reviews yet.</p>';
}

window.deleteTestimonial = (id) => {
    localStorage.setItem('coffee_reviews', JSON.stringify(JSON.parse(localStorage.getItem('coffee_reviews') || '[]').filter(r => r.id !== id)));
    renderTestimonials(); initShop();
};

window.addCustomStandItem = () => {
    const v = document.getElementById('new-stand-item').value.trim();
    if (v && !customStandItems.includes(v)) { customStandItems.push(v); document.getElementById('new-stand-item').value = ''; renderCustomStandItems(); }
};

window.removeCustomStandItem = (item) => { customStandItems = customStandItems.filter(i => i !== item); renderCustomStandItems(); };

function renderCustomStandItems() {
    const c = document.getElementById('stand-custom-items-list');
    if (c) c.innerHTML = customStandItems.map(i => `<div class="stand-custom-item">${i} <button onclick="removeCustomStandItem('${i}')" class="btn-remove-item">&times;</button></div>`).join('');
}

window.saveStandToSchedule = () => {
    const loc = document.getElementById('stand-location').value;
    const date = document.getElementById('stand-date').value;
    if (!loc || !date) return alert("Location/Date missing!");
    const prs = []; document.getElementsByName('stand-prod').forEach(cb => { if (cb.checked) prs.push(cb.value); });
    const sch = JSON.parse(localStorage.getItem('coffee_stand_schedule') || '[]');
    sch.unshift({ id: 'ST-'+Date.now(), location: loc, date: date, status: document.getElementById('stand-status').value, products: prs, customItems: [...customStandItems] });
    localStorage.setItem('coffee_stand_schedule', JSON.stringify(sch));
    customStandItems = []; renderCustomStandItems(); renderStandSchedule(); alert("Scheduled!");
};

window.activateStand = (id) => { localStorage.setItem('active_stand_id', id); renderStandSchedule(); renderStandAnnouncement(); };

window.deletePlannedStand = (id) => {
    if (confirm("Delete stand?")) {
        const sch = JSON.parse(localStorage.getItem('coffee_stand_schedule') || '[]').filter(s => s.id !== id);
        localStorage.setItem('coffee_stand_schedule', JSON.stringify(sch));
        if (localStorage.getItem('active_stand_id') === id) localStorage.removeItem('active_stand_id');
        renderStandSchedule(); renderStandAnnouncement();
    }
};

function renderStandSchedule() {
    const c = document.getElementById('planned-stands-list');
    if (!c) return;
    const sch = JSON.parse(localStorage.getItem('coffee_stand_schedule') || '[]');
    const aid = localStorage.getItem('active_stand_id');
    c.innerHTML = sch.map(s => `<div class="planned-stand-card ${s.id === aid ? 'active' : ''}"><h4>${s.location}</h4><p>${s.date}</p><div class="planned-stand-actions">${s.id !== aid ? `<button onclick="activateStand('${s.id}')" class="btn-mini btn-set-active">Activate</button>` : ''}<button onclick="deletePlannedStand('${s.id}')" class="btn-mini btn-delete-stand">Delete</button></div></div>`).join('');
}

function renderStandAnnouncement() {
    const b = document.getElementById('stand-announcement');
    const sch = JSON.parse(localStorage.getItem('coffee_stand_schedule') || '[]');
    const d = sch.find(s => s.id === localStorage.getItem('active_stand_id'));
    if (!d || d.status === 'none') return b.classList.add('hidden');
    b.classList.remove('hidden');
    document.getElementById('announce-text').innerHTML = `We're at <strong>${d.location}</strong> today! (${d.date})`;
    const all = [...(d.products || []), ...(d.customItems || [])];
    document.getElementById('announce-items').innerHTML = all.map(i => `<span class="announce-item-tag">${i}</span>`).join('');
}

/** 3. ADMIN & INVENTORY */
window.loginAdmin = () => { if (prompt("Admin Password:") === (window.ENV?.LEGACY_ADMIN_PASSWORD || '[REDACTED_ADMIN_PASSWORD]')) { localStorage.setItem('isAdmin', 'true'); toggleAdminUI(true); } };
window.logoutAdmin = () => { localStorage.removeItem('isAdmin'); toggleAdminUI(false); };

function toggleAdminUI(isAdmin) {
    const sections = ['order-history', 'admin-inventory', 'admin-stand'];
    sections.forEach(id => document.getElementById(id)?.classList.toggle('hidden', !isAdmin));
    document.body.classList.toggle('admin-active', isAdmin);
    if (isAdmin) { initInventoryManager(); initStandManager(); renderOrderHistory(); }
}

function initInventoryManager() {
    const c = document.getElementById('admin-inventory-list');
    if (c) c.innerHTML = PRODUCTS.map(p => `<div class="inventory-card"><h4>${p.name}</h4><div class="inventory-controls"><button class="btn-inventory" onclick="adjustStock('${p.id}',-1)">-</button><strong>${p.stock}</strong><button class="btn-inventory" onclick="adjustStock('${p.id}',1)">+</button></div></div>`).join('');
}

window.adjustStock = (id, delta) => {
    const p = PRODUCTS.find(prod => prod.id === id);
    p.stock = Math.max(0, p.stock + delta);
    saveStockToLocal(); initInventoryManager(); initShop();
};

function saveStockToLocal() { localStorage.setItem('coffee_inventory', JSON.stringify(PRODUCTS.map(p => ({ id: p.id, stock: p.stock })))); }

function renderOrderHistory() {
    const c = document.getElementById('orders-list');
    const h = JSON.parse(localStorage.getItem('coffee_orders') || '[]');
    if (c) c.innerHTML = h.map(o => `<div class="order-card"><div class="order-header"><span>${o.id}</span> <span class="order-status ${o.status.toLowerCase()}">${o.status}</span></div><p><strong>Customer:</strong> ${o.customer} (${o.phone})</p><p><strong>Shipping:</strong> ${o.location} (${o.delivery})</p><p><strong>Note:</strong> ${o.note || 'None'}</p><p><strong>Total:</strong> ${o.total}</p>${o.receipt ? `<img src="${o.receipt}" style="max-width:150px; cursor:pointer" onclick="window.open('${o.receipt}')">` : ''}<div class="order-actions"><button class="btn-delete-stand" onclick="deleteOrder('${o.id}')">Delete</button></div></div>`).join('');
}

window.deleteOrder = (id) => { if (confirm("Delete?")) { localStorage.setItem('coffee_orders', JSON.stringify(JSON.parse(localStorage.getItem('coffee_orders') || '[]').filter(o => o.id !== id))); renderOrderHistory(); } };

async function getCoffeeNews() {
    try {
        const r = await fetch(`https://newsapi.org/v2/everything?q=coffee&pageSize=20&apiKey=${API_KEY}`);
        const d = await r.json();
        const articles = d.articles && d.articles.length ? d.articles : MOCK_COFFEE_NEWS;
        
        // Pick 3 articles based on the day of the month
        const day = new Date().getDate();
        const itemsToDisplay = 3;
        const totalArticles = articles.length;
        // Ensure we stay within bounds
        const startIndex = (day * itemsToDisplay) % (totalArticles <= itemsToDisplay ? 1 : totalArticles - itemsToDisplay + 1);
        
        displayNews(articles.slice(startIndex, startIndex + itemsToDisplay));
    } catch { 
        const day = new Date().getDate();
        const itemsToDisplay = Math.min(3, MOCK_COFFEE_NEWS.length);
        const startIndex = (day % (MOCK_COFFEE_NEWS.length - itemsToDisplay + 1));
        displayNews(MOCK_COFFEE_NEWS.slice(startIndex, startIndex + itemsToDisplay)); 
    }
}

function displayNews(articles) {
    const g = document.getElementById('news-grid');
    if (!g) return;
    g.innerHTML = articles.map(a => `<article class="news-card"><img src="${a.urlToImage || ''}" class="news-image"><div class="news-body"><h3>${a.title}</h3><p class="news-desc">${a.description || ''}</p><a href="${a.url}" target="_blank">Read More &rarr;</a></div></article>`).join('');
}

function initStandManager() {
    const l = document.getElementById('stand-products-list');
    if (l) l.innerHTML = PRODUCTS.map(p => `<label class="checkbox-group"><input type="checkbox" name="stand-prod" value="${p.name}"> ${p.name}</label>`).join('');
    renderStandSchedule(); renderStandAnnouncement();
}

/** INITIALIZE */
document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Logic
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // Load Cart from LocalStorage
    const savedCart = JSON.parse(localStorage.getItem('coffee_cart') || '{}');
    cart = savedCart;

    // Load Stock from LocalStorage
    const s = JSON.parse(localStorage.getItem('coffee_inventory') || '[]');
    s.forEach(item => { const p = PRODUCTS.find(prod => prod.id === item.id); if (p) p.stock = item.stock; });

    // Page Specific Initialization
    const path = window.location.pathname;
    const page = path.split("/").pop();

    if (page === 'index.html' || page === '') {
        renderFeaturedProducts();
    } else if (page === 'products.html') {
        initShop();
        renderCart();
    } else if (page === 'checkout.html') {
        renderCart();
        document.getElementById('shipping-city')?.addEventListener('change', window.handleShippingUpdate);
        document.getElementById('delivery-service')?.addEventListener('change', window.handleShippingUpdate);
    } else if (page === 'about.html') {
        renderTestimonials();
    } else if (page === 'brew.html') {
        getCoffeeNews();
        initStars();
    } else if (page === 'contact.html') {
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('contact-name').value;
                const email = document.getElementById('contact-email').value;
                const whatsapp = document.getElementById('contact-whatsapp').value;
                const purpose = document.getElementById('contact-purpose').value;
                const message = document.getElementById('contact-message').value;

                const waMessage = `Halo KG Smart Drip Coffee, saya ${name} (${email}).%0A%0AKeperluan: ${purpose}%0A%0APesan: ${message}`;
                const waUrl = `https://wa.me/6281219092900?text=${waMessage}`;
                window.open(waUrl, '_blank');
            });
        }
    }

    toggleAdminUI(localStorage.getItem('isAdmin') === 'true');
});

function renderFeaturedProducts() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    const featured = PRODUCTS.slice(0, 3);
    grid.innerHTML = featured.map(p => {
        let imgClass = 'img-sachet';
        if (p.name.includes('BOX')) imgClass = 'img-box';
        if (p.name.includes('POUCH')) imgClass = 'img-pouch';
        
        return `
            <div class="product-card">
                <img src="${p.image}" class="${imgClass}">
                <h3>${p.name}</h3>
                <div class="product-price">Rp ${p.price.toLocaleString('id-ID')}</div>
                <a href="products.html" class="btn-primary w-100">Shop Now</a>
            </div>
        `;
    }).join('');
}

// Update renderCart to save to localStorage
const originalRenderCart = renderCart;
renderCart = () => {
    localStorage.setItem('coffee_cart', JSON.stringify(cart));
    const cont = document.getElementById('cart-items');
    if (!cont) return; // Guard for pages without a cart
    
    let sub = 0;
    const ids = Object.keys(cart);
    if (ids.length === 0) { 
        cont.innerHTML = '<p>Your cart is empty.</p>'; 
    } else {
        cont.innerHTML = ids.map(id => {
            const p = PRODUCTS.find(prod => prod.id === id);
            sub += p.price * cart[id];
            return `<div class="cart-item"><div><h4>${p.name}</h4><span>Rp ${p.price.toLocaleString('id-ID')} x ${cart[id]}</span></div><div class="quantity-controls"><button class="btn-qty" onclick="updateQty('${id}',-1)">-</button><span>${cart[id]}</span><button class="btn-qty" onclick="updateQty('${id}',1)">+</button></div></div>`;
        }).join('');
    }
    
    const subtotalEl = document.getElementById('subtotal');
    if (subtotalEl) subtotalEl.innerText = `Rp ${sub.toLocaleString('id-ID')}`;
    
    const total = sub > 0 ? sub + currentShippingFee : 0;
    const grandTotalEl = document.getElementById('grand-total');
    if (grandTotalEl) grandTotalEl.innerText = `Rp ${total.toLocaleString('id-ID')}`;
};
