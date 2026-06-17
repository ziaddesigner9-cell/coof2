/**
 * لوحة العامل (المطبخ): النسخة النهائية والمستقرة والموطنة بالكامل
 */

let activeOrderId = null;
let timerInterval = null;
let timerStartedAt = null;
let kitchenTickInterval = null;
let knownOrderIds = new Set();
let firstLoad = true;
let audioContext = null;
let isFetching = false;
let ordersCache = []; 

const LOCAL_PREP_KEY = "kitchen_local_preparing";
const LOCAL_OPENED_KEY = "coof2_kitchen_opened_at";

function getClient() {
    return typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
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

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatElapsed(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatClock(iso) {
    if (!iso) return "—";
    try {
        let lang = localStorage.getItem("coof2_userLang") || "ar";
        let locale = "ar-SA";
        if (lang === "en" || lang === "en-AU") locale = "en-US";
        else if (lang === "de") locale = "de-DE";
        else if (lang === "fr") locale = "fr-FR";
        return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "—";
    }
}

function sortNewestFirst(list) {
    return list.slice().sort(function(a, b) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
}

function getOpenedAt(order) {
    if (order.preparing_started_at) return order.preparing_started_at;
    try {
        var map = JSON.parse(localStorage.getItem(LOCAL_OPENED_KEY) || "{}");
        if (map[order.id]) return new Date(map[order.id]).toISOString();
    } catch (_) {}
    var prep = getLocalPreparingMap()[order.id];
    if (prep && prep.startedAt) return new Date(prep.startedAt).toISOString();
    return null;
}

function rememberOpenedAt(orderId) {
    try {
        var map = JSON.parse(localStorage.getItem(LOCAL_OPENED_KEY) || "{}");
        if (!map[orderId]) {
            map[orderId] = Date.now();
            localStorage.setItem(LOCAL_OPENED_KEY, JSON.stringify(map));
        }
    } catch (err) {
        console.error("rememberOpenedAt localstorage failed:", err);
    }
}

function clearOpenedAt(orderId) {
    try {
        var map = JSON.parse(localStorage.getItem(LOCAL_OPENED_KEY) || "{}");
        if (map[orderId]) {
            delete map[orderId];
            localStorage.setItem(LOCAL_OPENED_KEY, JSON.stringify(map));
        }
    } catch (err) {
        console.error("clearOpenedAt localstorage failed:", err);
    }
}

function renderTimeBadges(order, mode) {
    const arrived = order.created_at;
    const opened = getOpenedAt(order);

    if (mode === "pending") {
        return `
        <div class="flex flex-wrap gap-1.5 mt-2 text-[11px]">
            <span class="px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-700/40">📥 ${phrase(null, 'arrived', 'وصل')} ${formatClock(arrived)}</span>
            <span class="px-2 py-0.5 rounded-md bg-zinc-900 text-amber-200 font-mono border border-amber-600/30"
                data-kitchen-wait="${order.id}" data-since="${arrived || ""}">
                ⏱ ${phrase(null, 'wait', 'انتظار')} <span class="wait-el">00:00</span>
            </span>
        </div>`;
    }

    if (mode === "active") {
        return `
        <div class="flex flex-wrap gap-1.5 mt-2 text-[11px]">
            <span class="px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-700/40">📥 ${phrase(null, 'arrived', 'وصل')} ${formatClock(arrived)}</span>
            <span class="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/40">▶ ${phrase(null, 'opened', 'فُتح')} ${formatClock(opened)}</span>
            <span class="px-2 py-0.5 rounded-md bg-zinc-900 text-amber-200 font-mono border border-amber-600/30"
                data-kitchen-prep="${order.id}" data-since="${opened || ""}">
                ⏱ ${phrase(null, 'prep', 'تجهيز')} <span class="prep-el">00:00</span>
            </span>
        </div>`;
    }
    return "";
}

function tickAllKitchenTimers() {
    document.querySelectorAll("[data-kitchen-wait]").forEach(function(el) {
        const since = el.dataset.since;
        const target = el.querySelector(".wait-el");
        if (!since || !target) return;
        target.textContent = formatElapsed(Date.now() - new Date(since).getTime());
    });
    document.querySelectorAll("[data-kitchen-prep]").forEach(function(el) {
        const since = el.dataset.since;
        const target = el.querySelector(".prep-el");
        if (!since || !target) return;
        target.textContent = formatElapsed(Date.now() - new Date(since).getTime());
    });
}

function startKitchenTicks() {
    tickAllKitchenTimers();
    if (kitchenTickInterval) clearInterval(kitchenTickInterval);
    kitchenTickInterval = setInterval(tickAllKitchenTimers, 1000);
}

function initAudioContext() {
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
document.addEventListener("click", initAudioContext, { once: true });
document.addEventListener("touchstart", initAudioContext, { once: true });

function playNewOrderSound() {
    if (!audioContext) initAudioContext();
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
        audioContext.resume().then(function() { _playNewOrderSoundLogic(); }).catch(function() { _playNewOrderSoundLogic(); });
    } else {
        _playNewOrderSoundLogic();
    }
}

function _playNewOrderSoundLogic() {
    if (!audioContext) return;
    [0, 0.2].forEach(function(delay) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0.2, audioContext.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.25);
        osc.start(audioContext.currentTime + delay);
        osc.stop(audioContext.currentTime + delay + 0.25);
    });
}

function getLocalPreparingMap() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_PREP_KEY) || "{}");
    } catch (e) {
        return {};
    }
}

