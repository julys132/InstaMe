import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import Colors from "@/constants/colors";

export default function IndexScreen() {
  useEffect(() => {
    router.replace("/welcome");
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );
}

