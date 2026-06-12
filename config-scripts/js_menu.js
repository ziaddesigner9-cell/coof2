/**
 * قائمة الأصناف حسب التصنيف: hot | cold | dessert
 */

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let isMenuLoading = false;
async function loadMenu() {
    if (isMenuLoading) return; // منع التكرار
    isMenuLoading = true;

    const menuContainer = document.getElementById("menu-items");
    if (!menuContainer) { isMenuLoading = false; return; }

    const supabaseClient =
        typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (!supabaseClient) { isMenuLoading = false; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get("cat");

    if (!category || !MENU_CATEGORY_KEYS.includes(category)) {
        const pathLower = window.location.pathname.toLowerCase();
        const isInSubFolder = pathLower.includes("/front-end/") || pathLower.includes("/admin-panel/");
        window.location.replace(isInSubFolder ? "../index.html" : "index.html");
        return;
    }

    try {
        const { data: items, error } = await supabaseClient
            .from("items")
            .select("*")
            .eq("is_available", true)
            .eq("category", category)
            .order("created_at", { ascending: false });

        if (error) {
            menuContainer.innerHTML = `<p class='text-center text-red-400 p-4'>خطأ في الاتصال: ${error.message}</p>`;
            return;
        }

        if (!items || items.length === 0) {
            const label = MENU_CATEGORY_LABELS[category] || category;
            menuContainer.innerHTML = `<p class='text-center col-span-full gold-text-soft py-10'>لا توجد أصناف في «${label}» حالياً.<br><span class="text-sm text-zinc-500">أضف صنفاً واختر التصنيف الصحيح من لوحة المدير.</span></p>`;
            return;
        }

        menuContainer.innerHTML = items
            .map(
                function(item) {
                    const safeName = escapeHtml(item.name || "غير معروف");
                    const safePrice = escapeHtml(parseFloat(item.price || 0).toFixed(2));
                    const safeImage = escapeHtml(window.getSafeImageUrl(item.image_url));
                    return `
        <div class="menu-card menu-item p-4 rounded-2xl flex items-center gap-4 transition">
              <img src="${safeImage}" alt="${safeName}" loading="lazy" decoding="async"
                   class="w-20 h-20 object-cover rounded-xl border border-amber-500/50 flex-shrink-0">
            <div class="flex-grow min-w-0">
                <h3 class="font-bold gold-title text-lg leading-tight">${safeName}</h3>
                <p class="gold-text font-bold mt-1 text-base">${safePrice} ريال</p>
            </div>
            <button class="add-to-cart-btn bg-gradient-to-b from-amber-400 to-amber-600 text-black p-3 rounded-full hover:from-amber-300 hover:to-amber-500 transition flex-shrink-0 shadow-md shadow-amber-900/40" 
                    data-id="${escapeHtml(item.id)}" 
                    data-name="${safeName}" 
                    data-price="${escapeHtml(item.price)}" 
                    data-image="${safeImage}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
        `;
                }
            )
            .join("");

        updateCartCount();
        if (typeof window.loadAppSettings === "function") {
            await window.loadAppSettings();
        }
    } catch (err) {
        console.error("فشل جلب الأصناف:", err);
        menuContainer.innerHTML = "<p class='text-center text-red-400 p-4'>تعذر تحميل الأصناف.</p>";
    } finally {
        isMenuLoading = false;
    }
}

let menuAudioCtx = null;
function initMenuAudio() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx && !menuAudioCtx) {
            menuAudioCtx = new AudioCtx();
        }
        if (menuAudioCtx) {
            if (menuAudioCtx.state === 'suspended') {
                menuAudioCtx.resume();
            }
            var buffer = menuAudioCtx.createBuffer(1, 1, 22050);
            var source = menuAudioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(menuAudioCtx.destination);
            if (source.start) source.start(0);
            else if (source.noteOn) source.noteOn(0);
        }
    } catch (err) {
        console.error("فشل تهيئة صوت القائمة:", err);
    }
}
document.addEventListener("click", initMenuAudio, { once: true });
document.addEventListener("touchstart", initMenuAudio, { once: true });

/** تشغيل صوت خفيف عند الإضافة */
function playCartSound() {
    if (!menuAudioCtx) {
        initMenuAudio();
    }
    if (!menuAudioCtx) return;
    try {
        const ctx = menuAudioCtx;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.2);
    } catch(e) {}
}

