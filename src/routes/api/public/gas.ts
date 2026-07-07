import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const DEFAULT_FOLDER = "FSD Documents";
const FOLDER_ALIASES: Record<string, string> = {
  default: "FSD Documents",
  aoc: "FSD AOC Tracking",
  hr: "FSD HR Management",
};

const folderCache: Record<string, string> = {};
async function getOrCreateFolderId(lovableKey: string, driveKey: string, folderName: string): Promise<string | null> {
  if (folderCache[folderName]) return folderCache[folderName];
  const headers = {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": driveKey,
  };
  const q = encodeURIComponent(
    `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const findRes = await fetch(
    `${GATEWAY}/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=1`,
    { headers },
  );
  if (findRes.ok) {
    const j = (await findRes.json()) as { files?: Array<{ id: string }> };
    if (j.files && j.files.length > 0) {
      folderCache[folderName] = j.files[0].id;
      return folderCache[folderName];
    }
  }
  const createRes = await fetch(`${GATEWAY}/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!createRes.ok) return null;
  const created = (await createRes.json()) as { id: string };
  folderCache[folderName] = created.id;
  return folderCache[folderName];
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

async function uploadToDrive(fileName: string, mimeType: string, b64: string, folderKey?: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const driveKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lovableKey || !driveKey) {
    return { error: "Drive connector not configured" };
  }
  const folderName = FOLDER_ALIASES[folderKey || "default"] || DEFAULT_FOLDER;
  const folderId = await getOrCreateFolderId(lovableKey, driveKey, folderName);
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

async function ensureFolders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const driveKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lovableKey || !driveKey) return { error: "Drive connector not configured" };
  const results: Record<string, string | null> = {};
  for (const [key, name] of Object.entries(FOLDER_ALIASES)) {
    results[key] = await getOrCreateFolderId(lovableKey, driveKey, name);
  }
  return { folders: results };
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
        if (action === "getUsers") {
          const t = supabaseAdmin.from("fsd_users") as unknown as { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }> } };
          const { data, error } = await t.select("*").order("id", { ascending: true });
          if (error) return json({ users: [], error: error.message }, 500);
          const users = (data ?? []).map((r) => ({ id: Number(r.id), u: r.username, p: r.password, name: r.name, dept: r.group_name ?? "", role: r.role, email: r.email ?? "", photo: r.photo ?? "" }));
          return json({ users });
        }
        if (action === "getSheets") {
          const t = supabaseAdmin.from("fsd_sheets") as unknown as { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }> } };
          const { data, error } = await t.select("*").order("id", { ascending: true });
          if (error) return json({ sheets: [], error: error.message }, 500);
          const sheets = (data ?? []).map((r) => ({ id: Number(r.id), name: r.name, rawUrl: r.raw_url, embedUrl: r.embed_url ?? "" }));
          return json({ sheets });
        }
        if (action === "getAoc") {
          const t = supabaseAdmin.from("fsd_aoc_companies" as never) as unknown as { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }> } };
          const { data, error } = await t.select("*").order("id", { ascending: true });
          if (error) return json({ aoc: [], error: error.message }, 500);
          const aoc = (data ?? []).map((r) => ({ id: Number(r.id), name: r.name, operator: r.operator ?? "", contact: r.contact ?? "", note: r.note ?? "", phases: r.phases ?? {}, files: r.files ?? [], docIds: r.doc_ids ?? [] }));
          return json({ aoc });
        }
        if (action === "getHr") {
          const t = supabaseAdmin.from("fsd_hr_employees" as never) as unknown as { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }> } };
          const { data, error } = await t.select("*").order("id", { ascending: true });
          if (error) return json({ hr: [], error: error.message }, 500);
          const hr = (data ?? []).map((r) => ({ id: Number(r.id), name: r.name, position: r.position ?? "", department: r.department ?? "", email: r.email ?? "", phone: r.phone ?? "", photo: r.photo ?? "", bio: r.bio ?? "", courses: r.courses ?? [], firstName: r.first_name ?? "", lastName: r.last_name ?? "", birthDate: r.birth_date ?? "", address: r.address ?? "", startDate: r.start_date ?? "", education: r.education ?? [], workHistory: r.work_history ?? [], certFiles: r.cert_files ?? [], empType: r.emp_type ?? "gov", employeeId: r.employee_id ?? "", branch: r.branch ?? "", status: r.status ?? "active" }));
          return json({ hr });
        }
        if (action === "ensureFolders") {
          return json(await ensureFolders());
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
            payload.folder ? String(payload.folder) : undefined,
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

        if (action === "saveUser") {
          const u = (payload.user ?? {}) as Record<string, unknown>;
          const row = {
            username: String(u.u ?? ""),
            password: String(u.p ?? ""),
            name: String(u.name ?? ""),
            group_name: String(u.dept ?? ""),
            role: String(u.role ?? "staff"),
            email: u.email == null ? null : String(u.email),
            photo: u.photo == null ? null : String(u.photo),
          };
          const t = supabaseAdmin.from("fsd_users") as unknown as {
            update: (v: Record<string, unknown>) => { eq: (c: string, v: unknown) => { select: () => { maybeSingle: () => Promise<{ data: { id: number } | null; error: { message: string } | null }> } } };
            insert: (v: Record<string, unknown>) => { select: () => { single: () => Promise<{ data: { id: number }; error: { message: string } | null }> } };
          };
          if (u.id) {
            const { data, error } = await t.update({ ...row, updated_at: new Date().toISOString() }).eq("id", Number(u.id)).select().maybeSingle();
            if (error) return json({ error: error.message }, 500);
            return json({ id: data?.id });
          }
          const { data, error } = await t.insert(row).select().single();
          if (error) return json({ error: error.message }, 500);
          return json({ id: data.id });
        }

        if (action === "deleteUser") {
          const { error } = await supabaseAdmin.from("fsd_users").delete().eq("id", Number(payload.id));
          if (error) return json({ error: error.message }, 500);
          return json({ ok: true });
        }

        if (action === "saveSheet") {
          const s = (payload.sheet ?? {}) as Record<string, unknown>;
          const row = { name: String(s.name ?? ""), raw_url: String(s.rawUrl ?? ""), embed_url: String(s.embedUrl ?? "") };
          const t = supabaseAdmin.from("fsd_sheets") as unknown as {
            update: (v: Record<string, unknown>) => { eq: (c: string, v: unknown) => { select: () => { maybeSingle: () => Promise<{ data: { id: number } | null; error: { message: string } | null }> } } };
            insert: (v: Record<string, unknown>) => { select: () => { single: () => Promise<{ data: { id: number }; error: { message: string } | null }> } };
          };
          if (s.id) {
            const { data, error } = await t.update({ ...row, updated_at: new Date().toISOString() }).eq("id", Number(s.id)).select().maybeSingle();
            if (error) return json({ error: error.message }, 500);
            return json({ id: data?.id });
          }
          const { data, error } = await t.insert(row).select().single();
          if (error) return json({ error: error.message }, 500);
          return json({ id: data.id });
        }

        if (action === "deleteSheet") {
          const { error } = await supabaseAdmin.from("fsd_sheets").delete().eq("id", Number(payload.id));
          if (error) return json({ error: error.message }, 500);
          return json({ ok: true });
        }

        if (action === "saveAoc") {
          const a = (payload.aoc ?? {}) as Record<string, unknown>;
          const row = {
            name: String(a.name ?? ""),
            operator: a.operator == null ? null : String(a.operator),
            contact: a.contact == null ? null : String(a.contact),
            note: a.note == null ? null : String(a.note),
            phases: a.phases ?? {},
            files: a.files ?? [],
            doc_ids: a.docIds ?? [],
          };
          const t = supabaseAdmin.from("fsd_aoc_companies" as never) as unknown as {
            update: (v: Record<string, unknown>) => { eq: (c: string, v: unknown) => { select: () => { maybeSingle: () => Promise<{ data: { id: number } | null; error: { message: string } | null }> } } };
            insert: (v: Record<string, unknown>) => { select: () => { single: () => Promise<{ data: { id: number }; error: { message: string } | null }> } };
          };
          if (a.id) {
            const { data, error } = await t.update({ ...row, updated_at: new Date().toISOString() }).eq("id", Number(a.id)).select().maybeSingle();
            if (error) return json({ error: error.message }, 500);
            return json({ id: data?.id });
          }
          const { data, error } = await t.insert(row).select().single();
          if (error) return json({ error: error.message }, 500);
          return json({ id: data.id });
        }

        if (action === "deleteAoc") {
          const { error } = await (supabaseAdmin.from("fsd_aoc_companies" as never) as unknown as { delete: () => { eq: (c: string, v: unknown) => Promise<{ error: { message: string } | null }> } }).delete().eq("id", Number(payload.id));
          if (error) return json({ error: error.message }, 500);
          return json({ ok: true });
        }

        if (action === "saveHr") {
          const h = (payload.hr ?? {}) as Record<string, unknown>;
          const row = {
            name: String(h.name ?? ""),
            position: h.position == null ? null : String(h.position),
            department: h.department == null ? null : String(h.department),
            email: h.email == null ? null : String(h.email),
            phone: h.phone == null ? null : String(h.phone),
            photo: h.photo == null ? null : String(h.photo),
            bio: h.bio == null ? null : String(h.bio),
            courses: h.courses ?? [],
            first_name: h.firstName == null ? null : String(h.firstName),
            last_name: h.lastName == null ? null : String(h.lastName),
            birth_date: h.birthDate ? String(h.birthDate) : null,
            address: h.address == null ? null : String(h.address),
            start_date: h.startDate ? String(h.startDate) : null,
            education: h.education ?? [],
            work_history: h.workHistory ?? [],
            cert_files: h.certFiles ?? [],
            emp_type: h.empType ? String(h.empType) : "gov",
            employee_id: h.employeeId == null ? null : String(h.employeeId),
            branch: h.branch == null ? null : String(h.branch),
            status: h.status ? String(h.status) : "active",
          };
          const t = supabaseAdmin.from("fsd_hr_employees" as never) as unknown as {
            update: (v: Record<string, unknown>) => { eq: (c: string, v: unknown) => { select: () => { maybeSingle: () => Promise<{ data: { id: number } | null; error: { message: string } | null }> } } };
            insert: (v: Record<string, unknown>) => { select: () => { single: () => Promise<{ data: { id: number }; error: { message: string } | null }> } };
          };
          if (h.id) {
            const { data, error } = await t.update({ ...row, updated_at: new Date().toISOString() }).eq("id", Number(h.id)).select().maybeSingle();
            if (error) return json({ error: error.message }, 500);
            return json({ id: data?.id });
          }
          const { data, error } = await t.insert(row).select().single();
          if (error) return json({ error: error.message }, 500);
          return json({ id: data.id });
        }

        if (action === "deleteHr") {
          const { error } = await (supabaseAdmin.from("fsd_hr_employees" as never) as unknown as { delete: () => { eq: (c: string, v: unknown) => Promise<{ error: { message: string } | null }> } }).delete().eq("id", Number(payload.id));
          if (error) return json({ error: error.message }, 500);
          return json({ ok: true });
        }

        return json({ error: "unknown action" }, 400);
      },
    },
  },
});
