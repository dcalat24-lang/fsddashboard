import { createFileRoute } from "@tanstack/react-router";

const FOLDER_ID = "17QN_wUJlISQNbT3a8Wr-9bcS-aGi04Er";
const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

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
    files: r.files ?? [],
    uid: r.uid ?? 1,
    owner: r.owner ?? "",
    fiscal: r.fiscal ?? "2568",
  };
}

function docToRow(d: Record<string, unknown>) {
  return {
    dcal_no: d.dcalNo ?? null,
    dcal_date: d.dcalDate ?? null,
    fsd_no: d.fsdNo ?? null,
    fsd_date: d.fsdDate ?? null,
    doc_no: d.docNo ?? null,
    doc_date: d.docDate ?? null,
    subject: d.subject ?? null,
    status: d.status ?? "head",
    status_note: d.statusNote ?? "",
    files: d.files ?? [],
    uid: d.uid ?? null,
    owner: d.owner ?? null,
    fiscal: d.fiscal ?? null,
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
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const boundary = "fsd_boundary_" + Date.now();
  const metadata = JSON.stringify({ name: fileName, parents: [FOLDER_ID] });
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
          if (doc.id) {
            const { data, error } = await supabaseAdmin
              .from("fsd_documents")
              .update({ ...row, updated_at: new Date().toISOString() })
              .eq("id", Number(doc.id))
              .select()
              .maybeSingle();
            if (error) return json({ error: error.message }, 500);
            return json({ id: data?.id });
          }
          const { data, error } = await supabaseAdmin
            .from("fsd_documents")
            .insert(row)
            .select()
            .single();
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
