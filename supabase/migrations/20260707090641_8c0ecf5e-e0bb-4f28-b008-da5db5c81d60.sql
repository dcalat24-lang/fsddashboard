ALTER TABLE public.fsd_hr_employees
  ADD COLUMN IF NOT EXISTS emp_type text NOT NULL DEFAULT 'gov',
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';