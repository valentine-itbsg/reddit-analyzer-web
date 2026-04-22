export function cleanText(input: string | null | undefined): string {
    if (!input) {
      return "";
    }
  
    return input
      .replace(/\s+/g, " ")
      .replace(/\u0000/g, "")
      .trim();
  }
  
  export function safeJsonParse<T>(value: string): T | null {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  
  export function toNumberOrNull(value: string | null | undefined): number | null {
    if (!value) {
      return null;
    }
  
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  
  export function isRedditPostUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?reddit\.com\/r\/.+\/comments\/.+/i.test(url.trim());
  }