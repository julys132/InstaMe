import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { InstaMeStylePreset } from "@shared/instame-style-presets";
import type {
  InstaMeEditTier,
  InstaMeGenerationTier,
  InstaMePortraitEnhanceTier,
} from "@shared/instame-pricing";

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "@instame_access_token",
  REFRESH_TOKEN: "@instame_refresh_token",
};

export type InstaMeUploadedImage = {
  id: string;
  name: string;
  kind?: "uploaded" | "enhanced" | "own_style";
  mimeType: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  createdAt: string;
  previewUri: string;
};

export type InstaMeOwnStyle = {
  id: string;
  name: string;
  mimeType: string;
  createdAt: string;
  previewUri: string;
  promptPreview: string;
  imageHash?: string;
};

export type InstaMeUploadedImageAsset = InstaMeUploadedImage & {
  base64: string;
  dataUri: string;
};

export type SocialLoginPayload =
  | {
      provider: "google";
      idToken: string;
      email?: string;
      name?: string;
    }
  | {
      provider: "apple";
      identityToken: string;
      email?: string;
      name?: string;
    };

function withApiPortIfNeeded(hostOrDomain: string): string {
  const trimmed = hostOrDomain.trim();
  if (!trimmed) return trimmed;

  const hasPort = /:\d+$/.test(trimmed);
  if (hasPort) return trimmed;

  const isReplitDomain =
    trimmed.includes(".replit.dev") || trimmed.includes(".repl.co");

  if (isReplitDomain) {
    return `${trimmed}:5000`;
  }

  return trimmed;
}

