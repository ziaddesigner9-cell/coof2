/**
 * نسخة متوافقة لصفحات قديمة تعتمد على js_supabase.js
 * وتحافظ على نفس آلية التهيئة الموجودة في dependencies.js.
 */
(function initSupabaseClientFromLegacyFile() {
    const SUPABASE_URL = "https://xywrgfnktvesnmeeqlux.supabase.co";
    const SUPABASE_KEY = "sb_publishable_Ii70Zy47h_KNbMv60d2UZw_II1i-mFC";

    if (!window.supabase || !window.supabase.createClient) {
        console.error("لم يتم تحميل مكتبة Supabase. تأكد من تضمين CDN أولاً.");
        return;
    }

    // إذا تم التهيئة مسبقًا، لا نعيد الإنشاء
    if (window.supabaseClient) {
        window.supabase = window.supabaseClient;
        window.dispatchEvent(new Event("supabaseReady"));
        return;
    }

    try {
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.supabaseClient = client;
        window.supabase = client;
        window.dispatchEvent(new Event("supabaseReady"));
        console.log("تم تهيئة Supabase عبر js_supabase.js بنجاح.");
    } catch (error) {
        console.error("فشل تهيئة Supabase:", error);
    }
})();
