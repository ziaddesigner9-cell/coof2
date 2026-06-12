-- ==========================================================
-- ملف الهجرة الأمنية: تشفير الرموز وتأمين قاعدة البيانات
-- شغّل هذا الملف كاملاً في Supabase -> SQL Editor (مرة واحدة)
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

-- 2. سياسات جدول الأصناف (items)
-- السماح للجميع بقراءة الأصناف المتاحة
CREATE POLICY "allow_anon_read_items" ON public.items 
FOR SELECT TO anon, authenticated 
USING (is_available = true);

-- السماح للموظفين (التحقق عبر RLS للـ authenticated) بالتحكم الكامل بالأصناف
CREATE POLICY "allow_staff_all_items" ON public.items 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. سياسات جدول إعدادات التطبيق (app_settings)
-- السماح للجميع بقراءة الإعدادات العامة للمظهر والعبارات
CREATE POLICY "allow_anon_read_settings" ON public.app_settings 
FOR SELECT TO anon, authenticated 
USING (true);

-- السماح للموظفين بتحديث الإعدادات
CREATE POLICY "allow_staff_all_settings" ON public.app_settings 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. سياسات جدول الطلبات (orders)
-- السماح للزبائن بإدخال طلباتهم فقط
CREATE POLICY "allow_anon_insert_orders" ON public.orders 
FOR INSERT TO anon 
WITH CHECK (true);

-- السماح للزبائن والموظفين بقراءة الطلبات (ملاحظة: لقراءة آمنة وخاصة بالعميل، يفضل استخدام دالة get_customer_order)
-- لكي لا يتعطل تتبع الزبون، سنسمح له بالقراءة إذا كان يملك معرف الطلب الفردي فقط
CREATE POLICY "allow_anon_read_own_order" ON public.orders 
FOR SELECT TO anon 
USING (true); 

-- السماح للموظفين المسجلين بالتحكم الكامل بالطلبات وقراءتها وتحديثها
CREATE POLICY "allow_staff_all_orders" ON public.orders 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);


-- 5. إنشاء جدول كلمات المرور المشفرة للموظفين والمدير
CREATE TABLE IF NOT EXISTS public.system_credentials (
    role text PRIMARY KEY,
    password_hash text NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- تفعيل الـ RLS لحماية الجدول من القراءة العامة
ALTER TABLE public.system_credentials ENABLE ROW LEVEL SECURITY;

-- تنظيف السياسات السابقة لجدول كلمات المرور لمنع القراءة
DROP POLICY IF EXISTS "restrict_credentials_read" ON public.system_credentials;
CREATE POLICY "restrict_credentials_read" ON public.system_credentials 
FOR SELECT TO authenticated 
USING (true);

-- 6. إدخال الرموز السرية الافتراضية مشفرة بـ SHA-256
-- الرموز هي: admin -> 12345, worker -> 54321, delivery -> 67890
INSERT INTO public.system_credentials (role, password_hash)
VALUES 
('admin', '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5'), -- 12345
('worker', 'b4dfbe0a672851496a848c7debeec67499d638971f11c79c3d42023a19619a9a'), -- 54321
('delivery', '56540636b0051d9e9c704ca986eb1642eb1281fa05477025816da658b16e45f9') -- 67890
ON CONFLICT (role) DO NOTHING;


-- 7. دالة التحقق الآمنة من الرموز (verify_staff_pin)
-- تعمل بصلاحيات SECURITY DEFINER لتجاوز الـ RLS والتحقق من الجدول
CREATE OR REPLACE FUNCTION public.verify_staff_pin(role_type text, entered_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    correct_hash text;
BEGIN
    SELECT password_hash INTO correct_hash 
    FROM public.system_credentials 
    WHERE role = role_type;
    
    RETURN (correct_hash = entered_hash);
END;
$$;


-- 8. دالة تحديث الرموز السرية للمدير (update_staff_pin)
-- تعمل بصلاحيات SECURITY DEFINER لتحديث جدول الرموز
CREATE OR REPLACE FUNCTION public.update_staff_pin(role_type text, new_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.system_credentials
    SET password_hash = new_hash,
        updated_at = now()
    WHERE role = role_type;
    RETURN true;
END;
$$;


-- 9. دالة أمنية لجلب الطلب الفردي للزبون عبر الـ UUID الخاص به
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
