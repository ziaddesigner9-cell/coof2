-- هذا السكربت يساعدنا في معرفة الحسابات الموجودة حالياً وحالة كلمات مرورها لتحديد المشكلة بدقة
CREATE OR REPLACE FUNCTION public.get_users_list()
RETURNS TABLE(user_email text, is_confirmed boolean, has_identities boolean) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        u.email::text, 
        (u.email_confirmed_at IS NOT NULL) AS is_confirmed,
        EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id) AS has_identities
    FROM auth.users u;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
