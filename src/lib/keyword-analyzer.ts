import { ParsedRedditPost } from "./types";
import { cleanText } from "./utils/clean";


export interface KeywordAnalyzerResult {
  keywordCount: number;
  uniqueKeywordCount: number;
  topKeywords: string[];
  matchedKeywords: string[];
  keywordFrequency: Record<string, number>;
}

export class KeywordAnalyzerService {
  analyze(post: ParsedRedditPost, targetKeywords: string[]): KeywordAnalyzerResult {
    const normalizedKeywords = this.normalizeKeywords(targetKeywords);

    const fullText = this.buildFullText(post);
    const normalizedText = this.normalizeText(fullText);

    const keywordFrequency: Record<string, number> = {};

    for (const keyword of normalizedKeywords) {
      const count = this.countOccurrences(normalizedText, keyword);

      if (count > 0) {
        keywordFrequency[keyword] = count;
      }
    }

    const matchedKeywords = Object.keys(keywordFrequency);

    const sortedKeywords = [...matchedKeywords].sort((a, b) => {
      return keywordFrequency[b] - keywordFrequency[a];
    });

    const keywordCount = Object.values(keywordFrequency).reduce(
      (sum, count) => sum + count,
      0,
    );

    return {
      keywordCount,
      uniqueKeywordCount: matchedKeywords.length,
      topKeywords: sortedKeywords.slice(0, 10),
      matchedKeywords,
      keywordFrequency,
    };
  }

  private buildFullText(post: ParsedRedditPost): string {
    const parts: string[] = [];

    if (post.title) {
      parts.push(post.title);
    }

    if (post.bodyText) {
      parts.push(post.bodyText);
    }

    for (const comment of post.comments) {
      if (comment.bodyText) {
        parts.push(comment.bodyText);
      }
    }

    return cleanText(parts.join(" "));
  }

  private normalizeKeywords(keywords: string[]): string[] {
    const unique = new Set<string>();

    for (const keyword of keywords) {
      const normalized = this.normalizeText(keyword);

      if (normalized) {
        unique.add(normalized);
      }
    }

    return [...unique];
  }

  private normalizeText(text: string): string {
    return cleanText(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private countOccurrences(text: string, keyword: string): number {
    const escapedKeyword = this.escapeRegExp(keyword);
    const regex = new RegExp(`(?<!\\S)${escapedKeyword}(?!\\S)`, "gu");
    const matches = text.match(regex);

    return matches ? matches.length : 0;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}