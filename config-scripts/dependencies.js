/**
 * تهيئة Supabase مرة واحدة لكل الصفحات.
 * يوفّر: window.supabaseClient و window.getSupabaseClient()
 */
(function initSupabaseClient() {
    const SUPABASE_URL = "YOUR_SUPABASE_URL"; 
    const SUPABASE_KEY = "YOUR_SUPABASE_KEY"; 

    /** رابط عام ثابت بعد رفع الموقع. اتركه فارغاً ليستخدم الموقع الحالي أو قاعدة مخزنة.
     * يُستخدم في QR بدل localhost.
     */
    window.COOF1_SITE_BASE = "";

    const PUBLIC_BASE_STORAGE_KEY = "COOF1_PUBLIC_BASE";

    function normalizeBase(url) {
        if (!url) return "";
        let base = String(url).trim();
        if (!base) return "";
        if (!/^https?:\/\//i.test(base)) base = "https://" + base;
        if (!base.endsWith("/")) base += "/";
        return base;
    }

    window.setCoof1PublicBase = function setCoof1PublicBase(url) {
        const base = normalizeBase(url);
        if (base) localStorage.setItem(PUBLIC_BASE_STORAGE_KEY, base);
        else localStorage.removeItem(PUBLIC_BASE_STORAGE_KEY);
        return base;
    };

    window.getCoof1PublicBase = function getCoof1PublicBase() {
        return localStorage.getItem(PUBLIC_BASE_STORAGE_KEY) || "";
    };

    /** عنوان يعمل من الجوال عند مسح QR */
    window.resolveSiteBase = function resolveSiteBase() {
        if (window.COOF1_SITE_BASE) return normalizeBase(window.COOF1_SITE_BASE);
        const stored = getCoof1PublicBase();
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

    try {
        const client = window.getSupabaseClient();
        if (client) {
            window.dispatchEvent(new Event("supabaseReady"));
            console.log("تم تهيئة Supabase بنجاح.");
        } else {
            console.error("لم يتم تحميل مكتبة Supabase. تأكد من إدراج سكربت CDN الخاص بـ Supabase قبل هذا الملف.");
        }
    } catch (error) {
        console.error("فشل تهيئة Supabase:", error);
    }
})();