function clearLocalPreparing(orderId) {
    var map = getLocalPreparingMap();
    delete map[orderId];
    try {
        localStorage.setItem(LOCAL_PREP_KEY, JSON.stringify(map));
    } catch (err) {
        console.error("clearLocalPreparing localstorage failed:", err);
    }
}

async function markAsReadyForPickup(orderId) {
    const payload = { status: "ready_for_pickup" };
    const result = await updateOrder(orderId, payload, ["pending", "preparing"]);
    if (result.ok) {
        clearLocalPreparing(orderId);
        clearOpenedAt(orderId);
        try {
            localStorage.removeItem(`coof2_kitchen_timer_${orderId}`);
        } catch (e) {}
        if (String(activeOrderId) === String(orderId)) closeActive();
        loadOrders();
    } else {
        alert(phrase(null, 'kitchen_db_update_error', 'فشل التحديث: ') + result.error);
    }
}

async function markAsReadyForDelivery(orderId) {
    const payload = { status: "ready_for_delivery" };
    const result = await updateOrder(orderId, payload, ["pending", "preparing"]);
    if (result.ok) {
        clearLocalPreparing(orderId);
        clearOpenedAt(orderId);
        if (String(activeOrderId) === String(orderId)) closeActive();
        loadOrders();
    } else {
        alert(phrase(null, 'kitchen_db_update_error', 'فشل التحديث: ') + result.error);
    }
}

async function markAsPickedUp(orderId) {
    const payload = { status: "completed_local" };
    const result = await updateOrder(orderId, payload, "ready_for_pickup");
    if (result.ok) {
        loadOrders();
    } else {
        loadOrders();
    }
}

function closeActive() {
    activeOrderId = null;
    try {
        localStorage.removeItem("coof2_kitchen_active_order");
    } catch (e) {}
    stopTimer();
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerStartedAt = null;
}

function startTimerDisplay(order) {
    stopTimer();
    const el = document.getElementById("order-timer");
    if (!el) return;

    var stored = null;
    try {
        stored = localStorage.getItem(`coof2_kitchen_timer_${order.id}`);
    } catch (e) {}
    const started = order.preparing_started_at
        ? new Date(order.preparing_started_at).getTime()
        : stored
          ? parseInt(stored, 10)
          : Date.now();
    if (!stored) {
        try {
            localStorage.setItem(`coof2_kitchen_timer_${order.id}`, String(started));
        } catch (e) {}
    }
    timerStartedAt = started;

    var tick = function() {
        el.textContent = formatElapsed(Date.now() - timerStartedAt);
    };
    tick();
    timerInterval = setInterval(tick, 1000);
}

function renderItemsList(items) {
    if (!items.length) return `<li class="text-zinc-500">${phrase(null, 'no_items', 'لا توجد أصناف')}</li>`;
    return items
        .map(
            function(item) {
                const translatedName = phrase(null, item.name, item.name);
                const itemPrice = parseFloat(item.price) || 0;
                const itemQty = parseInt(item.quantity) || 1;
                return `
        <li class="flex justify-between text-sm text-amber-100">
            <span>${escapeHtml(translatedName)} × ${itemQty}</span>
            <span class="text-amber-500">${formatPrice(itemPrice * itemQty)}</span>
        </li>`;
            }
        )
        .join("");
}

