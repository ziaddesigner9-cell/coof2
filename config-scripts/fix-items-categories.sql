-- اختياري: توحيد تصنيفات الأصناف القديمة (شغّل مرة واحدة إن كانت الأصناف لا تظهر في الأقسام)

UPDATE public.items SET category = 'hot'
WHERE lower(trim(category)) IN ('hot', 'ساخن', 'مشروبات ساخنة', 'قهوة', 'ساخنة');

UPDATE public.items SET category = 'cold'
WHERE lower(trim(category)) IN ('cold', 'بارد', 'مشروبات باردة', 'عصير', 'عصائر', 'باردة');

UPDATE public.items SET category = 'dessert'
WHERE lower(trim(category)) IN ('dessert', 'حلى', 'حلويات', 'حلوى', 'تحلية');

-- إضافة قيد لضمان جودة البيانات مستقبلاً
ALTER TABLE public.items 
DROP CONSTRAINT IF EXISTS items_category_check;

ALTER TABLE public.items 
ADD CONSTRAINT items_category_check 
CHECK (category IN ('hot', 'cold', 'dessert'));
