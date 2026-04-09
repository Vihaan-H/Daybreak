import type { AppConfig } from "../config.js";

interface ArchiveRow {
  date: string;
  filename: string;
  quote_text: string;
  quote_author: string;
  source_id: string;
  source_name: string;
}

function buildHeaders(config: AppConfig): Record<string, string> {
  return {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
  };
}

export async function upsertArchiveRow(
  config: AppConfig,
  row: ArchiveRow,
  imageBuffer: Buffer
): Promise<void> {
  const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${config.supabaseBucket}/${encodeURIComponent(row.filename)}`;
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      ...buildHeaders(config),
      "Content-Type": "image/png",
      "x-upsert": "true",
    },
    body: new Uint8Array(imageBuffer),
  });
  if (!uploadRes.ok) {
    const message = await uploadRes.text();
    throw new Error(`Supabase storage upload failed (${uploadRes.status}): ${message}`);
  }

  const upsertUrl = `${config.supabaseUrl}/rest/v1/wallpaper_archive?on_conflict=filename`;
  const upsertRes = await fetch(upsertUrl, {
    method: "POST",
    headers: {
      ...buildHeaders(config),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify([row]),
  });
  if (!upsertRes.ok) {
    const message = await upsertRes.text();
    throw new Error(`Supabase archive upsert failed (${upsertRes.status}): ${message}`);
  }
}

export async function listArchiveRows(config: AppConfig): Promise<
  Array<{
    date: string;
    filename: string;
    quote_text: string;
    quote_author: string;
  }>
> {
  const listUrl =
    `${config.supabaseUrl}/rest/v1/wallpaper_archive?` +
    new URLSearchParams({
      select: "date,filename,quote_text,quote_author",
      order: "date.desc,filename.desc",
    }).toString();

  const res = await fetch(listUrl, {
    headers: {
      ...buildHeaders(config),
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Supabase archive list failed (${res.status}): ${message}`);
  }

  return (await res.json()) as Array<{
    date: string;
    filename: string;
    quote_text: string;
    quote_author: string;
  }>;
}

export async function downloadArchiveImage(
  config: AppConfig,
  filename: string
): Promise<Buffer | null> {
  const url = `${config.supabaseUrl}/storage/v1/object/public/${config.supabaseBucket}/${encodeURIComponent(filename)}`;
  const res = await fetch(url, { headers: buildHeaders(config) });
  if (!res.ok) return null;
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
