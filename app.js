const API_KEY = '[REDACTED_NEWSAPI_KEY]';

// SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://cdlirubbmeayfwklnnyu.supabase.co';
const SUPABASE_ANON_KEY = '[REDACTED_SUPABASE_ANON_KEY]';
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

let DYNAMIC_PRODUCTS = [];

// EMAILJS CONFIGURATION
const EMAILJS_SERVICE_ID = 'service_k151d3t';
const EMAILJS_ADMIN_TEMPLATE_ID = 'template_32knsih';
const EMAILJS_BUYER_TEMPLATE_ID = 'template_vsn07oo';

// --- FORM PERSISTENCE LOGIC ---
const FORM_FIELDS = ['customer-name', 'customer-phone', 'customer-email', 'shipping-city', 'delivery-service', 'customer-address'];

function saveFormData() {
    const data = {};
    FORM_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    });
    localStorage.setItem('checkout_form_data', JSON.stringify(data));
}

function loadFormData() {
    const saved = localStorage.getItem('checkout_form_data');
    if (!saved) return;
    try {
        const data = JSON.parse(saved);
        FORM_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (el && data[id]) el.value = data[id];
        });
    } catch (e) {
        console.warn("Gagal membaca checkout_form_data dari localStorage:", e);
    }
}

function clearFormData() {
    localStorage.removeItem('checkout_form_data');
    FORM_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const helperText = document.getElementById('address-helper-text');
    if (helperText) helperText.innerText = "Catatan: Silakan tambahkan nomor rumah/blok/RT/RW secara lengkap.";
}

