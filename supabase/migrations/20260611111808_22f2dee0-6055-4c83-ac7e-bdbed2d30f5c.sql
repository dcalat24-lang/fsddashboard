
CREATE TABLE public.fsd_documents (
  id BIGSERIAL PRIMARY KEY,
  dcal_no TEXT,
  dcal_date TEXT,
  fsd_no TEXT,
  fsd_date TEXT,
  doc_no TEXT,
  doc_date TEXT,
  subject TEXT,
  status TEXT,
  status_note TEXT,
  files JSONB DEFAULT '[]'::jsonb,
  uid INT,
  owner TEXT,
  fiscal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fsd_documents TO anon, authenticated;
GRANT ALL ON public.fsd_documents TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.fsd_documents_id_seq TO anon, authenticated, service_role;

ALTER TABLE public.fsd_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read fsd_documents" ON public.fsd_documents FOR SELECT USING (true);
CREATE POLICY "public insert fsd_documents" ON public.fsd_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "public update fsd_documents" ON public.fsd_documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete fsd_documents" ON public.fsd_documents FOR DELETE USING (true);
