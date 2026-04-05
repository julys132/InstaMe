import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import ChicooBackground from "@/components/ChicooBackground";
import PasswordRequirements from "@/components/PasswordRequirements";
import Colors from "@/constants/colors";
import { apiClient } from "@/lib/api-client";
import {
  getPasswordRequirementChecks,
  getPasswordValidationMessage,
  isStrongPassword,
} from "@shared/password-policy";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const email = typeof params.email === "string" ? params.email : "";
  const token = typeof params.token === "string" ? params.token : "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(() => getPasswordRequirementChecks(password), [password]);
  const passwordReady = isStrongPassword(password);
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const linkValid = Boolean(email && token);

  async function handleResetPassword() {
    const passwordValidationMessage = getPasswordValidationMessage(password);
    if (!linkValid) {
      Alert.alert("Invalid link", "This password reset link is incomplete or invalid.");
      return;
    }
    if (passwordValidationMessage) {
      Alert.alert("Error", passwordValidationMessage);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.resetPassword(email, token, password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Password updated", "You can now sign in with your new password.", [
        {
          text: "Go to login",
          onPress: () => router.replace("/(auth)/login"),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not reset password.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <ChicooBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 30 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>

          <Animated.View entering={FadeIn.duration(700)} style={styles.brandSection}>
            <Text style={styles.brandLabel}>Chicoo Security</Text>
            <Text style={styles.brandTitle}>Reset Password</Text>
            <View style={styles.brandLine} />
            <Text style={styles.brandSubtitle}>
              {linkValid
                ? `Create a new password for ${email}.`
                : "This reset link is missing required information."}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(600)} style={styles.formSection}>
            <View style={[styles.inputContainer, password.length > 0 && passwordReady && styles.inputContainerSuccess]}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <PasswordRequirements checks={passwordChecks} title="Your new password should include" />

            <View style={styles.inputContainer}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <Pressable onPress={() => setShowConfirmPassword((value) => !value)} style={styles.eyeBtn}>
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <Pressable
              onPress={handleResetPassword}
              disabled={loading || !linkValid}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                (loading || !linkValid) && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.primaryButtonText}>{loading ? "Updating..." : "Update Password"}</Text>
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
  backBtn: { marginBottom: 20 },
  brandSection: { marginBottom: 32, gap: 4 },
  brandLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#F3DDE5",
    letterSpacing: 4.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  brandTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 30,
    color: Colors.white,
    marginBottom: 14,
  },
  brandLine: {
    width: 54,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  brandSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
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
  inputContainerSuccess: {
    borderColor: "rgba(76,175,80,0.55)",
    backgroundColor: "rgba(76,175,80,0.08)",
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
  primaryButton: {
    backgroundColor: "rgba(7,8,12,0.9)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: 58,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#EEE6EA",
    letterSpacing: 2.8,
    textTransform: "uppercase",
  },
});