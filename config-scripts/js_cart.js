/**
 * ملف: js_cart.js
 */

function getCart() {
    try {
        const data = localStorage.getItem("coof2_cart");
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

    // تحديد الاتجاه والمحاذاة ديناميكياً حسب اللغة النشطة
    let currentLang = 'ar';
    try {
        currentLang = localStorage.getItem('coof2_userLang') || 'ar';
    } catch (_) {}
    
    const isRtl = currentLang === 'ar';
    const directionClass = isRtl ? 'rtl' : 'ltr';
    const textAlignment = isRtl ? 'text-right' : 'text-left';
    const paddingClass = isRtl ? 'pr-1' : 'pl-1';

    container.classList.remove("flex-row");
    container.classList.add("flex", "flex-col", "w-full", "px-1");
    container.style.display = "flex";

    const emptyMsg = phrase(null, 'cart_empty', "السلة فارغة حالياً.");

    if (!cart || cart.length === 0) {
        container.innerHTML = `<p class='text-gray-500 text-center py-10'>${emptyMsg}</p>`;
        if (totalEl) totalEl.innerText = typeof formatPrice === 'function' ? formatPrice(0) : "0 ريال";
        return;
    }

    var total = 0;
    container.innerHTML = cart
        .map(function(item, index) {
            var qtyVal = item.quantity;
            if (qtyVal === undefined || qtyVal === null) qtyVal = item.qty;
            if (qtyVal === undefined || qtyVal === null) qtyVal = item.count;
            if (qtyVal === undefined || qtyVal === null) qtyVal = 1;
            var qty = parseInt(qtyVal);
            var price = parseFloat(item.price) || 0;
            total += price * qty;

            const displayName = phrase(null, item.name) || item.name;
            const itemPriceFormatted = typeof formatPrice === 'function' ? formatPrice(price) : (price + " ر.س");

            return `
            <div class="w-full flex items-center justify-between bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 gap-3" 
                 style="direction: ${directionClass} !important; display: flex !important; flex-shrink: 0 !important;">
                
                <!-- الاسم والسعر -->
                <div class="flex-grow min-w-0 ${paddingClass} ${textAlignment}">
                    <h4 class="font-bold text-white text-sm md:text-base leading-tight truncate" style="color: #ffffff !important;">${displayName}</h4>
                    <p class="text-amber-500 font-bold text-xs mt-1" style="color: #f5d76e !important;">${itemPriceFormatted}</p>
                </div>

                <!-- الكمية (وسط) -->
                <div class="shrink-0 w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
                    <span class="font-black text-amber-500 text-base" style="color: #f5d76e !important; display: inline-block !important;">
                        ${qty}
                    </span>
                </div>

                <!-- أزرار التحكم -->
                <div class="shrink-0 flex items-center gap-2" onclick="event.stopPropagation()" style="display: flex !important;">
                    <button type="button" onclick="updateQty(${index}, -1)" 
                            class="w-10 h-10 text-zinc-500 hover:text-white active:scale-75 transition-all text-3xl bg-transparent border-none outline-none">
                        -
                    </button>
                    <button type="button" onclick="updateQty(${index}, 1)" 
                            class="w-10 h-10 text-amber-500 hover:text-amber-400 active:scale-75 transition-all text-3xl bg-transparent border-none outline-none">
                        +
                    </button>
                </div>
            </div>`;
        })
        .join("");

    if (totalEl) totalEl.innerText = typeof formatPrice === 'function' ? formatPrice(total) : (total + " ريال");

    // خدعة Safari Force Reflow
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
    try {
        localStorage.setItem("coof2_cart", JSON.stringify(cart));
    } catch (err) {
        console.error("فشل حفظ السلة في localStorage:", err);
    }
    renderCart();
}

function enableConfirmButton() {
    const btn = document.getElementById("confirm-btn");
    if (!btn) return;
    const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (client) {
        let currentLang = 'ar';
        try {
            currentLang = localStorage.getItem('coof2_userLang') || 'ar';
        } catch (_) {}
        btn.disabled = false;
        btn.innerText = phrase(null, 'confirm_order', "تأكيد الطلب");
    }
}

function setOrderType(type) {
    var localSection = document.getElementById("local-section");
    var deliverySection = document.getElementById("delivery-section");
    var localBtn = document.getElementById("tab-local");
    var deliveryBtn = document.getElementById("tab-delivery");

    if (type === 'local') {
        if (localSection) localSection.classList.remove("hidden");
        if (deliverySection) deliverySection.classList.add("hidden");
        if (localBtn) localBtn.classList.add("border-orange-500", "bg-orange-50");
        if (deliveryBtn) deliveryBtn.classList.remove("border-orange-500", "bg-orange-50");
    } else {
        if (deliverySection) deliverySection.classList.remove("hidden");
        if (localSection) localSection.classList.add("hidden");
        if (deliveryBtn) deliveryBtn.classList.add("border-orange-500", "bg-orange-50");
        if (localBtn) localBtn.classList.remove("border-orange-500", "bg-orange-50");
    }
}

async function shareLocation(btn) {
    const addressEl = document.getElementById("deliveryAddress");
    const textEl = document.getElementById("share-location-text");
    
    let currentLang = 'ar';
    try {
        currentLang = localStorage.getItem('coof2_userLang') || 'ar';
    } catch (_) {}

    const isAr = currentLang === 'ar';
    const gpsSupportMsg = isAr ? "متصفحك لا يدعم مشاركة الموقع." : "Your browser does not support geolocation.";
    const gpsLocatingMsg = isAr ? "جاري تحديد موقعك الجغرافي..." : "Locating your GPS coordinates...";
    const gpsFetchingMsg = isAr ? "جاري جلب الإحداثيات..." : "Fetching coordinates...";
    const gpsSuccessMsg = phrase(null, 'gps_success', "تم تحديد الموقع بنجاح ✓");
    const gpsErrorMsg = isAr ? "تعذر جلب الموقع تلقائياً، يرجى كتابة العنوان يدوياً." : "Could not acquire location automatically, please type it manually.";
    const gpsFailedStatus = isAr ? "فشل التحديد تلقائياً - يرجى الكتابة بالأسفل" : "GPS failed - Please type below";
    const gpsPlaceholderStatus = isAr ? "الحي، الشارع، المعالم القريبة..." : "Street, Suburb, Postcode...";

    if (!navigator.geolocation) {
        alert(gpsSupportMsg);
        return;
    }
    
    if (btn) {
        btn.disabled = true;
        btn.classList.add("opacity-70");
    }
    if (textEl) textEl.innerText = gpsLocatingMsg;
    if (addressEl) addressEl.placeholder = gpsFetchingMsg;
    
    navigator.geolocation.getCurrentPosition(function(position) {
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;
        var mapUrl = "https://www.google.com/maps?q=" + latitude + "," + longitude;
        if (addressEl) addressEl.value = mapUrl;
        if (textEl) textEl.innerText = gpsSuccessMsg;
        if (btn) {
            btn.disabled = false;
            btn.classList.remove("opacity-70");
            btn.classList.remove("border-amber-800/60", "text-amber-300");
            btn.classList.add("border-emerald-600", "text-emerald-400");
        }
    }, function(error) {
        alert(gpsErrorMsg);
        if (textEl) textEl.innerText = gpsFailedStatus;
        if (addressEl) addressEl.placeholder = gpsPlaceholderStatus;
        if (btn) {
            btn.disabled = false;
            btn.classList.remove("opacity-70");
        }
    });
}

async function confirmOrder() {
    var btn = document.getElementById("confirm-btn");
    var supabaseClient =
        typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;

    let currentLang = 'ar';
    try {
        currentLang = localStorage.getItem('coof2_userLang') || 'ar';
    } catch (_) {}

    const isAr = currentLang === 'ar';
    const connectionErrorMsg = isAr 
        ? "⚠️ فشل الارتباط: لا يمكن إرسال الطلب حالياً. تأكد من إعدادات الربط في dependencies.js" 
        : "⚠️ Connection failed: Cannot send order. Verify configurations in dependencies.js";
    
    if (!supabaseClient) {
        alert(connectionErrorMsg);
        return;
    }

    var localEl = document.getElementById("localInput");
    var deliveryNameEl = document.getElementById("deliveryName");
    var deliveryPhoneEl = document.getElementById("deliveryPhone");
    var deliveryAddressEl = document.getElementById("deliveryAddress");
    var paymentEl = document.querySelector('input[name="paymentMethod"]:checked');
    
    var localSection = document.getElementById("local-section");
    var isLocal = localSection ? !localSection.classList.contains("hidden") : true;
    var localVal = (isLocal && localEl) ? localEl.value.trim() : "";

    var nameVal = (!isLocal && deliveryNameEl) ? deliveryNameEl.value.trim() : "";
    var phoneVal = (!isLocal && deliveryPhoneEl) ? deliveryPhoneEl.value.trim() : "";
    var paymentVal = (!isLocal && paymentEl) ? paymentEl.value : "";
    var addressVal = (!isLocal && deliveryAddressEl) ? deliveryAddressEl.value.trim() : "";

    var cart = getCart();

    const valTable = phrase(null, 'validation_table', "يرجى إدخال رقم الطاولة");
    const valName = phrase(null, 'validation_name', "يرجى إدخال الاسم");
    const valPhone = phrase(null, 'validation_phone', "يرجى إدخال رقم الجوال");
    const valAddress = phrase(null, 'validation_address', "يرجى تحديد الموقع أو كتابة العنوان");
    const valCompleteDelivery = isAr
        ? "يرجى إكمال كافة بيانات التوصيل (الاسم، الجوال، الموقع، وطريقة الدفع)"
        : "Please complete all delivery information (Name, Mobile, Address, and Payment)";
    const valCartEmpty = phrase(null, 'cart_empty', "السلة فارغة");
    const msgPlacing = phrase(null, 'order_placing', "جاري إرسال الطلب...");
    const msgPlacingFailed = isAr ? "تعذر إرسال الطلب. حاول مرة أخرى." : "Could not place the order. Try again.";

    if (isLocal && !localVal) {
        alert(valTable);
        return;
    }
    if (!isLocal) {
        if (!nameVal || !phoneVal || !addressVal || !paymentVal) {
            alert(valCompleteDelivery);
            return;
        }
        
        // التحقق من صيغة الهاتف ديناميكياً لكل بلد
        const config = window.phoneConfig[currentLang] || window.phoneConfig['ar'];
        const phoneRegex = new RegExp(config.pattern);
        if (!phoneRegex.test(phoneVal)) {
            alert(config.errorMsg);
            return;
        }
    }
    if (cart.length === 0) {
        alert(valCartEmpty);
        return;
    }

    var notesEl = document.getElementById("order-notes");
    var notesVal = notesEl ? notesEl.value.trim() : "";

    var orderLocation = isLocal 
        ? "محلي: " + localVal 
        : "توصيل - الاسم: " + nameVal + " | الجوال: " + phoneVal + " | الدفع: " + paymentVal + " | الموقع: " + addressVal;

    if (notesVal) {
        orderLocation += " | ملاحظات: " + notesVal;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerText = msgPlacing;
    }

    var total = 0;
    for (var i = 0; i < cart.length; i++) {
        var qty = parseInt(cart[i].quantity) || 0;
        var price = parseFloat(cart[i].price) || 0;
        total += qty * price;
    }

    var orderCode = "ORD-" + Math.floor(1000 + Math.random() * 9000);

    try {
        var res = await supabaseClient
            .from("orders")
            .insert([
                {
                    table_no: orderLocation.substring(0, 500),
                    items: cart,
                    total_price: total,
                    status: "pending",
                    order_code: orderCode,
                },
            ])
            .select("id, order_code")
            .single();

        var error = res.error;
        var data = res.data;

        if (error) {
            console.error("خطأ Supabase:", error);
            alert("Error: " + error.message);
            if (btn) {
                btn.disabled = false;
                btn.innerText = phrase(null, 'confirm_order', "تأكيد الطلب");
            }
            return;
        }

        try {
            localStorage.removeItem("coof2_cart");
        } catch (err) {
            console.error("فشل إزالة السلة من localStorage:", err);
        }
        
        if (typeof window.updateCartBadge === "function") {
            window.updateCartBadge();
        }
        if (typeof updateCartCount === "function") {
            updateCartCount();
        }

        var orderId = data ? data.id : null;
        if (orderId) {
            try {
                localStorage.setItem("coof2_lastOrderId", orderId);
            } catch (err) {
                console.error("فشل حفظ آخر طلب في localStorage:", err);
            }
        }

        var redirectUrl = orderId
            ? "tracking.html?orderId=" + encodeURIComponent(orderId)
            : "tracking.html";
        window.location.href = redirectUrl;
    } catch (err) {
        console.error("فشل إرسال الطلب:", err);
        alert(msgPlacingFailed);
        if (btn) {
            btn.disabled = false;
            btn.innerText = phrase(null, 'confirm_order', "تأكيد الطلب");
        }
    }
}

window.addEventListener("DOMContentLoaded", function() {
    let currentLang = 'ar';
    try {
        currentLang = localStorage.getItem('coof2_userLang') || 'ar';
    } catch (_) {}

    var btn = document.getElementById("confirm-btn");
    if (btn) {
        btn.disabled = true;
        btn.innerText = phrase(null, 'loading', "جاري الاتصال...");
    }
    renderCart();
    enableConfirmButton();
    
    var confirmBtn = document.getElementById("confirm-btn");
    if (confirmBtn) confirmBtn.addEventListener("click", confirmOrder);
    
    var tabLocal = document.getElementById("tab-local");
    if (tabLocal) tabLocal.addEventListener("click", function() { setOrderType('local'); });
    
    var tabDelivery = document.getElementById("tab-delivery");
    if (tabDelivery) tabDelivery.addEventListener("click", function() { setOrderType('delivery'); });
    
    var phoneInput = document.getElementById("deliveryPhone");
    if (phoneInput) {
        phoneInput.addEventListener("input", function(e) {
            e.target.value = e.target.value.replace(/\D/g, "");
        });
    }

    if (typeof window.updateHomeState === "function") window.updateHomeState();

    // استماع لحدث تغيير اللغة لإعادة بناء السلة باللغة الجديدة فوراً
    window.addEventListener('languageChanged', function() {
        renderCart();
        enableConfirmButton();
    });
});

window.addEventListener("supabaseReady", enableConfirmButton);