function parseDeliveryString(text) {
    var strText = String(text != null ? text : "");
    if (!strText) return null;
    var lower = strText.toLowerCase();
    if (lower.indexOf("توصيل") === -1 && lower.indexOf("delivery") === -1 && lower.indexOf("lieferung") === -1 && lower.indexOf("livraison") === -1) return null;
    try {
        var parts = strText.split('|');
        for (var i = 0; i < parts.length; i++) {
            parts[i] = parts[i].trim();
        }
        
        var name = "غير معروف";
        var phone = "";
        var payment = "";
        var location = "";
        
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            var lowerP = p.toLowerCase();
            var colonIdx = p.indexOf(":");
            if (colonIdx !== -1) {
                var key = lowerP.substring(0, colonIdx).trim();
                var val = p.substring(colonIdx + 1).trim();
                if (key.indexOf("اسم") !== -1 || key.indexOf("name") !== -1 || key.indexOf("nom") !== -1) name = val;
                else if (key.indexOf("جوال") !== -1 || key.indexOf("phone") !== -1 || key.indexOf("mobile") !== -1 || key.indexOf("mobilnummer") !== -1 || key.indexOf("portable") !== -1) phone = val;
                else if (key.indexOf("دفع") !== -1 || key.indexOf("payment") !== -1 || key.indexOf("zahlungsmethode") !== -1 || key.indexOf("paiement") !== -1) payment = val;
                else if (key.indexOf("موقع") !== -1 || key.indexOf("location") !== -1 || key.indexOf("address") !== -1 || key.indexOf("standort") !== -1 || key.indexOf("localisation") !== -1) location = val;
            }
        }
        
        return { name: name, phone: phone, payment: payment, location: location };
    } catch (e) { return null; }
}

function parseNotes(text) {
    var strText = String(text != null ? text : "");
    if (!strText) return "";
    try {
        var parts = strText.split('|');
        for (var i = 0; i < parts.length; i++) {
            parts[i] = parts[i].trim();
        }
        
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            var lowerP = p.toLowerCase();
            var colonIdx = p.indexOf(":");
            if (colonIdx !== -1) {
                var key = lowerP.substring(0, colonIdx).trim();
                if (key.indexOf("ملاحظ") !== -1 || key.indexOf("note") !== -1 || key.indexOf("anmerkung") !== -1) {
                    return p.substring(colonIdx + 1).trim();
                }
            }
        }
    } catch (e) {
        console.error("خطأ في تحليل الملاحظة:", e);
    }
    return "";
}

function formatOrderHeader(tableNo) {
    var strTableNo = String(tableNo != null ? tableNo : "—");
    if (!strTableNo || strTableNo === "—") return "—";
    
    const lowerTable = strTableNo.toLowerCase();
    if (strTableNo.indexOf("توصيل") !== -1 || lowerTable.indexOf("delivery") !== -1 || lowerTable.indexOf("lieferung") !== -1 || lowerTable.indexOf("livraison") !== -1) {
        var info = parseDeliveryString(strTableNo);
        if (!info) return phrase(null, 'kitchen_delivery_header', '🚗 توصيل');
        const translatedName = translateInfoValue(info.name);
        const translatedPayment = translatePayment(info.payment);
        return "🚗 " + escapeHtml(translatedName) + (info.payment ? ' <span class="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-500 mr-2">' + escapeHtml(translatedPayment) + '</span>' : "");
    }
    
    var cleanTable = strTableNo;
    var prefixes = ["محلي", "dine-in", "local", "vor ort", "sur place"];
    for (var i = 0; i < prefixes.length; i++) {
        var pref = prefixes[i];
        if (lowerTable.indexOf(pref) !== -1 && cleanTable.indexOf(":") !== -1) {
            var colonIndex = cleanTable.indexOf(":");
            var keyPart = lowerTable.substring(0, colonIndex);
            if (keyPart.indexOf(pref) !== -1) {
                cleanTable = cleanTable.substring(colonIndex + 1).trim();
                break;
            }
        }
    }
    
    var parts = cleanTable.split('|');
    var tableNum = parts[0] ? parts[0].replace(/\D/g, '').trim() : "—";
    if (!tableNum) tableNum = parts[0] ? parts[0].trim() : "—";
    return phrase(null, 'kitchen_table_header', 'طاولة {num}').replace('{num}', escapeHtml(tableNum));
}

