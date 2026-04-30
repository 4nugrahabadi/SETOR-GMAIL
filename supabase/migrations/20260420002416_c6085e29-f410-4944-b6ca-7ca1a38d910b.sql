-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Roles enum + table (admin/user)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- App settings (singleton row, admin only)
CREATE TABLE public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  valid_password TEXT NOT NULL DEFAULT 'prabujaya',
  price_per_account INTEGER NOT NULL DEFAULT 4000,
  min_withdraw INTEGER NOT NULL DEFAULT 30000,
  admin_fee INTEGER NOT NULL DEFAULT 1000,
  maintenance BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id) VALUES (1);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read settings (price, min_withdraw, maintenance dipakai user)
CREATE POLICY "Authenticated can read settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update settings" ON public.app_settings
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Accounts (Gmail submissions)
CREATE TYPE public.account_status AS ENUM ('processing', 'success', 'failed');

CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password TEXT, -- cleared after resolved
  status account_status NOT NULL DEFAULT 'processing',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_accounts_user ON public.accounts(user_id);
CREATE INDEX idx_accounts_status ON public.accounts(status);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own accounts" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own accounts" ON public.accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all accounts" ON public.accounts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update accounts" ON public.accounts
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Withdraws
CREATE TYPE public.payment_method AS ENUM ('Dana', 'GoPay', 'OVO');
CREATE TYPE public.withdraw_status AS ENUM ('processing', 'success', 'failed');

CREATE TABLE public.withdraws (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  number TEXT NOT NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status withdraw_status NOT NULL DEFAULT 'processing',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_withdraws_user ON public.withdraws(user_id);
CREATE INDEX idx_withdraws_status ON public.withdraws(status);

ALTER TABLE public.withdraws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdraws" ON public.withdraws
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own withdraws" ON public.withdraws
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all withdraws" ON public.withdraws
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update withdraws" ON public.withdraws
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifs_user ON public.notifications(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifs" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifs" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifs" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "System inserts notifs" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();