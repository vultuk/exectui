import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DEFAULT_THEME_NAME, isThemeName, type ThemeName } from "./theme";

type AppSettings = {
  themeName?: ThemeName;
};

const SETTINGS_PATH = resolveSettingsPath();

export function loadThemePreference(): ThemeName {
  try {
    if (!existsSync(SETTINGS_PATH)) {
      return DEFAULT_THEME_NAME;
    }

    const raw = readFileSync(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as AppSettings;
    return isThemeName(parsed.themeName) ? parsed.themeName : DEFAULT_THEME_NAME;
  } catch {
    return DEFAULT_THEME_NAME;
  }
}

export function saveThemePreference(themeName: ThemeName) {
  try {
    mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
    writeFileSync(SETTINGS_PATH, JSON.stringify({ themeName }, null, 2));
  } catch {
    // Ignore write failures and keep the in-memory theme active.
  }
}

function resolveSettingsPath() {
  const configHome =
    process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), ".config");
  return join(configHome, "exectui", "settings.json");
}
