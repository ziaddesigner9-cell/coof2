/**
 * لوحة العامل (المطبخ): النسخة الكاملة والنهائية المتوافقة
 */

let activeOrderId = null;
let timerInterval = null;
let timerStartedAt = null;
let kitchenTickInterval = null;
let knownOrderIds = new Set();
let firstLoad = true;
let audioContext = null;
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

    if (mode === "pickup") {
        return `
        <div class="flex flex-wrap gap-1.5 mt-1 mb-2 text-[10px]">
            <span class="px-2 py-0.5 rounded bg-zinc-900 text-zinc-400">📥 ${formatClock(arrived)}</span>
            ${opened ? `<span class="px-2 py-0.5 rounded bg-zinc-900 text-zinc-400">▶ ${formatClock(opened)}</span>` : ""}
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

function hideRlsBanner() {
    document.getElementById("rls-warning")?.classList.add("hidden");
}

function showRlsBanner() {
    document.getElementById("rls-warning")?.classList.remove("hidden");
}

function getLocalPreparingMap() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_PREP_KEY) || "{}");
    } catch {
        return {};
    }
}

function setLocalPreparing(order) {
    const map = getLocalPreparingMap();
    map[order.id] = { startedAt: Date.now(), order };
    localStorage.setItem(LOCAL_PREP_KEY, JSON.stringify(map));
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
        if (activeOrderId === orderId) closeActive();
        loadOrders();
    } else {
        alert("فشل تحديث حالة الطلب إلى جاهز: " + result.error);
    }
}

async function markAsPickedUp(orderId) {
    const payload = { status: "completed" };
    const result = await updateOrder(orderId, payload, "ready");
    if (result.ok) {
        loadOrders();
    } else {
        loadOrders();
    }
}

function mergeWithLocalPreparing(orders) {
    const map = getLocalPreparingMap();
    return orders.map((o) => {
        if (o.status === "pending" && map[o.id]) {
            return {
                ...o,
                status: "preparing",
                preparing_started_at: new Date(map[o.id].startedAt).toISOString(),
            };
        }
        return o;
    });
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
                تم التجهيز ✓
            </button>
        </div>`;
    }

    if (type === "pickup") {
        return `
        <div class="p-4 rounded-xl border border-emerald-700/40 bg-emerald-950/30">
            <div class="flex justify-between items-center mb-2">
                <span class="text-emerald-400 font-bold">📦 جاهز</span>
                <span class="text-zinc-400 text-sm">${titleHtml}</span>
            </div>
            ${detailsHtml}
            <p class="text-amber-400 text-sm font-bold mb-2 mt-1">المجموع: ${priceText}</p>
            ${renderTimeBadges(order, "pickup")}
            <ul class="mb-3 space-y-1">${renderItemsList(items)}</ul>
            <button type="button" onclick="markAsPickedUp('${order.id}')"
                class="w-full bg-amber-600 hover:bg-amber-500 text-black py-3 rounded-xl font-bold">
                تم الاستلام ✓
            </button>
        </div>`;
    }

    return `
    <div class="p-3 rounded-lg border border-zinc-800 bg-zinc-950/50 opacity-80">
        <div class="flex justify-between text-sm">
            <span class="text-zinc-500">✓ مسلّم</span>
            <span class="text-zinc-400">${titleHtml} · المجموع: ${priceText}</span>
        </div>
    </div>`;
}

