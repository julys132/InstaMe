import Constants from "expo-constants";

export const CHICOO_SUPPORT_EMAIL = "support@instame.app";
export const CHICOO_BILLING_EMAIL = "billing@instame.app";
export const CHICOO_PRIVACY_EMAIL = "privacy@instame.app";

export const PUBLIC_PAGE_PATHS = {
  privacy: "/privacy",
  terms: "/terms",
  contact: "/contact",
  deleteAccount: "/delete-account",
} as const;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getPublicWebBaseUrl(): string {
  const extra: any = Constants.expoConfig?.extra || {};
  const configured =
    extra.publicWebUrl ||
    process.env.EXPO_PUBLIC_WEB_BASE_URL ||
    process.env.PUBLIC_WEB_URL ||
    process.env.PUBLIC_APP_URL;

  if (typeof configured === "string" && configured.trim().length > 0) {
    return trimTrailingSlash(configured.trim());
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return trimTrailingSlash(window.location.origin);
  }

  return "https://instame.up.railway.app";
}

export function getPublicPageUrl(path: string): string {
  const baseUrl = getPublicWebBaseUrl();
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${safePath}`;
}