function formatLocationInfo(text) {
    if (!text) return "—";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" class="inline-block px-2 py-1 bg-blue-600 text-white text-[10px] rounded-md mt-1 mb-1">${phrase(null, 'kitchen_open_map', 'فتح الخريطة 📍')}</a>`;
    });
}

function renderOrderCard(order, type) {
    const items = parseItems(order.items);
    const tableRaw = order.table_no != null ? order.table_no : "—";
    const lowerRaw = tableRaw.toLowerCase();
    // دعم الحقل الجديد والاحتياط بالنص في حال كانت أجهزة الزبائن تستخدم كاش قديم
    const isDelivery = order.order_type === 'delivery' || (lowerRaw.indexOf("توصيل") !== -1 || lowerRaw.indexOf("delivery") !== -1 || lowerRaw.indexOf("lieferung") !== -1 || lowerRaw.indexOf("livraison") !== -1);
    const deliveryInfo = isDelivery ? parseDeliveryString(tableRaw) : null;
    const titleHtml = formatOrderHeader(tableRaw);
    
    const detailsHtml = deliveryInfo ? `
        <div class="mt-2 text-xs text-amber-200/60 bg-black/30 p-2 rounded-lg border border-amber-900/20">
            <p>${phrase(null, 'kitchen_phone_label', '📞 الجوال:')} <span class="text-amber-400 font-mono">${escapeHtml(translateInfoValue(deliveryInfo.phone))}</span></p>
            <div class="mt-1">${formatLocationInfo(escapeHtml(deliveryInfo.location))}</div>
        </div>` : "";

    const orderNotes = parseNotes(tableRaw);
    const notesHtml = orderNotes ? `
        <div class="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm text-right">
            <span class="font-bold text-amber-300">${phrase(null, 'kitchen_customer_notes', '📝 ملاحظة الزبون:')}</span>
            <p class="mt-1 font-semibold text-white break-words">${escapeHtml(orderNotes)}</p>
        </div>` : "";

    const priceText = formatPrice(parseFloat(order.total_price || 0));

    if (type === "active") {
        return `
        <div class="rounded-2xl border-2 border-amber-500 bg-zinc-900 p-5 shadow-lg">
            <div class="flex justify-between items-start gap-3 mb-3">
                <div>
                    <span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-black mb-2">${phrase(null, 'kitchen_preparing', 'قيد التجهيز')}</span>
                    <h2 class="text-xl font-bold text-amber-400">${titleHtml}</h2>
                    <p class="text-amber-200/70 text-xl font-bold mt-1">${phrase(null, 'kitchen_total', 'المجموع:')} ${priceText}</p>
                    ${detailsHtml}
                    ${notesHtml}
                </div>
                <div class="text-center shrink-0">
                    <p class="text-xs text-zinc-500 mb-1">${phrase(null, 'kitchen_order_prep_timer', 'مؤقت التجهيز')}</p>
                    <p id="order-timer" class="text-3xl font-mono font-bold text-amber-400">00:00</p>
                </div>
            </div>
            ${renderTimeBadges(order, "active")}
            <ul class="my-4 space-y-2 border-y border-amber-800/30 py-3">${renderItemsList(items)}</ul>
            <button type="button" onclick="${isDelivery ? `markAsReadyForDelivery('${order.id}')` : `markAsReadyForPickup('${order.id}')`}"
                class="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg">
                ${isDelivery ? phrase(null, 'kitchen_mark_ready_delivery', 'تم التجهيز ✓ (إرسال للسائق)') : phrase(null, 'kitchen_mark_ready', 'تم التجهيز ✓')}
            </button>
        </div>`;
    }

    if (type === "finished") {
        let displayStatus = phrase(null, 'kitchen_ready', 'جاهز 🚚'); // Default
        if (order.status === "completed" || order.status === "completed_local" || order.status === "completed_delivery") displayStatus = phrase(null, 'kitchen_completed', 'تم التسليم ✓');
        if (order.status === "out_for_delivery") displayStatus = phrase(null, 'kitchen_out_for_delivery', 'مع السائق 🚴');

        // إظهار زر التسليم فقط إذا كان الطلب محلي (طاولة) وحالته "ready" (جاهز ولم يُسلّم بعد)
        const showPickupButton = !isDelivery && order.status === "ready";

        return `
        <div class="p-3 rounded-xl border border-zinc-800/40 bg-zinc-900/40 text-sm">
            <div class="flex justify-between items-center mb-1">
                <div class="flex items-center gap-2">
                    <span class="text-emerald-400 text-xs font-bold bg-emerald-950 px-1.5 py-0.5 rounded">${displayStatus}</span>
                    <span class="text-zinc-300 font-bold">${titleHtml}</span>
                </div>
                <span class="text-zinc-500 text-[10px]">${formatClock(order.created_at)}</span>
            </div>
            <ul class="my-2 space-y-0.5 text-zinc-400 text-[12px] border-t border-zinc-800/30 pt-1">
                ${items.map(function(i) { return `<li class="truncate">• ${escapeHtml(phrase(null, i.name, i.name))} × ${i.quantity}</li>`; }).join('')}
            </ul>
            ${orderNotes ? `<div class="text-amber-400 text-[11px] mt-1 px-1 border-t border-zinc-850/40 pt-1">📝 ${escapeHtml(orderNotes)}</div>` : ""}
            ${showPickupButton ? `
            <button type="button" onclick="markAsPickedUp('${order.id}')"
                class="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white py-1.5 px-3 rounded-lg font-bold text-xs transition">
                ${phrase(null, 'kitchen_deliver_to_customer', '🤝 تم تسليم الطلب للزبون (إنهاء)')}
            </button>` : ""}
        </div>`;
    }
    return "";
}

