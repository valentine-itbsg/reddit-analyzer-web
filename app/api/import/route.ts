import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { processAnalysisByUrl } from "@/src/lib/process-analysis";

function getHyperlinkValue(value: unknown) {
  if (!value || typeof value !== "object") return null;
  if (!("hyperlink" in value)) return null;
  const v = (value as Record<string, unknown>).hyperlink;
  return typeof v === "string" ? v : null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return NextResponse.json({ error: "No worksheet found" }, { status: 400 });
  }

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];

  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const urlColumnIndex = headers.findIndex(
    (header) => header.toLowerCase() === "url",
  );

  if (urlColumnIndex === -1) {
    return NextResponse.json(
      { error: 'Input Excel must contain a column named "url"' },
      { status: 400 },
    );
  }

  const urls: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const value = row.getCell(urlColumnIndex + 1).value;
    const hyperlink = getHyperlinkValue(value);
    const url = String(hyperlink ?? value ?? "").trim();
    if (url) urls.push(url);
  });

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