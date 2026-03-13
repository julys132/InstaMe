const appJson = require("./app.json");

function hasPlugin(plugins, pluginName) {
  return plugins.some((entry) =>
    Array.isArray(entry) ? entry[0] === pluginName : entry === pluginName,
  );
}

function toGoogleRedirectScheme(clientId) {
  const suffix = ".apps.googleusercontent.com";
  if (!clientId || typeof clientId !== "string") return "";
  const trimmed = clientId.trim();
  if (!trimmed.endsWith(suffix)) return "";
  const prefix = trimmed.slice(0, -suffix.length);
  return prefix ? `com.googleusercontent.apps.${prefix}` : "";
}

function hasIntentFilter(intentFilters, scheme, pathPrefix) {
  return intentFilters.some((filter) => {
    const dataEntries = Array.isArray(filter?.data) ? filter.data : [];
    return dataEntries.some((entry) => {
      const sameScheme = entry?.scheme === scheme;
      const samePathPrefix = pathPrefix ? entry?.pathPrefix === pathPrefix : true;
      return sameScheme && samePathPrefix;
    });
  });
}

module.exports = () => {
  const baseExpoConfig = appJson.expo || {};
  const plugins = Array.isArray(baseExpoConfig.plugins) ? [...baseExpoConfig.plugins] : [];
  const androidConfig = { ...(baseExpoConfig.android || {}) };
  const intentFilters = Array.isArray(androidConfig.intentFilters) ? [...androidConfig.intentFilters] : [];
  const extra = { ...(baseExpoConfig.extra || {}) };

  if (!hasPlugin(plugins, "@react-native-google-signin/google-signin")) {
    plugins.push("@react-native-google-signin/google-signin");
  }

  if (!hasIntentFilter(intentFilters, "instame")) {
    intentFilters.push({
      action: "VIEW",
      category: ["BROWSABLE", "DEFAULT"],
      data: [{ scheme: "instame" }],
    });
  }

  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.GOOGLE_ANDROID_CLIENT_ID || "";
  const googleRedirectScheme = toGoogleRedirectScheme(googleAndroidClientId);

  const configuredApiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.PUBLIC_WEB_URL ||
    extra.apiBaseUrl ||
    "https://instame.up.railway.app";
  const configuredPublicWebUrl =
    process.env.EXPO_PUBLIC_WEB_BASE_URL ||
    process.env.PUBLIC_WEB_URL ||
    process.env.PUBLIC_APP_URL ||
    extra.publicWebUrl ||
    "https://instame.up.railway.app";

  if (googleRedirectScheme && !hasIntentFilter(intentFilters, googleRedirectScheme, "/oauth2redirect")) {
    intentFilters.push({
      action: "VIEW",
      category: ["BROWSABLE", "DEFAULT"],
      data: [
        {
          scheme: googleRedirectScheme,
          pathPrefix: "/oauth2redirect",
        },
      ],
    });
  }

  return {
    ...baseExpoConfig,
    plugins,
    extra: {
      ...extra,
      apiBaseUrl: configuredApiBaseUrl,
      publicWebUrl: configuredPublicWebUrl.replace(/\/+$/, ""),
    },
    android: {
      ...androidConfig,
      intentFilters,
    },
  };
};