async function fetchProducts() {
    if (DYNAMIC_PRODUCTS && DYNAMIC_PRODUCTS.length > 0) {
        return DYNAMIC_PRODUCTS;
    }
    console.log("Fetching products from Supabase...");
    if (!supabaseClient) {
        console.error("Supabase client not initialized!");
        return [];
    }
    try {
        const { data, error } = await supabaseClient.from('products').select('*');
        if (error) {
            console.error("Error fetching products:", error);
            return [];
        }
        if (data) {
            console.log("Successfully fetched products:", data.length);
            DYNAMIC_PRODUCTS = data;
            return data;
        }
    } catch (e) {
        console.error("Failed to fetch products from Supabase (network or CORS block):", e);
        return [];
    }
    return [];
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
const MOCK_COFFEE_NEWS = [
    { title: "The Art of the Perfect Pour-Over", description: "Discover the secrets to mastering the pour-over technique.", urlToImage: "https://images.unsplash.com/photo-1544787210-2211d64b565a?w=600&auto=format", url: "https://www.bluebottlecoffee.com/us/en/brew-guides/pour-over" },
    { title: "Sustainable Sourcing: From Farm to Cup", description: "Learn how we work with small-scale farmers.", urlToImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format", url: "https://www.fairtrade.org.uk/farmers-and-workers/coffee/" },
    { title: "Understanding Coffee Roast Profiles", description: "Light, medium, or dark? Explore roasting levels.", urlToImage: "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600&auto=format", url: "https://www.ncausa.org/about-coffee/coffee-roasts-guide" },
    { title: "Cold Brew vs. Iced Coffee", description: "What's the difference? We break down the brewing methods.", urlToImage: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format", url: "https://www.foodnetwork.com/fn-dish/news/2015/06/cold-brew-vs-iced-coffee" },
    { title: "The Rise of Oat Milk in Coffee", description: "Why oat milk has become the favorite dairy alternative.", urlToImage: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format", url: "https://www.bonappetit.com/story/oat-milk-coffee-shops" },
    { title: "Coffee Brewing Essentials", description: "The must-have tools for your home coffee station.", urlToImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format", url: "https://www.nytimes.com/wirecutter/reviews/best-coffee-maker/" }
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

async function initShop() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    
    const products = await fetchProducts();
    if (!products || products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 50px;">No products found. Please add products in the Admin Dashboard.</p>';
        return;
    }

    let reviews = [];
    try {
        reviews = JSON.parse(localStorage.getItem('coffee_reviews') || '[]');
        if (!Array.isArray(reviews)) reviews = [];
    } catch (e) {
        console.warn("Gagal membaca coffee_reviews dari localStorage:", e);
        reviews = [];
    }
    grid.innerHTML = products.map(p => {
        const out = p.stock <= 0;
        const prodReviews = reviews.filter(r => r.items && r.items.includes(p.name));
        const avg = prodReviews.length > 0 ? (prodReviews.reduce((a, b) => a + b.rating, 0) / prodReviews.length).toFixed(1) : '0.0';
        const imgClass = p.name.includes('BOX') ? 'img-box' : 'img-sachet';
        const imagePath = p.image_url && p.image_url.trim() !== '' ? p.image_url : 'Images/My Product.png';
        
        return `
            <div class="product-card ${out ? 'out-of-stock' : ''}">
                <img src="${imagePath}" class="${imgClass}" onerror="this.src='Images/My Product.png'">
                <h3>${p.name}</h3>
                <div class="product-rating">${'&#9733;'.repeat(Math.round(avg))} (${avg})</div>
                <div class="product-price">Rp ${parseInt(p.price).toLocaleString('id-ID')}</div>
                <div class="product-stock">Stock: ${p.stock} units</div>
                <button class="btn-primary w-100" onclick="addToCart('${p.id}')" ${out ? 'disabled' : ''}>${out ? 'Sold Out' : 'Add to Cart'}</button>
            </div>
        `;
    }).join('');
}

window.addToCart = (id) => {
    const p = DYNAMIC_PRODUCTS.find(prod => prod.id === id);
    if (!p) return;
    if ((cart[id] || 0) >= p.stock) return alert("Out of stock!");
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
    const chk = document.getElementById('checkout');
    if (chk) chk.scrollIntoView({ behavior: 'smooth' });
};

window.updateQty = (id, delta) => {
    const p = DYNAMIC_PRODUCTS.find(prod => prod.id === id);
    if (!p) return;
    const next = (cart[id] || 0) + delta;
    if (next > p.stock) return alert("Stock limit!");
    cart[id] = next;
    if (cart[id] <= 0) delete cart[id];
    renderCart();
};

function renderCart() {
    localStorage.setItem('coffee_cart', JSON.stringify(cart));
    const cont = document.getElementById('cart-items');
    if (!cont) return;
    let sub = 0;
    const ids = Object.keys(cart);
    if (ids.length === 0) { cont.innerHTML = '<p>Your cart is empty.</p>'; }
    else {
        cont.innerHTML = ids.map(id => {
            const p = DYNAMIC_PRODUCTS.find(prod => prod.id === id);
            if (!p) return '';
            sub += p.price * cart[id];
            return `<div class="cart-item"><div><h4>${p.name}</h4><span>Rp ${parseInt(p.price).toLocaleString('id-ID')} x ${cart[id]}</span></div><div class="quantity-controls"><button class="btn-qty" onclick="updateQty('${id}',-1)">-</button><span>${cart[id]}</span><button class="btn-qty" onclick="updateQty('${id}',1)">+</button></div></div>`;
        }).join('');
    }
    const sEl = document.getElementById('subtotal');
    if (sEl) sEl.innerText = `Rp ${sub.toLocaleString('id-ID')}`;
    const total = sub > 0 ? sub + currentShippingFee : 0;
    const gEl = document.getElementById('grand-total');
    if (gEl) gEl.innerText = `Rp ${total.toLocaleString('id-ID')}`;
    
    const pgEl = document.getElementById('payment-grand-total');
    if (pgEl) pgEl.innerText = `Rp ${total.toLocaleString('id-ID')}`;
}

window.addToCartCheckout = (id) => {
    const p = DYNAMIC_PRODUCTS.find(prod => prod.id === id);
    if (!p) return;
    if ((cart[id] || 0) >= p.stock) return alert("Stok produk habis!");
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
};

function renderCheckoutProductsList() {
    const grid = document.getElementById('checkout-products-list');
    if (!grid) return;
    
    const products = DYNAMIC_PRODUCTS;
    if (products.length === 0) {
        grid.innerHTML = '<p style="font-size: 0.8rem; color: #999;">Memuat produk...</p>';
        return;
    }
    
    grid.innerHTML = products.map(p => {
        let imgClass = 'img-sachet';
        if (p.name.includes('BOX')) imgClass = 'img-box';
        if (p.name.includes('POUCH')) imgClass = 'img-pouch';
        
        const imagePath = p.image_url && p.image_url.trim() !== '' ? p.image_url : 'Images/My Product.png';
        
        return `
            <div style="background: #faf7f5; border: 1px solid var(--border-light); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; gap: 8px; transition: transform 0.2s;"
                 onmouseover="this.style.transform='translateY(-2px)'"
                 onmouseout="this.style.transform='none'">
                <img src="${imagePath}" style="width: 45px; height: 45px; object-fit: contain;" onerror="this.src='Images/My Product.png'">
                <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">
                    <h5 style="margin: 0; font-family: 'Montserrat', sans-serif; font-size: 0.75rem; color: var(--coffee-dark); line-height: 1.2;">${p.name}</h5>
                    <span style="font-size: 0.72rem; color: var(--wood-warm); font-weight: 600; margin-top: 3px;">Rp ${parseInt(p.price).toLocaleString('id-ID')}</span>
                </div>
                <button type="button" class="btn-qty" onclick="addToCartCheckout('${p.id}')"
                        style="width: 100%; padding: 6px; border: none; background: var(--wood-warm); color: white; border-radius: 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: background 0.2s;"
                        onmouseover="this.style.backgroundColor='var(--coffee-dark)'"
                        onmouseout="this.style.backgroundColor='var(--wood-warm)'">
                    ➕ Tambah
                </button>
            </div>
        `;
    }).join('');
}


window.handleShippingUpdate = () => {
    const citySelect = document.getElementById('shipping-city');
    const serviceSelect = document.getElementById('delivery-service');
    if (!citySelect || !serviceSelect) return;
    
    const city = citySelect.value;
    const serv = serviceSelect.value;
    
    currentShippingFee = (city && SHIPPING_FEES[city]) ? SHIPPING_FEES[city][serv] : 0;
    const feeEl = document.getElementById('shipping-fee');
    if (feeEl) feeEl.innerText = `Rp ${currentShippingFee.toLocaleString('id-ID')}`;
    
    saveFormData();
    renderCart();
};

window.handleProceedToPayment = () => {
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;
    const email = document.getElementById('customer-email').value;
    const city = document.getElementById('shipping-city').value;
    const address = document.getElementById('customer-address').value;

    if (!name || !phone || !email || !city || !address || Object.keys(cart).length === 0) {
        return alert("Please fill in all required delivery details and add items to your cart!");
    }

    const payArea = document.getElementById('payment-area');
    if (payArea) {
        payArea.classList.remove('hidden');
        document.getElementById('btn-checkout').classList.add('hidden');
        const total = document.getElementById('grand-total').innerText;
        document.getElementById('payment-grand-total').innerText = total;
        
        // Initialize payment display
        window.updatePaymentDisplay();
        
        payArea.scrollIntoView({ behavior: 'smooth' });
    }
};

window.updatePaymentDisplay = () => {
    const methodEl = document.getElementById('payment-method');
    if (!methodEl) return;
    const method = methodEl.value;
    const qrContainer = document.getElementById('qrcode');
    const instruction = document.querySelector('.payment-instruction');
    
    if (!qrContainer || !instruction) return;

    if (method === 'gopay' || method === 'qris') {
        qrContainer.innerHTML = `<img src="Images/QR Merchant Gojek.jpeg" style="width: 250px; border-radius: 12px; box-shadow: var(--shadow-medium);">`;
        instruction.innerText = "Scan the QR code above with your Gojek / GoPay / Any QRIS app.";
    } else if (method === 'transfer') {
        qrContainer.innerHTML = `<div style="padding: 40px; background: #eee; border-radius: 12px; font-weight: 700; color: #666;">🏦 BANK TRANSFER<br><br><span style="font-size: 0.9rem; font-weight: 400;">Coming Soon! Please use QRIS for now.</span></div>`;
        instruction.innerText = "Direct Bank Transfer is currently under maintenance.";
    }
};

window.handlePlaceOrder = async () => {
    const btn = document.getElementById('btn-place-order');
    const receiptFile = document.getElementById('payment-receipt').files[0];
    if (!receiptFile) return alert("Upload proof first!");
    if (!supabaseClient) return alert("Database service not available.");

    btn.disabled = true;
    btn.innerText = "Processing Order...";

    try {
        const formData = new FormData();
        formData.append('file', receiptFile);
        formData.append('upload_preset', 'unsigned_123'); 
        const cloudResponse = await fetch(`https://api.cloudinary.com/v1_1/dzwv7azwx/image/upload`, { method: 'POST', body: formData });
        if (!cloudResponse.ok) throw new Error("Cloudinary upload failed");
        const cloudData = await cloudResponse.json();
        const receiptUrl = cloudData.secure_url; 
        
        const orderId = 'ORD-'+Date.now();
        const customerName = document.getElementById('customer-name').value;
        const customerPhone = document.getElementById('customer-phone').value;
        const customerEmail = document.getElementById('customer-email').value;
        const location = `${document.getElementById('shipping-city').value}, ${document.getElementById('customer-address').value}`;
        
        // Detailed Items List
        const itemsList = Object.keys(cart).map(id => {
            const prod = DYNAMIC_PRODUCTS.find(p => p.id === id);
            const priceStr = prod ? `Rp ${parseInt(prod.price).toLocaleString('id-ID')}` : 'Rp 0';
            return prod ? `${prod.name} (x${cart[id]}) [${priceStr}]` : `Unknown Item (x${cart[id]})`;
        }).join(', ');

        const subtotalStr = document.getElementById('subtotal').innerText;
        const shippingStr = document.getElementById('shipping-fee').innerText;
        const total = document.getElementById('grand-total').innerText;
        
        // Get full text for courier (e.g. Regular (J&T / JNE))
        const courierEl = document.getElementById('delivery-service');
        const delivery = courierEl.options[courierEl.selectedIndex].text;
        
        const note = document.getElementById('order-note').value;
        const method = document.getElementById('payment-method').value.toUpperCase();

        // --- CONSTRUCT BEAUTIFUL HTML TABLE FOR EMAILS ---
        let itemsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 14px; color: #333333;">
            <thead>
                <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6; text-align: left;">
                    <th style="padding: 12px 10px; font-weight: 600; color: #495057;">Produk</th>
                    <th style="padding: 12px 10px; font-weight: 600; color: #495057; text-align: center;">Jumlah</th>
                    <th style="padding: 12px 10px; font-weight: 600; color: #495057; text-align: right;">Harga</th>
                    <th style="padding: 12px 10px; font-weight: 600; color: #495057; text-align: right;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
        `;

        Object.keys(cart).forEach(id => {
            const prod = DYNAMIC_PRODUCTS.find(p => p.id === id);
            if (prod) {
                const price = parseInt(prod.price);
                const qty = cart[id];
                const itemSubtotal = price * qty;
                itemsHtml += `
                <tr style="border-bottom: 1px solid #eaeaea;">
                    <td style="padding: 12px 10px; color: #212529; font-weight: 500;">${prod.name}</td>
                    <td style="padding: 12px 10px; text-align: center; color: #495057;">${qty}</td>
                    <td style="padding: 12px 10px; text-align: right; color: #495057;">Rp ${price.toLocaleString('id-ID')}</td>
                    <td style="padding: 12px 10px; text-align: right; color: #212529; font-weight: 600;">Rp ${itemSubtotal.toLocaleString('id-ID')}</td>
                </tr>
                `;
            }
        });

        itemsHtml += `
            </tbody>
            <tfoot>
                <tr style="border-top: 2px solid #dee2e6;">
                    <td colspan="3" style="padding: 12px 10px 4px 10px; text-align: right; color: #6c757d; font-size: 13px;">Subtotal:</td>
                    <td style="padding: 12px 10px 4px 10px; text-align: right; color: #495057; font-size: 13px; font-weight: 500;">${subtotalStr}</td>
                </tr>
                <tr>
                    <td colspan="3" style="padding: 4px 10px 4px 10px; text-align: right; color: #6c757d; font-size: 13px;">Biaya Pengiriman:</td>
                    <td style="padding: 4px 10px 4px 10px; text-align: right; color: #495057; font-size: 13px; font-weight: 500;">${shippingStr}</td>
                </tr>
                <tr style="font-size: 16px; font-weight: bold;">
                    <td colspan="3" style="padding: 8px 10px 12px 10px; text-align: right; color: #212529;">Total Pembayaran:</td>
                    <td style="padding: 8px 10px 12px 10px; text-align: right; color: #198754;">${total}</td>
                </tr>
            </tfoot>
        </table>
        `;

        // --- NOTIFIKASI EMAIL (VIA EMAILJS) ---
        if (typeof emailjs !== 'undefined') {
            const templateParams = {
                order_id: orderId,
                name: customerName, // Sesuai baris pertama template
                from_name: customerName,
                time: new Date().toLocaleString('id-ID'), // Menambahkan waktu pesanan
                phone: customerPhone, // Sesuai {{phone}} di template
                customer_email: customerEmail,
                shipping_address: location, // Sesuai {{shipping_address}} di template
                order_items: itemsList,
                order_items_table: itemsHtml, // Tabel HTML baru
                total_amount: total,
                delivery_method: delivery,
                customer_note: note,
                receipt_image: receiptUrl 
            };

            // 1. Kirim email bukti pemesanan ke Penjual/Admin
            try {
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ADMIN_TEMPLATE_ID, templateParams);
                console.log("Email notifikasi untuk admin berhasil dikirim!");
            } catch (e) { 
                console.warn("Gagal mengirim email admin:", e); 
            }

            // 2. Kirim email bukti pemesanan ke Pembeli/Customer
            // Catatan: Pastikan Anda telah membuat template kedua untuk pembeli di dashboard EmailJS Anda.
            // Di template pembeli tersebut, kolom "To Email" harus diisi dengan {{customer_email}} agar email terkirim ke pembeli.
            try {
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_BUYER_TEMPLATE_ID, templateParams);
                console.log("Email notifikasi untuk pembeli berhasil dikirim!");
            } catch (e) { 
                console.warn("Gagal mengirim email pembeli:", e); 
            }
        }

        const { error: sbError } = await supabaseClient.from('orders').insert([{
            order_id: orderId, 
            customer_name: customerName, 
            customer_phone: customerPhone, 
            customer_email: customerEmail,
            address: location, 
            items: itemsList, 
            total_amount: total, 
            subtotal: subtotalStr,
            shipping_fee: shippingStr,
            receipt_url: receiptUrl, 
            status: 'PENDING',
            delivery_method: delivery,
            note: note,
            payment_method: method
        }]);
        if (sbError) throw sbError;

        // --- AUTOMATIC STOCK REDUCTION ---
        for (const productId in cart) {
            const qtyOrdered = cart[productId];
            const product = DYNAMIC_PRODUCTS.find(p => p.id === productId);
            if (product) {
                const newStock = Math.max(0, product.stock - qtyOrdered);
                await supabaseClient.from('products').update({ stock: newStock }).eq('id', productId);
            }
        }

        // --- SAVE PROFILE & ORDER ID FOR AUTOFILL & RECENT ORDERS ---
        const customerProfile = {
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
            city: document.getElementById('shipping-city').value,
            address: document.getElementById('customer-address').value
        };
        localStorage.setItem('customer_profile', JSON.stringify(customerProfile));

        let recentOrders = JSON.parse(localStorage.getItem('recent_orders') || '[]');
        if (!recentOrders.includes(orderId)) {
            recentOrders.unshift(orderId);
            if (recentOrders.length > 5) recentOrders.pop();
            localStorage.setItem('recent_orders', JSON.stringify(recentOrders));
        }

        // SUCCESS: Clear everything
        cart = {}; 
        localStorage.removeItem('coffee_cart');
        clearFormData(); 
        renderCart(); 
        
        alert(`Order Submitted Successfully!\n\nYour Order ID: ${orderId}\n\nPlease save this ID to track your order on the 'Track' page.`);
        window.location.href = 'track.html?id=' + orderId;

    } catch (error) {
        console.error(error);
        alert("Order submission failed: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit Payment & Order";
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

window.submitDirectReview = async () => {
    const name = document.getElementById('direct-review-name').value || 'Anonymous';
    const text = document.getElementById('direct-review-text').value;
    if (directSelectedRating === 0) return alert("Rating required!");
    if (!supabaseClient) return alert("Database unavailable");

    try {
        const { error } = await supabaseClient.from('feedback').insert([{
            customer_name: name,
            rating: directSelectedRating,
            message: text
        }]);
        if (error) throw error;

        document.getElementById('direct-review-name').value = '';
        document.getElementById('direct-review-text').value = '';
        directSelectedRating = 0;
        document.querySelectorAll('.star-d').forEach(s => s.classList.remove('active'));
        alert("Thanks! Your feedback is waiting for admin approval.");
        renderTestimonials(); 
    } catch (err) {
        alert("Submission failed");
    }
};

async function renderTestimonials() {
    const cont = document.getElementById('testimonials-grid');
    if (!cont || !supabaseClient) return;

    const { data, error } = await supabaseClient
        .from('feedback')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

    if (error) return;

    cont.innerHTML = data.length ? data.map(r => `
        <div class="testimonial-card">
            <div style="color:#f1c40f">${'&#9733;'.repeat(r.rating)}</div>
            <p class="testimonial-text">"${r.message}"</p>
            <strong>${r.customer_name}</strong>
        </div>
    `).join('') : '<p>No reviews yet.</p>';
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

async function renderStandAnnouncement() {
    const banner = document.getElementById('stand-announcement');
    if (!banner || !supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from('events')
            .select('*')
            .eq('is_active', true)
            .maybeSingle();
        
        if (error) {
            console.error("Error fetching stand announcement:", error);
            banner.classList.add('hidden');
            return;
        }

        if (data) {
            banner.classList.remove('hidden');
            document.getElementById('announce-text').innerHTML = `We're at <strong>${data.location}</strong> today! Come visit our stand.`;
        } else {
            banner.classList.add('hidden');
        }
    } catch (e) {
        console.error("Failed to fetch stand announcement (network block):", e);
        banner.classList.add('hidden');
    }
}

/** 3. ADMIN & INVENTORY (Legacy Support) */
window.loginAdmin = () => { window.location.href = 'admin.html'; };

async function getCoffeeNews() {
    try {
        const r = await fetch(`https://newsapi.org/v2/everything?q=coffee&pageSize=20&apiKey=${API_KEY}`);
        const d = await r.json();
        const articles = d.articles && d.articles.length ? d.articles : MOCK_COFFEE_NEWS;
        const day = new Date().getDate();
        const itemsToDisplay = 3;
        const startIndex = (day * itemsToDisplay) % (articles.length <= itemsToDisplay ? 1 : articles.length - itemsToDisplay + 1);
        displayNews(articles.slice(startIndex, startIndex + itemsToDisplay));
    } catch { 
        displayNews(MOCK_COFFEE_NEWS.slice(0, 3)); 
    }
}

function displayNews(articles) {
    const g = document.getElementById('news-grid');
    if (!g) return;
    g.innerHTML = articles.map(a => `<article class="news-card"><img src="${a.urlToImage || ''}" class="news-image"><div class="news-body"><h3>${a.title}</h3><p class="news-desc">${a.description || ''}</p><a href="${a.url}" target="_blank">Read More &rarr;</a></div></article>`).join('');
}

async function renderFeaturedProducts() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    const products = await fetchProducts();
    const featured = products.slice(0, 3);
    grid.innerHTML = featured.map(p => {
        let imgClass = 'img-sachet';
        if (p.name.includes('BOX')) imgClass = 'img-box';
        if (p.name.includes('POUCH')) imgClass = 'img-pouch';
        
        const imagePath = p.image_url && p.image_url.trim() !== '' ? p.image_url : 'Images/My Product.png';

        return `
            <div class="product-card">
                <img src="${imagePath}" class="${imgClass}" onerror="this.src='Images/My Product.png'">
                <h3>${p.name}</h3>
                <div class="product-price">Rp ${parseInt(p.price).toLocaleString('id-ID')}</div>
                <a href="products.html" class="btn-primary w-100">Shop Now</a>
            </div>
        `;
    }).join('');
}

let leafletMap = null;
let leafletMarker = null;
let tempCoordinate = null;
let modalOpenTime = 0; // Menghindari ketukan ganda / click-through di mobile

function matchShippingCity(detectedCityOrState, currentSelection) {
    const text = (detectedCityOrState || '').toLowerCase();
    
    // 1. Jabodetabek (Jakarta, Bogor, Depok, Tangerang, Bekasi) dipetakan ke Jakarta
    if (text.includes('jakarta') || 
        text.includes('bekasi') || 
        text.includes('tangerang') || 
        text.includes('depok') || 
        text.includes('bogor')) {
        return 'jakarta';
    }
    
    // 2. Kota-kota utama lainnya
    if (text.includes('bandung')) return 'bandung';
    if (text.includes('surabaya')) return 'surabaya';
    if (text.includes('medan')) return 'medan';
    if (text.includes('bali') || text.includes('denpasar') || text.includes('badung')) return 'bali';
    
    // 3. Jika di luar kota utama tapi user sudah memilih kota secara manual yang valid, pertahankan pilihan tersebut!
    if (currentSelection && ['jakarta', 'bandung', 'surabaya', 'medan', 'bali'].includes(currentSelection)) {
        return currentSelection;
    }
    
    return '';
}

function initLeafletMap(lat, lon, accuracy) {
    tempCoordinate = { lat, lon, accuracy };
    
    // Perbaikan path marker icon Leaflet
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
    
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

    if (!leafletMap) {
        // Inisialisasi peta Leaflet yang berpusat pada koordinat (hanya sekali)
        // Menonaktifkan animasi zoom, keyboard focus, dan fade untuk mereduksi flickering saat inisialisasi di dalam modal flexbox
        leafletMap = L.map('map-container', {
            zoomAnimation: false,
            fadeAnimation: false,
            keyboard: false
        }).setView([lat, lon], 17);
        
        // Tambahkan layer tile OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(leafletMap);
        
        // Tambahkan marker/pin merah yang bisa digeser (draggable)
        leafletMarker = L.marker([lat, lon], {
            draggable: true
        }).addTo(leafletMap);
        
        // Update koordinat sementara saat pin digeser oleh pengguna
        leafletMarker.on('dragend', function (event) {
            const marker = event.target;
            const position = marker.getLatLng();
            tempCoordinate = {
                lat: position.lat,
                lon: position.lng,
                accuracy: 0
            };
        });
        
        // Update marker saat area peta diklik
        leafletMap.on('click', function (event) {
            const latlng = event.latlng;
            leafletMarker.setLatLng(latlng);
            tempCoordinate = {
                lat: latlng.lat,
                lon: latlng.lng,
                accuracy: 0
            };
        });
    } else {
        // Jika peta sudah pernah dibuat, cukup ubah posisi tengah peta & pin secara instan (menghindari flickering buat ulang DOM)
        leafletMap.setView([lat, lon], 17);
        leafletMarker.setLatLng([lat, lon]);
    }

    // Perbaiki rendering tiles Leaflet saat ukuran kontainer modal berubah
    setTimeout(() => {
        if (leafletMap) {
            leafletMap.invalidateSize();
        }
    }, 200);
}

// Pasang event listener untuk tombol-tombol modal peta
document.addEventListener('DOMContentLoaded', () => {
    const btnCancel = document.getElementById('btn-cancel-map');
    const btnClose = document.getElementById('btn-close-map');
    const btnConfirm = document.getElementById('btn-confirm-map');
    const modal = document.getElementById('map-modal');
    const searchInput = document.getElementById('map-search-input');
    const btnSearch = document.getElementById('btn-map-search');
    const searchResults = document.getElementById('map-search-results');
    const detailInput = document.getElementById('map-detail-input');
    
    // Cek apakah klik terjadi terlalu cepat setelah modal terbuka (mencegah click-through / ketukan tembus)
    const isClickThrough = () => {
        return (Date.now() - modalOpenTime) < 400;
    };
    
    const resetSearchState = () => {
        if (searchInput) searchInput.value = '';
        if (detailInput) detailInput.value = '';
        if (searchResults) {
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
        }
    };
    
    if (btnCancel) {
        btnCancel.onclick = () => {
            if (isClickThrough()) return;
            if (modal) modal.style.display = 'none';
            resetSearchState();
        };
    }
    if (btnClose) {
        btnClose.onclick = () => {
            if (isClickThrough()) return;
            if (modal) modal.style.display = 'none';
            resetSearchState();
        };
    }

    // -------------------------------------------------------------
    // LOGIKA PENCARIAN LOKASI (SEARCH BAR ALA GOJEK)
    // -------------------------------------------------------------
    if (btnSearch && searchInput && searchResults) {
        const performSearch = async (isAutocomplete = false) => {
            const query = searchInput.value.trim();
            if (!query) {
                searchResults.style.display = 'none';
                searchResults.innerHTML = '';
                return;
            }

            // Auto-extract and populate details if user types Blok/No/RT/RW
            const extractSpecificDetails = (text) => {
                if (!text) return '';
                const parts = [];
                const blokMatch = text.match(/blok\s*[a-z0-9\-]+/i);
                if (blokMatch) parts.push(blokMatch[0]);
                const noMatch = text.match(/no\.?\s*[0-9]+/i);
                if (noMatch) parts.push(noMatch[0]);
                const rtrwMatch = text.match(/rt\s*\d+\s*(\/?\s*rw\s*\d+)?/i);
                if (rtrwMatch) parts.push(rtrwMatch[0]);
                return parts.map(p => p.trim()).join(', ');
            };

            const extracted = extractSpecificDetails(query);
            if (extracted && detailInput && !detailInput.value) {
                detailInput.value = extracted;
            }

            if (!isAutocomplete) {
                btnSearch.disabled = true;
                btnSearch.innerHTML = '⏳...';
            } else {
                searchResults.innerHTML = `
                    <div style="padding: 10px 12px; font-size: 0.8rem; color: #999; display: flex; align-items: center; gap: 8px;">
                        <div style="width: 14px; height: 14px; border: 2px solid #ccc; border-top-color: var(--wood-warm); border-radius: 50%; animation: spin-mini 0.8s linear infinite;"></div>
                        Mencari lokasi...
                    </div>
                `;
                searchResults.style.display = 'block';
            }

            try {
                // Fetch search query using OpenStreetMap Nominatim Search API
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=id&limit=5`;
                const response = await fetch(url);
                if (!response.ok) throw new Error("Gagal mencari lokasi.");
                let data = await response.json();

                // Fallback 1: Bersihkan detail spesifik nomor rumah, blok, RT/RW
                if ((!data || data.length === 0) && query.length > 3) {
                    let cleanedQuery = query
                        .replace(/blok\s*[a-z0-9\-]+/gi, '')
                        .replace(/no\.?\s*[0-9]+/gi, '')
                        .replace(/rt\s*\d+\s*(\/?\s*rw\s*\d+)?/gi, '')
                        .replace(/rw\s*\d+/gi, '')
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (cleanedQuery !== query && cleanedQuery.length > 3) {
                        const fallbackResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanedQuery)}&accept-language=id&limit=5`);
                        if (fallbackResponse.ok) {
                            const fallbackData = await fallbackResponse.json();
                            if (fallbackData && fallbackData.length > 0) {
                                data = fallbackData;
                            }
                        }
                    }
                }

                // Fallback 2: Penyesuaian istilah sekolah/instansi (misal SD Islam -> SDI)
                if ((!data || data.length === 0) && query.length > 3) {
                    // Gunakan query yang mungkin sudah dibersihkan oleh Fallback 1
                    let cleanedQuery = query
                        .replace(/blok\s*[a-z0-9\-]+/gi, '')
                        .replace(/no\.?\s*[0-9]+/gi, '')
                        .replace(/rt\s*\d+\s*(\/?\s*rw\s*\d+)?/gi, '')
                        .replace(/rw\s*\d+/gi, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    let fallbackQuery = cleanedQuery;
                    const qLower = cleanedQuery.toLowerCase();
                    
                    if (qLower.includes('sd islam')) {
                        fallbackQuery = cleanedQuery.replace(/sd islam/gi, 'SDI');
                    } else if (qLower.includes('smp islam')) {
                        fallbackQuery = cleanedQuery.replace(/smp islam/gi, 'SMPI');
                    } else if (qLower.includes('sma islam')) {
                        fallbackQuery = cleanedQuery.replace(/sma islam/gi, 'SMAI');
                    } else if (qLower.includes('sd negeri')) {
                        fallbackQuery = cleanedQuery.replace(/sd negeri/gi, 'SDN');
                    } else if (qLower.includes('smp negeri')) {
                        fallbackQuery = cleanedQuery.replace(/smp negeri/gi, 'SMPN');
                    } else if (qLower.includes('sma negeri')) {
                        fallbackQuery = cleanedQuery.replace(/sma negeri/gi, 'SMAN');
                    } else if (qLower.includes('sd ') && !qLower.includes('sdi ')) {
                        fallbackQuery = cleanedQuery.replace(/sd\s+/gi, 'SDI ');
                    }
                    
                    if (fallbackQuery !== cleanedQuery) {
                        const fallbackResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}&accept-language=id&limit=5`);
                        if (fallbackResponse.ok) {
                            const fallbackData = await fallbackResponse.json();
                            if (fallbackData && fallbackData.length > 0) {
                                data = fallbackData;
                            }
                        }
                    }
                }

                if (data && data.length > 0) {
                    searchResults.innerHTML = data.map(item => {
                        const displayName = item.display_name;
                        const mainName = displayName.split(',')[0];
                        const detailsName = displayName.split(',').slice(1).join(',').trim();
                        const escapedDisplayName = displayName.replace(/"/g, '&quot;');
                        return `
                            <div class="search-result-item" data-lat="${item.lat}" data-lon="${item.lon}" data-display-name="${escapedDisplayName}"
                                 style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; font-size: 0.8rem; transition: background 0.2s;"
                                 onmouseover="this.style.backgroundColor='#f7f7f7'"
                                 onmouseout="this.style.backgroundColor='white'">
                                📍 <strong>${mainName}</strong><br>
                                <span style="color: #666; font-size: 0.75rem;">${detailsName}</span>
                            </div>
                        `;
                    }).join('');

                    searchResults.style.display = 'block';

                    // Attach click handler to each item
                    searchResults.querySelectorAll('.search-result-item').forEach(item => {
                        item.onclick = () => {
                            const lat = parseFloat(item.getAttribute('data-lat'));
                            const lon = parseFloat(item.getAttribute('data-lon'));
                            const displayName = item.getAttribute('data-display-name');
                            
                            // Pindahkan peta ke lokasi pencarian
                            if (leafletMap) {
                                leafletMap.setView([lat, lon], 17);
                                leafletMarker.setLatLng([lat, lon]);
                                tempCoordinate = { lat, lon, accuracy: 0 };
                            }
                            
                            // Update input text with the full detailed display name (not shortened)
                            searchInput.value = displayName;
                            searchResults.style.display = 'none';
                        };
                    });
                } else {
                    searchResults.innerHTML = `
                        <div style="padding: 12px; font-size: 0.8rem; color: #666; line-height: 1.4;">
                            ⚠️ Lokasi tidak ditemukan.<br>
                            <span style="font-size: 0.72rem; color: #999;">💡 <strong>Tip Pencarian:</strong> Persingkat kata kunci Anda. Coba ketik <em>"Al-Azhar Summarecon"</em> atau <em>"Summarecon Bekasi"</em> saja daripada alamat lengkap spesifik.</span>
                        </div>
                    `;
                    searchResults.style.display = 'block';
                }
            } catch (error) {
                console.error(error);
                searchResults.innerHTML = `<div style="padding: 10px 12px; font-size: 0.8rem; color: #d9381e;">Gagal mencari lokasi. Periksa koneksi internet Anda.</div>`;
                searchResults.style.display = 'block';
            } finally {
                if (!isAutocomplete) {
                    btnSearch.disabled = false;
                    btnSearch.innerHTML = '🔍 Cari';
                }
            }
        };

        btnSearch.onclick = () => performSearch(false);
        searchInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(false);
            }
        };

        // Real-time Autocomplete Suggestions (Debounced)
        let debounceTimer;
        searchInput.oninput = () => {
            clearTimeout(debounceTimer);
            const query = searchInput.value.trim();
            if (query.length < 3) {
                searchResults.style.display = 'none';
                searchResults.innerHTML = '';
                return;
            }
            debounceTimer = setTimeout(() => {
                performSearch(true);
            }, 600); // Tunggu 600ms setelah mengetik selesai sebelum memanggil API
        };

        // Tutup hasil pencarian jika klik di luar daerah hasil pencarian
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target) && !btnSearch.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }
    
    if (btnConfirm) {
        btnConfirm.onclick = async () => {
            if (isClickThrough()) return;
            if (!tempCoordinate) return;
            const { lat, lon, accuracy } = tempCoordinate;
            
            // Baca detail sebelum mereset search state
            const detailsValue = detailInput ? detailInput.value.trim() : '';
            
            // Tutup modal peta
            if (modal) modal.style.display = 'none';
            resetSearchState();
            
            const btn = document.getElementById('btn-open-map');
            const addressArea = document.getElementById('customer-address');
            const helperText = document.getElementById('address-helper-text');
            
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '🔍 Mengambil Alamat...';
            }
            
            try {
                // Lakukan reverse geocoding berdasarkan pin koordinat terakhir
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&accept-language=id`);
                if (!response.ok) throw new Error("Gagal mengambil data alamat.");
                const data = await response.json();
                
                if (data && data.address) {
                    const addr = data.address;
                    
                    // Cari nama tempat / gedung / perumahan yang bukan administratif
                    const nonPoiKeys = new Set([
                        'house_number', 'road', 'street', 'suburb', 'village', 'neighbourhood', 'hamlet', 
                        'city_district', 'subdistrict', 'district', 'city', 'town', 'municipality', 'county', 
                        'state_district', 'state', 'province', 'postcode', 'country', 'country_code', 'continent'
                    ]);
                    let poiName = '';
                    for (const key in addr) {
                        if (!nonPoiKeys.has(key) && addr[key] !== 'yes' && addr[key] !== 'no') {
                            poiName = addr[key];
                            break;
                        }
                    }

                    const houseNumber = addr.house_number || '';
                    const road = addr.road || addr.street || '';
                    const neighbourhood = addr.neighbourhood || '';
                    const suburb = addr.suburb || '';
                    const village = addr.village || addr.hamlet || '';
                    const subdistrict = addr.city_district || addr.subdistrict || addr.district || '';
                    const city = addr.city || addr.town || addr.municipality || addr.county || '';
                    const state = addr.state || addr.province || '';
                    const postcode = addr.postcode || '';

                    const adminParts = [];

                    // 1. Jalan & Nomor Rumah
                    let roadStr = road;
                    if (roadStr && houseNumber) {
                        roadStr += ` No. ${houseNumber}`;
                    }
                    if (roadStr) {
                        adminParts.push(roadStr);
                    }

                    // Helper untuk menambahkan bagian alamat tanpa duplikasi nama
                    function addPart(val, prefix = '') {
                        if (!val) return;
                        const cleanVal = val.trim();
                        if (!cleanVal) return;
                        
                        const isDup = adminParts.some(p => {
                            const cleanP = p.toLowerCase()
                                .replace(/^(kel\.|des\.|kec\.|kota\/kab\.|kota|kabupaten|provinsi)\s+/g, '')
                                .trim();
                            return cleanP === cleanVal.toLowerCase();
                        });
                        
                        const isPoiDup = poiName ? (cleanVal.toLowerCase() === poiName.toLowerCase()) : false;
                        if (!isDup && !isPoiDup) {
                            adminParts.push(prefix ? `${prefix} ${cleanVal}` : cleanVal);
                        }
                    }

                    addPart(neighbourhood);

                    let suburbPrefix = '';
                    if (suburb) {
                        const sLower = suburb.toLowerCase();
                        if (!sLower.startsWith('kel') && !sLower.startsWith('des')) {
                            suburbPrefix = 'Kel.';
                        }
                    }
                    addPart(suburb, suburbPrefix);

                    let villagePrefix = '';
                    if (village) {
                        const vLower = village.toLowerCase();
                        if (!vLower.startsWith('kel') && !vLower.startsWith('des')) {
                            villagePrefix = 'Kel./Desa';
                        }
                    }
                    addPart(village, villagePrefix);

                    let subdistrictPrefix = '';
                    if (subdistrict) {
                        const sLower = subdistrict.toLowerCase();
                        if (!sLower.startsWith('kec')) {
                            subdistrictPrefix = 'Kec.';
                        }
                    }
                    addPart(subdistrict, subdistrictPrefix);

                    let cityPrefix = '';
                    if (city) {
                        const cLower = city.toLowerCase();
                        if (!cLower.startsWith('kota') && !cLower.startsWith('kab')) {
                            cityPrefix = 'Kota/Kab.';
                        }
                    }
                    addPart(city, cityPrefix);

                    addPart(state);

                    let formattedAddress = '';
                    if (poiName) {
                        formattedAddress += poiName + ' - ';
                    }
                    formattedAddress += adminParts.join(', ');
                    
                    if (postcode) {
                        formattedAddress += ' ' + postcode;
                    }
                    
                    if (!formattedAddress || formattedAddress.trim() === '-' || formattedAddress.trim() === '') {
                        formattedAddress = data.display_name;
                    }
                    
                    if (addressArea) {
                        let finalAddress = formattedAddress;
                        if (detailsValue) {
                            finalAddress = detailsValue + ', ' + formattedAddress;
                        }
                        addressArea.value = finalAddress;
                        
                        if (helperText) {
                            if (accuracy > 100) {
                                helperText.innerHTML = `Catatan: Silakan lengkapi/ubah alamat ini dengan nomor rumah/blok Anda yang tepat. <span style="color:#d9381e;">(Terdeteksi sebagai lokasi perkiraan - Akurasi: ~${Math.round(accuracy)}m)</span>`;
                            } else {
                                helperText.innerHTML = "Catatan: Lokasi dari peta berhasil dipilih! Silakan tambahkan nomor rumah/blok/RT/RW jika belum lengkap.";
                            }
                        }
                        addressArea.dispatchEvent(new Event('input'));
                    }
                    
                    // Coba cocokkan kota untuk otomatisasi ongkir
                    const citySelect = document.getElementById('shipping-city');
                    const currentSelection = citySelect ? citySelect.value : '';
                    const cityLower = (city || addr.state || '').toLowerCase();
                    const matchedCity = matchShippingCity(cityLower, currentSelection);
                    
                    if (citySelect) {
                        if (matchedCity) {
                            citySelect.value = matchedCity;
                            citySelect.classList.add('touched');
                        } else {
                            alert("Lokasi Anda terdeteksi di luar area pengiriman utama kami (Jakarta, Bandung, Surabaya, Medan, Bali). Silakan pilih kota pengiriman terdekat secara manual.");
                        }
                        citySelect.dispatchEvent(new Event('change'));
                    }
                } else {
                    alert("Alamat tidak ditemukan untuk koordinat ini.");
                }
            } catch (error) {
                console.error(error);
                alert("Gagal melakukan pencarian alamat. Silakan ketik alamat Anda secara manual.");
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '🗺️ Pilih di Peta';
                }
            }
        };
    }
});

