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
                    <span class="font-bold w-6 text-center text-black">${qty}</span>
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

/**
 * التبديل بين نوع الطلب (محلي/توصيل) في الواجهة
 */
function setOrderType(type) {
    const localSection = document.getElementById("local-section");
    const deliverySection = document.getElementById("delivery-section");
    const localBtn = document.getElementById("tab-local");
    const deliveryBtn = document.getElementById("tab-delivery");

    if (type === 'local') {
        localSection?.classList.remove("hidden");
        deliverySection?.classList.add("hidden");
        localBtn?.classList.add("border-orange-500", "bg-orange-50");
        deliveryBtn?.classList.remove("border-orange-500", "bg-orange-50");
    } else {
        deliverySection?.classList.remove("hidden");
        localSection?.classList.add("hidden");
        deliveryBtn?.classList.add("border-orange-500", "bg-orange-50");
        localBtn?.classList.remove("border-orange-500", "bg-orange-50");
    }
}

/**
 * جلب موقع الزبون الجغرافي وتحويله لرابط خرائط جوجل
 */
async function shareLocation() {
    const addressEl = document.getElementById("deliveryAddress");
    if (!navigator.geolocation) {
        alert("متصفحك لا يدعم مشاركة الموقع.");
        return;
    }
    
    addressEl.placeholder = "جاري جلب الموقع...";
    navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        addressEl.value = mapUrl;
    }, (error) => {
        alert("تعذر جلب الموقع، يرجى كتابة العنوان يدوياً.");
        addressEl.placeholder = "الحي، الشارع، المعالم القريبة...";
    });
}

async function confirmOrder() {
    const btn = document.getElementById("confirm-btn");
    const supabaseClient =
        typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;

    if (!supabaseClient) {
        alert("⚠️ فشل الارتباط: لا يمكن إرسال الطلب حالياً. تأكد من إعدادات الربط في dependencies.js");
        return;
    }

    const localEl = document.getElementById("localInput");
    const deliveryNameEl = document.getElementById("deliveryName");
    const deliveryPhoneEl = document.getElementById("deliveryPhone");
    const deliveryAddressEl = document.getElementById("deliveryAddress");
    const paymentEl = document.querySelector('input[name="paymentMethod"]:checked');
    
    // التحقق من القسم الظاهر حالياً
    const isLocal = !document.getElementById("local-section")?.classList.contains("hidden");
    const localVal = (isLocal && localEl) ? localEl.value.trim() : "";

    const nameVal = (!isLocal && deliveryNameEl) ? deliveryNameEl.value.trim() : "";
    const phoneVal = (!isLocal && deliveryPhoneEl) ? deliveryPhoneEl.value.trim() : "";
    const paymentVal = (!isLocal && paymentEl) ? paymentEl.value : "";
    const addressVal = (!isLocal && deliveryAddressEl) ? deliveryAddressEl.value.trim() : "";

    const cart = getCart();

    if (isLocal && !localVal) {
        alert("يرجى إدخال رقم الطاولة");
        return;
    }
    if (!isLocal) {
        if (!nameVal || !phoneVal || !addressVal || !paymentVal) {
            alert("يرجى إكمال كافة بيانات التوصيل (الاسم، الجوال، الموقع، وطريقة الدفع)");
            return;
        }
        // التحقق من صحة رقم الجوال السعودي (10 أرقام يبدأ بـ 05)
        const phoneRegex = /^05\d{8}$/;
        if (!phoneRegex.test(phoneVal)) {
            alert("يرجى إدخال رقم جوال صحيح مكون من 10 أرقام ويبدأ بـ 05");
            return;
        }
    }
    if (cart.length === 0) {
        alert("السلة فارغة");
        return;
    }

    // تحديد نوع الطلب والموقع (محلي أو توصيل)
    const orderLocation = isLocal 
        ? `محلي: ${localVal}` 
        : `توصيل - الاسم: ${nameVal} | الجوال: ${phoneVal} | الدفع: ${paymentVal} | الموقع: ${addressVal}`;

    if (btn) {
        btn.disabled = true;
        btn.innerText = "جاري الإرسال...";
    }

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
                    table_no: orderLocation.substring(0, 500), // زيادة الطول لاستيعاب بيانات التوصيل كاملة
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
            if (btn) {
                btn.disabled = false;
                btn.innerText = "تأكيد الطلب";
            }
            return;
        }

        localStorage.removeItem("cart");
        
        // تحديث كافة العدادات في الصفحة الحالية
        if (typeof window.updateCartBadge === "function") {
            window.updateCartBadge();
        }
        if (typeof updateCartCount === "function") {
            updateCartCount();
        }

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
        if (btn) {
            btn.disabled = false;
            btn.innerText = "تأكيد الطلب";
        }
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
    document.getElementById("tab-local")?.addEventListener("click", () => setOrderType('local'));
    document.getElementById("tab-delivery")?.addEventListener("click", () => setOrderType('delivery'));
    
    // منع كتابة الأحرف في حقل الجوال
    const phoneInput = document.getElementById("deliveryPhone");
    if (phoneInput) {
        phoneInput.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/\D/g, "");
        });
    }

    if (typeof window.updateHomeState === "function") window.updateHomeState(); // تحديث حالة السلة في الرئيسية
});

window.addEventListener("supabaseReady", enableConfirmButton);