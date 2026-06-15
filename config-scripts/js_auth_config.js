/**
 * ملف: js_auth_config.js
 * المسؤول عن إدارة تسجيل الدخول الآمن والصلاحيات وجلسات الموظفين
 */

/**
 * دالة مساعدة: انتظار اتصال Supabase (تنتظر حدث supabaseReady أو تتحقق مباشرة)
 * @param {number} timeoutMs - الحد الأقصى للانتظار بالمللي ثانية
 * @returns {Promise<object|null>}
 */
function waitForSupabaseClient(timeoutMs = 5000) {
    return new Promise((resolve) => {
        // إذا كان الاتصال موجوداً بالفعل، أعِد النتيجة فوراً
        const existing = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
        if (existing) return resolve(existing);

        // انتظر حتى يُطلَق الحدث
        const timeout = setTimeout(() => {
            window.removeEventListener("supabaseReady", handler);
            resolve(null); // انتهى الوقت دون اتصال
        }, timeoutMs);

        function handler() {
            clearTimeout(timeout);
            window.removeEventListener("supabaseReady", handler);
            const client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
            resolve(client);
        }

        window.addEventListener("supabaseReady", handler);
    });
}

/**
 * دالة التحقق من الدخول الآمنة (Async)
 * @param {string} password - رمز PIN أو كلمة المرور المدخلة
 * @param {string} type - نوع المستخدم ('admin' أو 'worker' أو 'delivery')
 * @returns {Promise<boolean>}
 */
async function verifyLogin(password, type) {
    // 1. تحديد البريد الإلكتروني الوهمي بناءً على الدور (دخول صامت بدون بريد)
    let email = "";
    if (type === 'admin')    email = 'admin@cafe.com';
    else if (type === 'worker')   email = 'kitchen@cafe.com';
    else if (type === 'delivery') email = 'delivery@cafe.com';
    else return false;

    // 2. انتظار اتصال Supabase (بحد أقصى 5 ثوانٍ)
    const client = await waitForSupabaseClient(5000);
    if (!client) {
        console.error("فشل الاتصال بـ Supabase بعد الانتظار.");
        alert("⚠️ تعذّر الاتصال بالخادم، تأكد من اتصال الإنترنت وأعِد المحاولة.");
        return false;
    }

    try {
        // 3. تسجيل الخروج من أي جلسة سابقة لتنظيف المتصفح
        await logout(client);

        // 4. تسجيل الدخول الآمن عبر خادم Supabase
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error("خطأ تسجيل الدخول:", error.message);
            return false;
        }

        // 5. حفظ الدور محلياً للتوافق مع بقية كود المشروع
        localStorage.setItem('coof2_role', type);
        return true;
    } catch (e) {
        console.error("خطأ غير متوقع أثناء الدخول:", e);
        return false;
    }
}

/**
 * دالة تسجيل الخروج لمسح الجلسة المحلية والخلفية
 * @param {object} [existingClient] - يمكن تمرير العميل مباشرة لتجنب استدعاء getSupabaseClient مجدداً
 * @returns {Promise<void>}
 */
async function logout(existingClient) {
    localStorage.removeItem('coof2_role');
    const client = existingClient ||
        (typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null);
    if (client && typeof client.auth.signOut === "function") {
        try { await client.auth.signOut(); } catch (_) {}
    }
}

/**
 * دالة للتحقق من دور المستخدم الحالي (تستخدم محلياً للتوجيه المرئي)
 * @param {string} requiredRole - الدور المطلوب (مثلاً 'admin')
 * @returns {boolean}
 */
function checkAccess(requiredRole) {
    const currentRole = localStorage.getItem('coof2_role');
    return currentRole === requiredRole;
}