// TOMBOL 1: Langsung Autofill Lokasi Terkini Tanpa Peta (Instan)
window.detectUserLocationDirect = () => {
    const btn = document.getElementById('btn-detect-location');
    const addressArea = document.getElementById('customer-address');
    const helperText = document.getElementById('address-helper-text');
    
    if (!navigator.geolocation) {
        alert("Fitur Geolokasi tidak didukung oleh browser Anda.");
        return;
    }
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '🔍 Mendeteksi...';
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&accept-language=id`);
            if (!response.ok) throw new Error("Gagal mengambil data alamat.");
            const data = await response.json();
            
            if (data && data.address) {
                const addr = data.address;
                
                // Cari nama tempat / gedung / perumahan yang bukan administratif
                const nonPoiKeys = new Set([
                    'house_number', 'road', 'street', 'suburb', 'village', 'neighbourhood', 'hamlet', 
                    'city_district', 'subdistrict', 'district', 'city', 'town', 'municipality', 'county', 
                    'state_district', 'state', 'province', 'postcode', 'country', 'country_code', 'continent'
                ]);
                let poiName = '';
                for (const key in addr) {
                    if (!nonPoiKeys.has(key) && addr[key] !== 'yes' && addr[key] !== 'no') {
                        poiName = addr[key];
                        break;
                    }
                }

                const houseNumber = addr.house_number || '';
                const road = addr.road || addr.street || '';
                const neighbourhood = addr.neighbourhood || '';
                const suburb = addr.suburb || '';
                const village = addr.village || addr.hamlet || '';
                const subdistrict = addr.city_district || addr.subdistrict || addr.district || '';
                const city = addr.city || addr.town || addr.municipality || addr.county || '';
                const state = addr.state || addr.province || '';
                const postcode = addr.postcode || '';

                const adminParts = [];

                // 1. Jalan & Nomor Rumah
                let roadStr = road;
                if (roadStr && houseNumber) {
                    roadStr += ` No. ${houseNumber}`;
                }
                if (roadStr) {
                    adminParts.push(roadStr);
                }

                // Helper untuk menambahkan bagian alamat tanpa duplikasi nama
                function addPart(val, prefix = '') {
                    if (!val) return;
                    const cleanVal = val.trim();
                    if (!cleanVal) return;
                    
                    const isDup = adminParts.some(p => {
                        const cleanP = p.toLowerCase()
                            .replace(/^(kel\.|des\.|kec\.|kota\/kab\.|kota|kabupaten|provinsi)\s+/g, '')
                            .trim();
                        return cleanP === cleanVal.toLowerCase();
                    });
                    
                    const isPoiDup = poiName ? (cleanVal.toLowerCase() === poiName.toLowerCase()) : false;
                    if (!isDup && !isPoiDup) {
                        adminParts.push(prefix ? `${prefix} ${cleanVal}` : cleanVal);
                    }
                }

                addPart(neighbourhood);

                let suburbPrefix = '';
                if (suburb) {
                    const sLower = suburb.toLowerCase();
                    if (!sLower.startsWith('kel') && !sLower.startsWith('des')) {
                        suburbPrefix = 'Kel.';
                    }
                }
                addPart(suburb, suburbPrefix);

                let villagePrefix = '';
                if (village) {
                    const vLower = village.toLowerCase();
                    if (!vLower.startsWith('kel') && !vLower.startsWith('des')) {
                        villagePrefix = 'Kel./Desa';
                    }
                }
                addPart(village, villagePrefix);

                let subdistrictPrefix = '';
                if (subdistrict) {
                    const sLower = subdistrict.toLowerCase();
                    if (!sLower.startsWith('kec')) {
                        subdistrictPrefix = 'Kec.';
                    }
                }
                addPart(subdistrict, subdistrictPrefix);

                let cityPrefix = '';
                if (city) {
                    const cLower = city.toLowerCase();
                    if (!cLower.startsWith('kota') && !cLower.startsWith('kab')) {
                        cityPrefix = 'Kota/Kab.';
                    }
                }
                addPart(city, cityPrefix);

                addPart(state);

                let formattedAddress = '';
                if (poiName) {
                    formattedAddress += poiName + ' - ';
                }
                formattedAddress += adminParts.join(', ');
                
                if (postcode) {
                    formattedAddress += ' ' + postcode;
                }
                
                if (!formattedAddress || formattedAddress.trim() === '-' || formattedAddress.trim() === '') {
                    formattedAddress = data.display_name;
                }
                
                if (addressArea) {
                    addressArea.value = formattedAddress;
                    
                    if (helperText) {
                        if (accuracy > 100) {
                            helperText.innerHTML = `Catatan: Silakan lengkapi/ubah alamat ini dengan nomor rumah/blok Anda yang tepat. <span style="color:#d9381e;">(Terdeteksi sebagai lokasi perkiraan - Akurasi: ~${Math.round(accuracy)}m)</span>`;
                        } else {
                            helperText.innerHTML = "Catatan: Lokasi terkini berhasil diisi! Silakan tambahkan nomor rumah/blok/RT/RW secara manual.";
                        }
                    }
                    addressArea.dispatchEvent(new Event('input'));
                }
                
                // Coba cocokkan kota untuk otomatisasi ongkir
                const citySelect = document.getElementById('shipping-city');
                const currentSelection = citySelect ? citySelect.value : '';
                const cityLower = (city || addr.state || '').toLowerCase();
                const matchedCity = matchShippingCity(cityLower, currentSelection);
                
                if (citySelect) {
                    if (matchedCity) {
                        citySelect.value = matchedCity;
                        citySelect.classList.add('touched');
                    } else {
                        alert("Lokasi Anda terdeteksi di luar area pengiriman utama kami (Jakarta, Bandung, Surabaya, Medan, Bali). Silakan pilih kota pengiriman terdekat secara manual.");
                    }
                    citySelect.dispatchEvent(new Event('change'));
                }
            } else {
                alert("Alamat tidak ditemukan untuk koordinat ini.");
            }
        } catch (error) {
            console.error(error);
            alert("Gagal mengambil alamat otomatis. Silakan ketik alamat Anda secara manual.");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }, (error) => {
        console.error(error);
        btn.disabled = false;
        btn.innerHTML = originalText;
        let msg = "Gagal mendeteksi lokasi terkini.";
        if (error.code === error.PERMISSION_DENIED) {
            msg = "Akses lokasi ditolak oleh browser/pengguna. Silakan isi alamat secara manual.";
        }
        alert(msg);
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
};

// TOMBOL 2: Buka Modal Peta Interaktif & Geser Pin
window.detectUserLocationMap = () => {
    const btn = document.getElementById('btn-open-map');
    
    if (!navigator.geolocation) {
        alert("Fitur Geolokasi tidak didukung oleh browser Anda.");
        return;
    }
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '🔍 Mendeteksi...';
    
    navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        btn.disabled = false;
        btn.innerHTML = originalText;
        
        // Tampilkan modal peta
        const modal = document.getElementById('map-modal');
        if (modal) {
            modalOpenTime = Date.now(); // Catat waktu modal dibuka untuk pengaman klik-tembus
            modal.style.display = 'flex';
        }
        
        // Inisialisasi Peta Leaflet
        setTimeout(() => {
            initLeafletMap(lat, lon, accuracy);
        }, 150);
        
    }, (error) => {
        console.error(error);
        btn.disabled = false;
        btn.innerHTML = originalText;
        
        alert("Gagal mendeteksi lokasi otomatis. Peta akan dibuka di koordinat default (Jakarta), silakan geser pin ke lokasi Anda.");
        
        // Buka modal peta dengan pusat default Jakarta
        const modal = document.getElementById('map-modal');
        if (modal) {
            modalOpenTime = Date.now();
            modal.style.display = 'flex';
        }
        setTimeout(() => {
            initLeafletMap(-6.2088, 106.8456, 1000);
        }, 150);
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
};

/** INITIALIZE */
document.addEventListener('DOMContentLoaded', async () => {
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => { menuToggle.classList.toggle('active'); navLinks.classList.toggle('active'); });
        navLinks.querySelectorAll('a').forEach(link => { link.addEventListener('click', () => { menuToggle.classList.remove('active'); navLinks.classList.remove('active'); }); });
    }

    try {
        cart = JSON.parse(localStorage.getItem('coffee_cart') || '{}');
    } catch (e) {
        console.warn("Gagal membaca coffee_cart dari localStorage:", e);
        cart = {};
    }

    const path = window.location.pathname;
    const page = path.split("/").pop();

    // Only fetch products on pages that actually need them
    const needsProducts = ['index.html', '', 'products.html', 'admin.html', 'checkout.html'].includes(page);
    if (needsProducts && supabaseClient) {
        fetchProducts().then(() => {
            if (page === 'index.html' || page === '') {
                if (supabaseClient) renderFeaturedProducts();
            }
        });
    }

    if (page === 'index.html' || page === '') { 
        renderStandAnnouncement(); 
    }
    else if (page === 'track.html') {
        if (typeof window.renderRecentOrdersTrack === 'function') {
            window.renderRecentOrdersTrack();
        }
        const urlParams = new URLSearchParams(window.location.search);
        const idFromUrl = urlParams.get('id');
        if (idFromUrl) {
            const input = document.getElementById('track-id-input');
            if (input) {
                input.value = idFromUrl;
                setTimeout(() => { if (typeof handleTrackOrder === 'function') handleTrackOrder(); }, 500);
            }
        }
    }
    else if (page === 'products.html') { initShop(); renderCart(); }
    else if (page === 'checkout.html') { 
        renderCheckoutProductsList();
        loadFormData();
        window.handleShippingUpdate();
        if (typeof window.checkAutofillProfile === 'function') {
            window.checkAutofillProfile();
        }
        
        FORM_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', saveFormData);
                el.addEventListener('change', saveFormData);
            }
        });
        
        const citySelect = document.getElementById('shipping-city');
        if (citySelect) {
            citySelect.addEventListener('change', (e) => {
                e.target.classList.add('touched');
                window.handleShippingUpdate();
            });
        }
        
        const serviceSelect = document.getElementById('delivery-service');
        if (serviceSelect) {
            serviceSelect.addEventListener('change', (e) => {
                serviceSelect.classList.add('touched');
                window.handleShippingUpdate();
            });
        }
        
        document.getElementById('payment-method')?.addEventListener('change', window.updatePaymentDisplay);
    }
    else if (page === 'about.html') { renderTestimonials(); }
    else if (page === 'brew.html') { getCoffeeNews(); initStars(); }
    else if (page === 'contact.html') {
        // Inisialisasi EmailJS jika ada
        if (typeof emailjs !== 'undefined') {
            emailjs.init({
                publicKey: "[REDACTED_EMAILJS_PUBLIC_KEY]"
            });
        }

        const cf = document.getElementById('contact-form');
        const btnSubmit = document.getElementById('btn-submit-contact');
        const btnWhatsapp = document.getElementById('btn-whatsapp-contact');

        if (cf) {
            cf.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                if (!btnSubmit) return;
                const originalText = btnSubmit.innerHTML;
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '⏳ Mengirim...';

                try {
                    const name = document.getElementById('contact-name').value;
                    const email = document.getElementById('contact-email').value;
                    const phone = document.getElementById('contact-whatsapp').value;
                    const purpose = document.getElementById('contact-purpose').value;
                    const message = document.getElementById('contact-message').value;

                    const templateParams = {
                        order_id: "CONTACT_FORM_SUBMISSION",
                        name: name,
                        from_name: name,
                        phone: phone,
                        customer_email: email,
                        shipping_address: "Keperluan: " + purpose.toUpperCase(),
                        customer_note: message,
                        time: new Date().toLocaleString('id-ID'),
                        order_items: "Pesan Kontak",
                        total_amount: "-"
                    };

                    if (typeof emailjs !== 'undefined') {
                        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ADMIN_TEMPLATE_ID, templateParams);
                        alert("Pesan Anda berhasil dikirim ke email kami! Terima kasih.");
                        cf.reset();
                    } else {
                        throw new Error("Sistem email sedang tidak aktif.");
                    }
                } catch (err) {
                    console.error(err);
                    alert("Gagal mengirim pesan: " + err.message);
                } finally {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = originalText;
                }
            });
        }

        if (btnWhatsapp && cf) {
            btnWhatsapp.addEventListener('click', () => {
                // Jalankan validasi HTML5 form
                if (!cf.checkValidity()) {
                    cf.reportValidity();
                    return;
                }

                const name = document.getElementById('contact-name').value;
                const email = document.getElementById('contact-email').value;
                const phone = document.getElementById('contact-whatsapp').value;
                const purpose = document.getElementById('contact-purpose').value;
                const message = document.getElementById('contact-message').value;

                const waText = `Halo KG Smart Drip Coffee, saya *${name}* (${email}, WA: ${phone})\n\n*Keperluan:* ${purpose.toUpperCase()}\n*Pesan:* ${message}`;
                const waUrl = `https://wa.me/6281219092900?text=${encodeURIComponent(waText)}`;
                window.open(waUrl, '_blank');
            });
        }
    }
});

