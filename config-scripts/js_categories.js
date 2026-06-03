/**
 * تصنيفات القائمة الموحّدة: hot | cold | dessert
 */
const MENU_CATEGORY_KEYS = ["hot", "cold", "dessert"];

const MENU_CATEGORY_LABELS = {
    hot: "مشروبات ساخنة",
    cold: "مشروبات باردة",
    dessert: "الحلى",
};

const CATEGORY_ALIASES_MAP = {
    hot: ["hot", "ساخن", "مشروبات ساخنة", "قهوة", "قهـوة", "ساخنة"],
    cold: ["cold", "بارد", "مشروبات باردة", "عصير", "عصائر", "باردة"],
    dessert: ["dessert", "حلى", "حلويات", "حلوى", "تحلية"],
};

nfunction normalizeMenuCategory(value) {
    const c = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    if (!c) return null;
    for (const key of MENU_CATEGORY_KEYS) {
        if (CATEGORY_ALIASES_MAP[key].some((alias) => alias.toLowerCase() === c)) return key;
    }
    return null;
}

nfunction itemMatchesCategory(item, categoryKey) {
    return normalizeMenuCategory(item?.category) === categoryKey;
}

window.MENU_CATEGORY_KEYS = MENU_CATEGORY_KEYS;
window.MENU_CATEGORY_LABELS = MENU_CATEGORY_LABELS;
window.normalizeMenuCategory = normalizeMenuCategory;
window.itemMatchesCategory = itemMatchesCategory;
