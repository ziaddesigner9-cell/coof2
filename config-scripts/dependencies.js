/**
 * تهيئة Supabase مرة واحدة لكل الصفحات.
 * يوفّر: window.supabaseClient و window.getSupabaseClient()
 */
(function initSupabaseClient() {
    // جلب البيانات من ملف الإعدادات المركزي
    // إضافة تحقق لضمان عدم توقف النظام إذا تأخر تحميل ملف الإعدادات
    const safeGetEnv = (key) => (window.getEnv && typeof window.getEnv === "function" ? window.getEnv(key) : "");

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

        const siteBase = safeGetEnv("SITE_BASE_URL");
        if (siteBase) return normalizeBase(siteBase);
        
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
        // 1. التحقق من وجود عميل مهيأ مسبقاً
        if (window.supabaseClient && typeof window.supabaseClient.from === "function") return window.supabaseClient;
        
        const rawUrl = safeGetEnv("SUPABASE_URL");
        const rawKey = safeGetEnv("SUPABASE_KEY");
        const SUPABASE_URL = rawUrl ? rawUrl.trim() : "";
        const SUPABASE_KEY = rawKey ? rawKey.trim() : "";

        if (!SUPABASE_URL || !SUPABASE_KEY) return null;

        // 2. التحقق من توفر المكتبة (supabase-js CDN)
        // ملاحظة: الـ CDN يعرّف المتغير باسم supabasejs بدلاً من supabase
        const lib = window.supabasejs || window.supabase;
        
        if (lib && typeof lib.createClient === "function") {
            try {
                // التحقق من صحة المفتاح قبل المحاولة
                if (SUPABASE_KEY && SUPABASE_KEY.length > 0) {
                    if (!SUPABASE_KEY.startsWith("eyJ")) {
                        console.error("❌ خطأ حرج: المفتاح المستلم هو: (" + SUPABASE_KEY.substring(0, 5) + "...) وهو غير صالح. تأكد من حفظ ملف app_env.js واستدعائه أولاً.");
                        return null;
                    }
                }
                const client = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
                window.supabaseClient = client;
                window.supabase = client; 
                return client;
            } catch (e) {
                console.error("خطأ أثناء إنشاء عميل Supabase:", e);
            }
        }
        
        // 3. التحقق إذا كان الكائن نفسه هو العميل (بعض إصدارات CDN)
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
				const rawUrl = safeGetEnv("SUPABASE_URL");
				const rawKey = safeGetEnv("SUPABASE_KEY");
				if (!rawUrl || !rawKey) {
					console.error("❌ فشل التهيئة: المفاتيح مفقودة. تأكد من استدعاء app_env.js قبل dependencies.js");
				} else {
					console.error("❌ فشل التهيئة: مكتبة Supabase (CDN) مفقودة في هذه الصفحة.");
				}
			}
		}, 500);
    } catch (error) {
        console.error("فشل تهيئة Supabase:", error);
    }
})();
