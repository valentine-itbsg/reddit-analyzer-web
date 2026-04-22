export const config = {
    openAiApiKey: process.env.OPENAI_API_KEY ?? "",
    openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    maxCommentsForAi: Number(process.env.MAX_COMMENTS_FOR_AI ?? 40),
    requestDelayMs: Number(process.env.REQUEST_DELAY_MS ?? 1200),
    retryCount: Number(process.env.RETRY_COUNT ?? 2),
  };