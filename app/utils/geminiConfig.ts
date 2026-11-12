export const DEFAULT_GEMINI_API_KEY = "";
export const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

export function getGeminiApiKey(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("gemini_api_key");
    if (saved && saved.trim().length > 0 && !saved.includes("AIzaSyA4vvBvLJqeWe6SiVBf0Od79JmbBHHdFBU")) {
      return saved.trim();
    }
  }
  return DEFAULT_GEMINI_API_KEY;
}

export function setGeminiApiKey(key: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("gemini_api_key", key.trim());
  }
}

export function getGeminiModel(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("gemini_model");
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  }
  return DEFAULT_GEMINI_MODEL;
}

export function setGeminiModel(model: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("gemini_model", model.trim());
  }
}

export function getGeminiApiUrl(): string {
  const model = getGeminiModel();
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}
