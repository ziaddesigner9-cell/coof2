/**
 * تهيئة Supabase مرة واحدة لكل الصفحات.
 * يوفّر: window.supabaseClient و window.getSupabaseClient()
 */
(function initSupabaseClient() {
    const SUPABASE_URL = window.APP_ENV ? window.APP_ENV.SUPABASE_URL : "";
    const SUPABASE_ANON_KEY = window.APP_ENV ? window.APP_ENV.SUPABASE_ANON_KEY : "";
    const SITE_BASE_URL = "https://ziaddesigner9-cell.github.io/coof2/";
    
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

        if (SITE_BASE_URL) return normalizeBase(SITE_BASE_URL);
        
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
        
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

        // 2. التحقق من توفر المكتبة (supabase-js CDN)
        // ملاحظة: الـ CDN يعرّف المتغير باسم supabasejs بدلاً من supabase
        const lib = window.supabasejs || window.supabase;
        
        if (lib && typeof lib.createClient === "function") {
            try {
                // التحقق من صحة المفتاح قبل المحاولة
                if (!SUPABASE_ANON_KEY || String(SUPABASE_ANON_KEY).trim().indexOf("eyJ") !== 0) {
                    console.error("❌ خطأ حرج: المفتاح غير صالح أو مفقود.");
                    return null;
                }
                const client = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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

    /**
     * دالة ذكية لجلب رابط الصورة العام.
     * تحل مشكلة الروابط المحلية (localhost) المخزنة في قاعدة البيانات وتضمن استخدام getPublicUrl.
     */
    window.getSafeImageUrl = function(urlOrPath, bucket = 'menu-images') {
        if (!urlOrPath) return "https://via.placeholder.com/300?text=No+Image";
        
        const isFullUrl = urlOrPath.startsWith('http');
        const isLocal = urlOrPath.includes('localhost') || urlOrPath.includes('127.0.0.1');

        // إذا كان الرابط خارجياً وصحيحاً (وليس محلياً في بيئة أونلاين) نستخدمه كما هو
        if (isFullUrl && (!isLocal || window.isLocalOnlyEnvironment())) {
            return urlOrPath;
        }

        const client = window.getSupabaseClient();
        if (!client) return urlOrPath;

        // استخراج المسار الصافي للملف
        let path = urlOrPath;
        const markers = ["/menu-images/", "/object/public/menu-images/"];
        for (const marker of markers) {
            const idx = urlOrPath.indexOf(marker);
            if (idx !== -1) {
                path = urlOrPath.slice(idx + marker.length);
                break;
            }
        }

        const { data } = client.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
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
				if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
					console.error("❌ فشل التهيئة: المفاتيح مفقودة. يرجى التأكد من كتابة المفاتيح يدوياً داخل dependencies.js");
				} else {
					console.error("❌ فشل التهيئة: مكتبة Supabase (CDN) مفقودة في هذه الصفحة.");
				}
			}
		}, 500);
    } catch (error) {
        console.error("فشل تهيئة Supabase:", error);
    }
})();
