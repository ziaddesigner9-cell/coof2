/**
 * نظام عامل التوصيل: يعرض الطلبات الجاهزة فقط والموطنة بالكامل
 */

let isFetching = false;
let previousStatuses = new Map();
let isFirstLoad = true;
let audioContext = null;

function initAudio() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx && !audioContext) {
            audioContext = new AudioCtx();
        }
        if (audioContext) {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            var buffer = audioContext.createBuffer(1, 1, 22050);
            var source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            if (source.start) source.start(0);
            else if (source.noteOn) source.noteOn(0);
        }
    } catch (_) {}
}

function translatePayment(paymentStr) {
    if (!paymentStr) return phrase(null, 'unspecified', 'غير محدد');
    const p = String(paymentStr).toLowerCase();
    if (p.indexOf("كاش") !== -1 || p.indexOf("cash") !== -1) {
        return phrase(null, 'cash', '💵 كاش');
    }
    if (p.indexOf("بطاقة") !== -1 || p.indexOf("card") !== -1) {
        return phrase(null, 'card', '💳 بطاقة');
    }
    return phrase(null, paymentStr, paymentStr);
}

function translateInfoValue(val) {
    if (!val) return phrase(null, 'unspecified', 'غير محدد');
    const v = String(val).trim();
    if (v === "غير معروف" || v.toLowerCase() === "unknown") {
        return phrase(null, 'unknown', 'غير معروف');
    }
    if (v === "غير محدد" || v.toLowerCase() === "unspecified") {
        return phrase(null, 'unspecified', 'غير محدد');
    }
    return v;
}
document.addEventListener("click", initAudio, { once: true });
document.addEventListener("touchstart", initAudio, { once: true });

function playReadyAlert() {
    if (!audioContext) initAudio();
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
        audioContext.resume().then(function() { _playTone(); }).catch(function() { _playTone(); });
    } else {
        _playTone();
    }
}

function _playTone() {
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); 
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15); 
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc.start(now);
    osc.stop(now + 0.5);
}

function parseItems(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        const p = JSON.parse(raw);
        return Array.isArray(p) ? p : [];
    } catch {
        return [];
    }
}

function parseDeliveryDetails(text) {
    var safeText = text || "";
    try {
        var rawParts = safeText.split('|');
        var parts = [];
        for (var i = 0; i < rawParts.length; i++) {
            parts.push(rawParts[i].trim());
        }
        
        var name = "unknown"; // استخدام مفتاح إنجليزي للترجمة
        var phone = "unknown"; // استخدام مفتاح إنجليزي للترجمة
        var payment = "unspecified"; // استخدام مفتاح إنجليزي للترجمة
        var location = "";

        for (var j = 0; j < parts.length; j++) {
            var part = parts[j];
            var lowerPart = part.toLowerCase();
            var colonIdx = part.indexOf(":");
            if (colonIdx !== -1) {
                var key = lowerPart.substring(0, colonIdx).trim();
                var val = part.substring(colonIdx + 1).trim();
                
                if (key.indexOf("اسم") !== -1 || key.indexOf("name") !== -1 || key.indexOf("nom") !== -1) {
                    name = val;
                } else if (key.indexOf("جوال") !== -1 || key.indexOf("phone") !== -1 || key.indexOf("mobile") !== -1 || key.indexOf("mobilnummer") !== -1 || key.indexOf("portable") !== -1) {
                    phone = val;
                } else if (key.indexOf("دفع") !== -1 || key.indexOf("payment") !== -1 || key.indexOf("zahlungsmethode") !== -1 || key.indexOf("paiement") !== -1) {
                    payment = val;
                } else if (key.indexOf("موقع") !== -1 || key.indexOf("location") !== -1 || key.indexOf("address") !== -1 || key.indexOf("standort") !== -1 || key.indexOf("localisation") !== -1) {
                    location = val;
                }
            }
        }
        return { name: name, phone: phone, payment: payment, location: location };
    } catch (e) {
        return { name: "خطأ في البيانات", phone: safeText, payment: "unspecified", location: "" };
    }
}

