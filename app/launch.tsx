import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { apiClient } from "@/lib/api-client";
import Colors from "@/constants/colors";
import ChicooBackground from "@/components/ChicooBackground";

export default function LaunchScreen() {
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await apiClient.init();

        if (!apiClient.isAuthenticated()) {
          if (mounted) router.replace("/(auth)/login");
          return;
        }

        await apiClient.getProfile();
        if (mounted) router.replace("/(tabs)/instame");
      } catch {
        await apiClient.clearAuth();
        if (mounted) router.replace("/(auth)/login");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
      <ChicooBackground />
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );
}
