CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP POLICY IF EXISTS "System inserts notifs" ON public.notifications;
CREATE POLICY "Users insert own notifs" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins insert any notifs" ON public.notifications
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));