/**
 * تصنيفات القائمة الموحّدة: hot | cold | dessert
 */
const MENU_CATEGORY_KEYS = ["hot", "cold", "dessert", "shisha"];

const MENU_CATEGORY_LABELS = {
    hot: "مشروبات ساخنة",
    cold: "مشروبات باردة",
    dessert: "الحلى",
    shisha: "شيشة",
};

const CATEGORY_ALIASES_MAP = {
    hot: ["hot", "ساخن", "مشروبات ساخنة", "قهوة", "قهـوة", "ساخنة"],
    cold: ["cold", "بارد", "مشروبات باردة", "عصير", "عصائر", "باردة"],
    dessert: ["dessert", "حلى", "حلويات", "حلوى", "تحلية"],
    shisha: ["shisha", "شيشة", "معسل", "شيشه"],
};

function normalizeMenuCategory(value) {
    var c = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    if (!c) return null;
    for (var i = 0; i < MENU_CATEGORY_KEYS.length; i++) {
        var key = MENU_CATEGORY_KEYS[i];
        var aliases = CATEGORY_ALIASES_MAP[key];
        for (var j = 0; j < aliases.length; j++) {
            if (aliases[j].toLowerCase() === c) return key;
        }
    }
    return null;
}

function itemMatchesCategory(item, categoryKey) {
    return normalizeMenuCategory(item ? item.category : null) === categoryKey;
}

window.MENU_CATEGORY_KEYS = MENU_CATEGORY_KEYS;
window.MENU_CATEGORY_LABELS = MENU_CATEGORY_LABELS;
window.normalizeMenuCategory = normalizeMenuCategory;
window.itemMatchesCategory = itemMatchesCategory;
