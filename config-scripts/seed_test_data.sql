-- 1. إدراج أصناف المنيو (Items)
INSERT INTO public.items (name, price, category, image_url, is_available)
VALUES 
-- مشروبات ساخنة
('لاتيه كراميل', 22.00, 'hot', 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=400&h=400&fit=crop', true),
('كابتشينو مخصص', 18.00, 'hot', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop', true),
('سبانش لاتيه ساخن', 24.00, 'hot', 'https://images.unsplash.com/photo-1594132220962-eb4608c0ef66?w=400&h=400&fit=crop', true),

-- مشروبات باردة
('أيس سبانش لاتيه', 26.00, 'cold', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&h=400&fit=crop', true),
('موهيتو بلو بيري', 20.00, 'cold', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&h=400&fit=crop', true),
('أيس أمريكانو', 15.00, 'cold', 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400&h=400&fit=crop', true),

-- الحلى
('تيراميسو إيطالي', 35.00, 'dessert', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=400&fit=crop', true),
('كيكة العسل', 30.00, 'dessert', 'https://images.unsplash.com/photo-1524351199679-46cddf3027ef?w=400&h=400&fit=crop', true),
('براونيز كلاسيك', 22.00, 'dessert', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=400&fit=crop', true);

-- 2. إدراج إعدادات التطبيق (Home Settings) لتفعيل الصور في الواجهة
INSERT INTO public.app_settings (key, value)
VALUES ('app_config', $$
{
    "phrases": {
        "brand_tagline": "مقهى السعادة",
        "home_welcome_title": "أهلاً بك في مقهى السعادة",
        "home_welcome_sub": "استمتع بأفضل المشروبات والحلويات لدينا",
        "category_hot_label": "المشروبات الساخنة",
        "category_cold_label": "المشروبات الباردة",
        "category_dessert_label": "الحلى",
        "category_row_hint": "تصفح القائمة"
    },
    "logo_image": "https://images.unsplash.com/photo-1559902396-4d00214444e0?w=200&h=200&fit=crop",
    "category_hot_image": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",
    "category_cold_image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600",
    "category_dessert_image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600",
    "background_image": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200"
}
$$::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;