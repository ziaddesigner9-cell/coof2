/**
 * تهيئة Supabase مرة واحدة لكل الصفحات.
 * يوفّر: window.supabaseClient و window.getSupabaseClient()
 */
(function initSupabaseClient() {
    const SUPABASE_URL = "الرابط هنا"; 
    const SUPABASE_KEY = "المفتاح هنا"; 

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
        
        const lib = window.supabaseLib || (window.supabase && typeof window.supabase.createClient === "function" ? window.supabase : null);
        
        if (lib && typeof lib.createClient === "function") {
            try {
                const client = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
                window.supabaseClient = client;
                window.supabase = client; // توحيد المرجع لضمان التوافق مع الكود القديم
                return client;
            } catch (e) {
                console.error("خطأ أثناء إنشاء عميل Supabase:", e);
            }
        }
        return null;
    };

    window.onSupabaseReady = function(callback) {
        const client = window.getSupabaseClient();
        if (window.isSupabaseReady && client) {
            callback(client);
        } else {
            window.addEventListener("supabaseReady", () => callback(window.getSupabaseClient()), { once: true });
        }
    };

    try {
        const client = window.getSupabaseClient();
        if (client) {
            // إعلام النظام بالجاهزية
            window.dispatchEvent(new Event("supabaseReady"));
            // التأكد من استجابة المستمعين الذين تمت إضافتهم لاحقاً
            window.isSupabaseReady = true; 
            console.log("تم تهيئة Supabase بنجاح.");
        } else {
            // محاولة إعادة التهيئة بعد قليل في حال تأخر تحميل الـ CDN
            setTimeout(initSupabaseClient, 500);
        }
    } catch (error) {
        console.error("فشل تهيئة Supabase:", error);
    }
})();
