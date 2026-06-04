/**
 * شريط سفلي ثابت: رئيسية | ساخن | بارد | حلى | سلة
 * يُخفى تلقائياً في صفحة السلة (body.cart-page)
 */
(function initBottomNav() {
    if (document.body.classList.contains("cart-page")) return;

    const pathLower = window.location.pathname.toLowerCase();
    const isInSubFolder = pathLower.includes("/front-end/") || pathLower.includes("/admin-panel/");
    const isInFrontend = pathLower.includes("/front-end/");

    const homeHref = isInSubFolder ? "../index.html" : "./index.html";
    const menuBase = isInFrontend ? "./menu.html" : (isInSubFolder ? "../Front-end/menu.html?v=16" : "./Front-end/menu.html");
    const cartHref = isInFrontend ? "./cart.html" : (isInSubFolder ? "../Front-end/cart.html?v=16" : "./Front-end/cart.html");
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

    const activeClass = "font-bold scale-115";
    const activeStyle = "color:#f5d76e;text-shadow:0 0 15px rgba(245,215,110,0.8)";
    const idleClass = "transition hover:opacity-100";
    const idleStyle = "color:#f5d76e;text-shadow:0 0 8px rgba(245,215,110,0.4);opacity:0.95";
    const whiteStyle = "color:#ffffff;opacity:0.7;text-shadow:none";

    const nav = document.createElement("nav");
    nav.id = "app-bottom-nav";
    nav.className =
        "fixed bottom-0 left-0 w-full bg-zinc-900/98 backdrop-blur border-t border-amber-500/50 px-2 py-2 flex justify-around items-center z-50 shadow-[0_-8px_30px_rgba(232,184,74,0.12)]";

    nav.innerHTML = `
        <a href="${homeHref}" class="flex flex-col items-center gap-0.5 text-[11.5px] ${isHome && !currentCat ? activeClass : idleClass}" style="${isHome && !currentCat ? activeStyle : idleStyle}" data-nav="home">
            <span class="text-lg">🏠</span><span>الرئيسية</span>
        </a>
        <a href="${menuBase}?cat=hot" class="flex flex-col items-center gap-0.5 text-[11.5px] ${currentCat === "hot" ? activeClass : idleClass}" style="${currentCat === "hot" ? activeStyle : idleStyle}" data-nav="hot">
            <span class="text-lg">☕</span><span>ساخن</span>
        </a>
        <a href="${menuBase}?cat=cold" class="flex flex-col items-center gap-0.5 text-[11.5px] ${currentCat === "cold" ? activeClass : idleClass}" style="${currentCat === "cold" ? activeStyle : idleStyle}" data-nav="cold">
            <span class="text-lg">🧊</span><span>بارد</span>
        </a>
        <a href="${menuBase}?cat=dessert" class="flex flex-col items-center gap-0.5 text-[11.5px] ${currentCat === "dessert" ? activeClass : idleClass}" style="${currentCat === "dessert" ? activeStyle : idleStyle}" data-nav="dessert">
            <span class="text-lg">🍰</span><span>حلى</span>
        </a>
        <a href="${trackUrl}" id="nav-track-link" class="relative flex flex-col items-center gap-0.5 text-[11.5px] ${isTracking ? activeClass : idleClass}" style="${isTracking ? activeStyle : (lastOrderId ? idleStyle : whiteStyle)}" data-nav="track">
            <div id="order-status-indicator" class="absolute -top-2 left-0 w-full flex justify-center gap-0.5 h-1.5"></div>
            <span class="text-lg">📋</span><span>طلبي</span>
        </a>
        <a href="${cartHref}" class="relative flex flex-col items-center gap-0.5 text-[11.5px] ${pathLower.includes("cart.html") ? activeClass : idleClass}" style="${pathLower.includes("cart.html") ? activeStyle : idleStyle}" data-nav="cart">
            <span class="text-lg">🛒</span><span>السلة</span>
            <span id="cart-badge" class="absolute -top-1 -left-1 bg-amber-500 text-black text-[10px] font-bold rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-1">0</span>
        </a>
    `;

    document.body.appendChild(nav);
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

    async function monitorOrderStatus() {
        if (!lastOrderId) return;
        const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
        if (!client) return;

        const updateDots = (status) => {
            const el = document.getElementById("order-status-indicator");
            if (!el) return;
            
            let color = "";
            if (status === "pending") color = "#f5d76e"; // ذهبي - عند اتمام الطلب
            else if (status === "preparing" || status === "ready") color = "#22C55E"; // أخضر - عند التجهيز
            
            if (color) {
                el.innerHTML = `
                    <div class="w-1.5 h-1.5 rounded-sm" style="background-color:${color};box-shadow:0 0 5px ${color}"></div>
                    <div class="w-1.5 h-1.5 rounded-sm" style="background-color:${color};box-shadow:0 0 5px ${color}"></div>
                    <div class="w-1.5 h-1.5 rounded-sm" style="background-color:${color};box-shadow:0 0 5px ${color}"></div>
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
