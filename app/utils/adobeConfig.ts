export const DEFAULT_ADOBE_CLIENT_ID = "82a5500aa5d945049893aec8a2514446";

export function getAdobeClientId(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("adobe_client_id");
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  }
  return DEFAULT_ADOBE_CLIENT_ID;
}

export function setAdobeClientId(clientId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("adobe_client_id", clientId.trim());
  }
}
