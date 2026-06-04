/**
 * صور التصنيفات الاحتياطية من الأصناف إذا لم يحددها المدير في الإعدادات
 */
const CATEGORY_FALLBACK = {
    hot: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&h=500&fit=crop",
    cold: "https://images.unsplash.com/photo-1622597469430-0a57358133f0?w=800&h=500&fit=crop",
    dessert: "https://images.unsplash.com/photo-1558961363-fa8fdf82db73?w=800&h=500&fit=crop",
};

async function fillMissingCategoryImages() {
    const settings = await loadAppSettings();
    const needs = ["hot", "cold", "dessert"].filter((c) => !settings[`category_${c}_image`]);
    if (needs.length === 0) return;

    const setFallback = (cat, url) => {
        const row = document.querySelector(`[data-category-cover="${cat}"]`);
        if (row && !categoryRowHasImage(row)) setCategoryRowImage(row, url);
    };

    const client =
        typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (!client) {
        needs.forEach((c) => setFallback(c, CATEGORY_FALLBACK[c]));
        return;
    }

    const { data } = await client.from("items").select("category, image_url").eq("is_available", true);
    const items = Array.isArray(data) ? data : [];

    needs.forEach((cat) => {
        const row = document.querySelector(`[data-category-cover="${cat}"]`);
        if (!row || categoryRowHasImage(row)) return;
        const found = items.find((i) => itemMatchesCategory(i, cat) && i.image_url);
        setCategoryRowImage(row, found?.image_url || CATEGORY_FALLBACK[cat]);
    });
}

window.addEventListener("supabaseReady", fillMissingCategoryImages);
window.addEventListener("storage", fillMissingCategoryImages); // تحديث الصور عند تغيير الإعدادات
