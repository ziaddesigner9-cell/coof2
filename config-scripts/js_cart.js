/**
 * ملف: js_cart.js
 */

function getCart() {
    try {
        const data = localStorage.getItem("cart");
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("خطأ في قراءة بيانات السلة:", e);
        return [];
    }
}

function renderCart() {
    const container = document.getElementById("cart-items");
    const totalEl = document.getElementById("cart-total");
    const cart = getCart();
    if (!container) return;

    if (!cart || cart.length === 0) {
        container.innerHTML = "<p class='text-gray-500 text-center py-10'>السلة فارغة حالياً.</p>";
        if (totalEl) totalEl.innerText = "0 ريال";
        return;
    }

    let total = 0;
    container.innerHTML = cart
        .map((item, index) => {
            const qty = parseInt(item.quantity) || 1;
            const price = parseFloat(item.price) || 0;
            total += price * qty;
            return `
            <div class="bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between">
                <div>
                    <h3 class="font-bold text-gray-800">${item.name}</h3>
                    <p class="text-orange-600 font-bold">${price} ريال</p>
                </div>
                <div class="flex items-center gap-3 bg-gray-100 rounded-full px-3 py-1">
                    <button type="button" onclick="updateQty(${index}, -1)" class="text-xl font-bold px-2 text-gray-600">-</button>
                    <span class="font-bold w-6 text-center">${qty}</span>
                    <button type="button" onclick="updateQty(${index}, 1)" class="text-xl font-bold px-2 text-gray-600">+</button>
                </div>
            </div>`;
        })
        .join("");
    if (totalEl) totalEl.innerText = total + " ريال";
}

function updateQty(index, change) {
    const cart = getCart();
    if (!cart[index]) return;
    cart[index].quantity = (parseInt(cart[index].quantity) || 1) + change;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    renderCart();
}

function enableConfirmButton() {
    const btn = document.getElementById("confirm-btn");
    if (!btn) return;
    const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (client) {
        btn.disabled = false;
        btn.innerText = "تأكيد الطلب";
    }
}

async function confirmOrder() {
    const btn = document.getElementById("confirm-btn");
    const supabaseClient =
        typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;

    if (!supabaseClient) {
        alert("نظام الطلب غير متصل، يرجى تحديث الصفحة.");
        return;
    }

    const tableNoEl = document.getElementById("tableNo");
    const tableNo = tableNoEl ? tableNoEl.value.trim() : "";
    const cart = getCart();

    if (!tableNo) {
        alert("يرجى إدخال رقم الطاولة");
        return;
    }
    if (cart.length === 0) {
        alert("السلة فارغة");
        return;
    }

    btn.disabled = true;
    btn.innerText = "جاري الإرسال...";

    const total = cart.reduce((sum, item) => {
        const qty = parseInt(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        return sum + qty * price;
    }, 0);

    const orderCode = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
        const { data, error } = await supabaseClient
            .from("orders")
            .insert([
                {
                    table_no: String(tableNo),
                    items: cart,
                    total_price: total,
                    status: "pending",
                    order_code: orderCode,
                },
            ])
            .select("id, order_code")
            .single();

        if (error) {
            console.error("خطأ Supabase:", error);
            alert("خطأ في الإرسال: " + error.message);
            btn.disabled = false;
            btn.innerText = "تأكيد الطلب";
            return;
        }

        localStorage.removeItem("cart");
        const orderId = data?.id;
        // حفظ آخر طلب في الذاكرة المحلية لربط زر التتبع في الرئيسية
        if (orderId) localStorage.setItem("lastOrderId", orderId);
        const redirectUrl = orderId
            ? `tracking.html?orderId=${encodeURIComponent(orderId)}`
            : "tracking.html";
        window.location.href = redirectUrl;
    } catch (err) {
        console.error("فشل إرسال الطلب:", err);
        alert("تعذر إرسال الطلب. حاول مرة أخرى.");
        btn.disabled = false;
        btn.innerText = "تأكيد الطلب";
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("confirm-btn");
    if (btn) {
        btn.disabled = true;
        btn.innerText = "جاري الاتصال...";
    }
    renderCart();
    enableConfirmButton();
    document.getElementById("confirm-btn")?.addEventListener("click", confirmOrder);
    if (typeof window.updateHomeState === "function") window.updateHomeState(); // تحديث حالة السلة في الرئيسية
});

window.addEventListener("supabaseReady", enableConfirmButton);