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

async function loadMenu() {
    const menuContainer = document.getElementById("menu-items");
    if (!menuContainer) return;

    const supabaseClient =
        typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (!supabaseClient) {
        console.error("خطأ: Supabase غير معرف!");
        return;
    }

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
                    const safeImage = escapeHtml(item.image_url || "https://via.placeholder.com/150");
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
    } catch (err) {
        console.error("فشل جلب الأصناف:", err);
        menuContainer.innerHTML = "<p class='text-center text-red-400 p-4'>تعذر تحميل الأصناف.</p>";
    }
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
document.addEventListener("DOMContentLoaded", () => {
    loadMenu();
    window.addEventListener("supabaseReady", loadMenu);
    
    document.getElementById("menu-items")?.addEventListener("click", (e) => {
        const btn = e.target.closest(".add-to-cart-btn");
        if (btn) {
            const { id, name, price, image } = btn.dataset;
            addToCart(id, name, price, image);
        }
    });
});