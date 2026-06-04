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
    const menuBase = isInFrontend ? "./menu.html" : (isInSubFolder ? "../Front-end/menu.html" : "./Front-end/menu.html");
    const cartHref = isInFrontend ? "./cart.html" : (isInSubFolder ? "../Front-end/cart.html" : "./Front-end/cart.html");

    const params = new URLSearchParams(window.location.search);
    const currentCat = params.get("cat");
    const isHome =
        !pathLower.includes("menu.html") &&
        !pathLower.includes("cart.html");

    const activeClass = "font-bold scale-110";
    const activeStyle = "color:#f5d76e;text-shadow:0 0 10px rgba(245,215,110,0.5)";
    const idleClass = "transition hover:opacity-100";
    const idleStyle = "color:#e8b84a;opacity:0.85";

    const nav = document.createElement("nav");
    nav.id = "app-bottom-nav";
    nav.className =
        "fixed bottom-0 left-0 w-full bg-zinc-900/98 backdrop-blur border-t border-amber-500/50 px-2 py-2 flex justify-around items-center z-50 shadow-[0_-8px_30px_rgba(232,184,74,0.12)]";

    nav.innerHTML = `
        <a href="${homeHref}" class="flex flex-col items-center gap-0.5 text-[10px] ${isHome && !currentCat ? activeClass : idleClass}" style="${isHome && !currentCat ? activeStyle : idleStyle}" data-nav="home">
            <span class="text-lg">🏠</span><span>الرئيسية</span>
        </a>
        <a href="${menuBase}?cat=hot" class="flex flex-col items-center gap-0.5 text-[10px] ${currentCat === "hot" ? activeClass : idleClass}" style="${currentCat === "hot" ? activeStyle : idleStyle}" data-nav="hot">
            <span class="text-lg">☕</span><span>ساخن</span>
        </a>
        <a href="${menuBase}?cat=cold" class="flex flex-col items-center gap-0.5 text-[10px] ${currentCat === "cold" ? activeClass : idleClass}" style="${currentCat === "cold" ? activeStyle : idleStyle}" data-nav="cold">
            <span class="text-lg">🧊</span><span>بارد</span>
        </a>
        <a href="${menuBase}?cat=dessert" class="flex flex-col items-center gap-0.5 text-[10px] ${currentCat === "dessert" ? activeClass : idleClass}" style="${currentCat === "dessert" ? activeStyle : idleStyle}" data-nav="dessert">
            <span class="text-lg">🍰</span><span>حلى</span>
        </a>
        <a href="${cartHref}" class="relative flex flex-col items-center gap-0.5 text-[10px] ${idleClass}" style="${idleStyle}" data-nav="cart">
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

    updateCartBadge();
    window.addEventListener("storage", updateCartBadge);
    window.updateCartBadge = updateCartBadge;
})();
