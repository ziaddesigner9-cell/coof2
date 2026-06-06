/**
 * ملف الإعدادات المركزية (Environment Variables)
 * هنا تضع كافة الروابط والمفاتيح الحساسة لتسهيل نقل المشروع.
 */
window.APP_ENV = {
    // روابط Supabase
    SUPABASE_URL: "https://jdaggrzdaxcnnfmdyvic.supabase.co",
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWdncnpkYXhjbm5mbWR5dmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODMyMzgsImV4cCI6MjA5NjE1OTIzOH0.75Pcz12Jp0WkZ3_NUVt8D78BH0KgdDd1krjt-oxQoT8",

    // روابط الموقع
    SITE_BASE_URL: "https://ziaddesigner9-cell.github.io/coof2/",

    // كلمات مرور النظام
    ADMIN_PASS: "12345",
    WORKER_PASS: "54321",
    DELIVERY_PASS: "67890"
};

/**
 * دالة جلب الإعدادات (Helper Function)
 * @param {string} key - مفتاح الإعداد المطلوب
 */
window.getEnv = function getEnv(key) {
    return (window.APP_ENV && window.APP_ENV[key]) ? window.APP_ENV[key] : "";
};