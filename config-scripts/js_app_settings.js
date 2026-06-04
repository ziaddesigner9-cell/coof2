/**
 * إعدادات التطبيق (مظهر + عبارات) — تُحفظ في Supabase جدول app_settings
 */
const APP_SETTINGS_KEY = "app_config";
const APP_SETTINGS_CACHE = "cafe_app_settings_cache";
const APP_VERSION = "1.1.7"; // تحديث النسخة لضمان تصفير الكاش نهائياً

const DEFAULT_APP_SETTINGS = {
    background_image: "",
    logo_image: "",
    category_hot_image: "",
    category_cold_image: "",
    category_dessert_image: "",
    phrases: {
        brand_tagline: "CAFE AL-SAADA",
        home_slogan: "Welcome to the Distinguished Cafe",
        home_welcome_title: "أهلاً بك",
        home_welcome_sub: "اختر تصنيفاً واستمتع بتجربة فاخرة",
        category_hot_label: "المشروبات الساخنة",
        category_cold_label: "المشروبات الباردة",
        category_dessert_label: "الحلى",
        category_row_hint: "تصفح",
        tracking_title: "شكراً لطلبك",
        tracking_scan_hint: "امسح الرمز لفتح صفحة الطلب",
        tracking_sub_pending: "سيتحول الرمز للأخضر عند اكتمال التجهيز",
        tracking_status_waiting: "بانتظار العامل",
        tracking_status_preparing: "قيد التجهيز",
        tracking_status_ready: "الطلب جاهز للاستلام ✓",
        tracking_sub_ready: "تفضّل بالاستلام من الكاونتر",
        tracking_status_completed: "تم الاستلام ✓",
        tracking_sub_completed: "شكراً لزيارتكم — نتمنى لكم يوماً سعيداً",
        order_view_brand_en: "Cafe Al-Saada",
        order_view_brand_ar: "مقهى السعادة",
        order_view_ready_msg: "✓ الطلب جاهز — تفضّل بالاستلام",
        order_view_completed_msg: "✓ شكراً لزيارتكم",
    },
    /* UI / typography and code display settings */
    ui: {
        text_font_size: 16,
        box_width: 220,
        box_height: 220,
        gold_color: "#D4AF37",
        silver_color: "#C0C0C0",
        gold_on_top: false,
        show_code_text: false, // إخفاء النصوص الكودية (ORD-xxx)
        border_width: 1 // سمك الإطار
    }
};

function mergeSettings(raw) {
    const base = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
    if (!raw || typeof raw !== "object") return base;
    if (raw.background_image) base.background_image = raw.background_image;
    if (raw.logo_image) base.logo_image = raw.logo_image;
    if (raw.category_hot_image) base.category_hot_image = raw.category_hot_image;
    if (raw.category_cold_image) base.category_cold_image = raw.category_cold_image;
    if (raw.category_dessert_image) base.category_dessert_image = raw.category_dessert_image;
    if (raw.phrases && typeof raw.phrases === "object") {
        base.phrases = { ...base.phrases, ...raw.phrases };
    }
    // merge ui settings
    if (raw.ui && typeof raw.ui === "object") base.ui = { ...base.ui, ...raw.ui };
    return base;
}

async function loadAppSettings(forceRemote = false) {
    if (!forceRemote) {
        try {
            const cached = localStorage.getItem(APP_SETTINGS_CACHE);
            if (cached) {
                const parsed = JSON.parse(cached);
                // إذا كانت النسخة المخزنة قديمة، تجاوز الكاش
                if (parsed._version === APP_VERSION) return mergeSettings(parsed);
            }
        } catch (_) {}
    }

    const client =
        typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (!client) return mergeSettings(null);

    const { data, error } = await client
        .from("app_settings")
        .select("value")
        .eq("key", APP_SETTINGS_KEY)
        .maybeSingle();

    if (error) {
        console.warn("تعذر جلب الإعدادات:", error.message);
        return mergeSettings(null);
    }

    const merged = mergeSettings(data?.value);
    merged._version = APP_VERSION; // حفظ النسخة في الكاش
    try {
        localStorage.setItem(APP_SETTINGS_CACHE, JSON.stringify(merged));
    } catch (_) {}
    return merged;
}

