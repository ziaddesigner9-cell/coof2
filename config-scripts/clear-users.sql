-- تنظيف الحسابات التي تم إنشاؤها يدوياً لتفادي أخطاء قاعدة البيانات (Database Error)
DELETE FROM auth.users WHERE email IN ('admin@cafe.com', 'kitchen@cafe.com', 'delivery@cafe.com');
