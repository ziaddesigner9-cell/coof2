/**
 * شريط سفلي ثابت (العائم الفاخر): رئيسية | ساخن | بارد | حلى | سلة
 * تصميم كبسولة عائمة زجاجية (Glassmorphic Floating Capsule) مع أيقونات SVG أنيقة وتأثيرات توهج وحركة.
 * يُخفى تلقائياً في صفحة السلة (body.cart-page)
 */
(function initBottomNav() {
    if (document.body.classList.contains("cart-page")) return;

    const pathLower = window.location.pathname.toLowerCase();
    const isInSubFolder = pathLower.includes("/front-end/") || pathLower.includes("/admin-panel/");
    const isInFrontend = pathLower.includes("/front-end/");

    const homeHref = isInSubFolder ? "../index.html" : "./index.html";
    const menuBase = isInFrontend ? "./menu.html" : (isInSubFolder ? "../Front-end/menu.html" : "./Front-end/menu.html");
    const cartHref = isInFrontend ? "./cart.html" : (isInSubFolder ? "../Front-end/cart.html" : "./Front-end/cart.html");
    const trackHref = isInFrontend ? "./tracking.html" : (isInSubFolder ? "../Front-end/tracking.html" : "./Front-end/tracking.html");

    const params = new URLSearchParams(window.location.search);
    const currentCat = params.get("cat");
    const isHome =
        !pathLower.includes("menu.html") &&
        !pathLower.includes("cart.html");

    // جلب آخر طلب محفوظ لربط زر التتبع
    const lastOrderId = localStorage.getItem("lastOrderId");
    const trackUrl = lastOrderId ? `${trackHref}?orderId=${encodeURIComponent(lastOrderId)}` : trackHref;
    const isTracking = pathLower.includes("tracking.html");

    // إعداد تنسيق الشريط العائم الجديد
    const activeClass = "font-bold scale-110 -translate-y-0.5";
    const activeStyle = "color:#f5d76e; filter: drop-shadow(0 0 8px rgba(245,215,110,0.85));";
    const idleClass = "opacity-60 transition hover:opacity-100 hover:-translate-y-0.5";
    const idleStyle = "color:#f5d76e; filter: drop-shadow(0 0 2px rgba(245,215,110,0.25));";
    const whiteStyle = "color:#ffffff; opacity:0.4; transition hover:opacity-100";

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

    nav.innerHTML = `
        <a href="${homeHref}" class="flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${isHome && !currentCat ? activeClass : idleClass}" style="${isHome && !currentCat ? activeStyle : idleStyle}" data-nav="home">
            ${icons.home}<span>الرئيسية</span>
        </a>
        <a href="${menuBase}?cat=hot" class="flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${currentCat === "hot" ? activeClass : idleClass}" style="${currentCat === "hot" ? activeStyle : idleStyle}" data-nav="hot">
            ${icons.hot}<span>ساخن</span>
        </a>
        <a href="${menuBase}?cat=cold" class="flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${currentCat === "cold" ? activeClass : idleClass}" style="${currentCat === "cold" ? activeStyle : idleStyle}" data-nav="cold">
            ${icons.cold}<span>بارد</span>
        </a>
        <a href="${menuBase}?cat=dessert" class="flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${currentCat === "dessert" ? activeClass : idleClass}" style="${currentCat === "dessert" ? activeStyle : idleStyle}" data-nav="dessert">
            ${icons.dessert}<span>حلى</span>
        </a>
        <a href="${trackUrl}" id="nav-track-link" class="relative flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${isTracking ? activeClass : idleClass}" style="${isTracking ? activeStyle : (lastOrderId ? idleStyle : whiteStyle)}" data-nav="track">
            <div id="order-status-indicator" class="absolute -top-3 left-0 w-full flex justify-center gap-0.5 h-1.5"></div>
            ${icons.track}<span>طلبي</span>
        </a>
        <a href="${cartHref}" class="relative flex flex-col items-center justify-center text-[10px] tracking-wide transition-all duration-300 ${pathLower.includes("cart.html") ? activeClass : idleClass}" style="${pathLower.includes("cart.html") ? activeStyle : idleStyle}" data-nav="cart">
            ${icons.cart}<span>السلة</span>
            <span id="cart-badge" class="absolute -top-1 -right-2 bg-amber-500 text-black text-[9px] font-black rounded-full min-w-[1.2rem] h-[1.2rem] flex items-center justify-center px-1 border border-black shadow-[0_0_8px_rgba(245,215,110,0.5)]">0</span>
        </a>
    `;

    document.body.appendChild(nav);
    
    // إضافة تباعد لأسفل الصفحة لمنع تغطية المحتوى بالشريط العائم الجديد
    if (!document.getElementById("nav-spacing-style")) {
        const style = document.createElement("style");
        style.id = "nav-spacing-style";
        style.innerHTML = `
            body.has-bottom-nav {
                padding-bottom: 96px !important;
            }
            #app-bottom-nav a {
                flex: 1;
                text-decoration: none;
                -webkit-tap-highlight-color: transparent;
            }
        `;
        document.head.appendChild(style);
    }
    document.body.classList.add("has-bottom-nav");

    function updateCartBadge() {
        const badge = document.getElementById("cart-badge");
        if (!badge) return;
        try {
            const cart = JSON.parse(localStorage.getItem("cart") || "[]");
            const count = cart.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
            badge.textContent = count;
            badge.style.display = count > 0 ? "flex" : "none";
        } catch {
            badge.textContent = "0";
        }
    }

    let isMonitoringStarted = false;
    async function monitorOrderStatus() {
        if (!lastOrderId || isMonitoringStarted) return;
        const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
        if (!client) return;

        isMonitoringStarted = true;
        const updateDots = (status) => {
            const el = document.getElementById("order-status-indicator");
            if (!el) return;
            
            let color = "";
            if (status === "pending") color = "#f5d76e"; 
            else if (status === "preparing" || status === "ready") color = "#10B981"; // Emerald Green
            
            if (color) {
                el.innerHTML = `
                    <div class="w-1.5 h-1.5 rounded-full animate-ping" style="background-color:${color};box-shadow:0 0 8px ${color}"></div>
                    <div class="w-1.5 h-1.5 rounded-full" style="background-color:${color};box-shadow:0 0 5px ${color}"></div>
                `;
            } else {
                el.innerHTML = "";
            }
        };

        const { data } = await client.from("orders").select("status").eq("id", lastOrderId).maybeSingle();
        if (data) updateDots(data.status);

        client.channel(`nav_order_status`).on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${lastOrderId}`
        }, payload => updateDots(payload.new.status)).subscribe();
    }

    updateCartBadge();
    window.addEventListener("storage", updateCartBadge);
    window.updateCartBadge = updateCartBadge;

    window.addEventListener("supabaseReady", monitorOrderStatus);
    if (typeof window.getSupabaseClient === "function" && window.getSupabaseClient()) monitorOrderStatus();
})();
