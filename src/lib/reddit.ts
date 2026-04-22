import axios, { AxiosInstance } from "axios";
import { delay } from "./utils/delay";

export class RedditFetcherService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 20000,
      headers: {
        "User-Agent": "reddit-analyzer-bot/1.0 by YourUsername",
        Accept: "application/json",
      },
      maxRedirects: 5,
    });
  }

  async fetchHtml(url: string, retryCount: number, delayMs: number): Promise<string> {
    const jsonUrl =
      url.replace(/\?.*$/, "").replace(/\/$/, "") + ".json?limit=500&raw_json=1";

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        const response = await this.client.get<unknown>(jsonUrl);

        if (!response.data) {
          throw new Error("Received empty JSON response.");
        }

        return JSON.stringify(response.data);
      } catch (error) {
        lastError = error;

        if (attempt < retryCount) {
          await delay(delayMs);
        }
      }
    }

    const errorMessage =
      lastError instanceof Error ? lastError.message : "Unknown fetch error";

    throw new Error(`Failed to fetch Reddit JSON: ${errorMessage}`);
  }
}