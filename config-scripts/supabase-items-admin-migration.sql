-- شغّل في Supabase → SQL Editor (مرة واحدة) لتفعيل تعديل وحذف الأصناف من لوحة المدير

DROP POLICY IF EXISTS "items_update" ON public.items;
CREATE POLICY "items_update"
ON public.items FOR UPDATE TO anon, authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "items_delete" ON public.items;
CREATE POLICY "items_delete"
ON public.items FOR DELETE TO anon, authenticated
USING (true);
