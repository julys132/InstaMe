import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

type NativePlatform = "ios" | "android";

type PurchaseResult = {
  success: boolean;
  credits?: number;
  cancelled?: boolean;
  error?: string;
};

type SyncResult = {
  success: boolean;
  error?: string;
};

export type IapProduct = {
  productId: string;
  title: string;
  description: string;
  localizedPrice: string;
  currency?: string;
  type: "in-app" | "subs";
  subscriptionPeriodNumberIOS?: string;
  subscriptionPeriodUnitIOS?: string;
};

type EventSubscription = {
  remove: () => void;
};

const DEFAULT_IOS_PRODUCT_MAP: Record<string, string> = {
  pack_5: "com.instame.app.credits.quickstart10",
  pack_15: "com.instame.app.credits.creator30",
  pack_30: "com.instame.app.credits.studio60",
  pack_100: "com.instame.app.credits.bestvalue200",
};

const DEFAULT_ANDROID_PRODUCT_MAP: Record<string, string> = {
  pack_5: "com.instame.app.credits.quickstart10",
  pack_15: "com.instame.app.credits.creator30",
  pack_30: "com.instame.app.credits.studio60",
  pack_100: "com.instame.app.credits.bestvalue200",
};

const DEFAULT_IOS_SUBSCRIPTION_MAP: Record<string, string> = {
  sub_basic: "com.instame.app.sub.lite.monthly",
  sub_premium: "com.instame.app.sub.plus.monthly",
  sub_unlimited: "com.instame.app.sub.studio.monthly",
};

const DEFAULT_ANDROID_SUBSCRIPTION_MAP: Record<string, string> = {};

