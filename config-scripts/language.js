const translations = {
    'ar': { 'welcome': 'أهلاً بك في مقهانا', 'browse': 'تصفح القائمة', 'kitchen': 'لوحة تحكم المطبخ' },
    'en': { 'welcome': 'Welcome to our cafe', 'browse': 'Browse Menu', 'kitchen': 'Kitchen Dashboard' }
};

// تطبيق اللغة
function applyLanguage(lang) {
    document.documentElement.setAttribute('dir', (lang === 'ar') ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('userLang', lang); // حفظ اللغة

    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });
}

// تبديل اللغة
function changeLanguage() {
    const currentLang = localStorage.getItem('userLang') || 'ar';
    const newLang = (currentLang === 'ar') ? 'en' : 'ar';
    applyLanguage(newLang);
}

// تنفيذ تلقائي عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('userLang') || 'ar';
    applyLanguage(savedLang);
});
