const translations = {
    'ar': { 'welcome': 'أهلاً بك في COOF2', 'browse': 'تصفح القائمة', 'kitchen': 'لوحة تحكم المطبخ' },
    'en': { 'welcome': 'Welcome to COOF2', 'browse': 'Browse Menu', 'kitchen': 'Kitchen Dashboard' }
};

// تطبيق اللغة
function applyLanguage(lang) {
    document.documentElement.setAttribute('dir', (lang === 'ar') ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    try {
        localStorage.setItem('coof2_userLang', lang); // حفظ اللغة
    } catch (err) {
        console.error("فشل حفظ اللغة في localStorage:", err);
    }

    document.querySelectorAll('[data-key]').forEach(function(el) {
        var key = el.getAttribute('data-key');
        if (translations[lang] && translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });
}

// تبديل اللغة
function changeLanguage() {
    let currentLang = 'ar';
    try {
        currentLang = localStorage.getItem('coof2_userLang') || 'ar';
    } catch (err) {
        console.error("فشل قراءة اللغة من localStorage:", err);
    }
    const newLang = (currentLang === 'ar') ? 'en' : 'ar';
    applyLanguage(newLang);
}

// تنفيذ تلقائي عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', function() {
    let savedLang = 'ar';
    try {
        savedLang = localStorage.getItem('coof2_userLang') || 'ar';
    } catch (err) {
        console.error("فشل قراءة اللغة من localStorage عند البدء:", err);
    }
    applyLanguage(savedLang);
});
