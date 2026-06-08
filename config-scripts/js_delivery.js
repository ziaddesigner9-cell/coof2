/**
 * نظام عامل التوصيل: يعرض الطلبات الجاهزة فقط
 */

let isFetching = false;
let previousStatuses = new Map();
let isFirstLoad = true;
let audioContext = null;

function initAudio() {
    if (audioContext) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) audioContext = new AudioCtx();
    } catch (_) {}
}

function playReadyAlert() {
    if (!audioContext) initAudio();
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => _playTone());
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
    // نغمة مزدوجة سريعة وصاعدة (تنبيه إيجابي)
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
    if (!text || !text.includes("توصيل")) return null;
    // الصيغة: توصيل - الاسم: زيد | الجوال: 05... | الموقع: رابط أو نص
    try {
        const parts = text.split('|').map(p => p.trim());
        const name = parts.find(p => p.includes("الاسم:"))?.split("الاسم:")[1]?.trim() || "غير معروف";
        const phone = parts.find(p => p.includes("الجوال:"))?.split("الجوال:")[1]?.trim() || "غير معروف";
        const payment = parts.find(p => p.includes("الدفع:"))?.split("الدفع:")[1]?.trim() || "غير محدد";
        const location = parts.find(p => p.includes("الموقع:"))?.split("الموقع:")[1]?.trim() || "";
        return { name, phone, payment, location };
    } catch (e) {
        return { name: "خطأ في البيانات", phone: text, location: "" };
    }
}

