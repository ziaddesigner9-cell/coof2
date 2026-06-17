-- ========================================================================
-- Ritzy Roast Coffee Co. - 1-Click Database Setup Installer
-- هذا الملف هو الإصدار الشامل والمدمج. يشمل الجداول، السياسات، التخزين، والحسابات.
-- شغّل هذا الملف بالكامل في Supabase -> SQL Editor
-- ========================================================================

-- 1. تفعيل الإضافات المطلوبة
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. إنشاء الجداول الأساسية
-- أ. جدول الأصناف (items)
CREATE TABLE IF NOT EXISTS public.items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    price numeric NOT NULL,
    image_url text,
    category text NOT NULL,
    is_available boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- ب. جدول الطلبات (orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    status text NOT NULL DEFAULT 'pending',
    order_code text,
    table_no text,
    order_type text DEFAULT 'local' NOT NULL, --  local | delivery :الحقل الجديد لتحديد نوع الطلب
    items jsonb NOT NULL,
    total_price numeric NOT NULL,
    preparing_started_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- ج. جدول معرض الصور (gallery)
CREATE TABLE IF NOT EXISTS public.gallery (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url text NOT NULL,
    name text,
    created_at timestamptz DEFAULT now()
);

-- د. جدول إعدادات التطبيق (app_settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- 3. تفعيل جدار حماية الأمان (Row Level Security - RLS)
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- إعداد التخزين (Storage) لصور الأصناف
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. إنشاء سياسات الأمان (RLS Policies)
-- أ. سياسات الأصناف (items)
DROP POLICY IF EXISTS "allow_anon_read_items" ON public.items;
DROP POLICY IF EXISTS "allow_staff_all_items" ON public.items;
CREATE POLICY "allow_anon_read_items" ON public.items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_staff_all_items" ON public.items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ب. سياسات معرض الصور (gallery)
DROP POLICY IF EXISTS "allow_anon_read_gallery" ON public.gallery;
DROP POLICY IF EXISTS "allow_staff_all_gallery" ON public.gallery;
CREATE POLICY "allow_anon_read_gallery" ON public.gallery FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_staff_all_gallery" ON public.gallery FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ج. سياسات إعدادات التطبيق (app_settings)
DROP POLICY IF EXISTS "allow_anon_read_settings" ON public.app_settings;
DROP POLICY IF EXISTS "allow_staff_all_settings" ON public.app_settings;
CREATE POLICY "allow_anon_read_settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_staff_all_settings" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- د. سياسات الطلبات (orders)
DROP POLICY IF EXISTS "allow_anon_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "allow_staff_all_orders" ON public.orders;
DROP POLICY IF EXISTS "allow_anon_read_own_order" ON public.orders;
CREATE POLICY "allow_anon_insert_orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "allow_staff_all_orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- [ثغرة أمنية] تم حذف السياسة التالية لأنها تسمح لأي مستخدم بقراءة كل الطلبات
-- CREATE POLICY "allow_anon_read_own_order" ON public.orders FOR SELECT TO anon USING (true);

-- هـ. سياسات الوصول للتخزين (Storage)
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.buckets TO authenticated;

DROP POLICY IF EXISTS "menu_images_select" ON storage.objects;
CREATE POLICY "menu_images_select" ON storage.objects FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "menu_images_insert" ON storage.objects;
CREATE POLICY "menu_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "menu_images_update" ON storage.objects;
CREATE POLICY "menu_images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'menu-images') WITH CHECK (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "menu_images_delete" ON storage.objects;
CREATE POLICY "menu_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'menu-images');

-- و. دالة تتبع الطلب الخاصة بالزبائن (آمنة ولا تسرب بقية الطلبات)
CREATE OR REPLACE FUNCTION public.get_customer_order(target_order_id uuid)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.orders WHERE id = target_order_id;
END;
$$;

-- 5. دالة آمنة لتحديث كلمة مرور الموظفين من لوحة التحكم (update_staff_password)
CREATE OR REPLACE FUNCTION public.update_staff_password(role_type text, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_email text;
BEGIN
    -- تحديد البريد الإلكتروني المستهدف بناءً على الدور المختار
    IF role_type = 'admin' THEN
        target_email := 'admin@cafe.com';
    ELSIF role_type = 'worker' THEN
        target_email := 'kitchen@cafe.com';
    ELSIF role_type = 'delivery' THEN
        target_email := 'delivery@cafe.com';
    ELSE
        RAISE EXCEPTION 'الدور المختار غير صالح.';
    END IF;

    -- تحديث كلمة المرور في جدول auth.users مع تشفير متوافق (10 دورات)
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf', 10)),
        updated_at = now()
    WHERE email = target_email;

    RETURN true;
END;
$$;

-- 6. إنشاء حسابات الموظفين الافتراضية
CREATE OR REPLACE FUNCTION public.create_cafe_user(user_email text, user_pin text)
RETURNS void AS $$
DECLARE
    new_user_id uuid;
    has_provider_id boolean;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
        new_user_id := gen_random_uuid();
        
        -- إدخال في جدول المستخدمين الرئيسي
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud
        ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            user_email,
            crypt(user_pin, gen_salt('bf', 10)),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            now(),
            now(),
            'authenticated',
            'authenticated'
        );

        -- التحقق هل جدول auth.identities يحتوي على عمود provider_id
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'auth' 
              AND table_name = 'identities' 
              AND column_name = 'provider_id'
        ) INTO has_provider_id;

        -- ربط الهوية ديناميكياً لتجنب مشاكل بنية الجدول في الإصدارات المختلفة
        IF has_provider_id THEN
            EXECUTE 'INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) 
                     VALUES ($1, $1, $1::text, $2, ''email'', now(), now(), now())'
            USING new_user_id, json_build_object('sub', new_user_id::text, 'email', user_email, 'email_verified', true);
        ELSE
            EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) 
                     VALUES ($1, $1, $2, ''email'', now(), now(), now())'
            USING new_user_id, json_build_object('sub', new_user_id::text, 'email', user_email, 'email_verified', true);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- تشغيل الدالة لإنشاء الحسابات الثلاثة الافتراضية
SELECT public.create_cafe_user('admin@cafe.com', '12345');
SELECT public.create_cafe_user('kitchen@cafe.com', '54321');
SELECT public.create_cafe_user('delivery@cafe.com', '67890');

-- تنظيف الدالة المساعدة بعد الاستخدام
DROP FUNCTION public.create_cafe_user(text, text);
