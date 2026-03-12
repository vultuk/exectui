import { createContext, useContext, type ReactNode } from "react";

export type ThemeName = "midnight" | "paper" | "forest" | "phosphor";

export type AppTheme = {
  name: ThemeName;
  label: string;
  description: string;
  colors: {
    appBackground: string;
    chromeBackground: string;
    panelBackground: string;
    panelBackgroundAlt: string;
    panelBackgroundMuted: string;
    panelBackgroundSelected: string;
    overlayBackground: string;
    border: string;
    borderMuted: string;
    borderStrong: string;
    focusBorder: string;
    borderDanger: string;
    scrollbarTrack: string;
    scrollbarThumb: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textAccent: string;
    textAccentSoft: string;
    textHighlight: string;
    textDanger: string;
    textSuccess: string;
    textWarning: string;
    textFailure: string;
    inlineCodeForeground: string;
    inlineCodeBackground: string;
    quoteBackground: string;
    quoteBorder: string;
  };
};

export const DEFAULT_THEME_NAME: ThemeName = "midnight";

export const THEMES: Record<ThemeName, AppTheme> = {
  midnight: {
    name: "midnight",
    label: "Midnight Operator",
    description: "Deep navy panels with cyan structure and amber emphasis.",
    colors: {
      appBackground: "#071015",
      chromeBackground: "#0b141b",
      panelBackground: "#0d1821",
      panelBackgroundAlt: "#101b1f",
      panelBackgroundMuted: "#10212b",
      panelBackgroundSelected: "#173042",
      overlayBackground: "#03090d",
      border: "#315a72",
      borderMuted: "#284556",
      borderStrong: "#3d697d",
      focusBorder: "#f5b85c",
      borderDanger: "#b84a3c",
      scrollbarTrack: "#173042",
      scrollbarThumb: "#5fb3b3",
      textPrimary: "#f9f6ef",
      textSecondary: "#d9e5ec",
      textMuted: "#6f91a4",
      textAccent: "#8ed7c6",
      textAccentSoft: "#d6f0ea",
      textHighlight: "#f5b85c",
      textDanger: "#ffb3a8",
      textSuccess: "#8ed7c6",
      textWarning: "#f5b85c",
      textFailure: "#ff8f70",
      inlineCodeForeground: "#f5b85c",
      inlineCodeBackground: "#13232d",
      quoteBackground: "#112028",
      quoteBorder: "#3d697d",
    },
  },
  paper: {
    name: "paper",
    label: "Paper Ledger",
    description: "Warm parchment surfaces with ink-blue borders and brass accents.",
    colors: {
      appBackground: "#f1eadf",
      chromeBackground: "#f7f0e5",
      panelBackground: "#fbf6ee",
      panelBackgroundAlt: "#f5ede0",
      panelBackgroundMuted: "#efe4d3",
      panelBackgroundSelected: "#e8dcc8",
      overlayBackground: "#ddd4c6",
      border: "#6f7f8c",
      borderMuted: "#8c9aa5",
      borderStrong: "#4f6678",
      focusBorder: "#b36b15",
      borderDanger: "#b65d4c",
      scrollbarTrack: "#d9cfbf",
      scrollbarThumb: "#6f8ca0",
      textPrimary: "#23313d",
      textSecondary: "#344754",
      textMuted: "#6c7b84",
      textAccent: "#2b7a78",
      textAccentSoft: "#4a6764",
      textHighlight: "#b36b15",
      textDanger: "#8c3e32",
      textSuccess: "#2f7a51",
      textWarning: "#b36b15",
      textFailure: "#b65d4c",
      inlineCodeForeground: "#9c5d0f",
      inlineCodeBackground: "#ede2cf",
      quoteBackground: "#efe6d8",
      quoteBorder: "#8aa0a8",
    },
  },
  forest: {
    name: "forest",
    label: "Forest Grid",
    description: "Mossy greens, dark bark panels, and crisp lime focus states.",
    colors: {
      appBackground: "#09110e",
      chromeBackground: "#101813",
      panelBackground: "#111d17",
      panelBackgroundAlt: "#15231c",
      panelBackgroundMuted: "#193027",
      panelBackgroundSelected: "#234235",
      overlayBackground: "#050b08",
      border: "#4a7867",
      borderMuted: "#38584d",
      borderStrong: "#5c947e",
      focusBorder: "#d2c55a",
      borderDanger: "#8d5048",
      scrollbarTrack: "#1f3a30",
      scrollbarThumb: "#75c1a2",
      textPrimary: "#eef6ef",
      textSecondary: "#d6eadc",
      textMuted: "#89a79a",
      textAccent: "#8cd8b7",
      textAccentSoft: "#cde9dc",
      textHighlight: "#d2c55a",
      textDanger: "#ffb8af",
      textSuccess: "#8cd8b7",
      textWarning: "#d2c55a",
      textFailure: "#ff947e",
      inlineCodeForeground: "#d2c55a",
      inlineCodeBackground: "#193128",
      quoteBackground: "#162820",
      quoteBorder: "#5c947e",
    },
  },
  phosphor: {
    name: "phosphor",
    label: "Amber Phosphor",
    description: "CRT-inspired black glass with amber signal and green pass states.",
    colors: {
      appBackground: "#050504",
      chromeBackground: "#0d0b08",
      panelBackground: "#120f0a",
      panelBackgroundAlt: "#16120c",
      panelBackgroundMuted: "#1d170f",
      panelBackgroundSelected: "#2b2114",
      overlayBackground: "#020201",
      border: "#8e6b2a",
      borderMuted: "#6d531f",
      borderStrong: "#b28d47",
      focusBorder: "#f8bf4c",
      borderDanger: "#99533b",
      scrollbarTrack: "#221a10",
      scrollbarThumb: "#d8a84b",
      textPrimary: "#fff5de",
      textSecondary: "#f0ddb5",
      textMuted: "#ae9360",
      textAccent: "#f8bf4c",
      textAccentSoft: "#ffe2a4",
      textHighlight: "#f8bf4c",
      textDanger: "#ffb496",
      textSuccess: "#9fd38e",
      textWarning: "#f8bf4c",
      textFailure: "#ff9d72",
      inlineCodeForeground: "#f8bf4c",
      inlineCodeBackground: "#21170d",
      quoteBackground: "#18130d",
      quoteBorder: "#b28d47",
    },
  },
};

const ThemeContext = createContext<AppTheme>(THEMES[DEFAULT_THEME_NAME]);

export function ThemeProvider({
  theme,
  children,
}: {
  theme: AppTheme;
  children: ReactNode;
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function getThemeList() {
  return Object.values(THEMES);
}

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && value in THEMES;
}
