
-- Remove permissive public policies. All access to these tables goes through
-- the server route /api/public/gas which uses the service role (bypasses RLS).
-- Revoke direct Data API access from anon/authenticated so no one can read or
-- modify credentials, users, or sheets via the public API.

DROP POLICY IF EXISTS "open users" ON public.fsd_users;
DROP POLICY IF EXISTS "open sheets" ON public.fsd_sheets;
DROP POLICY IF EXISTS "open documents" ON public.fsd_documents;

ALTER TABLE public.fsd_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fsd_sheets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fsd_documents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.fsd_users   FROM anon, authenticated;
REVOKE ALL ON public.fsd_sheets  FROM anon, authenticated;
REVOKE ALL ON public.fsd_documents FROM anon, authenticated;

GRANT ALL ON public.fsd_users   TO service_role;
GRANT ALL ON public.fsd_sheets  TO service_role;
GRANT ALL ON public.fsd_documents TO service_role;