async function loadOrders() {
    if (isFetching) return;
    isFetching = true;

    const container = document.getElementById("orders-container");
    if (!container) return;
    const client = getClient();

    if (!activeOrderId) {
        try {
            activeOrderId = localStorage.getItem("coof2_kitchen_active_order");
        } catch (e) {}
    }

    if (!client) {
        isFetching = false;
        return;
    }

    try {
        const [activeRes, finishedRes] = await Promise.all([
            client.from("orders").select("*").in("status", ["pending", "preparing"]).order("created_at", { ascending: false }),
            client.from("orders").select("*").in("status", ["ready", "out_for_delivery", "completed"]).order("created_at", { ascending: false }).limit(5)
        ]);

        if (activeRes.error) {
            console.error("خطأ أثناء جلب الطلبات:", activeRes.error.message);
            isFetching = false;
            return;
        }

        let activeOrders = Array.isArray(activeRes.data) ? activeRes.data : [];
        let finishedList = Array.isArray(finishedRes.data) ? finishedRes.data : [];
        ordersCache = activeOrders;

        if (!firstLoad) {
            activeOrders.forEach(function(o) {
                if (o.status === "pending" && !knownOrderIds.has(o.id)) playNewOrderSound();
            });
        }
        activeOrders.forEach(function(o) { knownOrderIds.add(o.id); });
        firstLoad = false;

        let activeOrder = null;
        if (activeOrderId) {
            for (var k = 0; k < activeOrders.length; k++) {
                if (String(activeOrders[k].id) === String(activeOrderId)) {
                    activeOrder = activeOrders[k];
                    break;
                }
            }
        }

        if (activeOrderId && !activeOrder) {
            activeOrderId = null;
            try {
                localStorage.removeItem("coof2_kitchen_active_order");
            } catch (e) {}
        }

        var pendingList = [];
        for (var m = 0; m < activeOrders.length; m++) {
            var o = activeOrders[m];
            if (o.status === "pending" || (o.status === "preparing" && String(o.id) !== String(activeOrderId))) {
                pendingList.push(o);
            }
        }
        pendingList = sortNewestFirst(pendingList);

        let html = ''; 

        if (activeOrder) html += renderOrderCard(activeOrder, "active");

        if (pendingList.length > 0) {
            html += `<div class="mt-4 space-y-2"><h3 class="text-amber-500/80 text-sm font-bold">${phrase(null, 'kitchen_new_orders', 'طلبات جديدة')}</h3>`;
            html += pendingList.map(function(o) {
                return `
                <button type="button" onclick="openOrder('${o.id}')"
                    class="w-full text-right p-4 rounded-xl border border-amber-700/40 bg-zinc-950 hover:border-amber-500 transition ${activeOrderId ? "" : "animate-pulse"}">
                    <div class="flex justify-between items-start gap-2">
                        <span class="text-amber-400 font-bold">${phrase(null, 'kitchen_new_order_badge', '🆕 طلب جديد')}</span>
                        <span class="text-zinc-400 text-sm">${formatOrderHeader(o.table_no != null ? o.table_no : "—")}</span>
                    </div>
                    ${renderTimeBadges(o, "pending")}
                </button>`;
            }).join("");
            html += `</div>`;
        }

        if (finishedList.length > 0) {
            html += `<div class="mt-8 pt-6 border-t border-zinc-800/60 space-y-3">
                        <h3 class="text-zinc-400 text-[12px] font-black uppercase tracking-widest px-1">${phrase(null, 'kitchen_previous_orders', '📦 طلبات سابقة (للمراجعة والتسليم)')}</h3>`;
            html += finishedList.map(function(o) { return renderOrderCard(o, "finished"); }).join("");
            html += `</div>`;
        }

        if (!activeOrder && pendingList.length === 0) {
            html += `
                <div class="text-center py-20">
                    <span class="text-5xl block mb-4">👨‍🍳</span>
                    <p class="text-zinc-500">${phrase(null, 'kitchen_no_active_orders', 'لا توجد طلبات نشطة حالياً')}</p>
                </div>`;
        }

        container.innerHTML = html;
        if (activeOrder) startTimerDisplay(activeOrder);
        else stopTimer();
        startKitchenTicks();
    } finally {
        isFetching = false;
    }
}

