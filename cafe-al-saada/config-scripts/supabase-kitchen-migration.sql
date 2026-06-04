-- ============================================
-- شغّل هذا كاملاً في Supabase → SQL Editor (مرة واحدة)
-- حالات الطلب: pending → preparing → ready → completed
-- ============================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS preparing_started_at timestamptz;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- إزالة كل السياسات القديمة على جدول orders (قد تمنع التحديث)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "orders_select_public"
ON public.orders FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "orders_insert_public"
ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "orders_update_public"
ON public.orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- تحقق: بعد التشغيل جرّب تحديث طلب من Table Editor أو من التطبيق
