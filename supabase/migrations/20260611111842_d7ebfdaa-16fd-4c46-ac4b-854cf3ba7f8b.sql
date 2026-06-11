
DROP POLICY IF EXISTS "public insert fsd_documents" ON public.fsd_documents;
DROP POLICY IF EXISTS "public update fsd_documents" ON public.fsd_documents;
DROP POLICY IF EXISTS "public delete fsd_documents" ON public.fsd_documents;
REVOKE INSERT, UPDATE, DELETE ON public.fsd_documents FROM anon, authenticated;
