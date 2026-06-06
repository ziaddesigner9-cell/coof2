/**
 * ملف الإعدادات المركزية (Environment Variables)
 * هنا تضع كافة الروابط والمفاتيح الحساسة لتسهيل نقل المشروع.
 */
window.APP_ENV = Object.assign(window.APP_ENV || {}, {
    // روابط الموقع
    SITE_BASE_URL: "https://ziaddesigner9-cell.github.io/coof2/",

    // كلمات مرور النظام
    ADMIN_PASS: "12345",
    WORKER_PASS: "54321",
    DELIVERY_PASS: "67890"
});

/**
 * دالة جلب الإعدادات (Helper Function)
 * @param {string} key - مفتاح الإعداد المطلوب
 */
window.getEnv = function getEnv(key) {
    return (window.APP_ENV && window.APP_ENV[key]) ? window.APP_ENV[key] : "";
};