async function loadDeliveryOrders() {
    if (isFetching) return;
    isFetching = true;

    const container = document.getElementById("delivery-orders");
    const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (!container) { isFetching = false; return; }

    if (!client) {
        container.innerHTML = `<p class="text-amber-500 text-center py-10">جاري الاتصال بالنظام...</p>`;
        isFetching = false;
        return;
    }

    try {
        const { data: orders, error } = await client
            .from("orders")
            .select("*")
            .in("status", ["pending", "preparing", "ready", "out_for_delivery"])
            .order("created_at", { ascending: false });

        if (error) {
            container.innerHTML = `<p class="text-red-400 text-center">خطأ: ${error.message}</p>`;
            isFetching = false;
            return;
        }

        const currentOrders = orders || [];

        // التحقق من تغير الحالة من ذهبي (preparing/pending) إلى أخضر (ready)
        if (!isFirstLoad) {
            currentOrders.forEach(order => {
                const prevStatus = previousStatuses.get(order.id);
                if (order.status === 'ready' && (prevStatus === 'pending' || prevStatus === 'preparing')) {
                    playReadyAlert();
                }
            });
        }

        // تصفية الطلبات التي هي "توصيل" فقط
        const deliveryOnly = currentOrders.filter(o => o.table_no && o.table_no.includes("توصيل"));

        if (deliveryOnly.length === 0) {
            container.innerHTML = `
                <div class="text-center py-20">
                    <span class="text-5xl block mb-4">💤</span>
                    <p class="text-zinc-500">لا توجد طلبات توصيل جاهزة حالياً</p>
                </div>`;
            return;
        }

        container.innerHTML = deliveryOnly.map(order => {
            const info = parseDeliveryDetails(order.table_no);
            const items = parseItems(order.items);
            const mapLink = info.location.includes('http')
                ? `<a href="${info.location}" target="_blank" class="block w-full bg-blue-600 text-center py-3 rounded-xl font-bold mb-2">📍 فتح الموقع في الخرائط</a>`
                : `<div class="bg-zinc-800 p-3 rounded-xl mb-2 text-sm text-zinc-300">🏠 العنوان: ${info.location || 'غير محدد'}</div>`;

            const appBaseUrl = window.resolveSiteBase();
            const qrCodeUpdateUrl = `${appBaseUrl}Front-end/delivery_status_update.html?orderId=${order.id}`;

            // تحديد لون الكود: ذهبي للتحضير، أخضر للجاهزية
            const isReady = order.status === 'ready' || order.status === 'out_for_delivery';
            const qrColor = isReady ? '10B981' : 'D4AF37';
            const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=${qrColor}&data=${encodeURIComponent(qrCodeUpdateUrl)}`;

            let actionContent = '';
            let statusLabel = '';

            if (order.status === 'pending' || order.status === 'preparing') {
                statusLabel = `<span class="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-1 rounded-lg border border-amber-500/20">جاري التحضير بالمطبخ</span>`;
                actionContent = `
                    <div class="text-center mt-4 bg-zinc-800/50 p-3 rounded-2xl border border-amber-500/20">
                        <p class="text-amber-500 text-xs font-bold mb-2">انتظر اللون الأخضر:</p>
                        <img src="${qrCodeImageUrl}" class="mx-auto w-32 h-32 opacity-50 mb-3">
                        <button disabled class="w-full bg-zinc-800 text-zinc-600 py-3 rounded-xl font-bold cursor-not-allowed border border-zinc-700">
                            الطلب في الطريق (بانتظار المطبخ) ⏳
                        </button>
                    </div>`;
            } else if (order.status === 'ready') {
                statusLabel = `<span class="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-1 rounded-lg border border-emerald-500/20">جاهز للتوصيل</span>`;
                actionContent = `
                    <div class="text-center mt-4 bg-white p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
                        <p class="text-black text-xs font-bold mb-2">امسح أو اضغط للبدء:</p>
                        <img src="${qrCodeImageUrl}" class="mx-auto w-32 h-32 mb-3">
                        <button onclick="startDeliveryManually('${order.id}')" class="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-500 transition shadow-md">
                            تأكيد الاستلام (الطلب في الطريق) 🚚
                        </button>
                    </div>`;
            } else {
                statusLabel = `<span class="bg-blue-500/10 text-blue-500 text-[10px] px-2 py-1 rounded-lg border border-blue-500/20">في الطريق</span>`;
                actionContent = `
                    <button onclick="finishDelivery('${order.id}')" class="w-full bg-zinc-100 text-black py-4 rounded-2xl font-bold hover:bg-white transition">
                        تم التسليم للزبون ✓
                    </button>`;
            }

            const totalPrice = parseFloat(order.total_price || 0).toFixed(2);

            return `
            <div class="bg-zinc-900 border border-emerald-500/30 rounded-3xl p-5 shadow-xl">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-emerald-400">${info.name}</h3>
                        <a href="tel:${info.phone}" class="text-amber-500 font-mono text-lg font-bold">📞 ${info.phone}</a>
                        <p class="text-lg font-black text-white mt-1">المجموع: ${totalPrice} ر.س</p>
                        <p class="text-xs text-zinc-400 mt-1">💳 طريقة الدفع: <span class="text-amber-300 font-bold">${info.payment}</span></p>
                    </div>
                    ${statusLabel}
                </div>

                <div class="space-y-2 mb-4">
                    <p class="text-xs text-zinc-500">الأصناف:</p>
                    <ul class="text-sm text-zinc-300">
                        ${items.map(i => `<li>• ${i.name} × ${i.quantity}</li>`).join('')}
                    </ul>
                </div>

                ${mapLink}
                ${actionContent}
            </div>`;
        }).join('');

        // تحديث سجل الحالات للمرة القادمة
        previousStatuses.clear();
        currentOrders.forEach(o => previousStatuses.set(o.id, o.status));
        isFirstLoad = false;

    } finally {
        isFetching = false;
    }
}

async function startDeliveryManually(orderId) {
    const result = await markAsOutForDelivery(orderId);
    if (!result.ok) {
        alert("⚠️ فشل تحديث الحالة: " + result.error);
    } else {
        loadDeliveryOrders();
    }
}

async function markAsOutForDelivery(orderId) {
    const client = window.getSupabaseClient();
    const { error } = await client
        .from("orders")
        .update({ status: "out_for_delivery" })
        .eq("id", orderId)
        .eq("status", "ready");

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

async function finishDelivery(orderId) {
    const client = window.getSupabaseClient();
    const { error } = await client.from("orders").update({ status: "completed" }).eq("id", orderId);
    if (error) alert("خطأ: " + error.message);
    else loadDeliveryOrders();
}

let isDeliveryInit = false;
function initDelivery() {
    if (isDeliveryInit) return;
    isDeliveryInit = true;

    // 🔒 فرض التنصيص الإجباري: التحقق من الصلاحية (توصيل أو مدير)
    if (typeof checkAccess === "function" && !checkAccess('delivery') && !checkAccess('admin')) {
        window.location.replace("admin-login.html");
        return;
    }

    loadDeliveryOrders();
    // تحديث تلقائي كل دقيقة كاحتياط
    setInterval(loadDeliveryOrders, 60000);

    const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (client) {
        client.channel('delivery_orders_realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'orders' 
            }, () => {
                loadDeliveryOrders();
            })
            .subscribe();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (client) initDelivery();
    window.addEventListener("supabaseReady", initDelivery);
});

window.finishDelivery = finishDelivery;
window.markAsOutForDelivery = markAsOutForDelivery;
window.startDeliveryManually = startDeliveryManually;