export interface InputRow {
    rowNumber: number;
    url: string;
    [key: string]: unknown;
  }
  
  export interface ParsedRedditComment {
    commentId: string | null;
    author: string | null;
    bodyText: string | null;
    score: number | null;
    createdAt: string | null;
    depth: number;
    permalink: string | null;
  }
  
  export interface ParsedRedditPost {
    url: string;
    postId: string | null;
    title: string | null;
    author: string | null;
    subreddit: string | null;
    score: number | null;
    commentCount: number | null;
    awardCount: number | null;
    createdAt: string | null;
    bodyText: string | null;
    comments: ParsedRedditComment[];
    fetchedHtmlLength: number;
  }
  
  export interface AiAnalysisResult {
    summary: string;
    overallSentiment: "positive" | "negative" | "mixed" | "neutral";
    recommendedServices: string[];
    mentionedBrands: string[];
    painPoints: string[];
    advantages: string[];
    keyTakeaways: string[];
    usefulnessScore: number;
    topicRelevanceScore: number;
    finalTakeaway: string;
    aiMentionCount: number;
    mentionedTools: string[];
    aiContextSummary: string;
  }