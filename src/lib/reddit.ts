import axios, { AxiosError, AxiosInstance } from "axios";
import { delay } from "./utils/delay";

export class RedditFetcherService {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 20000,
      headers: {
        "User-Agent": "web:reddit-analyzer:1.0.0 (by /u/Spiritual-Emphasis90)",
        Accept: "application/json, text/plain, */*",
      },
      maxRedirects: 5,
      validateStatus: () => true,
    });
  }

  async fetchHtml(url: string, retryCount: number, delayMs: number): Promise<string> {
    const cleanUrl = url.replace(/\?.*$/, "").replace(/\/$/, "");
    const redditPath = new URL(cleanUrl).pathname;
    
    const jsonUrl = `https://api.reddit.com${redditPath}?limit=500&raw_json=1`;

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        console.log("Fetching Reddit JSON:", {
          url: jsonUrl,
          attempt: attempt + 1,
        });

        const response = await this.client.get<unknown>(jsonUrl);

        console.log("Reddit response:", {
          url: jsonUrl,
          status: response.status,
          headers: response.headers,
          dataPreview:
            typeof response.data === "string"
              ? response.data.slice(0, 500)
              : JSON.stringify(response.data).slice(0, 500),
        });

        if (response.status >= 400) {
          throw new Error(`Reddit returned status ${response.status}`);
        }

        if (!response.data) {
          throw new Error("Received empty JSON response.");
        }

        return JSON.stringify(response.data);
      } catch (error) {
        lastError = error;

        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          console.error("Reddit fetch attempt failed:", {
            url: jsonUrl,
            attempt: attempt + 1,
            status: axiosError.response?.status,
            responseData:
              typeof axiosError.response?.data === "string"
                ? axiosError.response.data.slice(0, 500)
                : JSON.stringify(axiosError.response?.data ?? {}).slice(0, 500),
            message: axiosError.message,
          });
        } else {
          console.error("Reddit fetch attempt failed:", {
            url: jsonUrl,
            attempt: attempt + 1,
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }

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