async function loadDeliveryOrders() {
    if (isFetching) return;
    isFetching = true;

    const container = document.getElementById("delivery-orders");
    const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (!container) { isFetching = false; return; }

    if (!client) {
        container.innerHTML = `<p class="text-amber-500 text-center py-10">${phrase(null, 'delivery_connecting', 'جاري الاتصال بالنظام...')}</p>`;
        isFetching = false;
        return;
    }

    try {
        const { data: orders, error } = await client
            .from("orders")
            .select("*")
            .in("status", ["pending", "preparing", "ready_for_delivery", "out_for_delivery"]) // جلب الحالات التي تهم السائق
            .order("created_at", { ascending: false });

        if (error) {
            container.innerHTML = `<p class="text-red-400 text-center">${phrase(null, 'delivery_load_error', 'خطأ: {error}').replace('{error}', error.message)}</p>`;
            isFetching = false;
            return;
        }

        const currentOrders = orders || [];
        // الفلتر المزدوج: يعتمد على الحقل الجديد، أو يقرأ من النص كاحتياط للطلبات القادمة من كاش قديم للزبون
        const deliveryOnly = currentOrders.filter(function(o) {
            if (!o.table_no) return o.order_type === 'delivery';
            const lower = o.table_no.toLowerCase();
            const hasText = lower.indexOf("توصيل") !== -1 || lower.indexOf("delivery") !== -1 || lower.indexOf("lieferung") !== -1 || lower.indexOf("livraison") !== -1;
            return o.order_type === 'delivery' || hasText;
        });

        // التحقق من تغير الحالة من ذهبي (preparing/pending) إلى أخضر (ready)
        if (!isFirstLoad) {
            deliveryOnly.forEach(function(order) {
                const prevStatus = previousStatuses.get(order.id);
                if (order.status === 'ready_for_delivery' && (prevStatus === 'pending' || prevStatus === 'preparing')) {
                    playReadyAlert();
                }
            });
        }

        // تصفية الطلبات التي هي "توصيل" فقط
        if (deliveryOnly.length === 0) {
            container.innerHTML = `
                <div class="text-center py-20">
                    <span class="text-5xl block mb-4">💤</span>
                    <p class="text-zinc-500">${phrase(null, 'delivery_no_orders', 'لا توجد طلبات توصيل جاهزة حالياً')}</p>
                </div>`;
            return;
        }

        container.innerHTML = deliveryOnly.map(function(order) {
            const info = parseDeliveryDetails(order.table_no);
            
            const items = parseItems(order.items);
            const mapLink = info.location.indexOf('http') !== -1
                ? `<a href="${info.location}" target="_blank" class="block w-full bg-blue-600 text-center py-3 rounded-xl font-bold mb-2">${phrase(null, 'delivery_map_button', '📍 فتح الموقع في الخرائط')}</a>`
                : `<div class="bg-zinc-800 p-3 rounded-xl mb-2 text-sm text-zinc-300">${phrase(null, 'delivery_address_label', '🏠 العنوان: {address}').replace('{address}', info.location || '—')}</div>`;

            const appBaseUrl = window.resolveSiteBase();
            const qrCodeUpdateUrl = `${appBaseUrl}Front-end/delivery_status_update.html?orderId=${order.id}`;

            // تحديد لون الكود: ذهبي للتحضير، أخضر للجاهزية
            const isReady = order.status === 'ready_for_delivery' || order.status === 'out_for_delivery';
            const qrColor = isReady ? '10B981' : 'D4AF37';
            const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=${qrColor}&data=${encodeURIComponent(qrCodeUpdateUrl)}`;

            let actionContent = '';
            let statusLabel = '';

            if (order.status === 'pending' || order.status === 'preparing') {
                statusLabel = `<span class="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-1 rounded-lg border border-amber-500/20">${phrase(null, 'delivery_status_preparing', 'جاري التحضير بالمطبخ')}</span>`;
                actionContent = `
                    <div class="text-center mt-4 bg-zinc-800/50 p-3 rounded-2xl border border-amber-500/20">
                        <p class="text-amber-500 text-xs font-bold mb-2">${phrase(null, 'delivery_wait_green', 'انتظر اللون الأخضر:')}</p>
                        <img src="${qrCodeImageUrl}" class="mx-auto w-32 h-32 opacity-50 mb-3">
                        <button disabled class="w-full bg-zinc-800 text-zinc-600 py-3 rounded-xl font-bold cursor-not-allowed border border-zinc-700">
                            ${phrase(null, 'delivery_waiting_kitchen', 'الطلب في الطريق (بانتظار المطبخ) ⏳')}
                        </button>
                    </div>`;
            } else if (order.status === 'ready_for_delivery') {
                statusLabel = `<span class="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-1 rounded-lg border border-emerald-500/20">${phrase(null, 'delivery_status_ready', 'جاهز للتوصيل')}</span>`;
                actionContent = `
                    <div class="text-center mt-4 bg-white p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
                        <p class="text-black text-xs font-bold mb-2">${phrase(null, 'delivery_scan_or_click', 'امسح أو اضغط للبدء:')}</p>
                        <img src="${qrCodeImageUrl}" class="mx-auto w-32 h-32 mb-3">
                        <button onclick="startDeliveryManually('${order.id}')" class="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-500 transition shadow-md">
                            ${phrase(null, 'delivery_confirm_receipt', 'تأكيد الاستلام (الطلب في الطريق) 🚚')}
                        </button>
                    </div>`;
            } else {
                statusLabel = `<span class="bg-blue-500/10 text-blue-500 text-[10px] px-2 py-1 rounded-lg border border-blue-500/20">${phrase(null, 'delivery_status_out', 'في الطريق')}</span>`;
                actionContent = `
                    <button onclick="finishDelivery('${order.id}')" class="w-full bg-zinc-100 text-black py-4 rounded-2xl font-bold hover:bg-white transition">
                        ${phrase(null, 'delivery_delivered_btn', 'تم التسليم للزبون ✓')}
                    </button>`;
            }

            const totalPrice = parseFloat(order.total_price || 0);

            const translatedName = translateInfoValue(info.name);
            const translatedPhone = translateInfoValue(info.phone);
            const translatedPayment = translatePayment(info.payment);

            return `
            <div class="bg-zinc-900 border border-emerald-500/30 rounded-3xl p-5 shadow-xl">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-emerald-400">${escapeHtml(translatedName)}</h3>
                        <a href="tel:${translatedPhone}" class="text-amber-500 font-mono text-lg font-bold">📞 ${escapeHtml(translatedPhone)}</a>
                        <p class="text-lg font-black text-white mt-1">${phrase(null, 'delivery_total', 'المجموع: {price}').replace('{price}', formatPrice(totalPrice))}</p>
                        <p class="text-xs text-zinc-400 mt-1">${phrase(null, 'delivery_payment_method', '💳 طريقة الدفع: ')}<span class="text-amber-300 font-bold">${escapeHtml(translatedPayment)}</span></p>
                    </div>
                    ${statusLabel}
                </div>

                <div class="space-y-2 mb-4">
                    <p class="text-xs text-zinc-500">${phrase(null, 'items_label', 'Items:')}</p>
                    <ul class="text-sm text-zinc-300">
                        ${items.map(function(i) { return `<li>• ${escapeHtml(phrase(null, i.name, i.name))} × ${i.quantity}</li>`; }).join('')}
                    </ul>
                </div>

                ${mapLink}
                ${actionContent}
            </div>`;
        }).filter(Boolean).join('');

        // تحديث سجل الحالات للمرة القادمة
        previousStatuses.clear();
        deliveryOnly.forEach(function(o) { previousStatuses.set(o.id, o.status); });
        isFirstLoad = false;

    } finally {
        isFetching = false;
    }
}

async function startDeliveryManually(orderId) {
    const result = await markAsOutForDelivery(orderId);
    if (!result.ok) {
        alert(phrase(null, 'delivery_update_failed', 'فشل تحديث حالة الطلب.') + " " + result.error);
    } else {
        loadDeliveryOrders();
    }
}

async function markAsOutForDelivery(orderId) {
    const client = window.getSupabaseClient();
    const { data, error } = await client
        .from("orders")
        .update({ status: "out_for_delivery" })
        .eq("id", orderId)
        .eq("status", "ready_for_delivery")
        .select();

    if (error) {
        console.error("خطأ في تحديث طلب التوصيل:", error);
        return { ok: false, error: error.message };
    }
    
    if (!data || data.length === 0) {
        return { ok: false, error: phrase(null, 'delivery_err_no_order', 'الطلب غير موجود') };
    }

    return { ok: true, data };
}

async function finishDelivery(orderId) {
    const client = window.getSupabaseClient();
    const { data, error } = await client.from("orders").update({ status: "completed_delivery" }).eq("id", orderId).select();
    if (error) {
        alert(phrase(null, 'delivery_load_error', 'خطأ: {error}').replace('{error}', error.message));
    } else if (!data || data.length === 0) {
        alert(phrase(null, 'delivery_err_session_expired', 'تعذر إنهاء الطلب (قد تكون الجلسة انتهت، يرجى تسجيل الدخول مجدداً)'));
    } else {
        loadDeliveryOrders();
    }
}

let deliveryChannel = null;
function subscribeDeliveryRealtime() {
    const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (client) {
        try {
            if (deliveryChannel) {
                client.removeChannel(deliveryChannel);
                deliveryChannel = null;
            }
        } catch (e) {}

        deliveryChannel = client.channel('delivery_orders_realtime_' + Date.now())
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'orders' 
            }, function() {
                loadDeliveryOrders();
            });
        deliveryChannel.subscribe();
    }
}

function applyDirection() {
    const lang = localStorage.getItem("coof2_userLang") || "ar";
    if (lang === "ar") {
        document.documentElement.dir = "rtl";
        document.documentElement.lang = "ar";
    } else {
        document.documentElement.dir = "ltr";
        document.documentElement.lang = lang;
    }
}

let isDeliveryInit = false;
function initDelivery() {
    if (isDeliveryInit) return;
    isDeliveryInit = true;

    if (typeof checkAccess === "function" && !checkAccess('delivery') && !checkAccess('admin')) {
        window.location.replace("admin-login.html");
        return;
    }

    applyDirection();
    loadDeliveryOrders();
    setInterval(loadDeliveryOrders, 60000);

    subscribeDeliveryRealtime();
}

window.addEventListener('languageChanged', function() {
    applyDirection();
    loadDeliveryOrders();
});

document.addEventListener("DOMContentLoaded", function() {
    const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (client) initDelivery();
    window.addEventListener("supabaseReady", initDelivery);
});

document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") {
        console.log("العودة للتوصيل، تحديث طلبات التوصيل والاشتراك اللحظي...");
        loadDeliveryOrders();
        subscribeDeliveryRealtime();
    }
});

window.finishDelivery = finishDelivery;
window.markAsOutForDelivery = markAsOutForDelivery;
window.startDeliveryManually = startDeliveryManually;