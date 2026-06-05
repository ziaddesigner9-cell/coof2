/**
 * نظام عامل التوصيل: يعرض الطلبات الجاهزة فقط
 */

function parseDeliveryDetails(text) {
    if (!text || !text.includes("توصيل")) return null;
    // الصيغة: توصيل - الاسم: زيد | الجوال: 05... | الموقع: رابط أو نص
    try {
        const parts = text.split('|');
        const name = parts[0]?.split('الاسم:')[1]?.trim() || "غير معروف";
        const phone = parts[1]?.split('الجوال:')[1]?.trim() || "غير معروف";
        const payment = parts[2]?.split('الدفع:')[1]?.trim() || "غير محدد";
        const location = parts[3]?.split('الموقع:')[1]?.trim() || "";
        return { name, phone, payment, location };
    } catch (e) {
        return { name: "خطأ في البيانات", phone: text, location: "" };
    }
}

async function loadDeliveryOrders() {
    const container = document.getElementById("delivery-orders");
    const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (!container) return;
    if (!client) {
        container.innerHTML = `<p class="text-amber-500 text-center py-10">جاري الاتصال بالنظام...</p>`;
        return;
    }

    const { data: orders, error } = await client
        .from("orders")
        .select("*")
        .in("status", ["ready", "out_for_delivery"]) //
        .order("created_at", { ascending: false });

    if (error) {
        container.innerHTML = `<p class="text-red-400 text-center">خطأ: ${error.message}</p>`;
        return;
    }

    // تصفية الطلبات التي هي "توصيل" فقط
    const deliveryOnly = orders.filter(o => o.table_no && o.table_no.includes("توصيل"));

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
        const items = Array.isArray(order.items) ? order.items : [];
        const mapLink = info.location.includes('http')
            ? `<a href="${info.location}" target="_blank" class="block w-full bg-blue-600 text-center py-3 rounded-xl font-bold mb-2">📍 فتح الموقع في الخرائط</a>`
            : `<div class="bg-zinc-800 p-3 rounded-xl mb-2 text-sm text-zinc-300">🏠 العنوان: ${info.location || 'غير محدد'}</div>`;

        const appBaseUrl = window.resolveSiteBase();
        const qrCodeUpdateUrl = `${appBaseUrl}Front-end/delivery_status_update.html?orderId=${order.id}`;
        const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeUpdateUrl)}`;

        let actionContent = '';
        let statusLabel = '';

        if (order.status === 'ready') {
            statusLabel = `<span class="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-1 rounded-lg border border-emerald-500/20">جاهز للتوصيل</span>`;
            actionContent = `
                <div class="text-center mt-4 bg-white p-3 rounded-2xl">
                    <p class="text-black text-xs font-bold mb-2">امسح لبدء التوصيل:</p>
                    <img src="${qrCodeImageUrl}" class="mx-auto w-32 h-32">
                </div>`;
        } else {
            statusLabel = `<span class="bg-blue-500/10 text-blue-500 text-[10px] px-2 py-1 rounded-lg border border-blue-500/20">في الطريق</span>`;
            actionContent = `
                <button onclick="finishDelivery('${order.id}')" class="w-full bg-zinc-100 text-black py-4 rounded-2xl font-bold hover:bg-white transition">
                    تم التسليم للزبون ✓
                </button>`;
        }

        return `
        <div class="bg-zinc-900 border border-emerald-500/30 rounded-3xl p-5 shadow-xl">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-bold text-emerald-400">${info.name}</h3>
                    <a href="tel:${info.phone}" class="text-amber-500 font-mono text-lg font-bold">📞 ${info.phone}</a>
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

function startDeliverySystem() {
    loadDeliveryOrders();
    // تحديث تلقائي كل 30 ثانية
    setInterval(loadDeliveryOrders, 30000);
}

window.finishDelivery = finishDelivery;
window.markAsOutForDelivery = markAsOutForDelivery;