import { ParsedRedditComment, ParsedRedditPost } from "./types";
import { cleanText } from "./utils/clean";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export class RedditParserService {
  parse(url: string, rawJson: string): ParsedRedditPost {
    const data = JSON.parse(rawJson);

    const postListing = data[0]?.data?.children?.[0]?.data;
    const commentListing = data[1]?.data?.children ?? [];

    if (!postListing) {
      throw new Error("Could not find post data in Reddit JSON response.");
    }

    const comments = this.extractComments(commentListing, 0);

    return {
      url,
      postId: postListing.id ?? null,
      title: cleanText(postListing.title) || null,
      author: cleanText(postListing.author) || null,
      subreddit: postListing.subreddit ? `r/${postListing.subreddit}` : null,
      score: postListing.score ?? null,
      commentCount: postListing.num_comments ?? null,
      awardCount: postListing.total_awards_received ?? null,
      createdAt: postListing.created_utc
        ? new Date(postListing.created_utc * 1000).toISOString()
        : null,
      bodyText: cleanText(postListing.selftext) || null,
      comments,
      fetchedHtmlLength: rawJson.length,
    };
  }

  private extractComments(children: unknown[], depth: number): ParsedRedditComment[] {
    const result: ParsedRedditComment[] = [];

    for (const child of children) {
      if (!isRecord(child)) continue;
      if (child.kind === "more") continue;

      const d = child.data;
      if (!isRecord(d)) continue;

      const bodyText = cleanText(typeof d.body === "string" ? d.body : "");
      if (!bodyText || bodyText === "[deleted]" || bodyText === "[removed]") continue;

      result.push({
        commentId: typeof d.id === "string" ? d.id : null,
        author: cleanText(typeof d.author === "string" ? d.author : "") || null,
        bodyText,
        score: typeof d.score === "number" ? d.score : null,
        createdAt:
          typeof d.created_utc === "number"
            ? new Date(d.created_utc * 1000).toISOString()
            : null,
        depth,
        permalink: typeof d.permalink === "string" ? d.permalink : null,
      });

      const replies = isRecord(d.replies) ? d.replies : null;
      const repliesData = replies && isRecord(replies.data) ? replies.data : null;
      const repliesChildren =
        repliesData && Array.isArray(repliesData.children) ? repliesData.children : null;

      if (repliesChildren) {
        const nested = this.extractComments(repliesChildren, depth + 1);
        result.push(...nested);
      }
    }

    return result;
  }
}