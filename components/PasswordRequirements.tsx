import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import type { PasswordRequirementCheck } from "@shared/password-policy";

type PasswordRequirementsProps = {
  checks: PasswordRequirementCheck[];
  title?: string;
};

export default function PasswordRequirements({
  checks,
  title = "Use a strong password",
}: PasswordRequirementsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {checks.map((check) => {
          const met = check.passed;

          return (
            <View
              key={check.id}
              style={[
                styles.badge,
                met ? styles.badgeMet : styles.badgePending,
              ]}
            >
              <Ionicons
                name={met ? "checkmark-circle" : "ellipse-outline"}
                size={14}
                color={met ? Colors.success : Colors.textMuted}
              />
              <Text style={[styles.badgeText, met ? styles.badgeTextMet : styles.badgeTextPending]}>
                {check.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: -4,
  },
  title: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgePending: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  badgeMet: {
    backgroundColor: "rgba(76,175,80,0.12)",
    borderColor: "rgba(76,175,80,0.35)",
  },
  badgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  badgeTextPending: {
    color: Colors.textMuted,
  },
  badgeTextMet: {
    color: "#CBEBC8",
  },
});