import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { processAnalysisByUrl } from "@/src/lib/process-analysis";

export const runtime = "nodejs";

function extractUrl(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.hyperlink === "string") return v.hyperlink.trim();
    if (typeof v.text === "string") return v.text.trim();
    if (Array.isArray(v.richText)) {
      return (v.richText as { text: string }[]).map((p) => p.text).join("").trim();
    }
  }
  return String(value).trim();
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const workbook = XLSX.read(buffer, { type: "buffer", cellFormula: false });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    return NextResponse.json({ error: "No worksheet found" }, { status: 400 });
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });

  const urlColumnKey = Object.keys(rows[0] ?? {}).find(
    (key) => key.toLowerCase() === "url",
  );

  if (!urlColumnKey) {
    return NextResponse.json(
      { error: 'Input Excel must contain a column named "url"' },
      { status: 400 },
    );
  }

  const urls = rows
    .map((row) => extractUrl(row[urlColumnKey]))
    .filter(Boolean);

  const results = [];

  for (const url of urls) {
    try {
      const result = await processAnalysisByUrl(url);
      results.push({ url, status: "completed", id: result.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      results.push({ url, status: "failed", error: message });
    }
  }

  return NextResponse.json({ count: results.length, results });
}