function getApiBaseUrl(): string {
  const extra: any = Constants.expoConfig?.extra || {};
  if (typeof extra.apiBaseUrl === "string" && extra.apiBaseUrl.length > 0) {
    return extra.apiBaseUrl;
  }

  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { protocol, hostname, port, origin } = window.location;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    if (isLocalhost && port !== "5000") {
      return `${protocol}//${hostname}:5000`;
    }
    const isReplitDomain =
      hostname.includes(".replit.dev") || hostname.includes(".repl.co");
    if (isReplitDomain && !port) {
      return `${protocol}//${hostname}:5000`;
    }
    return origin;
  }

  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${withApiPortIfNeeded(process.env.EXPO_PUBLIC_DOMAIN)}`;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host) {
      if (host === "localhost" || host === "127.0.0.1") {
        return "http://localhost:5000";
      }
      const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
      if (isIpv4) {
        return `http://${host}:5000`;
      }
      return `https://${withApiPortIfNeeded(host)}`;
    }
  }

  return "http://localhost:5000";
}

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  async init(): Promise<void> {
    this.accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    this.refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true,
  ): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (requireAuth && this.accessToken) {
      (headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`;
    }

    if (requireAuth && !this.accessToken && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed && this.accessToken) {
        (headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`;
      }
    }

    const doFetch = async () => {
      try {
        return await fetch(url, { ...options, headers });
      } catch (error) {
        const err: any = new Error(
          `Could not connect to API (${API_BASE_URL}). Make sure backend server is running.`,
        );
        err.cause = error;
        throw err;
      }
    };

    let response = await doFetch();
    let data: any = null;
    let textBody = "";
    let contentType = response.headers.get("content-type") || "";

    try {
      textBody = await response.text();
      const likelyJson =
        contentType.includes("application/json") ||
        textBody.trimStart().startsWith("{") ||
        textBody.trimStart().startsWith("[");
      data = textBody && likelyJson ? JSON.parse(textBody) : null;
    } catch {
      data = null;
    }

    if (requireAuth && response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        if (this.accessToken) {
          (headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`;
        }
        response = await doFetch();
        try {
          textBody = await response.text();
          const nextContentType = response.headers.get("content-type") || "";
          contentType = nextContentType;
          const likelyJson =
            nextContentType.includes("application/json") ||
            textBody.trimStart().startsWith("{") ||
            textBody.trimStart().startsWith("[");
          data = textBody && likelyJson ? JSON.parse(textBody) : null;
        } catch {
          data = null;
        }
      }
    }

    if (!response.ok) {
      const message = data?.error || data?.message || `HTTP ${response.status}`;
      const err: any = new Error(message);
      err.status = response.status;
      err.data = data;
      err.rawText = textBody;
      throw err;
    }

    if (data === null) {
      const preview = textBody.trim().slice(0, 120);
      const err: any = new Error(
        `Unexpected API response from ${url}. Expected JSON but got ${contentType || "unknown content-type"}${preview ? ` (${preview}...)` : ""}.`,
      );
      err.status = response.status;
      err.rawText = textBody;
      throw err;
    }

    return data as T;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
        if (!response.ok) {
          await this.clearAuth();
          return false;
        }
        const data = await response.json();
        await this.setAuth(data.accessToken, data.refreshToken);
        return true;
      } catch {
        await this.clearAuth();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async setAuth(accessToken: string, refreshToken: string): Promise<void> {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  async clearAuth(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]);
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  async register(name: string, email: string, password: string) {
    const data = await this.request<{
      user: any;
      accessToken: string;
      refreshToken: string;
    }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      },
      false,
    );
    await this.setAuth(data.accessToken, data.refreshToken);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{
      user: any;
      accessToken: string;
      refreshToken: string;
    }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
      false,
    );
    await this.setAuth(data.accessToken, data.refreshToken);
    return data;
  }

  async resetPassword(email: string, newPassword: string) {
    return this.request<{ success: boolean; message: string }>(
      "/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify({ email, newPassword }),
      },
      false,
    );
  }

  async socialLogin(payload: SocialLoginPayload) {
    const data = await this.request<{
      user: any;
      accessToken: string;
      refreshToken: string;
    }>(
      "/auth/social",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      false,
    );
    await this.setAuth(data.accessToken, data.refreshToken);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request(
        "/auth/logout",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        },
        true,
      );
    } finally {
      await this.clearAuth();
    }
  }

  async deleteAccount(): Promise<void> {
    await this.request("/auth/account", { method: "DELETE" }, true);
    await this.clearAuth();
  }

  async getProfile() {
    return this.request<any>("/profile", {}, true);
  }

  async updateProfile(payload: {
    name?: string;
    styleGender?: "female" | "male" | "non_binary" | null;
    stylePreferences?: string[];
    favoriteLooks?: string[];
    notificationsEnabled?: boolean;
  }) {
    return this.request<any>(
      "/profile",
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      true,
    );
  }

  async getCredits() {
    return this.request<{ credits: number; subscription: string | null }>("/credits", {}, true);
  }

  async getCreditPackages() {
    return this.request<any[]>("/credits/packages", {}, true);
  }

  async getCreditTransactions() {
    return this.request<any[]>("/credits/transactions", {}, true);
  }

  async useCredit(feature: string) {
    return this.request<{ success: boolean; credits: number }>(
      "/credits/use",
      {
        method: "POST",
        body: JSON.stringify({ feature }),
      },
      true,
    );
  }

  async grantDevCredits(amount?: number) {
    return this.request<{ success: boolean; grantedCredits: number; credits: number }>(
      "/credits/dev-grant",
      {
        method: "POST",
        body: JSON.stringify(typeof amount === "number" ? { amount } : {}),
      },
      true,
    );
  }

  async createCheckoutSession(payload: {
    itemType: "package" | "subscription";
    itemId: string;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    return this.request<{ url: string; sessionId: string }>(
      "/credits/checkout",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true,
    );
  }

  async createBillingPortalSession(returnUrl?: string) {
    return this.request<{ url: string; hasActiveSubscription: boolean }>(
      "/credits/billing-portal",
      {
        method: "POST",
        body: JSON.stringify(returnUrl ? { returnUrl } : {}),
      },
      true,
    );
  }

  async verifyPaymentSession(sessionId: string | string[]) {
    const normalizedSessionId = Array.isArray(sessionId) ? sessionId[0] : sessionId;
    if (!normalizedSessionId) {
      throw new Error("Missing payment session ID");
    }
    return this.request<{ success: boolean; credits: number; subscription: string | null }>(
      `/credits/verify-session/${encodeURIComponent(normalizedSessionId)}`,
      {},
      true,
    );
  }

  async verifyApplePurchase(receiptData: string, productId: string) {
    return this.request<{ success: boolean; credits: number; error?: string }>(
      "/credits/apple-verify",
      {
        method: "POST",
        body: JSON.stringify({ receiptData, productId }),
      },
      true,
    );
  }

  async verifyGooglePurchase(purchaseToken: string, productId: string) {
    return this.request<{ success: boolean; credits: number; error?: string; bypass?: boolean }>(
      "/credits/google-verify",
      {
        method: "POST",
        body: JSON.stringify({ purchaseToken, productId }),
      },
      true,
    );
  }

  async transformOldMoney(payload: {
    photo: { base64: string; mimeType?: string };
    stylePhoto?: {
      base64: string;
      mimeType?: string;
      previewBase64?: string;
      width?: number;
      height?: number;
      fileSizeBytes?: number;
      name?: string;
    };
    savedOwnStyleId?: string;
    saveOwnStyle?: boolean;
    customPrompt?: string;
    intensity?: "soft" | "editorial" | "dramatic";
    preserveBackground?: boolean;
    stylePresetId?: string;
    generationTierId?: string;
  }) {
    return this.request<{
      imageBase64: string;
      creditsCharged: number;
      creditsRemaining: number;
      model: string;
      provider?: string;
      styleReferenceIds?: string[];
      stylePresetId?: string | null;
      promptOnlyMode?: boolean;
      generationTierId?: string;
      savedOwnStyle?: InstaMeOwnStyle | null;
    }>(
      "/instame/transform",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true,
    );
  }

  async getInstaMeStyleLibrary() {
    return this.request<{
      generatedAt: string | null;
      referenceCount: number;
      profiles: Array<{
        id: string;
        title: string;
        description: string;
        referenceCount: number;
      }>;
    }>("/instame/style-library", {}, true);
  }

  async getInstaMeStylePresets() {
    return this.request<{
      presets: InstaMeStylePreset[];
    }>("/instame/style-presets", {}, true);
  }

  async getInstaMePricing() {
    return this.request<{
      generationTiers: InstaMeGenerationTier[];
      editTiers: InstaMeEditTier[];
      portraitEnhanceTier: InstaMePortraitEnhanceTier;
      liveGenerationTierId: string;
    }>("/instame/pricing", {}, true);
  }

  async getInstaMeOwnStyles() {
    return this.request<{
      ownStyles: InstaMeOwnStyle[];
    }>("/instame/own-styles", {}, true);
  }

  async saveInstaMeOwnStyle(payload: {
    image: {
      name?: string;
      mimeType?: string;
      base64: string;
      previewBase64?: string;
      width?: number;
      height?: number;
      fileSizeBytes?: number;
    };
  }) {
    return this.request<{
      ownStyle: InstaMeOwnStyle;
    }>(
      "/instame/own-styles",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true,
    );
  }

  async renameInstaMeOwnStyle(styleId: string, name: string) {
    return this.request<{
      ownStyle: InstaMeOwnStyle;
    }>(
      `/instame/own-styles/${encodeURIComponent(styleId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name }),
      },
      true,
    );
  }

  async getInstaMeUploadedImages(kind?: "uploaded" | "enhanced") {
    return this.request<{
      images: InstaMeUploadedImage[];
    }>(`/instame/uploaded-images${kind ? `?kind=${encodeURIComponent(kind)}` : ""}`, {}, true);
  }

  async getInstaMeUploadedImage(imageId: string) {
    return this.request<{
      image: InstaMeUploadedImageAsset;
    }>(`/instame/uploaded-images/${encodeURIComponent(imageId)}`, {}, true);
  }

  async saveInstaMeUploadedImage(payload: {
    image: {
      name?: string;
      kind?: "uploaded" | "enhanced";
      mimeType?: string;
      base64: string;
      previewBase64: string;
      width: number;
      height: number;
      fileSizeBytes: number;
    };
  }) {
    return this.request<{
      image: InstaMeUploadedImage;
    }>(
      "/instame/uploaded-images",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true,
    );
  }

  async deleteInstaMeUploadedImage(imageId: string) {
    return this.request<{ success: boolean }>(
      `/instame/uploaded-images/${encodeURIComponent(imageId)}`,
      {
        method: "DELETE",
      },
      true,
    );
  }

  async deleteInstaMeOwnStyle(styleId: string) {
    return this.request<{ success: boolean }>(
      `/instame/own-styles/${encodeURIComponent(styleId)}`,
      {
        method: "DELETE",
      },
      true,
    );
  }

  async editInstaMeImage(payload: {
    currentImage: { base64: string; mimeType?: string };
    originalPhoto?: { base64: string; mimeType?: string };
    editInstruction: string;
    customPrompt?: string;
    editTierId?: string;
  }) {
    return this.request<{
      imageBase64: string;
      creditsCharged: number;
      creditsRemaining: number;
      model: string;
      provider?: string;
      editTierId?: string;
    }>(
      "/instame/edit",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true,
    );
  }

  async enhanceInstaMePortrait(payload: {
    photo: { base64: string; mimeType?: string };
  }) {
    return this.request<{
      imageBase64: string;
      creditsCharged: number;
      creditsRemaining: number;
      model: string;
      provider?: string;
      output?: string;
    }>(
      "/instame/enhance-portrait",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true,
    );
  }

  async generateStyle(payload: {
    items: Array<{ name: string; category: string; color: string; description?: string }>;
    occasion: string;
    gender?: "female" | "male" | "non_binary";
    customPrompt: string;
    event?: string;
    season?: string;
    aesthetic?: string;
    colorPalette?: string;
    requiredPieces?: string[];
    outputMode: "text" | "image";
    imageInputMode: "single_item" | "multi_item";
    photos: Array<{ base64: string; mimeType?: string }>;
  }) {
    return this.request<{
      lookName: string;
      description: string;
      tips: string[];
      usedPieces: string[];
      imageBase64?: string;
      outputMode: "text" | "image";
      creditsCharged: number;
    }>(
      "/style",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true,
    );
  }

  async modifyStyle(payload: {
    originalDescription: string;
    originalTips: string[];
    modifyRequest: string;
    items: Array<{ name: string; category: string; color: string; description?: string }>;
    occasion: string;
    gender?: "female" | "male" | "non_binary";
    event?: string;
    season?: string;
    aesthetic?: string;
    colorPalette?: string;
    customPrompt?: string;
    requiredPieces?: string[];
    outputMode: "text" | "image";
    imageInputMode: "single_item" | "multi_item";
    photos?: Array<{ base64: string; mimeType?: string }>;
  }) {
    return this.request<{
      lookName: string;
      description: string;
      tips: string[];
      usedPieces: string[];
      imageBase64?: string;
      outputMode: "text" | "image";
      creditsCharged: number;
    }>(
      "/style/modify",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true,
    );
  }
}

export const apiClient = new ApiClient();
export { getApiBaseUrl, API_BASE_URL };
