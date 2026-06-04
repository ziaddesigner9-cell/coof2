/**
 * تهيئة Supabase مرة واحدة لكل الصفحات.
 * يوفّر: window.supabaseClient و window.getSupabaseClient()
 */
(function initSupabaseClient() {
    const SUPABASE_URL = "https://xywrgfnktvesnmeeqlux.supabase.co";
    const SUPABASE_KEY = "sb_publishable_Ii70Zy47h_KNbMv60d2UZw_II1i-mFC";

    /** رابط عام ثابت بعد رفع الموقع. اتركه فارغاً ليستخدم الموقع الحالي أو قاعدة مخزنة.
     * يُستخدم في QR بدل localhost.
     */
    window.CAFE_SITE_BASE = "";

    const PUBLIC_BASE_STORAGE_KEY = "CAFE_PUBLIC_BASE";

    function normalizeBase(url) {
        if (!url) return "";
        let base = String(url).trim();
        if (!base) return "";
        if (!/^https?:\/\//i.test(base)) base = "https://" + base;
        if (!base.endsWith("/")) base += "/";
        return base;
    }

    window.setCafePublicBase = function setCafePublicBase(url) {
        const base = normalizeBase(url);
        if (base) localStorage.setItem(PUBLIC_BASE_STORAGE_KEY, base);
        else localStorage.removeItem(PUBLIC_BASE_STORAGE_KEY);
        return base;
    };

    window.getCafePublicBase = function getCafePublicBase() {
        return localStorage.getItem(PUBLIC_BASE_STORAGE_KEY) || "";
    };

    /** عنوان يعمل من الجوال عند مسح QR */
    window.resolveSiteBase = function resolveSiteBase() {
        if (window.CAFE_SITE_BASE) return normalizeBase(window.CAFE_SITE_BASE);
        const stored = getCafePublicBase();
        if (stored) return normalizeBase(stored);

        if (window.location.protocol === "file:") return "";

        const host = window.location.hostname;
        if (host === "localhost" || host === "127.0.0.1") return "";

        return normalizeBase(window.location.href.replace(/[^/]*$/, ""));
    };

    window.isLocalOnlyEnvironment = function isLocalOnlyEnvironment() {
        if (window.location.protocol === "file:") return true;
        const host = window.location.hostname;
        return host === "localhost" || host === "127.0.0.1";
    };

    window.getSupabaseClient = function getSupabaseClient() {
        if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
            return window.supabaseClient;
        }
        if (window.supabase && typeof window.supabase.from === "function") {
            window.supabaseClient = window.supabase;
            return window.supabase;
        }
        const lib = window.supabaseLib || window.supabase;
        if (lib && typeof lib.createClient === "function") {
            const client = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
            window.supabaseClient = client;
            window.supabase = client;
            return client;
        }
        return null;
    };

    const lib = window.supabase;
    if (!lib || typeof lib.createClient !== "function") {
        console.error("لم يتم تحميل مكتبة Supabase. ضع سكربت CDN قبل هذا الملف.");
        return;
    }

    window.supabaseLib = lib;

    try {
        const client = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.supabaseClient = client;
        window.supabase = client;
        window.dispatchEvent(new Event("supabaseReady"));
        console.log("تم تهيئة Supabase بنجاح.");
    } catch (error) {
        console.error("فشل تهيئة Supabase:", error);
    }
})();
