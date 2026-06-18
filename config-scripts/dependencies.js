/**
 * تهيئة Supabase مرة واحدة لكل الصفحات.
 * يوفّر: window.supabaseClient و window.getSupabaseClient()
 */
(function initSupabaseClient() {
    // 🔴 ضع بياناتك الحقيقية هنا مباشرة لحل مشكلة قراءة المفاتيح أونلاين
    const DIRECT_SUPABASE_URL = "https://jdaggrzdaxcnnfmdyvic.supabase.co";
    const DIRECT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWdncnpkYXhjbm5mbWR5dmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODMyMzgsImV4cCI6MjA5NjE1OTIzOH0.75Pcz12Jp0WkZ3_NUVt8D78BH0KgdDd1krjt-oxQoT8"; // مفتاح الأنون

    const SITE_BASE_URL = "";
    const PUBLIC_BASE_STORAGE_KEY = "COOF2_PUBLIC_BASE";

    function normalizeBase(url) {
        if (!url) return "";
        let base = String(url).trim();
        if (!base) return "";
        if (!/^https?:\/\//i.test(base)) base = "https://" + base;
        if (base.slice(-1) !== "/") base += "/";
        return base;
    }

    window.setCoof2PublicBase = function setCoof2PublicBase(url) {
        const base = normalizeBase(url);
        try {
            if (base) localStorage.setItem(PUBLIC_BASE_STORAGE_KEY, base);
            else localStorage.removeItem(PUBLIC_BASE_STORAGE_KEY);
        } catch (err) {
            console.error("فشل الوصول إلى localStorage في setCoof2PublicBase:", err);
        }
        return base;
    };

    window.getCoof2PublicBase = function getCoof2PublicBase() {
        try {
            return localStorage.getItem(PUBLIC_BASE_STORAGE_KEY) || "";
        } catch (err) {
            console.error("فشل الوصول إلى localStorage في getCoof2PublicBase:", err);
            return "";
        }
    };

    /** عنوان يعمل من الجوال عند مسح QR */
    window.resolveSiteBase = function resolveSiteBase() {
        const currentPath = window.location.href.replace(/[^/]*$/, "");

        // إذا كنا أونلاين (Netlify أو GitHub) نعتمد دائماً على الرابط الحالي
        if (!window.isLocalOnlyEnvironment()) {
            return normalizeBase(currentPath);
        }

        // إذا كنا في بيئة محلية، نستخدم الإعداد اليدوي إذا وجد (لاختبار الجوال على نفس الشبكة)
        const stored = getCoof2PublicBase();
        if (stored) return normalizeBase(stored);

        return normalizeBase(currentPath);
    };

    window.isLocalOnlyEnvironment = function isLocalOnlyEnvironment() {
        if (window.location.protocol === "file:") return true;
        const host = window.location.hostname;
        return host === "localhost" || host === "127.0.0.1";
    };

    window.getSupabaseClient = function getSupabaseClient() {
        // 1. التحقق من وجود عميل مهيأ مسبقاً
        if (window.supabaseClient && typeof window.supabaseClient.from === "function") return window.supabaseClient;
        
        // الاعتماد على المفاتيح الثابتة المباشرة، أو جلبها حياً من المتصفح كخيار احتياطي
        const env = window.APP_ENV || {};
        const url = DIRECT_SUPABASE_URL || env.SUPABASE_URL || window.SUPABASE_URL || "";
        const key = DIRECT_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_KEY || window.SUPABASE_ANON_KEY || "";

        if (!url || !key) return null;

        // 2. التحقق من توفر المكتبة (supabase-js CDN)
        const lib = window.supabasejs || window.supabase;
        
        if (lib && typeof lib.createClient === "function") {
            try {
                // التحقق من صحة المفتاح قبل المحاولة
                if (!key || String(key).trim().indexOf("eyJ") !== 0) {
                    console.error("❌ خطأ حرج: المفتاح غير صالح أو مفقود.");
                    return null;
                }
                const client = lib.createClient(url, key, {
                    auth: {
                        persistSession: true,
                        storageKey: "coof2_sb_auth_token"
                    }
                });
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
     * تحل مشكلة الروابط المحلية وتضمن استخدام getPublicUrl الصافي دائماً أونلاين
     */
    window.getSafeImageUrl = function(urlOrPath, bucket = 'MENU-IMAGES') {
        if (!urlOrPath) return "https://via.placeholder.com/300?text=No+Image";
        
        let original = String(urlOrPath).trim();
        
        // 💡 السر هنا: إذا كان الرابط كاملاً (سواء من سوبابيس أو خارجي)، نعيده مباشرة دون تلاعب!
        // هذا يمنع التشفير المزدوج للأسماء العربية والمسافات ويطابق عمل النسخة القديمة المستقرة.
        if (original.startsWith('http')) {
            return original;
        }
        
        // معالجة المسارات المحلية القصيرة فقط (مثل assets/image.png)
        let path = original;
        if (path.startsWith('/')) {
            path = path.substring(1);
        }

        const client = window.getSupabaseClient();
        if (!client) {
            const encodedPath = path.split('/').map(encodeURIComponent).join('/');
            return `${DIRECT_SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodedPath}`;
        }

        const { data } = client.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    };

    try {
        let attempts = 0;
        const maxAttempts = 20;
        var checkInit = setInterval(function() {
            attempts++;
            var client = window.getSupabaseClient();
            if (client) {
                clearInterval(checkInit);
                if (!window.supabaseInitialized) {
                    window.supabaseInitialized = true;
                    window.dispatchEvent(new Event("supabaseReady"));
                    console.log("تم تهيئة Supabase بنجاح عبر البيانات المباشرة.");
                }
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInit);
                console.error("❌ فشل تهيئة المكتبة: تأكد من تحديث رابط CDN في ملف index.html إلى unpkg كخيار مستقر.");
            }
        }, 500);
    } catch (error) {
        console.error("فشل تهيئة Supabase:", error);
    }
})();
