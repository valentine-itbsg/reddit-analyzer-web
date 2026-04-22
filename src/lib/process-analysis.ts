import { Prisma } from "@prisma/client";
import { AiAnalyzerService } from "./ai";
import { RedditFetcherService } from "./reddit";
import { RedditParserService } from "./parser";
import { config } from "./config";
import { KeywordAnalyzerService } from "./keyword-analyzer";
import { prisma } from "./prisma";

export async function processAnalysisByUrl(url: string) {
  const fetcher = new RedditFetcherService();
  const parser = new RedditParserService();
  const aiAnalyzer = new AiAnalyzerService(config.openAiApiKey, config.openAiModel);
  const keywordAnalyzer = new KeywordAnalyzerService();

  const rawJson = await fetcher.fetchHtml(
    url,
    config.retryCount,
    config.requestDelayMs,
  );

  const parsedPost = parser.parse(url, rawJson);

  const ai = await aiAnalyzer.analyze(
    parsedPost,
    config.maxCommentsForAi,
  );

  const keywordMetrics = keywordAnalyzer.analyze(parsedPost, [
    "vat",
    "vat refund",
    "vat compliance",
    "tax filing",
    "eu vat",
    "etsy vat",
  ]);

  const rawPayload = JSON.parse(JSON.stringify(parsedPost)) as Prisma.InputJsonValue;

  const keywordFrequency = JSON.parse(
    JSON.stringify(keywordMetrics.keywordFrequency),
  ) as Prisma.InputJsonValue;

  return prisma.analysis.upsert({
    where: { sourceUrl: url },
    update: {
      status: "completed",
      title: parsedPost.title ?? null,
      subreddit: parsedPost.subreddit ?? null,
      author: parsedPost.author ?? null,
      postScore: parsedPost.score ?? null,
      commentCount: parsedPost.commentCount ?? null,
      parsedCommentCount: parsedPost.comments.length,
      createdAtReddit: parsedPost.createdAt
        ? new Date(parsedPost.createdAt)
        : null,
      summary: ai.summary,
      sentiment: ai.overallSentiment,
      recommendedServices: ai.recommendedServices,
      mentionedBrands: ai.mentionedBrands,
      painPoints: ai.painPoints,
      advantages: ai.advantages,
      keyTakeaways: ai.keyTakeaways,
      usefulnessScore: ai.usefulnessScore,
      topicRelevanceScore: ai.topicRelevanceScore,
      finalTakeaway: ai.finalTakeaway,

      keywordCount: keywordMetrics.keywordCount,
      uniqueKeywordCount: keywordMetrics.uniqueKeywordCount,
      topKeywords: keywordMetrics.topKeywords,
      matchedKeywords: keywordMetrics.matchedKeywords,
      keywordFrequency,

      rawPayload,
      errorMessage: null,
    },
    create: {
      sourceUrl: url,
      status: "completed",
      title: parsedPost.title ?? null,
      subreddit: parsedPost.subreddit ?? null,
      author: parsedPost.author ?? null,
      postScore: parsedPost.score ?? null,
      commentCount: parsedPost.commentCount ?? null,
      parsedCommentCount: parsedPost.comments.length,
      createdAtReddit: parsedPost.createdAt
        ? new Date(parsedPost.createdAt)
        : null,
      summary: ai.summary,
      sentiment: ai.overallSentiment,
      recommendedServices: ai.recommendedServices,
      mentionedBrands: ai.mentionedBrands,
      painPoints: ai.painPoints,
      advantages: ai.advantages,
      keyTakeaways: ai.keyTakeaways,
      usefulnessScore: ai.usefulnessScore,
      topicRelevanceScore: ai.topicRelevanceScore,
      finalTakeaway: ai.finalTakeaway,

      keywordCount: keywordMetrics.keywordCount,
      uniqueKeywordCount: keywordMetrics.uniqueKeywordCount,
      topKeywords: keywordMetrics.topKeywords,
      matchedKeywords: keywordMetrics.matchedKeywords,
      keywordFrequency,

      rawPayload,
    },
  });
}