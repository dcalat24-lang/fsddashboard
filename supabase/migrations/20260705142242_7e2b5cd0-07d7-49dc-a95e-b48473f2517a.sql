
CREATE TABLE public.fsd_aoc_companies (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  operator TEXT,
  contact TEXT,
  phases JSONB NOT NULL DEFAULT '{}'::jsonb,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  doc_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fsd_aoc_companies TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.fsd_aoc_companies_id_seq TO service_role;
ALTER TABLE public.fsd_aoc_companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.fsd_hr_employees (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  photo TEXT,
  bio TEXT,
  courses JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fsd_hr_employees TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.fsd_hr_employees_id_seq TO service_role;
ALTER TABLE public.fsd_hr_employees ENABLE ROW LEVEL SECURITY;
