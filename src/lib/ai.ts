import OpenAI from "openai";
import { AiAnalysisResult, ParsedRedditPost } from "./types";
import { safeJsonParse } from "./utils/clean";


export class AiAnalyzerService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async analyze(
    post: ParsedRedditPost,
    maxCommentsForAi: number,
  ): Promise<AiAnalysisResult> {
    const commentsForAi = post.comments.slice(0, maxCommentsForAi).map((comment) => ({
      author: comment.author,
      score: comment.score,
      depth: comment.depth,
      bodyText: comment.bodyText,
    }));

    const inputPayload = {
      url: post.url,
      title: post.title,
      author: post.author,
      subreddit: post.subreddit,
      score: post.score,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
      bodyText: post.bodyText,
      comments: commentsForAi,
    };

    const prompt = `
You are analyzing a Reddit thread.

Return ONLY valid JSON with this exact shape:
{
  "summary": string,
  "overallSentiment": "positive" | "negative" | "mixed" | "neutral",
  "recommendedServices": string[],
  "mentionedBrands": string[],
  "painPoints": string[],
  "advantages": string[],
  "keyTakeaways": string[],
  "usefulnessScore": number,
  "topicRelevanceScore": number,
  "finalTakeaway": string,
  "aiMentionCount": number,
  "mentionedTools": string[],
  "aiContextSummary": string,
  "extractedKeywords": string[]
}


Rules:
- Do not wrap JSON in markdown.
- If information is missing, return empty arrays or conservative values.
- usefulnessScore and topicRelevanceScore must be integers from 1 to 10.
- Be concise and factual.
- extractedKeywords must contain 5-15 important topic keywords or short phrases from the thread.
- extractedKeywords must be lowercase, deduplicated, and 1-4 words each.
- Prefer concrete entities, products, problems, workflows, and domain terms over generic words.
- Use wording that appears in the thread whenever possible, because keywords are counted as exact phrases later.

Thread data:
${JSON.stringify(inputPayload, null, 2)}
`.trim();

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const rawText = response.choices[0]?.message?.content?.trim();

    if (!rawText) {
      throw new Error("OpenAI returned empty output.");
    }

    const parsed = safeJsonParse<AiAnalysisResult>(rawText);

    if (!parsed) {
      throw new Error(`Failed to parse OpenAI JSON output: ${rawText}`);
    }

    return {
      summary: parsed.summary ?? "",
      overallSentiment: parsed.overallSentiment ?? "neutral",
      recommendedServices: parsed.recommendedServices ?? [],
      mentionedBrands: parsed.mentionedBrands ?? [],
      painPoints: parsed.painPoints ?? [],
      advantages: parsed.advantages ?? [],
      keyTakeaways: parsed.keyTakeaways ?? [],
      usefulnessScore: this.normalizeScore(parsed.usefulnessScore),
      topicRelevanceScore: this.normalizeScore(parsed.topicRelevanceScore),
      finalTakeaway: parsed.finalTakeaway ?? "",
      aiMentionCount: Number.isFinite(Number(parsed.aiMentionCount)) ? Math.max(0, Number(parsed.aiMentionCount)) : 0,
      mentionedTools: parsed.mentionedTools ?? [],
      aiContextSummary: parsed.aiContextSummary ?? "",
      extractedKeywords: this.normalizeStringArray(parsed.extractedKeywords, 15),
    };
  }

  private normalizeScore(value: number): number {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return 5;
    }

    const rounded = Math.round(numeric);
    return Math.min(10, Math.max(1, rounded));
  }

  private normalizeStringArray(value: unknown, limit: number): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const unique = new Set<string>();

    for (const item of value) {
      if (typeof item !== "string") continue;

      const normalized = item.toLowerCase().replace(/\s+/g, " ").trim();

      if (normalized) {
        unique.add(normalized);
      }

      if (unique.size >= limit) {
        break;
      }
    }

    return [...unique];
  }
}