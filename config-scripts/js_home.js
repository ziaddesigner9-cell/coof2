/**
 * صور التصنيفات الاحتياطية من الأصناف إذا لم يحددها المدير في الإعدادات
 */
const CATEGORY_FALLBACK = {
    hot: "",
    cold: "",
    dessert: "",
};

async function fillMissingCategoryImages() {
    var settings = await loadAppSettings();
    var categories = ["hot", "cold", "dessert"];
    var needs = [];
    for (var i = 0; i < categories.length; i++) {
        var c = categories[i];
        if (!settings["category_" + c + "_image"]) {
            needs.push(c);
        }
    }
    if (needs.length === 0) return;

    var setFallback = function(cat, url) {
        var row = document.querySelector('[data-category-cover="' + cat + '"]');
        if (row && !categoryRowHasImage(row)) setCategoryRowImage(row, url);
    };

    var client = typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (!client) {
        for (var i = 0; i < needs.length; i++) {
            setFallback(needs[i], CATEGORY_FALLBACK[needs[i]]);
        }
        return;
    }

    var res = await client.from("items").select("category, image_url").eq("is_available", true);
    var items = Array.isArray(res.data) ? res.data : [];

    for (var j = 0; j < needs.length; j++) {
        var cat = needs[j];
        var row = document.querySelector('[data-category-cover="' + cat + '"]');
        if (!row || categoryRowHasImage(row)) continue;
        
        var found = null;
        for (var k = 0; k < items.length; k++) {
            var item = items[k];
            if (itemMatchesCategory(item, cat) && item.image_url) {
                found = item;
                break;
            }
        }
        var finalImage = (found && found.image_url) ? window.getSafeImageUrl(found.image_url) : CATEGORY_FALLBACK[cat];
        setCategoryRowImage(row, finalImage);
    }
}

window.addEventListener("supabaseReady", fillMissingCategoryImages);
window.addEventListener("storage", function(e) {
    if (e.key === "coof2_app_settings_cache") {
        fillMissingCategoryImages();
    }
}); // تحديث الصور عند تغيير الإعدادات
