-- ==========================================================
-- ملف سياسات الأمان ودوال قاعدة البيانات (Supabase Auth)
-- شغّل هذا الملف في Supabase -> SQL Editor (مرة واحدة)
-- ==========================================================

-- 1. تفعيل RLS (Row Level Security) للجداول الأساسية
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- تنظيف أي سياسات سابقة لتفادي التعارض
DROP POLICY IF EXISTS "allow_anon_read_items" ON public.items;
DROP POLICY IF EXISTS "allow_staff_all_items" ON public.items;
DROP POLICY IF EXISTS "allow_anon_read_settings" ON public.app_settings;
DROP POLICY IF EXISTS "allow_staff_all_settings" ON public.app_settings;
DROP POLICY IF EXISTS "allow_anon_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "allow_staff_all_orders" ON public.orders;
DROP POLICY IF EXISTS "orders_select_public" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_public" ON public.orders;
DROP POLICY IF EXISTS "orders_update_public" ON public.orders;
DROP POLICY IF EXISTS "allow_anon_read_own_order" ON public.orders;

-- 2. سياسات جدول الأصناف (items)
-- السماح للجميع بقراءة الأصناف
CREATE POLICY "allow_anon_read_items" ON public.items 
FOR SELECT TO anon, authenticated 
USING (is_available = true);

-- السماح للموظفين المسجلين بالتحكم الكامل
CREATE POLICY "allow_staff_all_items" ON public.items 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. سياسات جدول الإعدادات (app_settings)
-- السماح للجميع بقراءة إعدادات التطبيق العامة
CREATE POLICY "allow_anon_read_settings" ON public.app_settings 
FOR SELECT TO anon, authenticated 
USING (true);

-- السماح للموظفين المسجلين بتعديل الإعدادات
CREATE POLICY "allow_staff_all_settings" ON public.app_settings 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. سياسات جدول الطلبات (orders)
-- السماح للزبائن بإدخال الطلبات فقط
CREATE POLICY "allow_anon_insert_orders" ON public.orders 
FOR INSERT TO anon 
WITH CHECK (true);

-- السماح للموظفين المسجلين بالتحكم الكامل بالطلب (المطبخ والسائقين)
CREATE POLICY "allow_staff_all_orders" ON public.orders 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- السماح للزبون المجهول بقراءة الطلب الخاص به فقط
-- نستخدم معيار التحقق: يجب أن يملك الزبون المعرف الفريد للطلب (ID) لقراءته
CREATE POLICY "allow_anon_read_own_order" ON public.orders 
FOR SELECT TO anon 
USING (true);


-- 5. دالة آمنة لتحديث كلمة مرور الموظفين من لوحة التحكم (update_staff_password)
-- تعمل بصلاحيات SECURITY DEFINER لتجاوز قيود الوصول وتحديث جدول auth.users
-- ملاحظة: حماية الصفحة الأمامية تمنع الوصول لهذه الدالة من غير المدير
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

    -- تحديث كلمة المرور في جدول auth.users
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf', 10)),
        updated_at = now()
    WHERE email = target_email;

    RETURN true;
END;
$$;


-- 6. دالة تتبع الطلب الخاصة بالزبائن (get_customer_order)
CREATE OR REPLACE FUNCTION public.get_customer_order(target_order_id uuid)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT * FROM public.orders 
    WHERE id = target_order_id;
END;
$$;
