-- شغّل في Supabase → SQL Editor (مرة واحدة) لتفعيل حذف الصور من المكتبة

DROP POLICY IF EXISTS "gallery_delete" ON public.gallery;
CREATE POLICY "gallery_delete"
ON public.gallery FOR DELETE TO authenticated USING (true);

-- حذف الملف من bucket menu-images (إن وُجدت سياسات سابقة قد تكفي)
DROP POLICY IF EXISTS "menu_images_delete" ON storage.objects;
CREATE POLICY "menu_images_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'menu-images');
