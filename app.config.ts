import type { ExpoConfig } from "expo/config"

/** Local app configuration contains no store identity or service credentials. */
const workoutAppConfig: ExpoConfig = {
  name: "Workout",
  slug: "workout",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  backgroundColor: "#F7F6F2",
  plugins: ["expo-sqlite"],
  ios: { supportsTablet: false },
  web: { bundler: "metro" },
}

export default workoutAppConfig
