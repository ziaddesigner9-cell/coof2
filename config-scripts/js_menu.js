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
                (item) => {
                    const safeName = escapeHtml(item.name || "غير معروف");
                    const safePrice = escapeHtml(parseFloat(item.price || 0).toFixed(2));
                    const safeImage = escapeHtml(window.getSafeImageUrl(item.image_url));
                    return `
        <div class="menu-card menu-item p-4 rounded-2xl flex items-center gap-4 transition">
              <img src="${safeImage}" alt="${safeName}" loading="lazy"
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

/** تشغيل صوت خفيف عند الإضافة */
function playCartSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
        ].filter(p => p && p.trim() !== "");

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
    document.body.appendChild(el);
    
    // تحريك أيقونة السلة في الشريط السفلي
    const cartNav = document.querySelector('[data-nav="cart"]');
    if (cartNav) { 
        cartNav.classList.remove('cart-animate'); // إعادة ضبط الحركة
        void cartNav.offsetWidth; // Force reflow
        cartNav.classList.add('cart-animate'); 
    }
    
    setTimeout(() => el.remove(), 2600);
}

function addToCart(id, name, price, imageUrl) {
    let cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find((item) => item.id === id);
    if (existingItem) {
        existingItem.quantity = (parseInt(existingItem.quantity) || 1) + 1;
    } else {
        cart.push({ id, name, price: parseFloat(price || 0), quantity: 1, image_url: imageUrl });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    playCartSound();
    showCartFeedback();
    updateCartCount();
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const count = cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    const badge = document.getElementById("cart-badge");
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? "flex" : "none";
    }
    if (typeof window.updateCartBadge === "function") window.updateCartBadge();
}

let isMenuInitialized = false;
document.addEventListener("DOMContentLoaded", () => {
    if (isMenuInitialized) return;
    isMenuInitialized = true;

    const tryInitMenu = () => {
        if (window.getSupabaseClient()) {
            loadMenu();
            // إزالة المستمع فور التنفيذ لضمان عدم التكرار
            window.removeEventListener("supabaseReady", tryInitMenu);
        }
    };

    tryInitMenu();
    window.addEventListener("supabaseReady", tryInitMenu);

    document.getElementById("menu-items")?.addEventListener("click", (e) => {
        const btn = e.target.closest(".add-to-cart-btn");
        if (btn) {
            const { id, name, price, image } = btn.dataset;
            addToCart(id, name, price, image);
        }
    });
});