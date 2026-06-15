
CREATE TABLE public.fsd_users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  email TEXT,
  group_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fsd_users TO authenticated, anon;
GRANT ALL ON public.fsd_users TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.fsd_users_id_seq TO authenticated, anon, service_role;
ALTER TABLE public.fsd_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open users" ON public.fsd_users FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.fsd_sheets (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  raw_url TEXT NOT NULL,
  embed_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fsd_sheets TO authenticated, anon;
GRANT ALL ON public.fsd_sheets TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.fsd_sheets_id_seq TO authenticated, anon, service_role;
ALTER TABLE public.fsd_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open sheets" ON public.fsd_sheets FOR ALL USING (true) WITH CHECK (true);
