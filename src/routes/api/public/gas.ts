import { createFileRoute } from "@tanstack/react-router";

const FOLDER_NAME = "FSD Documents";
const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

let cachedFolderId: string | null = null;
async function getOrCreateFolderId(lovableKey: string, driveKey: string): Promise<string | null> {
  if (cachedFolderId) return cachedFolderId;
  const headers = {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": driveKey,
  };
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const findRes = await fetch(
    `${GATEWAY}/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=1`,
    { headers },
  );
  if (findRes.ok) {
    const j = (await findRes.json()) as { files?: Array<{ id: string }> };
    if (j.files && j.files.length > 0) {
      cachedFolderId = j.files[0].id;
      return cachedFolderId;
    }
  }
  const createRes = await fetch(`${GATEWAY}/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!createRes.ok) return null;
  const created = (await createRes.json()) as { id: string };
  cachedFolderId = created.id;
  return cachedFolderId;
}


function rowToDoc(r: Record<string, unknown>) {
  return {
    id: r.id,
    dcalNo: r.dcal_no ?? "",
    dcalDate: r.dcal_date ?? "",
    fsdNo: r.fsd_no ?? "",
    fsdDate: r.fsd_date ?? "",
    docNo: r.doc_no ?? "",
    docDate: r.doc_date ?? "",
    subject: r.subject ?? "",
    status: r.status ?? "head",
    statusNote: r.status_note ?? "",
    statusNotes: r.status_notes ?? [],
    files: r.files ?? [],
    uid: r.uid ?? 1,
    owner: r.owner ?? "",
    fiscal: r.fiscal ?? "2568",
  };
}

function docToRow(d: Record<string, unknown>): Record<string, unknown> {
  const s = (v: unknown) => (v == null ? null : String(v));
  return {
    dcal_no: s(d.dcalNo),
    dcal_date: s(d.dcalDate),
    fsd_no: s(d.fsdNo),
    fsd_date: s(d.fsdDate),
    doc_no: s(d.docNo),
    doc_date: s(d.docDate),
    subject: s(d.subject),
    status: s(d.status) ?? "head",
    status_note: s(d.statusNote) ?? "",
    status_notes: d.statusNotes ?? [],
    files: d.files ?? [],
    uid: d.uid == null ? null : Number(d.uid),
    owner: s(d.owner),
    fiscal: s(d.fiscal),
  };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

async function uploadToDrive(fileName: string, mimeType: string, b64: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const driveKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lovableKey || !driveKey) {
    return { error: "Drive connector not configured" };
  }
  const folderId = await getOrCreateFolderId(lovableKey, driveKey);
  if (!folderId) return { error: "Could not create or find Drive folder" };
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const boundary = "fsd_boundary_" + Date.now();
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const tail = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head, 0);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);

  const res = await fetch(
    `${GATEWAY}/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": driveKey,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  const text = await res.text();
  if (!res.ok) return { error: `Drive upload failed (${res.status}): ${text.slice(0, 300)}` };
  const data = JSON.parse(text) as { id: string; name: string; webViewLink?: string };

  // Make it readable by anyone with link (best effort)
  await fetch(`${GATEWAY}/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": driveKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  }).catch(() => {});

  return {
    id: data.id,
    viewUrl: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
    previewUrl: `https://drive.google.com/file/d/${data.id}/preview`,
  };
}

export const Route = createFileRoute("/api/public/gas")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (action === "getDocuments") {
          const { data, error } = await supabaseAdmin
            .from("fsd_documents")
            .select("*")
            .order("id", { ascending: true });
          if (error) return json({ docs: [], error: error.message }, 500);
          return json({ docs: (data ?? []).map(rowToDoc) });
        }
        return json({ ok: true });
      },
      POST: async ({ request }) => {
        const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const action = payload.action as string;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (action === "uploadFile") {
          const r = await uploadToDrive(
            String(payload.fileName ?? "file"),
            String(payload.mimeType ?? "application/octet-stream"),
            String(payload.fileData ?? ""),
          );
          return json(r);
        }

        if (action === "saveDocument") {
          const doc = (payload.doc ?? {}) as Record<string, unknown>;
          const row = docToRow(doc);
          const table = supabaseAdmin.from("fsd_documents") as unknown as {
            update: (v: Record<string, unknown>) => { eq: (c: string, v: unknown) => { select: () => { maybeSingle: () => Promise<{ data: { id: number } | null; error: { message: string } | null }> } } };
            insert: (v: Record<string, unknown>) => { select: () => { single: () => Promise<{ data: { id: number }; error: { message: string } | null }> } };
          };
          if (doc.id) {
            const { data, error } = await table
              .update({ ...row, updated_at: new Date().toISOString() })
              .eq("id", Number(doc.id))
              .select()
              .maybeSingle();
            if (error) return json({ error: error.message }, 500);
            return json({ id: data?.id });
          }
          const { data, error } = await table.insert(row).select().single();
          if (error) return json({ error: error.message }, 500);
          return json({ id: data.id });
        }

        if (action === "deleteDocument") {
          const { error } = await supabaseAdmin
            .from("fsd_documents")
            .delete()
            .eq("id", Number(payload.id));
          if (error) return json({ error: error.message }, 500);
          return json({ ok: true });
        }

        return json({ error: "unknown action" }, 400);
      },
    },
  },
});
