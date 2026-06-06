-- شغّل في Supabase → SQL Editor (مرة واحدة) لتفعيل حذف الصور من المكتبة

-- سياسات جدول المعرض (إن وجد)
DROP POLICY IF EXISTS "gallery_all_access" ON public.gallery;
CREATE POLICY "gallery_all_access"
ON public.gallery FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- إنشاء الحاوية (Bucket) إذا لم تكن موجودة وتجعلها عامة (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- منح صلاحيات الوصول الأساسية للمخطط لضمان قدرة النظام على القراءة والكتابة
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT ALL ON TABLE storage.objects TO anon, authenticated;
GRANT ALL ON TABLE storage.buckets TO anon, authenticated;

-- سياسات التعامل مع ملفات الصور في Storage
-- تأكد من أن الـ bucket باسم 'menu-images' موجود ومعد كـ Public

DROP POLICY IF EXISTS "menu_images_select" ON storage.objects;
CREATE POLICY "menu_images_select"
ON storage.objects FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "menu_images_insert" ON storage.objects;
CREATE POLICY "menu_images_insert"
ON storage.objects FOR INSERT TO anon, authenticated 
WITH CHECK (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "menu_images_update" ON storage.objects;
CREATE POLICY "menu_images_update"
ON storage.objects FOR UPDATE TO anon, authenticated 
USING (bucket_id = 'menu-images') WITH CHECK (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "menu_images_delete" ON storage.objects;
CREATE POLICY "menu_images_delete"
ON storage.objects FOR DELETE TO anon, authenticated 
USING (bucket_id = 'menu-images');
