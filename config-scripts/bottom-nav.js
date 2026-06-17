/**
 * شريط سفلي ثابت (العائم الفاخر): رئيسية | ساخن | بارد | حلى | [شيشة] | سلة
 * تصميم كبسولة عائمة زجاجية (Glassmorphic Floating Capsule) مع أيقونات SVG أنيقة وتأثيرات توهج وحركة.
 * يعتمد على إعدادات Supabase لإظهار أو إخفاء الشيشة ديناميكياً وتفادي الازدحام في الشاشات الصغيرة.
 * يُخفى تلقائياً في صفحة السلة (body.cart-page)
 */
(async function initBottomNav() {
    if (document.body.classList.contains("cart-page")) return;

    // جلب الإعدادات من المخزن المؤقت أو قاعدة البيانات لمعرفة خيار الشيشة
    let settings = null;
    if (typeof window.loadAppSettings === "function") {
        settings = await window.loadAppSettings();
    }
    const showShisha = (settings && settings.ui && settings.ui.show_shisha_category !== undefined) ? settings.ui.show_shisha_category : false;

    const pathLower = window.location.pathname.toLowerCase();
    const isInSubFolder = pathLower.indexOf("/front-end/") !== -1 || pathLower.indexOf("/admin-panel/") !== -1;
    const isInFrontend = pathLower.indexOf("/front-end/") !== -1;

    const homeHref = isInSubFolder ? "../index.html" : "./index.html";
    const menuBase = isInFrontend ? "./menu.html" : (isInSubFolder ? "../Front-end/menu.html" : "./Front-end/menu.html");
    const cartHref = isInFrontend ? "./cart.html" : (isInSubFolder ? "../Front-end/cart.html" : "./Front-end/cart.html");
    const trackHref = isInFrontend ? "./tracking.html" : (isInSubFolder ? "../Front-end/tracking.html" : "./Front-end/tracking.html");

    const params = new URLSearchParams(window.location.search);
    const currentCat = params.get("cat");
    const isHome =
        pathLower.indexOf("menu.html") === -1 &&
        pathLower.indexOf("cart.html") === -1;

    // جلب آخر طلب محفوظ لربط زر التتبع في الرئيسية
    let lastOrderId = null;
    try {
        lastOrderId = localStorage.getItem("coof2_lastOrderId");
    } catch (err) {
        console.error("فشل قراءة lastOrderId من localStorage:", err);
    }
    const trackUrl = lastOrderId ? `${trackHref}?orderId=${encodeURIComponent(lastOrderId)}` : trackHref;
    const isTracking = pathLower.indexOf("tracking.html") !== -1;

    // إعداد الفئات المخصصة للتوهج والبريق الذهبي
    const activeClass = "font-bold active-nav-item";
    const idleClass = "idle-nav-item";
    const inactiveTrackClass = "inactive-track-item";

    const nav = document.createElement("nav");
    nav.id = "app-bottom-nav";
    
    // تصميم فاخر مخصص للهواتف الذكية: كبسولة عائمة زجاجية مع ظل ذهبي ناعم وحواف مستديرة
    nav.className =
        "fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-black/85 backdrop-blur-xl border border-amber-500/35 px-4 py-3 flex justify-around items-center z-50 rounded-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.8),_0_0_20px_rgba(232,184,74,0.08)] transition-all duration-300";

    // أيقونات SVG الأنيقة والمصممة بدقة
    const icons = {
        home: `
            <svg class="w-[22px] h-[22px] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
        `,
        hot: `
            <svg class="w-[22px] h-[22px] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 8h1a4 4 0 0 1 0 8h-1"/>
                <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
                <line x1="6" x2="6" y1="2" y2="4"/>
                <line x1="10" x2="10" y1="2" y2="4"/>
                <line x1="14" x2="14" y1="2" y2="4"/>
            </svg>
        `,
        cold: `
            <svg class="w-[22px] h-[22px] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 8L15.2 20.6C15.1 21.4 14.4 22 13.6 22H10.4C9.6 22 8.9 21.4 8.8 20.6L7 8H17Z"/>
                <path d="M6 8H18"/>
                <path d="M13 2L15 8"/>
            </svg>
        `,
        dessert: `
            <svg class="w-[22px] h-[22px] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 9v11h20V9L12 2z"/>
                <path d="M2 13h20"/>
                <path d="M2 16h20"/>
                <circle cx="12" cy="5.5" r="1" fill="currentColor"/>
            </svg>
        `,
        shisha: `
            <svg class="w-[22px] h-[22px] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 21h4v-1.5c0-.8-.7-1.5-1.5-1.5h-1c-.8 0-1.5.7-1.5 1.5V21Z"/>
                <path d="M7 13.5c0-1.4 1.1-2.5 2.5-2.5h5c1.4 0 2.5 1.1 2.5 2.5v2.5c0 1.4-1.1 2.5-2.5 2.5h-5C8.1 21 7 19.9 7 18.5v-2.5Z"/>
                <path d="M12 11V6"/>
                <path d="M9 6h6v-2H9v2Z"/>
                <path d="M14 8c2.5 0 4.5 1.5 4.5 3.5V17"/>
                <path d="M18.5 17h2v-4h-2v4Z"/>
            </svg>
        `,
        track: `
            <svg class="w-[22px] h-[22px] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 2v20l2-1 3 1 3-1 3 1 3-1 2 1V2l-2 1-3-1-3 1-3-1-3 1-2-1Z"/>
                <path d="M8 8h8M8 12h8M8 16h5"/>
            </svg>
        `,
        cart: `
            <svg class="w-[22px] h-[22px] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="8" cy="21" r="1"/>
                <circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
            </svg>
        `
    };

    // توليد عناصر القائمة ديناميكياً
    let navContent = `
        <a href="${homeHref}" class="flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${isHome && !currentCat ? activeClass : idleClass}" data-nav="home">
            ${icons.home}<span data-key="home">الرئيسية</span>
        </a>
        <a href="${menuBase}?cat=hot" class="flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${currentCat === "hot" ? activeClass : idleClass}" data-nav="hot">
            ${icons.hot}<span data-key="hot">ساخن</span>
        </a>
        <a href="${menuBase}?cat=cold" class="flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${currentCat === "cold" ? activeClass : idleClass}" data-nav="cold">
            ${icons.cold}<span data-key="cold">بارد</span>
        </a>
        <a href="${menuBase}?cat=dessert" class="flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${currentCat === "dessert" ? activeClass : idleClass}" data-nav="dessert">
            ${icons.dessert}<span data-key="dessert">حلى</span>
        </a>
    `;

    // إضافة زر الشيشة فقط إذا كانت مفعلة من لوحة التحكم
    if (showShisha) {
        navContent += `
        <a href="${menuBase}?cat=shisha" class="flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${currentCat === "shisha" ? activeClass : idleClass}" data-nav="shisha">
            ${icons.shisha}<span data-key="shisha">شيشة</span>
        </a>
        `;
    }

    navContent += `
        <a href="${trackUrl}" id="nav-track-link" class="relative flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${isTracking ? activeClass : (lastOrderId ? idleClass : inactiveTrackClass)}" data-nav="track">
            <div id="order-status-indicator" class="absolute -top-3 left-0 w-full flex justify-center gap-0.5 h-1.5"></div>
            ${icons.track}<span data-key="track">طلبي</span>
        </a>
        <a href="${cartHref}" class="relative flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${pathLower.indexOf("cart.html") !== -1 ? activeClass : idleClass}" data-nav="coof2_cart">
            ${icons.cart}<span data-key="cart">السلة</span>
            <span id="cart-badge" class="absolute -top-1 -right-2 bg-amber-500 text-black text-[9px] font-black rounded-full min-w-[1.2rem] h-[1.2rem] flex items-center justify-center px-1 border border-black shadow-[0_0_8px_rgba(245,215,110,0.5)]">0</span>
        </a>
    `;

    nav.innerHTML = navContent;
    document.body.appendChild(nav);

    // تفعيل التحديث المباشر للغة بعد الإضافة للشاشة
    if (typeof window.applyLanguage === "function") {
        let savedLang = 'ar';
        try {
            savedLang = localStorage.getItem('coof2_userLang') || 'ar';
        } catch (_) {}
        window.applyLanguage(savedLang);
    }
    
    // إضافة تباعد لأسفل الصفحة وتطبيق تصميم البريق الموحد، مع إخفاء النصوص في الشاشات الصغيرة لتفادي الازدحام
    if (!document.getElementById("nav-spacing-style")) {
        const style = document.createElement("style");
        style.id = "nav-spacing-style";
        style.innerHTML = `
            body.has-bottom-nav {
                padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)) !important;
            }
            #app-bottom-nav {
                bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
            }
            #app-bottom-nav a {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-decoration: none;
                -webkit-tap-highlight-color: transparent;
                color: #f5d76e !important;
                opacity: 0.85 !important;
                filter: drop-shadow(0 0 6px rgba(245, 215, 110, 0.75)) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            #app-bottom-nav a:hover, #app-bottom-nav a.active-nav-item {
                transform: scale(1.08) translateY(-2px);
                opacity: 1 !important;
                filter: drop-shadow(0 0 10px rgba(245, 215, 110, 0.95)) !important;
            }
            #app-bottom-nav a.inactive-track-item {
                color: #ffffff !important;
                opacity: 0.35 !important;
                filter: none !important;
            }
            #app-bottom-nav a.active-nav-item::after {
                content: '';
                display: block;
                width: 4px;
                height: 4px;
                background-color: #f5d76e;
                border-radius: 50%;
                margin-top: 3px;
                box-shadow: 0 0 6px #f5d76e, 0 0 12px #f5d76e;
                animation: activeDotPulse 1.8s infinite alternate;
            }
            @keyframes activeDotPulse {
                0% { transform: scale(0.95); opacity: 0.8; }
                100% { transform: scale(1.25); opacity: 1; }
            }
            
            /* حل مشكلة الازدحام على الشاشات الصغيرة عند تفعيل كافة الأقسام (7 أيقونات) */
            @media (max-width: 385px) {
                #app-bottom-nav a span:not(#cart-badge):not(.wait-el):not(.prep-el) {
                    display: none !important; /* إخفاء النص لتبقى الأيقونات المضيئة متناسقة ومريحة للمس */
                }
                #app-bottom-nav {
                    padding: 8px 10px !important;
                    height: 58px !important;
                }
                #app-bottom-nav a.active-nav-item::after {
                    margin-top: 2px !important; /* تقليل التباعد للنقطة المضيئة */
                }
            }
        `;
        document.head.appendChild(style);
    }
    document.body.classList.add("has-bottom-nav");

    function updateCartBadge() {
        const badge = document.getElementById("cart-badge");
        if (!badge) return;
        try {
            const cart = JSON.parse(localStorage.getItem("coof2_cart") || "[]");
            const count = cart.reduce(function(s, i) { return s + (parseInt(i.quantity) || 0); }, 0);
            badge.textContent = count;
            badge.style.display = count > 0 ? "flex" : "none";
        } catch {
            badge.textContent = "0";
        }
    }

    let navChannel = null;
    async function monitorOrderStatus() {
        let currentOrderId = null;
        try {
            currentOrderId = localStorage.getItem("coof2_lastOrderId");
        } catch (err) {
            console.error("فشل قراءة lastOrderId في monitorOrderStatus:", err);
        }

        if (!currentOrderId) {
            const el = document.getElementById("order-status-indicator");
            if (el) el.innerHTML = "";
            const link = document.getElementById("nav-track-link");
            if (link && !link.classList.contains("active-nav-item")) {
                link.classList.remove("idle-nav-item");
                link.classList.add("inactive-track-item");
            }
            if (navChannel) {
                try {
                    const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
                    if (client) client.removeChannel(navChannel);
                } catch (e) {}
                navChannel = null;
            }
            return;
        }

        const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
        if (!client) return;

        var updateDots = function(status) {
            const el = document.getElementById("order-status-indicator");
            if (!el) return;
            
            let color = "";
            if (status === "pending") color = "#f5d76e"; 
            else if (status === "preparing" || status === "ready_for_pickup" || status === "ready_for_delivery") color = "#10B981"; // Emerald Green
            else if (status === "out_for_delivery") color = "#3B82F6"; // Blue for delivery
            
            if (color) {
                el.innerHTML = `
                    <div class="w-1.5 h-1.5 rounded-full animate-ping" style="background-color:${color};box-shadow:0 0 8px ${color}"></div>
                    <div class="w-1.5 h-1.5 rounded-full" style="background-color:${color};box-shadow:0 0 5px ${color}"></div>
                `;
                const link = document.getElementById("nav-track-link");
                if (link && !link.classList.contains("active-nav-item")) {
                    link.classList.remove("inactive-track-item");
                    link.classList.add("idle-nav-item");
                }
            } else {
                el.innerHTML = "";
                if (status === "completed" || status === "completed_local" || status === "completed_delivery" || status === "cancelled" || !status) {
                    try {
                        localStorage.removeItem("coof2_lastOrderId");
                    } catch (e) {}
                    const link = document.getElementById("nav-track-link");
                    if (link && !link.classList.contains("active-nav-item")) {
                        link.classList.remove("idle-nav-item");
                        link.classList.add("inactive-track-item");
                    }
                }
            }
        };

        try {
            const { data } = await client.from("orders").select("status").eq("id", currentOrderId).maybeSingle();
            if (data) {
                updateDots(data.status);
            } else {
                try {
                    localStorage.removeItem("coof2_lastOrderId");
                } catch (e) {}
                const link = document.getElementById("nav-track-link");
                if (link && !link.classList.contains("active-nav-item")) {
                    link.classList.remove("idle-nav-item");
                    link.classList.add("inactive-track-item");
                }
            }
        } catch (err) {
            console.error("فشل قراءة حالة الطلب في القائمة:", err);
        }

        try {
            if (navChannel) {
                client.removeChannel(navChannel);
                navChannel = null;
            }
        } catch (e) {}

        navChannel = client.channel(`nav_order_status`).on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${currentOrderId}`
        }, function(payload) {
            if (payload.new) updateDots(payload.new.status);
        });
        navChannel.subscribe();
    }

    updateCartBadge();
    window.addEventListener("storage", function(e) {
        if (e.key === "coof2_cart") {
            updateCartBadge();
        }
    });
    window.updateCartBadge = updateCartBadge;

    window.addEventListener("supabaseReady", monitorOrderStatus);
    if (typeof window.getSupabaseClient === "function" && window.getSupabaseClient()) monitorOrderStatus();

    document.addEventListener("visibilitychange", function() {
        if (document.visibilityState === "visible") {
            monitorOrderStatus();
        }
    });
})();
