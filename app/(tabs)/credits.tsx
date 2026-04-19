import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import ChicooBackground from "@/components/ChicooBackground";
import { resolveIapProductId, resolveIapSubscriptionProductId, useIAP } from "@/hooks/useIAP";
import {
  useCredits,
  CREDIT_PACKAGES,
  SUBSCRIPTION_PLANS,
  CreditPackage,
  SubscriptionPlan,
} from "@/contexts/CreditsContext";

WebBrowser.maybeCompleteAuthSession();

function PackageCard({
  pkg,
  priceLabel,
  priceSubLabel,
  onPurchase,
  loading,
}: {
  pkg: CreditPackage;
  priceLabel: string;
  priceSubLabel?: string | null;
  onPurchase: () => void;
  loading: boolean;
}) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPurchase(); }}
      disabled={loading}
      style={({ pressed }) => [
        styles.packageCard,
        pkg.popular && styles.packageCardPopular,
        pressed && { opacity: 0.85 },
      ]}
    >
      {pkg.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Most Popular</Text>
        </View>
      )}
      <Text style={styles.packageName}>{pkg.name}</Text>
      <Text style={styles.packageCredits}>{pkg.credits}</Text>
      <Text style={styles.packageCreditsLabel}>credits</Text>
      <View style={styles.packagePriceRow}>
        <Text style={styles.packagePrice}>{priceLabel}</Text>
        {priceSubLabel ? <Text style={styles.packagePerCredit}>{priceSubLabel}</Text> : null}
      </View>
    </Pressable>
  );
}

function SubPlanCard({
  plan,
  active,
  priceLabel,
  activeHint,
  manageLabel,
  cancelLabel,
  onSubscribe,
  onTopUp,
  onCancel,
  loading,
}: {
  plan: SubscriptionPlan;
  active: boolean;
  priceLabel: string;
  activeHint?: string | null;
  manageLabel: string;
  cancelLabel: string;
  onSubscribe: () => void;
  onTopUp: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[styles.subCard, plan.popular && styles.subCardPopular, active && styles.subCardActive]}
    >
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Best Value</Text>
        </View>
      )}
      <Text style={styles.subName}>{plan.name}</Text>
      <View style={styles.subPriceRow}>
        <Text style={styles.subPrice}>{priceLabel}</Text>
        <Text style={styles.subPricePeriod}>/month</Text>
      </View>
      <Text style={styles.subCredits}>{plan.creditsPerMonth} credits/month</Text>

      <View style={styles.featuresList}>
        {plan.features.map((feature, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.accent} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onSubscribe(); }}
        disabled={loading || active}
        style={({ pressed }) => [
          styles.subButton,
          active && styles.subButtonActive,
          pressed && { opacity: 0.85 },
          loading && { opacity: 0.6 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.black} />
        ) : (
          <Text style={[styles.subButtonText, active && styles.subButtonTextActive]}>
            {active ? "Current Plan" : "Subscribe"}
          </Text>
        )}
      </Pressable>

      {active ? (
        <>
          <Text style={styles.subManageHint}>{activeHint || "Manage or cancel anytime from your subscription settings."}</Text>

          <View style={styles.subActionsRow}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); onTopUp(); }}
              style={({ pressed }) => [
                styles.subTopUpButton,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="add-circle-outline" size={16} color={Colors.accent} />
              <Text style={styles.subTopUpButtonText}>Buy Extra Credits</Text>
            </Pressable>

            <Pressable
              onPress={() => { Haptics.selectionAsync(); onCancel(); }}
              style={({ pressed }) => [
                styles.subCancelButton,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="close-circle-outline" size={16} color={Colors.white} />
              <Text style={styles.subCancelButtonText}>{cancelLabel}</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); onCancel(); }}
            style={({ pressed }) => [
              styles.subManageButton,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="settings-outline" size={16} color={Colors.white} />
            <Text style={styles.subManageButtonText}>{manageLabel}</Text>
          </Pressable>
        </>
      ) : null}
    </Animated.View>
  );
}