async function saveAppSettings(settings) {
    const client =
        typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null;
    if (!client) throw new Error("Supabase غير متصل");

    const payload = mergeSettings(settings);
    const { error } = await client.from("app_settings").upsert({
        key: APP_SETTINGS_KEY,
        value: payload,
        updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    localStorage.setItem(APP_SETTINGS_CACHE, JSON.stringify(payload));
    return payload;
}

function phrase(settings, key, fallback = "") {
    return settings?.phrases?.[key] ?? DEFAULT_APP_SETTINGS.phrases[key] ?? fallback;
}

/** عرض الصورة كاملة داخل الإطار دون قص (object-fit: contain) */
function setCategoryRowImage(row, url) {
    if (!row) return;
    const catKey = row.getAttribute("data-category-cover") || "تصنيف";
    const altText = `صورة ${catKey}`;
    let wrap = row.querySelector(".category-img-wrap");
    if (!wrap) {
        wrap = document.createElement("div");
        wrap.className = "category-img-wrap";
        const content = row.querySelector(".category-row-content");
        if (content) row.insertBefore(wrap, content);
        else row.prepend(wrap);
    }
    let img = wrap.querySelector(".category-cover-img");
    if (!img) {
        img = document.createElement("img");
        img.className = "category-cover-img";
        img.alt = altText;
        wrap.appendChild(img);
    } else {
        img.alt = altText;
    }
    if (url) {
        img.src = url;
        img.hidden = false;
        row.classList.add("has-cover");
    } else {
        img.removeAttribute("src");
        img.hidden = true;
        row.classList.remove("has-cover");
    }
}

function categoryRowHasImage(row) {
    const img = row?.querySelector(".category-cover-img");
    return Boolean(img?.src);
}

function applyHomeSettings(settings) {
    const s = mergeSettings(settings);
    
    // تطبيق الألوان وحجم الخط برمجياً عبر متغيرات CSS
    const ui = s.ui || {};
    if (ui.gold_color) {
        document.documentElement.style.setProperty('--app-gold', ui.gold_color);
    }
    if (ui.text_font_size) {
        document.documentElement.style.setProperty('--app-font-size', ui.text_font_size + 'px');
    }

    // تطبيق اللون المختار على كافة العبارات الذهبية لضمان الربط الفوري
    document.querySelectorAll('.gold-text, .gold-title').forEach(el => {
        el.style.color = ui.gold_color || '#D4AF37';
    });

    const bg = document.getElementById("app-bg-layer");
    if (bg && s.background_image) {
        bg.style.backgroundImage = `url('${s.background_image}')`;
        bg.style.backgroundSize = "contain";
        bg.style.backgroundRepeat = "no-repeat";
        bg.style.backgroundPosition = "center";
        bg.classList.remove("hidden");
    }

    const logo = document.getElementById("app-logo");
    if (logo && s.logo_image) {
        logo.src = s.logo_image;
        logo.classList.remove("hidden");
        const emoji = document.getElementById("app-logo-emoji");
        if (emoji) emoji.classList.add("hidden");
    }

    const slogan = document.getElementById("app-slogan");
    if (slogan) slogan.textContent = phrase(s, "home_slogan");

    const brand = document.getElementById("home-brand");
    if (brand) brand.textContent = phrase(s, "brand_tagline");

    const title = document.getElementById("home-welcome-title");
    if (title) title.textContent = phrase(s, "home_welcome_title");

    const sub = document.getElementById("home-welcome-sub");
    if (sub) sub.textContent = phrase(s, "home_welcome_sub");

    const hint = phrase(s, "category_row_hint");
    [["hot", s.category_hot_image, "category_hot_label"], ["cold", s.category_cold_image, "category_cold_label"], ["dessert", s.category_dessert_image, "category_dessert_label"]].forEach(
        ([cat, img, labelKey]) => {
            const row = document.querySelector(`[data-category-cover="${cat}"]`);
            if (row && img) setCategoryRowImage(row, img);
            const labelEl = document.querySelector(`[data-category-label="${cat}"]`);
            if (labelEl) labelEl.textContent = phrase(s, labelKey);
            const hintEl = document.querySelector(`[data-category-hint="${cat}"]`);
            if (hintEl) hintEl.textContent = hint;
        }
    );
}

window.DEFAULT_APP_SETTINGS = DEFAULT_APP_SETTINGS;
window.mergeSettings = mergeSettings;
window.loadAppSettings = loadAppSettings;
window.saveAppSettings = saveAppSettings;
window.phrase = phrase;
window.applyHomeSettings = applyHomeSettings;
window.setCategoryRowImage = setCategoryRowImage;
window.categoryRowHasImage = categoryRowHasImage;