async function updateOrder(orderId, payload, expectedStatus) {
    const client = getClient();
    if (!client) return { ok: false, error: phrase(null, 'db_not_connected', 'غير متصل') };
    
    let query = client.from("orders").update(payload).eq("id", orderId);
    if (expectedStatus) {
        if (Array.isArray(expectedStatus)) {
            query = query.in("status", expectedStatus);
        } else {
            query = query.eq("status", expectedStatus);
        }
    }
    
    const { data, error } = await query.select();
    
    if (error) {
        console.error("خطأ في تحديث الطلب:", error);
        return { ok: false, error: error.message };
    }
    
    if (!data || data.length === 0) {
        return { ok: false, error: phrase(null, 'kitchen_update_no_result', 'Update failed (status may have changed or session expired)') };
    }
    
    return { ok: true, data };
}

async function openOrder(orderId) {
    const client = getClient();
    if (!client) return alert(phrase(null, 'db_not_connected', 'غير متصل'));

    const payload = { status: "preparing", preparing_started_at: new Date().toISOString() };
    const result = await updateOrder(orderId, payload, "pending");
    
    if (!result.ok) {
        alert(phrase(null, 'kitchen_db_update_error', 'فشل التحديث: ') + result.error);
        return; 
    }

    clearLocalPreparing(orderId);
    rememberOpenedAt(orderId);
    activeOrderId = orderId;
    try {
        localStorage.setItem("coof2_kitchen_active_order", orderId);
    } catch (e) {}
    loadOrders();
}

let kitchenChannel = null;
function subscribeKitchenRealtime() {
    const client = getClient();
    if (client) {
        try {
            if (kitchenChannel) {
                client.removeChannel(kitchenChannel);
                kitchenChannel = null;
            }
        } catch (e) {}

        kitchenChannel = client.channel('kitchen_orders_realtime_' + Date.now())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, function() {
                loadOrders();
            });
        kitchenChannel.subscribe();
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

let isKitchenInit = false;
function initKitchen() {
    if (isKitchenInit) return;
    isKitchenInit = true;

    if (typeof checkAccess === "function" && !checkAccess('worker') && !checkAccess('admin')) {
        window.location.replace("admin-login.html");
        return;
    }

    applyDirection();
    loadOrders();
    setInterval(loadOrders, 15000);

    subscribeKitchenRealtime();
}

window.openOrder = openOrder;
window.markAsReadyForPickup = markAsReadyForPickup;
window.markAsReadyForDelivery = markAsReadyForDelivery;
window.markAsPickedUp = markAsPickedUp; 
window.closeActive = closeActive;

window.addEventListener('languageChanged', function() {
    applyDirection();
    loadOrders();
});

document.addEventListener("DOMContentLoaded", function() {
    if (getClient()) initKitchen();
    window.addEventListener("supabaseReady", initKitchen);
});

document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") {
        console.log("العودة للمطبخ، تحديث الطلبات والاشتراك اللحظي...");
        loadOrders();
        subscribeKitchenRealtime();
    }
});