async function loadOrders() {
    console.log("محاولة جلب الطلبات من السيرفر...");
    const container = document.getElementById("orders-container");
    if (!container) return;
    const client = getClient();

    // 1. استعادة معرف الطلب النشط من الذاكرة المحلية لضمان عدم اختفاء الطلب عند التحديث
    if (!activeOrderId) {
        activeOrderId = localStorage.getItem("kitchen_active_order");
    }

    if (!client) return;

    const [activeRes, deliveredRes] = await Promise.all([
        client.from("orders").select("*").in("status", ["pending", "preparing", "ready"]).order("created_at", { ascending: false }),
        client.from("orders").select("*").eq("status", "completed").order("created_at", { ascending: false }).limit(12),
    ]);

    if (activeRes.error) {
        console.error("خطأ أثناء جلب الطلبات:", activeRes.error.message);
        container.innerHTML = '<p class="text-red-400 text-center p-8">تعذر تحميل الطلبات</p>';
        return;
    }

    let orders = Array.isArray(activeRes.data) ? activeRes.data : [];
    ordersCache = orders; // حفظ جميع الطلبات النشطة للتحقق من الحالة عند الفتح
    orders = mergeWithLocalPreparing(orders);

    if (!firstLoad && Array.isArray(orders)) {
        orders.forEach((o) => {
            if (o.status === "pending" && !knownOrderIds.has(o.id)) playNewOrderSound();
        });
    }
    if (Array.isArray(orders)) orders.forEach((o) => knownOrderIds.add(o.id));
    firstLoad = false;

    // 2. البحث عن الطلب النشط أو استعادة أول طلب "قيد التجهيز" موجود في قاعدة البيانات
    let activeOrder = activeOrderId ? orders.find((o) => o.id === activeOrderId) : orders.find(o => o.status === "preparing");

    if (activeOrder && !activeOrderId) {
        activeOrderId = activeOrder.id;
        localStorage.setItem("kitchen_active_order", activeOrderId);
    }

    // 3. عرض الطلبات الجديدة: تشمل الطلبات المنتظرة، وأي طلبات "preparing" ليست هي النشطة حالياً
    const pendingList = sortNewestFirst(orders.filter((o) => (o.status === "pending" || (o.status === "preparing" && o.id !== activeOrderId))));
    const pickupList = sortNewestFirst(orders.filter((o) => o.status === "ready"));
    const deliveredList = Array.isArray(deliveredRes.data) ? deliveredRes.data : [];

    if (activeOrder && (activeOrder.status === "ready" || activeOrder.status === "completed")) {
        closeActive();
        activeOrder = null;
    }

    // 4. إضافة زر "نظام عامل التوصيل" في أعلى الصفحة
    let html = `
        <div class="mb-6 flex justify-between items-center bg-zinc-900/80 p-5 rounded-2xl border border-amber-500/20 shadow-xl">
            <h2 class="text-xl font-black text-amber-500">لوحة المطبخ</h2>
            <a href="delivery_orders.html" class="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-black px-5 py-2.5 rounded-xl font-bold shadow-lg transition active:scale-95">
                <span>🚚 نظام التوصيل</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </a>
        </div>
    `;

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

    html += `<div class="mt-6 space-y-2"><h3 class="text-emerald-500 text-sm font-bold">خانة الاستلام</h3>`;
    if (pickupList.length === 0) html += '<p class="text-zinc-600 text-sm text-center py-4 border border-zinc-800 rounded-xl">لا طلبات للاستلام</p>';
    else html += pickupList.map((o) => renderOrderCard(o, "pickup")).join("");
    html += `</div>`;

    html += `<div class="mt-6 space-y-2"><h3 class="text-zinc-500 text-sm font-bold">الطلبات المسلّمة</h3>`;
    if (deliveredList.length === 0) html += '<p class="text-zinc-700 text-sm text-center py-3">لا توجد طلبات مسلّمة بعد</p>';
    else html += deliveredList.map((o) => renderOrderCard(o, "delivered")).join("");
    html += `</div>`;

    if (!activeOrder && pendingList.length === 0 && pickupList.length === 0 && deliveredList.length === 0) {
        html = '<p class="text-zinc-500 text-center p-10 rounded-2xl bg-zinc-900 border border-amber-800/30">لا توجد طلبات</p>';
    }

    container.innerHTML = html;
    if (activeOrder) startTimerDisplay(activeOrder);
    else stopTimer();
    startKitchenTicks();
}

async function updateOrder(orderId, payload, expectedStatus) {
    console.log("جاري تحديث حالة الطلب رقم:", orderId, "بالبيانات:", payload);
    const client = getClient();
    if (!client) return { ok: false, error: "غير متصل" };
    let q = client.from("orders").update(payload).eq("id", orderId).select();
    if (expectedStatus) q = q.eq("status", expectedStatus);
    const { data, error } = await q;
    if (!error && data && data.length > 0) {
        console.log("تم التحديث بنجاح في قاعدة البيانات.");
        return { ok: true, data };
    }
    const errorMessage = String(error?.message || "لم يتم تحديث أي صفوف (ربما تغيرت حالة الطلب بالفعل)");
    console.error("فشل التحديث:", errorMessage);
    return { ok: false, error: errorMessage };
}

async function openOrder(orderId) {
    const client = getClient();
    if (!client) return alert("النظام غير متصل");

    const order = ordersCache.find((o) => o.id === orderId) || { id: orderId };

    // إذا كان الطلب قيد التجهيز بالفعل، نقوم بتفعيله في الواجهة فقط دون محاولة تحديثه كـ "pending"
    if (order.status === "preparing") {
        activeOrderId = orderId;
        localStorage.setItem("kitchen_active_order", orderId);
        loadOrders();
        return;
    }

    const payload = { status: "preparing", preparing_started_at: new Date().toISOString() };

    let result = await updateOrder(orderId, payload, "pending");

    if (!result.ok && /preparing_started_at/i.test(result.error || "")) {
        result = await updateOrder(orderId, { status: "preparing" }, "pending");
    }

    if (!result.ok) {
        setLocalPreparing(order);
        showRlsBanner();
    } else {
        clearLocalPreparing(orderId);
        hideRlsBanner();
    }

    rememberOpenedAt(orderId);
    activeOrderId = orderId;
    localStorage.setItem("kitchen_active_order", orderId);
    loadOrders();
}

let isKitchenInit = false;
function initKitchen() {
    if (isKitchenInit) return;
    isKitchenInit = true;
    loadOrders();
    setInterval(loadOrders, 10000);
}

// تصدير الوظائف للنافذة لضمان عملها مع onclick في HTML
window.openOrder = openOrder;
window.markAsReady = markAsReady;
window.markAsPickedUp = markAsPickedUp;
window.closeActive = closeActive;

document.addEventListener("DOMContentLoaded", () => {
    // ضمان تشغيل النظام فقط بعد جاهزية Supabase
    if (getClient()) initKitchen();
    window.addEventListener("supabaseReady", initKitchen);
});