function parseProductMap(raw: string | undefined): Record<string, string> {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, string>>((acc, [k, v]) => {
      if (typeof k === "string" && typeof v === "string" && k.trim() && v.trim()) {
        acc[k.trim()] = v.trim();
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

const IOS_PRODUCT_MAP = {
  ...DEFAULT_IOS_PRODUCT_MAP,
  ...parseProductMap(process.env.EXPO_PUBLIC_IOS_IAP_PRODUCT_MAP),
  ...parseProductMap(process.env.EXPO_PUBLIC_IAP_PRODUCT_MAP),
};

const ANDROID_PRODUCT_MAP = {
  ...DEFAULT_ANDROID_PRODUCT_MAP,
  ...parseProductMap(process.env.EXPO_PUBLIC_ANDROID_IAP_PRODUCT_MAP),
  ...parseProductMap(process.env.EXPO_PUBLIC_IAP_PRODUCT_MAP),
};

const IOS_SUBSCRIPTION_MAP = {
  ...DEFAULT_IOS_SUBSCRIPTION_MAP,
  ...parseProductMap(process.env.EXPO_PUBLIC_IOS_IAP_SUBSCRIPTION_MAP),
  ...parseProductMap(process.env.EXPO_PUBLIC_IAP_SUBSCRIPTION_MAP),
};

const ANDROID_SUBSCRIPTION_MAP = {
  ...DEFAULT_ANDROID_SUBSCRIPTION_MAP,
  ...parseProductMap(process.env.EXPO_PUBLIC_ANDROID_IAP_SUBSCRIPTION_MAP),
  ...parseProductMap(process.env.EXPO_PUBLIC_IAP_SUBSCRIPTION_MAP),
};

function getProductMapForPlatform(platform: NativePlatform): Record<string, string> {
  return platform === "ios" ? IOS_PRODUCT_MAP : ANDROID_PRODUCT_MAP;
}

function getSubscriptionMapForPlatform(platform: NativePlatform): Record<string, string> {
  return platform === "ios" ? IOS_SUBSCRIPTION_MAP : ANDROID_SUBSCRIPTION_MAP;
}

function normalizeProduct(entry: any, type: "in-app" | "subs"): IapProduct | null {
  const productId = String(entry?.productId || entry?.id || "").trim();
  if (!productId) return null;

  return {
    productId,
    title: String(entry?.title || entry?.localizedTitle || entry?.displayName || "Credits"),
    description: String(entry?.description || entry?.localizedDescription || ""),
    localizedPrice: String(entry?.localizedPrice || entry?.displayPrice || entry?.price || ""),
    currency: typeof entry?.currency === "string" ? entry.currency : undefined,
    type,
    subscriptionPeriodNumberIOS:
      typeof entry?.subscriptionPeriodNumberIOS === "string" ? entry.subscriptionPeriodNumberIOS : undefined,
    subscriptionPeriodUnitIOS:
      typeof entry?.subscriptionPeriodUnitIOS === "string" ? entry.subscriptionPeriodUnitIOS : undefined,
  };
}

export function resolveIapProductId(packageId: string, platform: NativePlatform): string | null {
  return getProductMapForPlatform(platform)[packageId] || null;
}

export function resolveIapSubscriptionProductId(planId: string, platform: NativePlatform): string | null {
  return getSubscriptionMapForPlatform(platform)[planId] || null;
}

function isSubscriptionProductId(productId: string, platform: NativePlatform): boolean {
  return Object.values(getSubscriptionMapForPlatform(platform)).includes(productId);
}

async function getIosReceipt(
  RNIap: any,
  purchase?: any,
  options?: { allowRefresh?: boolean },
): Promise<string> {
  const purchaseReceipt = String(purchase?.transactionReceipt || "").trim();
  if (purchaseReceipt) return purchaseReceipt;

  if (typeof RNIap?.getReceiptIOS === "function") {
    try {
      const receipt = String(await RNIap.getReceiptIOS()).trim();
      if (receipt) return receipt;
    } catch {
      // no-op
    }
  }

  if (options?.allowRefresh && typeof RNIap?.requestReceiptRefreshIOS === "function") {
    try {
      const refreshedReceipt = String(await RNIap.requestReceiptRefreshIOS()).trim();
      if (refreshedReceipt) return refreshedReceipt;
    } catch {
      // no-op
    }
  }

  return "";
}

export async function openNativeSubscriptionManagement(): Promise<boolean> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return false;
  }

  const RNIap = await import("react-native-iap");
  if (Platform.OS === "ios" && typeof RNIap.deepLinkToSubscriptionsIOS === "function") {
    return Boolean(await RNIap.deepLinkToSubscriptionsIOS());
  }

  if (typeof RNIap.deepLinkToSubscriptions === "function") {
    await RNIap.deepLinkToSubscriptions(
      Platform.OS === "android"
        ? { packageNameAndroid: process.env.EXPO_PUBLIC_ANDROID_PACKAGE_NAME || "com.instame.app" }
        : undefined,
    );
    return true;
  }

  return false;
}

export function useIAP() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [products, setProducts] = useState<IapProduct[]>([]);
  const [subscriptions, setSubscriptions] = useState<IapProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  const iapModuleRef = useRef<any>(null);
  const purchaseUpdatedSubscription = useRef<EventSubscription | null>(null);
  const purchaseErrorSubscription = useRef<EventSubscription | null>(null);
  const pendingResolve = useRef<((result: PurchaseResult) => void) | null>(null);

  const platform = (Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web") as
    | NativePlatform
    | "web";

  const clearStaleIosPurchase = useCallback(async (): Promise<boolean> => {
    if (platform !== "ios") {
      return false;
    }

    const RNIap = iapModuleRef.current;
    if (!RNIap || typeof RNIap.clearTransactionIOS !== "function") {
      return false;
    }

    try {
      await RNIap.clearTransactionIOS();
      pendingResolve.current = null;
      setIsPurchasing(false);
      return true;
    } catch {
      return false;
    }
  }, [platform]);

  const resolvePending = useCallback((result: PurchaseResult) => {
    const resolver = pendingResolve.current;
    pendingResolve.current = null;
    setIsPurchasing(false);
    resolver?.(result);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (platform === "web") {
        setIsLoading(false);
        setIsAvailable(false);
        return;
      }

      try {
        const RNIap = await import("react-native-iap");
        if (cancelled) return;
        iapModuleRef.current = RNIap;

        await RNIap.initConnection();

        if (platform === "ios" && typeof RNIap.clearTransactionIOS === "function") {
          try {
            await RNIap.clearTransactionIOS();
          } catch {
            // Best-effort cleanup for stale StoreKit transactions.
          }
        }

        const productIds = Array.from(new Set(Object.values(getProductMapForPlatform(platform)).filter(Boolean)));
        const subscriptionIds = Array.from(
          new Set(Object.values(getSubscriptionMapForPlatform(platform)).filter(Boolean)),
        );

        const [fetchedProducts, fetchedSubscriptions] = await Promise.all([
          productIds.length > 0 ? RNIap.fetchProducts({ skus: productIds, type: "in-app" }) : Promise.resolve([]),
          subscriptionIds.length > 0 ? RNIap.fetchProducts({ skus: subscriptionIds, type: "subs" }) : Promise.resolve([]),
        ]);

        const normalizedProducts = (Array.isArray(fetchedProducts) ? fetchedProducts : [])
          .map((entry: any) => normalizeProduct(entry, "in-app"))
          .filter((entry: IapProduct | null): entry is IapProduct => Boolean(entry));

        const normalizedSubscriptions = (Array.isArray(fetchedSubscriptions) ? fetchedSubscriptions : [])
          .map((entry: any) => normalizeProduct(entry, "subs"))
          .filter((entry: IapProduct | null): entry is IapProduct => Boolean(entry));

        purchaseUpdatedSubscription.current = RNIap.purchaseUpdatedListener(async (purchase: any) => {
          const productId = String(purchase?.productId || purchase?.productIdentifier || "").trim();
          const isSubscription = productId ? isSubscriptionProductId(productId, platform) : false;
          let receipt = "";

          if (platform === "ios") {
            receipt = await getIosReceipt(RNIap, purchase, { allowRefresh: false });
          } else {
            receipt = String(purchase?.purchaseToken || "").trim();
          }

          if (!productId) {
            resolvePending({ success: false, error: "Missing App Store product ID." });
            return;
          }

          if (!receipt) {
            resolvePending({
              success: false,
              error: "App Store receipt is unavailable right now. Try Restore Purchases once, then retry.",
            });
            return;
          }

          try {
            const verificationResult =
              platform === "ios"
                ? await apiClient.verifyApplePurchase(receipt, productId)
                : await apiClient.verifyGooglePurchase(receipt, productId);

            if (!verificationResult?.success) {
              resolvePending({
                success: false,
                error: verificationResult?.error || "Purchase verification failed.",
              });
              return;
            }

            try {
              await RNIap.finishTransaction({ purchase, isConsumable: !isSubscription });
            } catch {
              // Credits and subscription state are already granted server-side.
            }

            resolvePending({
              success: true,
              credits: typeof verificationResult.credits === "number" ? verificationResult.credits : undefined,
            });
          } catch (verificationError: any) {
            resolvePending({
              success: false,
              error: verificationError?.message || "Could not verify purchase.",
            });
          }
        });

        purchaseErrorSubscription.current = RNIap.purchaseErrorListener((purchaseError: any) => {
          const code = String(purchaseError?.code || "");
          resolvePending({
            success: false,
            cancelled: code === "E_USER_CANCELLED",
            error: purchaseError?.message || "Purchase failed.",
          });
        });

        setProducts(normalizedProducts);
        setSubscriptions(normalizedSubscriptions);
        setIsAvailable(normalizedProducts.length > 0 || normalizedSubscriptions.length > 0);
        setError(
          normalizedProducts.length > 0 || normalizedSubscriptions.length > 0
            ? null
            : "No in-app products are available. Store products may not be configured yet.",
        );
      } catch (initError: any) {
        if (cancelled) return;
        setIsAvailable(false);
        setError(initError?.message || "Could not initialize in-app purchases.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initialize();

    return () => {
      cancelled = true;
      purchaseUpdatedSubscription.current?.remove?.();
      purchaseErrorSubscription.current?.remove?.();
      try {
        iapModuleRef.current?.endConnection?.();
      } catch {
        // no-op
      }
    };
  }, [platform, resolvePending]);

  const startPurchase = useCallback(
    async (productId: string, type: "in-app" | "subs"): Promise<PurchaseResult> => {
      if (platform === "web") {
        return { success: false, error: "In-app purchases are only available on mobile apps." };
      }

      if (!isAvailable || !iapModuleRef.current) {
        return { success: false, error: error || "In-app purchases are unavailable right now." };
      }

      if (!productId) {
        return { success: false, error: "Missing product ID." };
      }

      if (isPurchasing) {
        const cleared = await clearStaleIosPurchase();
        if (cleared) {
          // Let React commit the cleared state before starting the next request.
          await Promise.resolve();
        }
      }

      if (isPurchasing) {
        return { success: false, error: "A purchase is already in progress." };
      }

      setIsPurchasing(true);

      return new Promise<PurchaseResult>((resolve) => {
        pendingResolve.current = resolve;

        iapModuleRef.current
          .requestPurchase({
            type,
            request: {
              apple: {
                sku: productId,
                andDangerouslyFinishTransactionAutomatically: false,
                appAccountToken: platform === "ios" ? user?.id || undefined : undefined,
              },
              google:
                type === "subs"
                  ? { skus: [productId] }
                  : { skus: [productId] },
            },
          })
          .catch((requestError: any) => {
            const code = String(requestError?.code || "");
            resolvePending({
              success: false,
              cancelled: code === "E_USER_CANCELLED",
              error: requestError?.message || "Failed to start purchase.",
            });
          });
      });
    },
    [clearStaleIosPurchase, platform, isAvailable, error, isPurchasing, resolvePending, user?.id],
  );

  const purchaseProduct = useCallback(
    async (productId: string): Promise<PurchaseResult> => startPurchase(productId, "in-app"),
    [startPurchase],
  );

  const purchaseSubscription = useCallback(
    async (productId: string): Promise<PurchaseResult> => startPurchase(productId, "subs"),
    [startPurchase],
  );

  const syncAppleSubscriptions = useCallback(async (options?: { allowRefresh?: boolean }): Promise<SyncResult> => {
    if (platform !== "ios") {
      return { success: false, error: "Apple subscription sync is only available on iOS." };
    }

    const RNIap = iapModuleRef.current;
    if (!RNIap || !isAvailable) {
      return { success: false, error: error || "In-app purchases are unavailable right now." };
    }

    try {
      if (typeof RNIap.syncIOS === "function") {
        await RNIap.syncIOS();
      }

      const receipt = await getIosReceipt(RNIap, undefined, {
        allowRefresh: options?.allowRefresh === true,
      });
      if (!receipt) {
        return { success: false, error: "No App Store receipt is available yet." };
      }

      await apiClient.syncAppleSubscriptions(receipt);
      return { success: true };
    } catch (syncError: any) {
      return { success: false, error: syncError?.message || "Could not sync Apple subscriptions." };
    }
  }, [platform, isAvailable, error]);

  const restorePurchases = useCallback(async () => {
    if (platform === "web") return;
    const RNIap = iapModuleRef.current;
    if (!RNIap || !isAvailable) {
      Alert.alert("Unavailable", "In-app purchases are not available right now.");
      return;
    }

    try {
      const purchases = await RNIap.getAvailablePurchases();
      const purchaseList = Array.isArray(purchases) ? purchases : [];

      if (purchaseList.length === 0 && platform !== "ios") {
        Alert.alert("No Purchases Found", "There are no previous purchases to restore.");
        return;
      }

      let restoredCount = 0;
      let failedCount = 0;

      let cachedIosReceipt = "";

      for (const purchase of purchaseList) {
        const productId = String(purchase?.productId || purchase?.productIdentifier || "").trim();
        if (!productId) {
          failedCount += 1;
          continue;
        }

        const isSubscription = isSubscriptionProductId(productId, platform);
        let receipt = "";

        if (platform === "ios") {
          receipt = String(purchase?.transactionReceipt || "").trim();
          if (!receipt) {
            if (!cachedIosReceipt) {
              cachedIosReceipt = await getIosReceipt(RNIap, purchase, { allowRefresh: false });
            }
            receipt = cachedIosReceipt;
          }
        } else {
          receipt = String(purchase?.purchaseToken || "").trim();
        }

        if (!receipt) {
          failedCount += 1;
          continue;
        }

        try {
          const verification =
            platform === "ios"
              ? await apiClient.verifyApplePurchase(receipt, productId)
              : await apiClient.verifyGooglePurchase(receipt, productId);

          if (!verification?.success) {
            failedCount += 1;
            continue;
          }

          restoredCount += 1;
          try {
            await RNIap.finishTransaction({ purchase, isConsumable: !isSubscription });
          } catch {
            // no-op
          }
        } catch {
          failedCount += 1;
        }
      }

      if (platform === "ios") {
        const syncResult = await syncAppleSubscriptions({ allowRefresh: true });
        if (syncResult.success) {
          restoredCount += 1;
        } else if (purchaseList.length === 0) {
          failedCount += 1;
        }
      }

      if (restoredCount > 0) {
        Alert.alert(
          "Restore Complete",
          `Restored ${restoredCount} purchase(s)${failedCount > 0 ? `, ${failedCount} failed` : ""}.`,
        );
      } else {
        Alert.alert("Nothing Restored", "No new purchases needed restoring.");
      }
    } catch (restoreError: any) {
      Alert.alert("Restore Failed", restoreError?.message || "Could not restore purchases.");
    }
  }, [platform, isAvailable, syncAppleSubscriptions]);

  const openSubscriptionManagement = useCallback(async (): Promise<SyncResult> => {
    if (platform === "web") {
      return { success: false, error: "Subscription management is only available on mobile here." };
    }

    try {
      const opened = await openNativeSubscriptionManagement();
      return opened
        ? { success: true }
        : { success: false, error: "Could not open subscription management." };
    } catch (manageError: any) {
      return { success: false, error: manageError?.message || "Could not open subscription management." };
    }
  }, [platform]);

  const [isRetryingProducts, setIsRetryingProducts] = useState(false);

  const retryFetchProducts = useCallback(async (): Promise<boolean> => {
    if (platform === "web") return false;
    const RNIap = iapModuleRef.current;
    if (!RNIap) return false;

    setIsRetryingProducts(true);
    try {
      const productIds = Array.from(
        new Set(Object.values(getProductMapForPlatform(platform as NativePlatform)).filter(Boolean)),
      );
      if (productIds.length === 0) return false;

      const fetched = await RNIap.fetchProducts({ skus: productIds, type: "in-app" });
      const normalized = (Array.isArray(fetched) ? fetched : [])
        .map((entry: any) => normalizeProduct(entry, "in-app"))
        .filter((entry: IapProduct | null): entry is IapProduct => Boolean(entry));

      if (normalized.length > 0) {
        setProducts(normalized);
        setIsAvailable(true);
        setError(null);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsRetryingProducts(false);
    }
  }, [platform]);

  return {
    platform,
    isLoading,
    isAvailable,
    isPurchasing,
    isRetryingProducts,
    products,
    subscriptions,
    error,
    purchaseProduct,
    purchaseSubscription,
    restorePurchases,
    syncAppleSubscriptions,
    openSubscriptionManagement,
    retryFetchProducts,
  };
}
