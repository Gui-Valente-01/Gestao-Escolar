import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callAi, isAiConfigured } from "./ai";

const ORIGINAL_ENV = process.env;

describe("ai client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("considera Gemini configurado com GEMINI_API_KEY", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.AI_API_KEY = "";
    process.env.GEMINI_API_KEY = "gemini-key-123";

    expect(isAiConfigured()).toBe(true);
  });

  it("chama a API generateContent do Gemini e extrai a resposta", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.AI_API_KEY = "gemini-key-123";
    process.env.AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    process.env.AI_MODEL = "gemini-2.5-flash";
    process.env.AI_MAX_TOKENS = "321";

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "Resposta " }, { text: "do Gemini." }],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callAi({ system: "Responda em pt-BR.", user: "Oi" });

    expect(result).toEqual({
      answer: "Resposta do Gemini.",
      model: "gemini-2.5-flash",
      provider: "gemini",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gemini-key-123",
    );
    expect(init?.method).toBe("POST");

    const body = JSON.parse(String(init?.body));
    expect(body.systemInstruction.parts[0].text).toBe("Responda em pt-BR.");
    expect(body.contents[0].parts[0].text).toBe("Oi");
    expect(body.generationConfig).toMatchObject({
      temperature: 0.4,
      maxOutputTokens: 321,
    });
  });
});
