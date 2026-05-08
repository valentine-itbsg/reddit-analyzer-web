import { NextResponse } from "next/server";
import { getPrisma } from "@/src/lib/prisma";
import { processAnalysisByUrl } from "@/src/lib/process-analysis";

export const runtime = "nodejs";

export async function POST() {
  const prisma = getPrisma();

  try {
    const analyses = await prisma.analysis.findMany({
      select: { sourceUrl: true },
      orderBy: { createdAt: "asc" },
    });

    const results = [];

    for (const analysis of analyses) {
      try {
        const result = await processAnalysisByUrl(analysis.sourceUrl);
        results.push({
          url: analysis.sourceUrl,
          status: "completed",
          id: result.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({
          url: analysis.sourceUrl,
          status: "failed",
          error: message,
        });
      }
    }

    return NextResponse.json({
      count: results.length,
      completed: results.filter((result) => result.status === "completed").length,
      failed: results.filter((result) => result.status === "failed").length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
