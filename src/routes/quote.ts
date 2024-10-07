import { Hono } from "hono";

const quoteRoute = new Hono();

const primaryApiUrl = "https://api.quotable.io/random";
const fallbackApiUrl = "https://zenquotes.io/api/random";

interface QuoteResponse {
  content: string;
  author: string;
}

interface PrimaryApiResponse {
  content: string;
  author: string;
}

interface FallbackApiResponse {
  q: string;
  a: string;
}

interface ErrorResponse {
  error: string;
}
quoteRoute.get("/quote", async (c): Promise<Response> => {
  try {
    const primaryResponse = await fetch(primaryApiUrl);
    if (!primaryResponse.ok) {
      throw new Error("Primary API failed");
    }
    const data = (await primaryResponse.json()) as PrimaryApiResponse;
    const quoteResponse: QuoteResponse = {
      content: data.content,
      author: data.author,
    };
    return c.json(quoteResponse);
  } catch (primaryError) {
    console.error("Error fetching from primary API:", primaryError);
    try {
      const fallbackResponse = await fetch(fallbackApiUrl);
      if (!fallbackResponse.ok) {
        throw new Error("Fallback API failed");
      }
      const data = (await fallbackResponse.json()) as FallbackApiResponse[];
      const quoteResponse: QuoteResponse = {
        content: data[0].q,
        author: data[0].a,
      };
      return c.json(quoteResponse);
    } catch (fallbackError) {
      console.error("Error fetching from fallback API:", fallbackError);
      const errorResponse: ErrorResponse = { error: "Failed to fetch quote" };
      return c.json(errorResponse, 500);
    }
  }
});

export default quoteRoute;
