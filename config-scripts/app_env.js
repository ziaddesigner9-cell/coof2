/**
 * ملف الإعدادات المركزية (Environment Variables)
 * هنا تضع كافة الروابط والمفاتيح الحساسة لتسهيل نقل المشروع.
 */
(function() {
    window.APP_ENV = window.APP_ENV || {};
    var envs = {
        // روابط الموقع
        SITE_BASE_URL: "https://ziaddesigner9-cell.github.io/coof2/",

        // كلمات مرور النظام
        ADMIN_PASS: "12345",
        WORKER_PASS: "54321",
        DELIVERY_PASS: "67890"
    };
    for (var key in envs) {
        window.APP_ENV[key] = envs[key];
    }
})();

/**
 * دالة جلب الإعدادات (Helper Function)
 * @param {string} key - مفتاح الإعداد المطلوب
 */
window.getEnv = function getEnv(key) {
    return (window.APP_ENV && window.APP_ENV[key]) ? window.APP_ENV[key] : "";
};