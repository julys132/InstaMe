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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import ChicooBackground from "@/components/ChicooBackground";
import PasswordRequirements from "@/components/PasswordRequirements";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPasswordRequirementChecks,
  getPasswordValidationMessage,
  isStrongPassword,
} from "@shared/password-policy";

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { user, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(() => getPasswordRequirementChecks(newPassword), [newPassword]);
  const passwordReady = isStrongPassword(newPassword);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  async function handleChangePassword() {
    if (user?.provider !== "email") {
      Alert.alert("Unavailable", "Password changes are only available for email-based accounts.");
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Complete all password fields.");
      return;
    }

    const passwordValidationMessage = getPasswordValidationMessage(newPassword);
    if (passwordValidationMessage) {
      Alert.alert("Error", passwordValidationMessage);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Password updated", "Your password has been changed successfully.", [
        {
          text: "Back to profile",
          onPress: () => router.back(),
        },
      ]);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not update your password.");
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
          contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 12, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={Colors.white} />
            </Pressable>
            <View>
              <Text style={styles.headerLabel}>Chicoo Security</Text>
              <Text style={styles.headerTitle}>Change Password</Text>
            </View>
          </View>

          <Animated.View entering={FadeIn.duration(600)} style={styles.infoCard}>
            <Text style={styles.infoTitle}>Account</Text>
            <Text style={styles.infoValue}>{user?.email || ""}</Text>
            <Text style={styles.infoDescription}>
              Update your password for this Chicoo email account. Other signed-in devices will need to refresh their session.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(600)} style={styles.formSection}>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Current password"
                placeholderTextColor={Colors.textMuted}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
              />
              <Pressable onPress={() => setShowCurrentPassword((value) => !value)} style={styles.eyeBtn}>
                <Ionicons name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <View style={[styles.inputContainer, newPassword.length > 0 && passwordReady && styles.inputContainerSuccess]}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={Colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <Pressable onPress={() => setShowNewPassword((value) => !value)} style={styles.eyeBtn}>
                <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textMuted} />
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
              onPress={handleChangePassword}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                loading && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.primaryButtonText}>{loading ? "Updating..." : "Save New Password"}</Text>
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
  content: { flexGrow: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  backButton: { padding: 6, marginLeft: -6 },
  headerLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: Colors.white,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 18,
    gap: 8,
    marginBottom: 18,
  },
  infoTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.white,
  },
  infoDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
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