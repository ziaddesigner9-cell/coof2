-- شغّل في Supabase → SQL Editor (مرة واحدة) لتفعيل تعديل وحذف الأصناف من لوحة المدير

-- 1. تفعيل نظام الحماية أولاً
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- 2. حذف كافة السياسات القديمة لتجنب التعارض
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.items', pol.policyname);
  END LOOP;
END $$;

-- 3. إنشاء سياسة وصول كاملة (قراءة، إضافة، تعديل، حذف)
-- ملاحظة: تم السماح للـ anon لأننا ندير الأمان عبر كلمة مرور داخل التطبيق
CREATE POLICY "items_full_access_policy"
ON public.items
FOR ALL 
TO anon, authenticated
USING (true)
WITH CHECK (true);
