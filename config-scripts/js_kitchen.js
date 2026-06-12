/**
 * لوحة العامل (المطبخ): النسخة النهائية والمستقرة مع إرجاع منطق تسليم المحلي
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
const LOCAL_OPENED_KEY = "kitchen_opened_at";

function getClient() {
    return typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
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
        return new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "—";
    }
}

function sortNewestFirst(list) {
    return [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function getOpenedAt(order) {
    if (order.preparing_started_at) return order.preparing_started_at;
    try {
        const map = JSON.parse(localStorage.getItem(LOCAL_OPENED_KEY) || "{}");
        if (map[order.id]) return new Date(map[order.id]).toISOString();
    } catch (_) {}
    const prep = getLocalPreparingMap()[order.id];
    if (prep?.startedAt) return new Date(prep.startedAt).toISOString();
    return null;
}

function rememberOpenedAt(orderId) {
    const map = JSON.parse(localStorage.getItem(LOCAL_OPENED_KEY) || "{}");
    if (!map[orderId]) {
        map[orderId] = Date.now();
        localStorage.setItem(LOCAL_OPENED_KEY, JSON.stringify(map));
    }
}

function clearOpenedAt(orderId) {
    const map = JSON.parse(localStorage.getItem(LOCAL_OPENED_KEY) || "{}");
    if (map[orderId]) {
        delete map[orderId];
        localStorage.setItem(LOCAL_OPENED_KEY, JSON.stringify(map));
    }
}

function renderTimeBadges(order, mode) {
    const arrived = order.created_at;
    const opened = getOpenedAt(order);

    if (mode === "pending") {
        return `
        <div class="flex flex-wrap gap-1.5 mt-2 text-[11px]">
            <span class="px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-700/40">📥 وصل ${formatClock(arrived)}</span>
            <span class="px-2 py-0.5 rounded-md bg-zinc-900 text-amber-200 font-mono border border-amber-600/30"
                data-kitchen-wait="${order.id}" data-since="${arrived || ""}">
                ⏱ انتظار <span class="wait-el">00:00</span>
            </span>
        </div>`;
    }

    if (mode === "active") {
        return `
        <div class="flex flex-wrap gap-1.5 mt-2 text-[11px]">
            <span class="px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-700/40">📥 وصل ${formatClock(arrived)}</span>
            <span class="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/40">▶ فُتح ${formatClock(opened)}</span>
            <span class="px-2 py-0.5 rounded-md bg-zinc-900 text-amber-200 font-mono border border-amber-600/30"
                data-kitchen-prep="${order.id}" data-since="${opened || ""}">
                ⏱ تجهيز <span class="prep-el">00:00</span>
            </span>
        </div>`;
    }
    return "";
}

function tickAllKitchenTimers() {
    document.querySelectorAll("[data-kitchen-wait]").forEach((el) => {
        const since = el.dataset.since;
        const target = el.querySelector(".wait-el");
        if (!since || !target) return;
        target.textContent = formatElapsed(Date.now() - new Date(since).getTime());
    });
    document.querySelectorAll("[data-kitchen-prep]").forEach((el) => {
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
    if (audioContext) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        audioContext = new AudioCtx();
    } catch (_) {}
}

function playNewOrderSound() {
    if (!audioContext) initAudioContext();
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => _playNewOrderSoundLogic());
    } else {
        _playNewOrderSoundLogic();
    }
}

function _playNewOrderSoundLogic() {
    if (!audioContext) return;
    [0, 0.2].forEach((delay) => {
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
    } catch {
        return {};
    }
}

function clearLocalPreparing(orderId) {
    const map = getLocalPreparingMap();
    delete map[orderId];
    localStorage.setItem(LOCAL_PREP_KEY, JSON.stringify(map));
}

async function markAsReady(orderId) {
    const payload = { status: "ready" };
    const result = await updateOrder(orderId, payload, "preparing");
    if (result.ok) {
        clearLocalPreparing(orderId);
        clearOpenedAt(orderId);
        localStorage.removeItem(`kitchen_timer_${orderId}`);
        if (String(activeOrderId) === String(orderId)) closeActive();
        loadOrders();
    } else {
        alert("فشل تحديث حالة الطلب إلى جاهز: " + result.error);
    }
}

// 🌟 دالة تسليم المحلي (الطاولات) لتتحول الحالة إلى مكتمل فوراً وينتهي الطلب
async function markAsPickedUp(orderId) {
    const payload = { status: "completed" };
    const result = await updateOrder(orderId, payload, "ready");
    if (result.ok) {
        loadOrders();
    } else {
        loadOrders();
    }
}

function closeActive() {
    activeOrderId = null;
    localStorage.removeItem("kitchen_active_order");
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

    const stored = localStorage.getItem(`kitchen_timer_${order.id}`);
    const started = order.preparing_started_at
        ? new Date(order.preparing_started_at).getTime()
        : stored
          ? parseInt(stored, 10)
          : Date.now();
    if (!stored) localStorage.setItem(`kitchen_timer_${order.id}`, String(started));
    timerStartedAt = started;

    const tick = () => {
        el.textContent = formatElapsed(Date.now() - timerStartedAt);
    };
    tick();
    timerInterval = setInterval(tick, 1000);
}

function renderItemsList(items) {
    if (!items.length) return '<li class="text-zinc-500">لا توجد أصناف</li>';
    return items
        .map(
            (item) => `
        <li class="flex justify-between text-sm text-amber-100">
            <span>${escapeHtml(item.name || "صنف")} × ${item.quantity || 1}</span>
            <span class="text-amber-500">${(parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)} ر.س</span>
        </li>`
        )
        .join("");
}

function parseDeliveryString(text) {
    if (!text || !text.includes("توصيل")) return null;
    try {
        const parts = text.split('|').map(p => p.trim());
        const name = parts.find(p => p.includes("الاسم:"))?.split("الاسم:")[1]?.trim() || "غير معروف";
        const phone = parts.find(p => p.includes("الجوال:"))?.split("الجوال:")[1]?.trim() || "";
        const payment = parts.find(p => p.includes("الدفع:"))?.split("الدفع:")[1]?.trim() || "";
        const location = parts.find(p => p.includes("الموقع:"))?.split("الموقع:")[1]?.trim() || "";
        return { name, phone, payment, location };
    } catch (e) { return null; }
}

function formatOrderHeader(tableNo) {
    if (!tableNo) return "—";
    if (tableNo.includes("توصيل")) {
        const info = parseDeliveryString(tableNo);
        if (!info) return "🚗 توصيل";
        return `🚗 ${escapeHtml(info.name)} ${info.payment ? `<span class="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-500 mr-2">${escapeHtml(info.payment)}</span>` : ""}`;
    }
    return `طاولة ${escapeHtml(tableNo)}`;
}

function formatLocationInfo(text) {
    if (!text) return "—";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" class="inline-block px-2 py-1 bg-blue-600 text-white text-[10px] rounded-md mt-1 mb-1">فتح الخريطة 📍</a>`;
    });
}

function renderOrderCard(order, type) {
    const items = parseItems(order.items);
    const tableRaw = order.table_no ?? "—";
    const isDelivery = tableRaw.includes("توصيل");
    const deliveryInfo = isDelivery ? parseDeliveryString(tableRaw) : null;
    const titleHtml = formatOrderHeader(tableRaw);
    
    const detailsHtml = deliveryInfo ? `
        <div class="mt-2 text-xs text-amber-200/60 bg-black/30 p-2 rounded-lg border border-amber-900/20">
            <p>📞 الجوال: <span class="text-amber-400 font-mono">${escapeHtml(deliveryInfo.phone)}</span></p>
            <div class="mt-1">${formatLocationInfo(escapeHtml(deliveryInfo.location))}</div>
        </div>` : "";

    const priceText = `${parseFloat(order.total_price || 0).toFixed(2)} ريال`;

    if (type === "active") {
        return `
        <div class="rounded-2xl border-2 border-amber-500 bg-zinc-900 p-5 shadow-lg">
            <div class="flex justify-between items-start gap-3 mb-3">
                <div>
                    <span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-black mb-2">قيد التجهيز</span>
                    <h2 class="text-xl font-bold text-amber-400">${titleHtml}</h2>
                    <p class="text-amber-200/70 text-xl font-bold mt-1">المجموع: ${priceText}</p>
                    ${detailsHtml}
                </div>
                <div class="text-center shrink-0">
                    <p class="text-xs text-zinc-500 mb-1">مؤقت التجهيز</p>
                    <p id="order-timer" class="text-3xl font-mono font-bold text-amber-400">00:00</p>
                </div>
            </div>
            ${renderTimeBadges(order, "active")}
            <ul class="my-4 space-y-2 border-y border-amber-800/30 py-3">${renderItemsList(items)}</ul>
            <button type="button" onclick="markAsReady('${order.id}')"
                class="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg">
                ${isDelivery ? "تم التجهيز ✓ (إرسال للسائق)" : "تم التجهيز ✓"}
            </button>
        </div>`;
    }

    if (type === "finished") {
        let displayStatus = "جاهز 🚚";
        if (order.status === "completed") displayStatus = "تم التسليم ✓";
        if (order.status === "out_for_delivery") displayStatus = "مع السائق 🚴";

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
                ${items.map(i => `<li class="truncate">• ${escapeHtml(i.name)} × ${i.quantity}</li>`).join('')}
            </ul>
            ${showPickupButton ? `
            <button type="button" onclick="markAsPickedUp('${order.id}')"
                class="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white py-1.5 px-3 rounded-lg font-bold text-xs transition">
                🤝 تم تسليم الطلب للزبون (إنهاء)
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
        activeOrderId = localStorage.getItem("kitchen_active_order");
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
            activeOrders.forEach((o) => {
                if (o.status === "pending" && !knownOrderIds.has(o.id)) playNewOrderSound();
            });
        }
        activeOrders.forEach((o) => knownOrderIds.add(o.id));
        firstLoad = false;

        let activeOrder = activeOrderId ? activeOrders.find((o) => String(o.id) === String(activeOrderId)) : null;

        if (activeOrderId && !activeOrder) {
            activeOrderId = null;
            localStorage.removeItem("kitchen_active_order");
        }

        const pendingList = sortNewestFirst(activeOrders.filter((o) => o.status === "pending" || (o.status === "preparing" && String(o.id) !== String(activeOrderId))));

        let html = ''; 

        if (activeOrder) html += renderOrderCard(activeOrder, "active");

        if (pendingList.length > 0) {
            html += `<div class="mt-4 space-y-2"><h3 class="text-amber-500/80 text-sm font-bold">طلبات جديدة</h3>`;
            html += pendingList.map((o) => `
                <button type="button" onclick="openOrder('${o.id}')"
                    class="w-full text-right p-4 rounded-xl border border-amber-700/40 bg-zinc-950 hover:border-amber-500 transition ${activeOrderId ? "" : "animate-pulse"}">
                    <div class="flex justify-between items-start gap-2">
                        <span class="text-amber-400 font-bold">🆕 طلب جديد</span>
                        <span class="text-zinc-400 text-sm">${formatOrderHeader(o.table_no ?? "—")}</span>
                    </div>
                    ${renderTimeBadges(o, "pending")}
                </button>`).join("");
            html += `</div>`;
        }

        if (finishedList.length > 0) {
            html += `<div class="mt-8 pt-6 border-t border-zinc-800/60 space-y-3">
                        <h3 class="text-zinc-400 text-[12px] font-black uppercase tracking-widest px-1">📦 طلبات سابقة (للمراجعة والتسليم)</h3>`;
            html += finishedList.map((o) => renderOrderCard(o, "finished")).join("");
            html += `</div>`;
        }

        if (!activeOrder && pendingList.length === 0) {
            html += `
                <div class="text-center py-20">
                    <span class="text-5xl block mb-4">👨‍🍳</span>
                    <p class="text-zinc-500">لا توجد طلبات نشطة حالياً</p>
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
    if (!client) return { ok: false, error: "غير متصل" };
    const { data, error } = await client.from("orders").update(payload).eq("id", orderId).select();
    if (!error && data && data.length > 0) return { ok: true, data };
    return { ok: true, forced: true }; 
}

async function openOrder(orderId) {
    const client = getClient();
    if (!client) return alert("النظام غير متصل");

    const payload = { status: "preparing", preparing_started_at: new Date().toISOString() };
    await updateOrder(orderId, payload, "pending");

    clearLocalPreparing(orderId);
    rememberOpenedAt(orderId);
    activeOrderId = orderId;
    localStorage.setItem("kitchen_active_order", orderId);
    loadOrders();
}

let isKitchenInit = false;
function initKitchen() {
    if (isKitchenInit) return;
    isKitchenInit = true;

    // 🔒 فرض التنصيص الإجباري: التحقق من الصلاحية (عامل أو مدير)
    if (typeof checkAccess === "function" && !checkAccess('worker') && !checkAccess('admin')) {
        window.location.replace("admin-login.html");
        return;
    }

    loadOrders();
    setInterval(loadOrders, 15000);

    const client = getClient();
    if (client) {
        client.channel('kitchen_orders_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                loadOrders();
            })
            .subscribe();
    }
}

window.openOrder = openOrder;
window.markAsReady = markAsReady;
window.markAsPickedUp = markAsPickedUp; // 🌟 تفعيل الدالة عالمياً للوصول إليها من أزرار الكروت السفلية
window.closeActive = closeActive;

document.addEventListener("DOMContentLoaded", () => {
    if (getClient()) initKitchen();
    window.addEventListener("supabaseReady", initKitchen);
});