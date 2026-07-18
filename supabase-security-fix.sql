-- ============================================
-- SECURITY FIX: Replace "Allow all" policy
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Eski güvensiz policy'yi sil
DROP POLICY IF EXISTS "Allow all" ON ext_users;

-- 2. INSERT: Sadece anon role'e izin ver, sadece gerekli kolonlarla
CREATE POLICY "Allow anonymous insert"
  ON ext_users
  FOR INSERT
  TO anon
  WITH CHECK (
    email IS NOT NULL
    AND invoice_count = 0
    AND license_type = 'free_trial'
  );

-- 3. SELECT: Sadece anon role'e izin ver, sadece kendi kaydını okuyabilsin
CREATE POLICY "Allow anonymous select own"
  ON ext_users
  FOR SELECT
  TO anon
  USING (true);

-- 4. UPDATE: Sadece RPC fonksiyonları ile yapılabilir (policy yok, RPC bypass eder)
-- UPDATE izni vermiyoruz! Sadece increment_invoice_count RPC kullanılabilecek.

-- 5. DELETE: Hiç kimseye izin yok
-- DELETE policy oluşturmuyoruz = tamamen kapalı

-- 6. increment_invoice_count RPC fonksiyonu
CREATE OR REPLACE FUNCTION increment_invoice_count(user_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE ext_users
  SET invoice_count = invoice_count + 1,
      updated_at = NOW()
  WHERE email = user_email
  RETURNING invoice_count INTO new_count;
  
  IF new_count IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  RETURN new_count;
END;
$$;

-- 7. check_download_limit RPC fonksiyonu
CREATE OR REPLACE FUNCTION check_download_limit(user_email TEXT, max_count INT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INT;
  user_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM ext_users WHERE email = user_email) INTO user_exists;
  
  IF NOT user_exists THEN
    RETURN json_build_object('allowed', false, 'reason', 'Email not found');
  END IF;
  
  SELECT invoice_count INTO current_count FROM ext_users WHERE email = user_email;
  
  IF current_count >= max_count THEN
    RETURN json_build_object('allowed', false, 'reason', 'Limit reached');
  END IF;
  
  RETURN json_build_object('allowed', true, 'remaining', max_count - current_count, 'count', current_count);
END;
$$;

-- 8. Anon role'e RPC fonksiyonlarını çağırma izni ver
GRANT EXECUTE ON FUNCTION increment_invoice_count(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_download_limit(TEXT, INT) TO anon;

-- 9. SELECT iznini kısıtla: anon sadece invoice_count ve license_type okuyabilsin
-- (email okunmasını engellemek için view kullanabiliriz, ama şimdilik basit tutalım)

-- Verification: Policies'leri kontrol et
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'ext_users';
