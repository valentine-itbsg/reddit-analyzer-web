import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

function formatDateForFilename(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
    d.getMinutes()
  )}`;
}

function stringifyCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function GET() {
  const analyses = await prisma.analysis.findMany({
    orderBy: { createdAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Reddit Analyzer";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Analyses", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "sourceUrl", key: "sourceUrl", width: 45 },
    { header: "title", key: "title", width: 50 },
    { header: "subreddit", key: "subreddit", width: 18 },
    { header: "author", key: "author", width: 18 },
    { header: "postScore", key: "postScore", width: 10 },
    { header: "commentCount", key: "commentCount", width: 14 },
    { header: "parsedCommentCount", key: "parsedCommentCount", width: 18 },
    { header: "sentiment", key: "sentiment", width: 12 },
    { header: "usefulnessScore", key: "usefulnessScore", width: 16 },
    { header: "topicRelevanceScore", key: "topicRelevanceScore", width: 18 },
    { header: "summary", key: "summary", width: 80 },
    { header: "finalTakeaway", key: "finalTakeaway", width: 80 },
    { header: "recommendedServices", key: "recommendedServices", width: 60 },
    { header: "keywordCount", key: "keywordCount", width: 14 },
    { header: "topKeywords", key: "topKeywords", width: 60 },
    { header: "createdAtReddit", key: "createdAtReddit", width: 22 },
  ];

  for (const a of analyses) {
    sheet.addRow({
      sourceUrl: a.sourceUrl,
      title: a.title ?? "",
      subreddit: a.subreddit ?? "",
      author: a.author ?? "",
      postScore: a.postScore ?? "",
      commentCount: a.commentCount ?? "",
      parsedCommentCount: a.parsedCommentCount ?? 0,
      sentiment: a.sentiment ?? "",
      usefulnessScore: a.usefulnessScore ?? "",
      topicRelevanceScore: a.topicRelevanceScore ?? "",
      summary: a.summary ?? "",
      finalTakeaway: a.finalTakeaway ?? "",
      recommendedServices: stringifyCell(a.recommendedServices),
      keywordCount: a.keywordCount ?? "",
      topKeywords: stringifyCell(a.topKeywords),
      createdAtReddit: a.createdAtReddit ? a.createdAtReddit.toISOString() : "",
    });
  }

  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((c) => {
    c.alignment = { vertical: "top", wrapText: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const now = new Date();
  const filename = `reddit-analyses_${formatDateForFilename(now)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

