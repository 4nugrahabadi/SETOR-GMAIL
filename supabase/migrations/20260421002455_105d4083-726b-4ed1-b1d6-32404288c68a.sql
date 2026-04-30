-- 1) Block writes to user_roles from non-service roles
CREATE POLICY "Block all inserts to user_roles"
ON public.user_roles FOR INSERT TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Block all updates to user_roles"
ON public.user_roles FOR UPDATE TO authenticated, anon
USING (false);

CREATE POLICY "Block all deletes from user_roles"
ON public.user_roles FOR DELETE TO authenticated, anon
USING (false);

-- 2) Hide accounts.password from admins (column-level revoke)
REVOKE SELECT (password) ON public.accounts FROM authenticated, anon;

-- 3) Remove profiles from realtime publication so balance/email aren't broadcast
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;