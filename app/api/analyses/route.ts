import { getPrisma } from "@/src/lib/prisma";
import { processAnalysisByUrl } from "@/src/lib/process-analysis";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createAnalysisSchema = z.object({
  url: z.string().url(),
});

export async function GET() {
  try {
    const prisma = getPrisma();
    const analyses = await prisma.analysis.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(analyses);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createAnalysisSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await processAnalysisByUrl(parsed.data.url);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}