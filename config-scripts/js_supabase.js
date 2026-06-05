/**
 * نسخة متوافقة لصفحات قديمة تعتمد على js_supabase.js
 * وتحافظ على نفس آلية التهيئة الموجودة في dependencies.js.
 */
(function initSupabaseClientFromLegacyFile() {
    const lib = window.supabasejs || window.supabase;
    if (!lib || !lib.createClient) {
        console.error("لم يتم تحميل مكتبة Supabase. تأكد من تضمين CDN أولاً.");
        return;
    }

    // إذا تم التهيئة مسبقًا، لا نعيد الإنشاء
    if (window.supabaseClient) {
        window.supabase = window.supabaseClient;
        window.dispatchEvent(new Event("supabaseReady"));
        return;
    }

    // المحاولة من خلال الدالة المركزية في dependencies.js
    if (typeof window.getSupabaseClient === "function") {
        const client = window.getSupabaseClient();
        if (client) return;
    }

    try {
        console.warn("js_supabase.js: يتم الاعتماد الآن على dependencies.js للتهيئة.");
    } catch (error) {
        console.error("فشل تهيئة Supabase:", error);
    }
})();
