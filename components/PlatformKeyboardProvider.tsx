import React from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";

export function PlatformKeyboardProvider({ children }: { children: React.ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}
