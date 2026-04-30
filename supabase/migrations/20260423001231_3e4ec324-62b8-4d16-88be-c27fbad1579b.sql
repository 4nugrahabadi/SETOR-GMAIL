-- 1. Tambah kolom referral di profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid;

-- 2. Tabel referral_rewards (audit + dedupe)
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  amount integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referral rewards"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Admins view all referral rewards"
  ON public.referral_rewards FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Generator kode referral pendek (8 char alphanumeric)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  exists_already boolean;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- 4. Update handle_new_user untuk set referral_code & referred_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_code_input text;
  ref_user_id uuid;
BEGIN
  ref_code_input := NEW.raw_user_meta_data->>'ref_code';

  IF ref_code_input IS NOT NULL AND length(ref_code_input) > 0 THEN
    SELECT id INTO ref_user_id FROM public.profiles WHERE referral_code = upper(ref_code_input) LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, username, email, whatsapp, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'whatsapp',
    public.generate_referral_code(),
    ref_user_id
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- 5. Backfill referral_code untuk user lama
UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- 6. Fungsi untuk award reward (dipanggil dari server function)
CREATE OR REPLACE FUNCTION public.award_referral_bonus(_new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_user_id uuid;
  reward_amount integer := 500;
BEGIN
  SELECT referred_by INTO ref_user_id FROM public.profiles WHERE id = _new_user_id;
  IF ref_user_id IS NULL THEN RETURN; END IF;

  -- INSERT akan gagal jika sudah ada (UNIQUE), jadi aman dari double credit
  BEGIN
    INSERT INTO public.referral_rewards (referrer_id, referred_user_id, amount)
    VALUES (ref_user_id, _new_user_id, reward_amount);
  EXCEPTION WHEN unique_violation THEN
    RETURN;
  END;

  UPDATE public.profiles SET balance = balance + reward_amount WHERE id = ref_user_id;

  INSERT INTO public.notifications (user_id, title, body, variant)
  VALUES (
    ref_user_id,
    'Bonus Referral!',
    'Anda mendapat Rp500 karena teman Anda mendaftar via link referral.',
    'success'
  );
END;
$$;