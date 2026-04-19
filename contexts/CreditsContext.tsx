import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { apiClient, type SubscriptionProvider } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  creditsPerMonth: number;
  price: number;
  features: string[];
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "pack_5", name: "Quick Start - 10 Credits", credits: 10, price: 2.99 },
  { id: "pack_15", name: "Creator Pack - 30 Credits", credits: 30, price: 7.99, popular: true },
  { id: "pack_30", name: "Studio Pack - 60 Credits", credits: 60, price: 14.99 },
  { id: "pack_100", name: "Best Value - 200 Credits", credits: 200, price: 44.99 },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "sub_basic",
    name: "Lite",
    creditsPerMonth: 20,
    price: 4.99,
    features: ["20 credits/month", "Fast and Best generations", "Save favorite styles"],
  },
  {
    id: "sub_premium",
    name: "Plus",
    creditsPerMonth: 50,
    price: 9.99,
    features: ["50 credits/month", "Signature generations included", "Own Style saves", "Priority support"],
    popular: true,
  },
  {
    id: "sub_unlimited",
    name: "Studio",
    creditsPerMonth: 100,
    price: 19.99,
    features: ["100 credits/month", "Best overall value", "Signature generations included", "All premium features"],
  },
];

interface CreditsContextValue {
  credits: number;
  subscription: string | null;
  subscriptionProvider: SubscriptionProvider | null;
  subscriptionRenewAt: string | null;
  isLoading: boolean;
  refreshCredits: () => Promise<void>;
  useCredit: (feature?: string) => Promise<boolean>;
  purchasePackage: (
    packageId: string,
    urls?: { successUrl?: string; cancelUrl?: string },
  ) => Promise<{ url: string; sessionId: string }>;
  subscribeToPlan: (
    planId: string,
    urls?: { successUrl?: string; cancelUrl?: string },
  ) => Promise<{ url: string; sessionId: string }>;
  createBillingPortalSession: (returnUrl?: string) => Promise<{ url: string; hasActiveSubscription: boolean }>;
  verifyPaymentSession: (
    sessionId: string | string[],
  ) => Promise<{
    success: boolean;
    credits: number;
    subscription: string | null;
    subscriptionProvider: SubscriptionProvider | null;
    subscriptionRenewAt: string | null;
  }>;
  grantDevCredits: (amount?: number) => Promise<{ success: boolean; grantedCredits: number; credits: number }>;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [credits, setCredits] = useState(0);
  const [subscription, setSubscription] = useState<string | null>(null);
  const [subscriptionProvider, setSubscriptionProvider] = useState<SubscriptionProvider | null>(null);
  const [subscriptionRenewAt, setSubscriptionRenewAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCredits = useCallback(async () => {
    const data = await apiClient.getCredits();
    setCredits(data.credits ?? 0);
    setSubscription(data.subscription ?? null);
    setSubscriptionProvider(data.subscriptionProvider ?? null);
    setSubscriptionRenewAt(data.subscriptionRenewAt ?? null);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCredits(0);
      setSubscription(null);
      setSubscriptionProvider(null);
      setSubscriptionRenewAt(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    refreshCredits()
      .catch((error) => {
        const status = (error as { status?: number } | null)?.status;
        if (status === 401) {
          setCredits(0);
          setSubscription(null);
          setSubscriptionProvider(null);
          setSubscriptionRenewAt(null);
          return;
        }
        console.error("Failed to load credits:", error);
      })
      .finally(() => setIsLoading(false));
  }, [authLoading, refreshCredits, user]);

  useEffect(() => {
    if (authLoading || !user || Platform.OS !== "ios") {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const RNIap = await import("react-native-iap");
        await RNIap.initConnection();
        if (typeof RNIap.syncIOS === "function") {
          await RNIap.syncIOS();
        }

        let receipt = "";
        if (typeof RNIap.getReceiptIOS === "function") {
          try {
            receipt = String(await RNIap.getReceiptIOS()).trim();
          } catch {
            receipt = "";
          }
        }
        if (!receipt && typeof RNIap.requestReceiptRefreshIOS === "function") {
          try {
            receipt = String(await RNIap.requestReceiptRefreshIOS()).trim();
          } catch {
            receipt = "";
          }
        }
        if (!receipt || cancelled) {
          return;
        }

        await apiClient.syncAppleSubscriptions(receipt);
        if (!cancelled) {
          await refreshCredits();
        }
      } catch {
        // Silent by default: a missing receipt is normal before the first Apple purchase.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, refreshCredits, user]);

  async function useCredit(feature: string = "style_generation"): Promise<boolean> {
    const data = await apiClient.useCredit(feature);
    setCredits(data.credits ?? 0);
    return true;
  }

  async function purchasePackage(
    packageId: string,
    urls?: { successUrl?: string; cancelUrl?: string },
  ): Promise<{ url: string; sessionId: string }> {
    return apiClient.createCheckoutSession({
      itemType: "package",
      itemId: packageId,
      successUrl: urls?.successUrl,
      cancelUrl: urls?.cancelUrl,
    });
  }

  async function subscribeToPlan(
    planId: string,
    urls?: { successUrl?: string; cancelUrl?: string },
  ): Promise<{ url: string; sessionId: string }> {
    return apiClient.createCheckoutSession({
      itemType: "subscription",
      itemId: planId,
      successUrl: urls?.successUrl,
      cancelUrl: urls?.cancelUrl,
    });
  }

  async function createBillingPortalSession(returnUrl?: string) {
    return apiClient.createBillingPortalSession(returnUrl);
  }

  async function verifyPaymentSession(sessionId: string | string[]) {
    const result = await apiClient.verifyPaymentSession(sessionId);
    setCredits(result.credits ?? 0);
    setSubscription(result.subscription ?? null);
    setSubscriptionProvider(result.subscriptionProvider ?? null);
    setSubscriptionRenewAt(result.subscriptionRenewAt ?? null);
    return result;
  }

  async function grantDevCredits(amount?: number) {
    const result = await apiClient.grantDevCredits(amount);
    setCredits(result.credits ?? 0);
    return result;
  }

  const value = useMemo(
    () => ({
      credits,
      subscription,
      subscriptionProvider,
      subscriptionRenewAt,
      isLoading,
      refreshCredits,
      useCredit,
      purchasePackage,
      subscribeToPlan,
      createBillingPortalSession,
      verifyPaymentSession,
      grantDevCredits,
    }),
    [credits, subscription, subscriptionProvider, subscriptionRenewAt, isLoading, refreshCredits],
  );

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (!context) throw new Error("useCredits must be used within CreditsProvider");
  return context;
}
