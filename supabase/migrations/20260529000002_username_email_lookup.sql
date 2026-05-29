-- Allow sign-in by username: returns the email for a given username
-- SECURITY DEFINER so it can query auth.users without requiring a session
CREATE OR REPLACE FUNCTION get_user_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.email::TEXT
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE p.username = p_username
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_user_email_by_username(TEXT) TO anon, authenticated;
