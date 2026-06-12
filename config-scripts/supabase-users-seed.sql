-- 1. تفعيل مكتبة التشفير إذا لم تكن مفعلة
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. دالة مساعدة ذكية لإنشاء الحساب وتفعيل هويته متوافقة مع جميع إصدارات Supabase
CREATE OR REPLACE FUNCTION public.create_cafe_user(user_email text, user_pin text)
RETURNS void AS $$
DECLARE
    new_user_id uuid;
    has_provider_id boolean;
BEGIN
    -- التحقق مما إذا كان المستخدم موجوداً بالفعل لتجنب التكرار
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
        new_user_id := gen_random_uuid();
        
        -- إدخال في جدول المستخدمين الرئيسي (auth.users)
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud
        ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            user_email,
            crypt(user_pin, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            now(),
            now(),
            'authenticated',
            'authenticated'
        );

        -- التحقق هل جدول auth.identities يحتوي على عمود provider_id
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'auth' 
              AND table_name = 'identities' 
              AND column_name = 'provider_id'
        ) INTO has_provider_id;

        -- ربط الهوية ديناميكياً لتجنب مشاكل بنية الجدول في الإصدارات المختلفة
        IF has_provider_id THEN
            EXECUTE 'INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) 
                     VALUES ($1, $1, $1, $2, ''email'', now(), now(), now())'
            USING new_user_id, json_build_object('sub', new_user_id, 'email', user_email, 'email_verified', true);
        ELSE
            EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) 
                     VALUES ($1, $1, $2, ''email'', now(), now(), now())'
            USING new_user_id, json_build_object('sub', new_user_id, 'email', user_email, 'email_verified', true);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. تشغيل الدالة لإنشاء الحسابات الثلاثة
SELECT public.create_cafe_user('admin@cafe.com', '12345');
SELECT public.create_cafe_user('kitchen@cafe.com', '54321');
SELECT public.create_cafe_user('delivery@cafe.com', '67890');

-- 4. تنظيف الدالة المساعدة بعد الاستخدام
DROP FUNCTION public.create_cafe_user(text, text);
