/**
 * ملف: js_auth_config.js
 * المسؤول عن إدارة كلمات المرور والصلاحيات والجلسات
 */

const AUTH_CONFIG = {
    ADMIN_PASS: window.getEnv("ADMIN_PASS") || "12345",
    WORKER_PASS: window.getEnv("WORKER_PASS") || "54321",
};

/**
 * دالة التحقق من الدخول
 * @param {string} password - كلمة المرور المدخلة
 * @param {string} type - نوع المستخدم ('admin' أو 'worker')
 * @returns {boolean}
 */
function verifyLogin(password, type) {
    // تنظيف الجلسة السابقة قبل المحاولة الجديدة
    logout();

    if (type === 'admin' && password === AUTH_CONFIG.ADMIN_PASS) {
        localStorage.setItem('role', 'admin');
        return true;
    }
    if (type === 'worker' && password === AUTH_CONFIG.WORKER_PASS) {
        localStorage.setItem('role', 'worker');
        return true;
    }
    return false;
}

/**
 * دالة تسجيل الخروج (لمسح الجلسة)
 */
function logout() {
    localStorage.removeItem('role');
}

/**
 * دالة للتحقق مما إذا كان المستخدم مسجلاً للدخول بالفعل
 * @param {string} requiredRole - الدور المطلوب (مثلاً 'admin')
 * @returns {boolean}
 */
function checkAccess(requiredRole) {
    const currentRole = localStorage.getItem('role');
    return currentRole === requiredRole;
}