/** إظهار عبارة عشوائية متساقطة من الإعدادات */
async function showCartFeedback() {
    let text = "تمت الإضافة للسلة"; // نص احتياطي في حال فشل التحميل

    try {
        if (typeof window.loadAppSettings !== "function" || typeof window.phrase !== "function") {
            throw new Error("Settings functions missing");
        }

        const settings = await window.loadAppSettings(); 
        const phrases = [
            phrase(settings, 'cart_feedback_1'),
            phrase(settings, 'cart_feedback_2'),
            phrase(settings, 'cart_feedback_3'),
            phrase(settings, 'cart_feedback_4'),
            phrase(settings, 'cart_feedback_5'),
            phrase(settings, 'cart_feedback_6')
        ].filter(function(p) { return p && p.trim() !== ""; });

        if (phrases.length > 0) {
            text = phrases[Math.floor(Math.random() * phrases.length)];
        }
    } catch (err) {
        console.warn("تعذر جلب العبارات المخصصة، استخدام النص الافتراضي.");
    }

    const el = document.createElement("div");
    // إضافة فئات Tailwind للظهور بوضوح مع التأكد من بقاء التنسيق الذهبي
    el.className = "falling-phrase gold-title text-xl px-8 py-3 bg-black/90 backdrop-blur-lg rounded-full border-2 border-amber-500/50 shadow-[0_0_30px_rgba(232,184,74,0.3)]";
    el.textContent = text;
    
    // إضافة انحراف عشوائي بسيط لليمين أو اليسار لتبدو الحركة طبيعية
    const randomOffset = Math.floor(Math.random() * 20) - 10;
    el.style.marginLeft = `${randomOffset}px`;
    
    document.body.appendChild(el);
    
    // تحريك أيقونة السلة في الشريط السفلي
    const cartNav = document.querySelector('[data-nav="cart"]');
    if (cartNav) { 
        cartNav.classList.remove('cart-animate'); // إعادة ضبط الحركة
        void cartNav.offsetWidth; // Force reflow
        cartNav.classList.add('cart-animate'); 
    }
    
    setTimeout(function() { el.remove(); }, 2600);
}

function addToCart(id, name, price, imageUrl) {
    var cart = [];
    try {
        cart = JSON.parse(localStorage.getItem("cart") || "[]");
    } catch (err) {
        console.error("فشل قراءة السلة من localStorage:", err);
    }

    var existingItem = null;
    for (var i = 0; i < cart.length; i++) {
        if (cart[i].id === id) {
            existingItem = cart[i];
            break;
        }
    }

    if (existingItem) {
        existingItem.quantity = (parseInt(existingItem.quantity) || 1) + 1;
    } else {
        cart.push({ id: id, name: name, price: parseFloat(price || 0), quantity: 1, image_url: imageUrl });
    }

    try {
        localStorage.setItem("cart", JSON.stringify(cart));
    } catch (err) {
        console.error("فشل حفظ السلة في localStorage:", err);
    }

    playCartSound();
    showCartFeedback();
    updateCartCount();
}

function updateCartCount() {
    var cart = [];
    try {
        cart = JSON.parse(localStorage.getItem("cart") || "[]");
    } catch (err) {
        console.error("فشل قراءة السلة في updateCartCount:", err);
    }

    var count = 0;
    for (var i = 0; i < cart.length; i++) {
        count += (parseInt(cart[i].quantity) || 0);
    }

    var badge = document.getElementById("cart-badge");
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? "flex" : "none";
    }
    if (typeof window.updateCartBadge === "function") window.updateCartBadge();
}

let isMenuInitialized = false;
document.addEventListener("DOMContentLoaded", function() {
    if (isMenuInitialized) return;
    isMenuInitialized = true;

    var tryInitMenu = function() {
        if (window.getSupabaseClient()) {
            loadMenu();
            // إزالة المستمع فور التنفيذ لضمان عدم التكرار
            window.removeEventListener("supabaseReady", tryInitMenu);
        }
    };

    tryInitMenu();
    window.addEventListener("supabaseReady", tryInitMenu);

    var menuItems = document.getElementById("menu-items");
    if (menuItems) {
        menuItems.addEventListener("click", function(e) {
            var btn = null;
            if (e.target.closest) {
                btn = e.target.closest(".add-to-cart-btn");
            } else {
                var current = e.target;
                while (current && current !== menuItems) {
                    if (current.className && current.className.indexOf("add-to-cart-btn") !== -1) {
                        btn = current;
                        break;
                    }
                    current = current.parentNode;
                }
            }
            if (btn) {
                var id = btn.getAttribute("data-id");
                var name = btn.getAttribute("data-name");
                var price = btn.getAttribute("data-price");
                var image = btn.getAttribute("data-image");
                addToCart(id, name, price, image);
            }
        });
    }
});