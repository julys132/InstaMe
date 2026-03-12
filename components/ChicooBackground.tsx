import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function ChicooBackground() {
  return (
    <>
      <LinearGradient
        colors={["#020202", "#080408", "#14070D", "#020202"]}
        locations={[0, 0.32, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.vignette} />
      <View style={styles.topGlow} />
      <View style={styles.midGlow} />
      <View style={styles.bottomGlow} />
    </>
  );
}

const styles = StyleSheet.create({
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.36)",
  },
  topGlow: {
    position: "absolute",
    top: -110,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: "rgba(255,79,125,0.08)",
  },
  midGlow: {
    position: "absolute",
    top: "34%",
    right: -90,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(255,143,174,0.06)",
  },
  bottomGlow: {
    position: "absolute",
    bottom: -140,
    left: "18%",
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(255,79,125,0.10)",
  },
});