window.handleEmailClick = () => {
    const email = "kreasiguna2026@gmail.com";
    navigator.clipboard.writeText(email).then(() => {
        alert("Alamat email kreasiguna2026@gmail.com berhasil disalin ke clipboard!\nMembuka Gmail...");
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`, '_blank');
    }).catch(() => {
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`, '_blank');
    });
};

window.checkAutofillProfile = () => {
    const profileStr = localStorage.getItem('customer_profile');
    const banner = document.getElementById('autofill-banner');
    if (profileStr && banner) {
        banner.classList.remove('hidden');
    }
};

window.autofillShippingProfile = () => {
    const profileStr = localStorage.getItem('customer_profile');
    if (!profileStr) return;
    try {
        const p = JSON.parse(profileStr);
        if (p.name) document.getElementById('customer-name').value = p.name;
        if (p.phone) document.getElementById('customer-phone').value = p.phone;
        if (p.email) document.getElementById('customer-email').value = p.email;
        if (p.city) {
            const citySelect = document.getElementById('shipping-city');
            citySelect.value = p.city;
            citySelect.dispatchEvent(new Event('change'));
        }
        if (p.address) document.getElementById('customer-address').value = p.address;
        
        const banner = document.getElementById('autofill-banner');
        if (banner) banner.classList.add('hidden');
    } catch (e) {
        console.error("Gagal melakukan autofill:", e);
    }
};

window.renderRecentOrdersTrack = () => {
    const container = document.getElementById('recent-orders-container');
    const list = document.getElementById('recent-orders-list');
    if (!container || !list) return;

    const recentOrders = JSON.parse(localStorage.getItem('recent_orders') || '[]');
    if (recentOrders.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    list.innerHTML = recentOrders.map(id => `
        <button type="button" class="recent-order-badge" onclick="fillAndTrackOrder('${id}')" 
                style="background: white; border: 1px solid #ddd; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: var(--coffee-dark); cursor: pointer; transition: all 0.2s ease; outline: none;"
                onmouseover="this.style.borderColor='var(--gold-premium)'; this.style.backgroundColor='#fffbf2';"
                onmouseout="this.style.borderColor='#ddd'; this.style.backgroundColor='white';">
            ${id}
        </button>
    `).join('');
};

window.fillAndTrackOrder = (id) => {
    const input = document.getElementById('track-id-input');
    if (input) {
        input.value = id;
        if (typeof handleTrackOrder === 'function') handleTrackOrder();
    }
};
