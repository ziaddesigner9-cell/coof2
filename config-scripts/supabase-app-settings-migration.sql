-- شغّل في Supabase → SQL Editor لإصلاح حفظ الإعدادات والمظهر

-- 1. إنشاء الجدول إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value jsonb,
    updated_at timestamptz DEFAULT now()
);

-- 2. التأكد من وجود عمود التحديث لضمان عمل دالة upsert
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='updated_at') THEN
        ALTER TABLE public.app_settings ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- 3. تفعيل الحماية
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 4. تنظيف السياسات القديمة لتجنب التعارض
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_settings', pol.policyname);
  END LOOP;
END $$;

-- 5. سياسة الوصول الكاملة (قراءة وكتابة) للجميع
CREATE POLICY "app_settings_full_access"
ON public.app_settings FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);