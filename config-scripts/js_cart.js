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

    // 🛠️ فرض الترتيب العمودي على الحاوية لضمان ظهور الأصناف تحت بعضها
    container.classList.remove("flex-row");
    container.classList.add("flex", "flex-col", "w-full", "px-1");
    container.style.display = "flex";

    if (!cart || cart.length === 0) {
        container.innerHTML = "<p class='text-gray-500 text-center py-10'>السلة فارغة حالياً.</p>";
        if (totalEl) totalEl.innerText = "0 ريال";
        return;
    }

    let total = 0;
    container.innerHTML = cart
        .map((item, index) => {
            const qty = parseInt(item.quantity ?? item.qty ?? item.count ?? 1);
            const price = parseFloat(item.price) || 0;
            total += price * qty;
            return `
            <div class="w-full flex items-center justify-between bg-zinc-900/40 border-b border-zinc-800/50 p-4 mb-1 text-right gap-4" style="direction: rtl !important; display: flex !important;">
                
                <!-- معلومات الصنف -->
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-white text-base leading-tight truncate" style="color: #ffffff !important; margin-bottom: 4px;">${item.name}</h4>
                    <p class="text-amber-500 font-bold text-sm" style="color: #f5d76e !important;">${price} ريال</p>
                </div>

                <!-- التحكم في الكمية (بدون خلفيات ملونة للأزرار) -->
                <div class="shrink-0 flex items-center gap-4" onclick="event.stopPropagation()" style="display: flex !important;">
                    <button type="button" onclick="updateQty(${index}, -1)" 
                            class="w-10 h-10 text-zinc-400 hover:text-white active:scale-90 font-bold flex items-center justify-center transition text-4xl bg-transparent border-none outline-none shadow-none">
                        -
                    </button>
                    <span class="font-black text-white text-lg min-w-[30px] text-center" style="color: #ffffff !important; display: inline-block !important;">
                        ${qty}
                    </span>
                    <button type="button" onclick="updateQty(${index}, 1)" 
                            class="w-10 h-10 text-amber-500 hover:text-amber-400 active:scale-90 font-bold flex items-center justify-center transition text-4xl bg-transparent border-none outline-none shadow-none">
                        +
                    </button>
                </div>
            </div>`;
        })
        .join("");
    if (totalEl) totalEl.innerText = total + " ريال";

    // 🪄 خدعة Force Reflow لإجبار متصفح Safari على إعادة رسم الألوان والأبعاد فوراً
    if (container) {
        container.style.display = 'none';
        void container.offsetHeight; 
        container.style.display = 'block';
    }
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