export default function CreditsScreen() {
  const insets = useSafeAreaInsets();
  const {
    credits,
    subscription,
    subscriptionProvider,
    subscriptionRenewAt,
    purchasePackage,
    subscribeToPlan,
    createBillingPortalSession,
    verifyPaymentSession,
    grantDevCredits,
    refreshCredits,
  } = useCredits();
  const iap = useIAP();
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState<string | null>(null);
  const [devGrantLoading, setDevGrantLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [subscriptionSyncing, setSubscriptionSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<"credits" | "subscription">("credits");
  const didInitialAppleSync = useRef(false);
  const showDevCreditTools = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEV_CREDITS === "true";
  const hasActiveSubscription = Boolean(subscription);
  const nativePlatform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : null;
  const subscriptionsAvailable = Platform.OS === "web" || nativePlatform === "ios";
  const iapPriceLookup = useMemo(
    () => new Map(iap.products.map((product) => [product.productId, product])),
    [iap.products],
  );
  const iapSubscriptionLookup = useMemo(
    () => new Map(iap.subscriptions.map((product) => [product.productId, product])),
    [iap.subscriptions],
  );
  const isAppleManagedSubscription = nativePlatform === "ios" && subscriptionProvider === "apple";
  const manageSubscriptionLabel = isAppleManagedSubscription ? "Manage on Apple" : "Manage Billing";
  const cancelSubscriptionLabel = isAppleManagedSubscription ? "Cancel on Apple" : "Cancel Subscription";
  const subscriptionManageHint = subscriptionRenewAt
    ? `Renews on ${new Date(subscriptionRenewAt).toLocaleDateString()}. ${isAppleManagedSubscription ? "Manage or cancel anytime on Apple." : "Manage or cancel anytime from billing."}`
    : isAppleManagedSubscription
      ? "Manage or cancel anytime on Apple."
      : "Manage or cancel anytime from billing.";

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  function getCheckoutUrls() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const origin = window.location.origin;
      return {
        successUrl: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/credits`,
        redirectUrl: `${origin}/payment-success`,
      };
    }

    const redirectUrl = Linking.createURL("payment-success");
    const separator = redirectUrl.includes("?") ? "&" : "?";
    return {
      successUrl: `${redirectUrl}${separator}session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${redirectUrl}${separator}cancelled=1`,
      redirectUrl,
    };
  }

  function getBillingPortalReturnUrl() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return `${window.location.origin}/credits`;
    }
    return undefined;
  }

  useEffect(() => {
    if (nativePlatform !== "ios" || iap.isLoading || didInitialAppleSync.current) {
      return;
    }

    didInitialAppleSync.current = true;
    setSubscriptionSyncing(true);
    void iap.syncAppleSubscriptions()
      .then(async (result) => {
        if (result.success) {
          await refreshCredits();
        }
      })
      .finally(() => setSubscriptionSyncing(false));
  }, [nativePlatform, iap, refreshCredits]);

  async function runCheckout(
    url: string,
    redirectUrl: string,
  ): Promise<{ sessionId: string | null; cancelled: boolean }> {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.location.assign(url);
      }
      return { sessionId: null, cancelled: false };
    }

    const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
    if (result.type !== "success" || !result.url) {
      return {
        sessionId: null,
        cancelled: result.type === "cancel" || result.type === "dismiss",
      };
    }

    const parsed = Linking.parse(result.url);
    const rawSessionId = parsed.queryParams?.session_id;
    const rawCancelled = parsed.queryParams?.cancelled;
    const sessionId =
      typeof rawSessionId === "string"
        ? rawSessionId
        : Array.isArray(rawSessionId) && typeof rawSessionId[0] === "string"
          ? rawSessionId[0]
          : null;
    const cancelledValue =
      typeof rawCancelled === "string"
        ? rawCancelled
        : Array.isArray(rawCancelled) && typeof rawCancelled[0] === "string"
          ? rawCancelled[0]
          : "";
    const cancelled = cancelledValue === "1" || cancelledValue.toLowerCase() === "true";
    return { sessionId, cancelled };
  }

  async function handlePurchase(pkg: CreditPackage) {
    setPurchaseLoading(pkg.id);
    try {
      if (nativePlatform) {
        const iapProductId = resolveIapProductId(pkg.id, nativePlatform);
        if (iap.isAvailable && iapProductId) {
          const iapResult = await iap.purchaseProduct(iapProductId);
          if (iapResult.cancelled) {
            Alert.alert("Purchase canceled", "No payment was processed.");
            return;
          }
          if (!iapResult.success) {
            throw new Error(iapResult.error || "In-app purchase failed.");
          }

          await refreshCredits();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Success", `${pkg.credits} credits added to your account!`);
          return;
        }

        throw new Error(
          nativePlatform === "ios"
            ? "Apple in-app purchases are not available on this build yet."
            : "Google Play billing is not available on this build yet.",
        );
      }

      const checkoutUrls = getCheckoutUrls();
      const checkout = await purchasePackage(pkg.id, {
        successUrl: checkoutUrls.successUrl,
        cancelUrl: checkoutUrls.cancelUrl,
      });
      if (!checkout.url) throw new Error("Checkout URL unavailable");
      const { sessionId, cancelled } = await runCheckout(checkout.url, checkoutUrls.redirectUrl);
      if (cancelled) {
        Alert.alert("Checkout canceled", "No payment was processed.");
        return;
      }
      if (!sessionId) return;

      const result = await verifyPaymentSession(sessionId);
      if (!result.success) {
        Alert.alert("Payment Pending", "Payment was not completed.");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `${pkg.credits} credits added to your account!`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Purchase failed. Please try again.");
    } finally {
      setPurchaseLoading(null);
    }
  }

  async function handleSubscribe(plan: SubscriptionPlan) {
    setSubLoading(plan.id);
    try {
      if (nativePlatform === "ios") {
        const iapProductId = resolveIapSubscriptionProductId(plan.id, "ios");
        if (!iapProductId) {
          throw new Error("This Apple subscription product is not configured yet.");
        }
        if (!iap.isAvailable && iap.subscriptions.length === 0) {
          throw new Error(iap.error || "Apple subscriptions are not available on this build yet.");
        }

        const result = await iap.purchaseSubscription(iapProductId);
        if (result.cancelled) {
          Alert.alert("Purchase canceled", "No subscription payment was processed.");
          return;
        }
        if (!result.success) {
          throw new Error(result.error || "Subscription failed.");
        }

        const syncResult = await iap.syncAppleSubscriptions();
        if (!syncResult.success && syncResult.error) {
          throw new Error(syncResult.error);
        }

        await refreshCredits();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", `Subscribed to ${plan.name} on Apple.`);
        return;
      }

      if (!subscriptionsAvailable) {
        throw new Error("Native subscriptions are enabled on iOS right now. On other platforms, use web checkout.");
      }

      const checkoutUrls = getCheckoutUrls();
      const checkout = await subscribeToPlan(plan.id, {
        successUrl: checkoutUrls.successUrl,
        cancelUrl: checkoutUrls.cancelUrl,
      });
      if (!checkout.url) throw new Error("Checkout URL unavailable");
      const { sessionId, cancelled } = await runCheckout(checkout.url, checkoutUrls.redirectUrl);
      if (cancelled) {
        Alert.alert("Checkout canceled", "No subscription payment was processed.");
        return;
      }
      if (!sessionId) return;

      const result = await verifyPaymentSession(sessionId);
      if (!result.success) {
        Alert.alert("Payment Pending", "Subscription payment was not completed.");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `Subscribed to ${plan.name} plan!`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Subscription failed. Please try again.");
    } finally {
      setSubLoading(null);
    }
  }

  async function handleGrantDevCredits() {
    setDevGrantLoading(true);
    try {
      const result = await grantDevCredits(50);
      Alert.alert(
        "Test Credits Added",
        `${result.grantedCredits} credits were added. Current balance: ${result.credits}.`,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not add test credits.");
    } finally {
      setDevGrantLoading(false);
    }
  }

  async function handleRestorePurchases() {
    setRestoreLoading(true);
    try {
      await iap.restorePurchases();
      await refreshCredits();
    } finally {
      setRestoreLoading(false);
    }
  }

  async function handleManageBilling() {
    setBillingPortalLoading(true);
    try {
      if (isAppleManagedSubscription || nativePlatform === "ios") {
        const result = await iap.openSubscriptionManagement();
        if (!result.success) {
          throw new Error(result.error || "Could not open Apple subscription settings.");
        }
        return;
      }

      const portal = await createBillingPortalSession(getBillingPortalReturnUrl());
      if (!portal.url) {
        throw new Error("Billing portal URL unavailable");
      }

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.location.assign(portal.url);
        }
        return;
      }

      await WebBrowser.openBrowserAsync(portal.url);
      await refreshCredits();
    } catch (error: any) {
      Alert.alert("Billing Portal", error?.message || "Could not open subscription management.");
    } finally {
      setBillingPortalLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <ChicooBackground />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Animated.View entering={FadeIn.duration(600)} style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
          <View>
            <Text style={styles.headerLabel}>Chicoo Credits</Text>
            <Text style={styles.headerTitle}>Get Credits</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.balanceCard}>
          <Ionicons name="sparkles" size={28} color={Colors.accent} />
          <View>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceValue}>{credits} Credits</Text>
          </View>
        </Animated.View>

        {hasActiveSubscription ? (
          <Animated.View entering={FadeInDown.delay(140).duration(500)} style={styles.topUpInfoCard}>
            <View style={styles.topUpInfoHeader}>
              <Ionicons name="sparkles-outline" size={16} color={Colors.accent} />
              <Text style={styles.topUpInfoTitle}>Your plan stays active</Text>
            </View>
            <Text style={styles.topUpInfoText}>
              Need more credits before your next renewal? Buy a top-up anytime and it stacks on top of your subscription balance.
            </Text>
            <Text style={styles.topUpInfoHint}>{subscriptionManageHint}</Text>
            <Pressable
              onPress={() => setActiveTab("credits")}
              style={({ pressed }) => [styles.topUpInfoButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.topUpInfoButtonText}>Open Credit Packs</Text>
            </Pressable>
            <Pressable
              onPress={handleManageBilling}
              style={({ pressed }) => [styles.topUpInfoSecondaryButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.topUpInfoSecondaryButtonText}>{manageSubscriptionLabel}</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {showDevCreditTools && (
          <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.devToolsCard}>
            <View style={styles.devToolsHeader}>
              <Ionicons name="flask-outline" size={16} color={Colors.accent} />
              <Text style={styles.devToolsTitle}>Developer Testing</Text>
            </View>
            <Text style={styles.devToolsText}>
              Add test credits instantly to verify styling requests and credit deductions.
            </Text>
            <Pressable
              onPress={handleGrantDevCredits}
              disabled={devGrantLoading}
              style={({ pressed }) => [
                styles.devGrantButton,
                pressed && { opacity: 0.85 },
                devGrantLoading && { opacity: 0.7 },
              ]}
            >
              {devGrantLoading ? (
                <ActivityIndicator color={Colors.black} />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.black} />
                  <Text style={styles.devGrantButtonText}>Add 50 Test Credits</Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setActiveTab("credits")}
            style={[styles.tab, activeTab === "credits" && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === "credits" && styles.tabTextActive]}>Credit Packs</Text>
          </Pressable>
          {subscriptionsAvailable ? (
            <Pressable
              onPress={() => setActiveTab("subscription")}
              style={[styles.tab, activeTab === "subscription" && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === "subscription" && styles.tabTextActive]}>Subscriptions</Text>
            </Pressable>
          ) : null}
        </View>

        {activeTab === "credits" || !subscriptionsAvailable ? (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.packagesGrid}>
            {CREDIT_PACKAGES.map((pkg) => (
              (() => {
                const productId = nativePlatform ? resolveIapProductId(pkg.id, nativePlatform) : null;
                const product = productId ? iapPriceLookup.get(productId) : null;
                const priceLabel = product?.localizedPrice || `$${pkg.price.toFixed(2)}`;
                const priceSubLabel =
                  product?.localizedPrice && nativePlatform
                    ? "Store price"
                    : `$${(pkg.price / pkg.credits).toFixed(2)}/credit`;

                return (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                priceLabel={priceLabel}
                priceSubLabel={priceSubLabel}
                onPurchase={() => handlePurchase(pkg)}
                loading={purchaseLoading === pkg.id || iap.isPurchasing}
              />
                );
              })()
            ))}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.subsSection}>
            {subscriptionSyncing ? (
              <Text style={styles.subscriptionSyncText}>Syncing Apple subscription status...</Text>
            ) : null}
            {SUBSCRIPTION_PLANS.map((plan) => (
              (() => {
                const productId = nativePlatform === "ios" ? resolveIapSubscriptionProductId(plan.id, "ios") : null;
                const storeProduct = productId ? iapSubscriptionLookup.get(productId) : null;
                const priceLabel = storeProduct?.localizedPrice || `$${plan.price.toFixed(2)}`;

                return (
              <SubPlanCard
                key={plan.id}
                plan={plan}
                active={subscription === plan.id}
                priceLabel={priceLabel}
                activeHint={subscriptionManageHint}
                manageLabel={manageSubscriptionLabel}
                cancelLabel={cancelSubscriptionLabel}
                onSubscribe={() => handleSubscribe(plan)}
                onTopUp={() => setActiveTab("credits")}
                onCancel={handleManageBilling}
                loading={subLoading === plan.id}
              />
                );
              })()
            ))}
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.paymentInfo}>
          <Text style={styles.paymentInfoTitle}>Payment Methods</Text>
          <View style={styles.paymentRow}>
            {nativePlatform === "ios" ? (
              <>
                <View style={styles.paymentMethod}>
                  <Ionicons name="logo-apple" size={20} color={Colors.white} />
                  <Text style={styles.paymentMethodText}>
                    {iap.isAvailable ? "Apple In-App Purchase" : "Apple IAP (not configured)"}
                  </Text>
                </View>
              </>
            ) : nativePlatform === "android" ? (
              <>
                <View style={styles.paymentMethod}>
                  <Ionicons name="logo-google" size={20} color={Colors.white} />
                  <Text style={styles.paymentMethodText}>
                    {iap.isAvailable ? "Google Play Billing" : "Google Play IAP (not configured)"}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.paymentMethod}>
                  <Ionicons name="card-outline" size={20} color={Colors.white} />
                  <Text style={styles.paymentMethodText}>Stripe</Text>
                </View>
              </>
            )}
          </View>
          <Text style={styles.paymentNote}>
            {nativePlatform === "ios"
              ? "Credit packs and subscriptions use Apple In-App Purchase on iPhone. Users can manage or cancel their subscription anytime from Apple subscription settings."
              : nativePlatform
                ? "Credit packs use Apple or Google in-app purchase on mobile. Native subscriptions are currently enabled on iPhone, and top-up packs can still be bought separately."
              : "Secure Stripe checkout for web credit packs and subscriptions. One-time top-ups can be bought even with an active plan."}
          </Text>
          {subscription ? (
            <>
              <Text style={styles.manageBillingHint}>{subscriptionManageHint}</Text>
              <View style={styles.manageBillingActions}>
                <Pressable
                  onPress={handleManageBilling}
                  disabled={billingPortalLoading}
                  style={({ pressed }) => [
                    styles.manageBillingButton,
                    styles.manageBillingButtonPrimary,
                    pressed && { opacity: 0.85 },
                    billingPortalLoading && { opacity: 0.7 },
                  ]}
                >
                  {billingPortalLoading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="settings-outline" size={16} color={Colors.white} />
                      <Text style={styles.manageBillingButtonText}>{manageSubscriptionLabel}</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleManageBilling}
                  disabled={billingPortalLoading}
                  style={({ pressed }) => [
                    styles.manageBillingButton,
                    styles.manageBillingButtonSecondary,
                    pressed && { opacity: 0.85 },
                    billingPortalLoading && { opacity: 0.7 },
                  ]}
                >
                  {billingPortalLoading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="close-circle-outline" size={16} color={Colors.white} />
                      <Text style={styles.manageBillingButtonText}>{cancelSubscriptionLabel}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          ) : null}
          {nativePlatform && !iap.isLoading && !iap.isAvailable && iap.error ? (
            <Text style={styles.paymentWarning}>{iap.error}</Text>
          ) : null}
          {nativePlatform && iap.isAvailable && (
            <Pressable
              onPress={handleRestorePurchases}
              disabled={restoreLoading}
              style={({ pressed }) => [
                styles.restoreButton,
                pressed && { opacity: 0.85 },
                restoreLoading && { opacity: 0.7 },
              ]}
            >
              {restoreLoading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color={Colors.white} />
                  <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                </>
              )}
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
  },
  backBtn: { paddingBottom: 4 },
  headerLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: Colors.white,
  },
  balanceCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  balanceLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  balanceValue: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: Colors.accent,
  },
  topUpInfoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 10,
  },
  topUpInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topUpInfoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.white,
  },
  topUpInfoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  topUpInfoHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.white,
  },
  topUpInfoButton: {
    alignSelf: "flex-start",
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  topUpInfoButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.black,
  },
  topUpInfoSecondaryButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  topUpInfoSecondaryButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.white,
  },
  devToolsCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 10,
    marginBottom: 20,
  },
  devToolsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  devToolsTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  devToolsText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  devGrantButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  devGrantButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.black,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: Colors.accent,
  },
  tabText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.black,
  },
  packagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
  },
  packageCard: {
    width: "47%",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    gap: 4,
  },
  packageCardPopular: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 79, 125, 0.08)",
  },
  popularBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  popularText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.black,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  packageName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.white,
  },
  packageCredits: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: Colors.accent,
  },
  packageCreditsLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: -4,
  },
  packagePriceRow: { alignItems: "center", gap: 2, marginTop: 8 },
  packagePrice: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.white,
  },
  packagePerCredit: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  subsSection: {
    paddingHorizontal: 20,
    gap: 16,
  },
  subscriptionSyncText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  subCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 8,
  },
  subCardPopular: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 79, 125, 0.06)",
  },
  subCardActive: {
    borderColor: Colors.success,
    backgroundColor: "rgba(76, 175, 80, 0.06)",
  },
  subName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: Colors.white,
  },
  subPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  subPrice: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 28,
    color: Colors.accent,
  },
  subPricePeriod: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  subCredits: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  featuresList: { gap: 8, marginTop: 8 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  subButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  subButtonActive: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderWidth: 1,
    borderColor: Colors.success,
  },
  subButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.black,
  },
  subButtonTextActive: {
    color: Colors.success,
  },
  subManageHint: {
    marginTop: 10,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  subActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  subTopUpButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.surfaceLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subTopUpButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.white,
  },
  subCancelButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subCancelButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.white,
  },
  subManageButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.surfaceLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subManageButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.white,
  },
  paymentInfo: {
    marginHorizontal: 20,
    marginTop: 28,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 12,
  },
  paymentInfoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.white,
  },
  paymentRow: {
    flexDirection: "row",
    gap: 12,
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  paymentMethodText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.white,
  },
  paymentNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 10,
  },
  manageBillingHint: {
    marginTop: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.white,
  },
  manageBillingActions: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  paymentWarning: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#FFD7A0",
    lineHeight: 18,
    marginTop: 10,
  },
  restoreButton: {
    marginTop: 2,
    alignSelf: "flex-start",
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.surfaceLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  restoreButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.white,
  },
  manageBillingButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.surfaceLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  manageBillingButtonPrimary: {
    backgroundColor: Colors.surfaceLight,
  },
  manageBillingButtonSecondary: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  manageBillingButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.white,
  },
});
