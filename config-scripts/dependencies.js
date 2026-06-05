/**
 * تهيئة Supabase مرة واحدة لكل الصفحات.
 * يوفّر: window.supabaseClient و window.getSupabaseClient()
 */
(function initSupabaseClient() {
    /**
     * تحذير أمني: لا تضع المفاتيح الحقيقية هنا بشكل دائم إذا كان المستودع عاماً.
     */
    const SUPABASE_URL = "https://jdaggrzdaxcnnfmdyvic.supabase.co";
    const SUPABASE_KEY = "sb_publishable_piXWc1wVLZYutDRvZaLVmA_7CqPaLD1";

    /** رابط عام ثابت بعد رفع الموقع. اتركه فارغاً ليستخدم الموقع الحالي أو قاعدة مخزنة.
     * يُستخدم في QR بدل localhost.
     */
    window.COOF2_SITE_BASE = "https://ziaddesigner9-cell.github.io/coof2/";

    const PUBLIC_BASE_STORAGE_KEY = "COOF2_PUBLIC_BASE";

    function normalizeBase(url) {
        if (!url) return "";
        let base = String(url).trim();
        if (!base) return "";
        if (!/^https?:\/\//i.test(base)) base = "https://" + base;
        if (!base.endsWith("/")) base += "/";
        return base;
    }

    window.setCoof2PublicBase = function setCoof2PublicBase(url) {
        const base = normalizeBase(url);
        if (base) localStorage.setItem(PUBLIC_BASE_STORAGE_KEY, base);
        else localStorage.removeItem(PUBLIC_BASE_STORAGE_KEY);
        return base;
    };

    window.getCoof2PublicBase = function getCoof2PublicBase() {
        return localStorage.getItem(PUBLIC_BASE_STORAGE_KEY) || "";
    };

    /** عنوان يعمل من الجوال عند مسح QR */
    window.resolveSiteBase = function resolveSiteBase() {
        // إذا كنا في بيئة محلية، نستخدم رابط الجهاز الحالي بدلاً من الرابط الثابت
        if (window.isLocalOnlyEnvironment()) {
            return normalizeBase(window.location.href.replace(/[^/]*$/, ""));
        }

        if (window.COOF2_SITE_BASE) return normalizeBase(window.COOF2_SITE_BASE);
        
        const stored = getCoof2PublicBase();
        if (stored) return normalizeBase(stored);

        return normalizeBase(window.location.href.replace(/[^/]*$/, ""));
    };

    window.isLocalOnlyEnvironment = function isLocalOnlyEnvironment() {
        if (window.location.protocol === "file:") return true;
        const host = window.location.hostname;
        return host === "localhost" || host === "127.0.0.1";
    };

	window.getSupabaseClient = function getSupabaseClient() {
		// 1. Check for existing initialized client
		if (window.supabaseClient && typeof window.supabaseClient.from === "function") return window.supabaseClient;
		
		// 2. Check for library availability (supabase-js CDN)
		const lib = window.supabase || (window.supabaseLib && window.supabaseLib.createClient ? window.supabaseLib : null);
		
		if (lib && typeof lib.createClient === "function") {
			try {
				const client = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
				window.supabaseClient = client;
				return client;
			} catch (e) {
				console.error("خطأ أثناء إنشاء عميل Supabase:", e);
			}
		}
		
		// 3. Check if 'supabase' object itself is already a client (some CDN versions)
		if (window.supabase && typeof window.supabase.from === "function") {
			window.supabaseClient = window.supabase;
			return window.supabase;
		}

		return null;
	};

    try {
		let attempts = 0;
		const maxAttempts = 20;
		const checkInit = setInterval(() => {
			attempts++;
			const client = window.getSupabaseClient();
			if (client) {
				clearInterval(checkInit);
				if (!window.supabaseInitialized) {
					window.supabaseInitialized = true;
					window.dispatchEvent(new Event("supabaseReady"));
					console.log("تم تهيئة Supabase بنجاح.");
				}
			} else if (attempts >= maxAttempts) {
				clearInterval(checkInit);
				console.error("تعذر العثور على مكتبة Supabase بعد عدة محاولات.");
			}
		}, 500);
    } catch (error) {
        console.error("فشل تهيئة Supabase:", error);
    }
})();
