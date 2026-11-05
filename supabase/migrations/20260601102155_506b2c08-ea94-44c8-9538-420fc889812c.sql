GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.oph_is_admin_or_editor() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.oph_is_admin_editor_or_kol() TO anon, authenticated;