import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Colors from "@/constants/colors";
import ChicooBackground from "@/components/ChicooBackground";
import { useAuth } from "@/contexts/AuthContext";
import * as Haptics from "expo-haptics";
import { CHICOO_SUPPORT_EMAIL, PUBLIC_PAGE_PATHS } from "@/lib/public-site";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, socialLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleNativeModule, setGoogleNativeModule] =
    useState<typeof import("@react-native-google-signin/google-signin") | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync()
      .then((available) => setAppleAuthAvailable(available))
      .catch(() => setAppleAuthAvailable(false));
  }, []);

  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
  const nativeGoogleWebClientId = googleWebClientId;
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || googleWebClientId;
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || googleWebClientId;
  const googleWebConfigured = googleWebClientId.length > 0;
  const googleAuthSessionConfigured =
    Platform.OS === "web"
      ? googleWebConfigured
      : Boolean(googleWebClientId || googleIosClientId || googleAndroidClientId);
  const googleNativeConfigured = nativeGoogleWebClientId.length > 0;
  const googleIsConfigured =
    Platform.OS === "android" ? googleNativeConfigured : googleAuthSessionConfigured;
  const fallbackGoogleClientId = "placeholder-web-client-id.apps.googleusercontent.com";

  const googleAuthConfig: any = {
    clientId: googleWebClientId || fallbackGoogleClientId,
    webClientId: googleWebClientId || fallbackGoogleClientId,
    ...(googleIosClientId ? { iosClientId: googleIosClientId } : {}),
    ...(googleAndroidClientId ? { androidClientId: googleAndroidClientId } : {}),
    redirectUri:
      Platform.OS === "web" && typeof window !== "undefined"
        ? `${window.location.origin}/`
        : makeRedirectUri({ scheme: "instame" }),
    selectAccount: true,
  };
  const [googleRequest, , promptGoogleAuth] = Google.useIdTokenAuthRequest(googleAuthConfig);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    if (Platform.OS === "web" && !googleWebConfigured) {
      console.warn("Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID; Google login is disabled on web.");
    }
  }, [googleWebConfigured]);

  useEffect(() => {
    if (Platform.OS !== "android" || !googleNativeConfigured) return;
    let cancelled = false;

    (async () => {
      try {
        const googleSigninModule = await import("@react-native-google-signin/google-signin");
        if (cancelled) return;

        googleSigninModule.GoogleSignin.configure({
          webClientId: nativeGoogleWebClientId,
          offlineAccess: false,
          forceCodeForRefreshToken: false,
        });

        setGoogleNativeModule(googleSigninModule);
      } catch (error) {
        console.warn("Native Google Sign-In module unavailable on this build", error);
        setGoogleNativeModule(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [googleNativeConfigured, nativeGoogleWebClientId]);

  async function handleLogin() {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/instame");
    } catch (e: any) {
      const message = e?.message || "Login failed. Please try again.";
      setErrorMessage(message);
      Alert.alert("Error", message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleLogin() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const name = credential.fullName
        ? `${credential.fullName.givenName || ""} ${credential.fullName.familyName || ""}`.trim()
        : "Apple User";
      if (!credential.identityToken) {
        throw new Error("Apple identity token not returned");
      }
      await socialLogin({
        provider: "apple",
        identityToken: credential.identityToken,
        email: credential.email || undefined,
        name: name || "Apple User",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/instame");
    } catch (e: any) {
      if (e.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Error", e?.message || "Apple Sign-In failed. Please try again.");
      }
    }
  }

  async function handleGoogleLogin() {
    try {
      if (Platform.OS === "android") {
        if (!googleNativeConfigured) {
          throw new Error(
            "Google Sign-In is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID for Android native sign-in.",
          );
        }
        if (!googleNativeModule) {
          Alert.alert(
            "Google Sign-In unavailable",
            "This build does not include native Google Sign-In. Use email login or run an Android development build.",
          );
          return;
        }

        const { GoogleSignin } = googleNativeModule;

        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });

        await GoogleSignin.signIn();
        const tokens = await GoogleSignin.getTokens();
        if (!tokens.idToken) {
          throw new Error("Google did not return an ID token");
        }

        await socialLogin({
          provider: "google",
          idToken: tokens.idToken,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)/instame");
        return;
      }

      if (!googleAuthSessionConfigured) {
        throw new Error(
          "Google Sign-In is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.",
        );
      }
      if (!googleRequest) {
        throw new Error("Google Sign-In is not ready yet");
      }

      const result: any = await promptGoogleAuth();
      if (result?.type !== "success") {
        return;
      }

      const idToken = result?.params?.id_token || result?.authentication?.idToken;
      if (!idToken) {
        throw new Error("Google did not return an ID token");
      }

      await socialLogin({
        provider: "google",
        idToken,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/instame");
    } catch (e: any) {
      if (Platform.OS === "android") {
        const code = e?.code;
        const statusCodes = googleNativeModule?.statusCodes;
        if (
          code === statusCodes?.SIGN_IN_CANCELLED ||
          code === statusCodes?.IN_PROGRESS ||
          code === "SIGN_IN_CANCELLED" ||
          code === "IN_PROGRESS"
        ) {
          return;
        }
        if (
          code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE ||
          code === "PLAY_SERVICES_NOT_AVAILABLE"
        ) {
          Alert.alert("Error", "Google Play Services are not available on this device.");
          return;
        }
      }
      Alert.alert("Error", "Google Sign-In failed. Please try again.");
    }
  }

  function handlePasswordHelp() {
    Alert.alert(
      "Password help",
      "Password recovery is handled by support for this launch. Contact Chicoo support from the email linked to your account.",
      [
        {
          text: "Email support",
          onPress: () => {
            void Linking.openURL(
              `mailto:${CHICOO_SUPPORT_EMAIL}?subject=Chicoo%20Password%20Reset&body=Please%20help%20me%20recover%20my%20password%20for%20the%20account%20linked%20to%20this%20email.`,
            );
          },
        },
        {
          text: "Support page",
          onPress: () => router.push(PUBLIC_PAGE_PATHS.contact as any),
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }

  const showApple = Platform.OS === "ios" && appleAuthAvailable;
  const showGoogle =
    Platform.OS === "android" ? googleIsConfigured && !!googleNativeModule : googleIsConfigured;

  return (
    <View style={styles.container}>
      <ChicooBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(800)} style={styles.brandSection}>
            <Text style={styles.brandLabel}>Chicoo Access</Text>
            <Text style={styles.brandTitle}>Chicoo</Text>
            <View style={styles.brandLine} />
            <Text style={styles.brandQuote}>
              Your face, styled better.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.formSection}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <Pressable
              onPress={handlePasswordHelp}
              style={styles.forgotPasswordBtn}
            >
              <Text style={styles.forgotPasswordText}>Need password help?</Text>
            </Pressable>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                loading && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.loginButtonText}>
                {loading ? "Signing in..." : "Sign In"}
              </Text>
            </Pressable>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              {showApple && (
                <Pressable
                  onPress={handleAppleLogin}
                  style={({ pressed }) => [styles.socialButton, styles.appleButton, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </Pressable>
              )}
              {showGoogle && (
                <Pressable
                  onPress={handleGoogleLogin}
                  style={({ pressed }) => [styles.socialButton, styles.googleButton, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>

          <View style={styles.legalLinksRow}>
            <Pressable onPress={() => router.push("/terms" as any)}>
              <Text style={styles.legalLink}>Terms</Text>
            </Pressable>
            <Text style={styles.legalDivider}>•</Text>
            <Pressable onPress={() => router.push("/privacy" as any)}>
              <Text style={styles.legalLink}>Privacy</Text>
            </Pressable>
            <Text style={styles.legalDivider}>•</Text>
            <Pressable onPress={() => router.push("/contact" as any)}>
              <Text style={styles.legalLink}>Support</Text>
            </Pressable>
          </View>

          <Animated.View entering={FadeInDown.delay(500).duration(600)} style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) }]}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <Pressable onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.footerLink}>Create Account</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 28 },
  brandSection: { marginBottom: 40, gap: 2 },
  brandLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#F3DDE5",
    letterSpacing: 4.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  brandTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 34,
    color: Colors.accent,
    marginBottom: 12,
    letterSpacing: 9,
    textTransform: "uppercase",
  },
  brandLine: {
    width: 54,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  brandQuote: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#8B8189",
    letterSpacing: 3.1,
    lineHeight: 22,
    textTransform: "uppercase",
  },
  formSection: { gap: 16 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(8,9,13,0.82)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.white,
    height: "100%",
  },
  eyeBtn: { padding: 4 },
  forgotPasswordBtn: {
    alignSelf: "flex-end",
    marginTop: -6,
  },
  forgotPasswordText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.accent,
  },
  loginButton: {
    backgroundColor: "rgba(7,8,12,0.9)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: 58,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#EEE6EA",
    letterSpacing: 3.2,
    textTransform: "uppercase",
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#FF9A9A",
    lineHeight: 18,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.cardBorder,
  },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#7E747C",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  socialButtons: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
  },
  appleButton: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.10)",
  },
  googleButton: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.10)",
  },
  socialButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.white,
  },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
  },
  legalLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  legalDivider: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: "auto",
    paddingTop: 24,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.accent,
  },
});

