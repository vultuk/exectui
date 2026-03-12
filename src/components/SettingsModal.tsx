import { useTerminalDimensions } from "@opentui/react";
import {
  getThemeList,
  THEMES,
  type ThemeName,
  useTheme,
} from "../lib/theme";

type SettingsModalProps = {
  selectedThemeName: ThemeName;
  highlightedThemeName: ThemeName;
  onHighlightTheme: (themeName: ThemeName) => void;
  onSelectTheme: (themeName: ThemeName) => void;
  onClose: () => void;
};

export function SettingsModal({
  selectedThemeName,
  highlightedThemeName,
  onHighlightTheme,
  onSelectTheme,
  onClose,
}: SettingsModalProps) {
  const theme = useTheme();
  const { width, height } = useTerminalDimensions();
  const modalWidth = Math.max(40, Math.min(74, width - 6));
  const modalHeight = Math.max(16, Math.min(28, height - 4));

  return (
    <box
      position="absolute"
      left={0}
      top={0}
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
      backgroundColor={theme.colors.overlayBackground}
    >
      <box
        width={modalWidth}
        height={modalHeight}
        border
        borderStyle="double"
        borderColor={theme.colors.focusBorder}
        backgroundColor={theme.colors.panelBackground}
        padding={1}
        flexDirection="column"
        gap={1}
      >
        <text fg={theme.colors.textHighlight}>
          <strong>Settings</strong>
        </text>
        <text fg={theme.colors.textMuted}>
          Ctrl+T or Esc closes. Up/Down changes selection. Space or Enter applies a
          theme.
        </text>
        <scrollbox
          flexGrow={1}
          scrollY
          backgroundColor={theme.colors.panelBackground}
          rootOptions={{ backgroundColor: theme.colors.panelBackground }}
          viewportOptions={{ backgroundColor: theme.colors.panelBackground }}
          contentOptions={{ backgroundColor: theme.colors.panelBackground }}
          scrollbarOptions={{
            trackOptions: {
              backgroundColor: theme.colors.scrollbarTrack,
              foregroundColor: theme.colors.scrollbarThumb,
            },
          }}
          verticalScrollbarOptions={{ visible: true }}
        >
          <box flexDirection="column" gap={1} paddingRight={1}>
            {getThemeList().map((option) => {
              const highlighted = option.name === highlightedThemeName;
              const selected = option.name === selectedThemeName;

              return (
                <box
                  key={option.name}
                  border
                  borderStyle="single"
                  borderColor={
                    highlighted ? theme.colors.focusBorder : theme.colors.border
                  }
                  backgroundColor={
                    highlighted
                      ? theme.colors.panelBackgroundSelected
                      : theme.colors.panelBackgroundMuted
                  }
                  padding={1}
                  flexDirection="column"
                  gap={1}
                  focusable
                  onMouseDown={() => {
                    onHighlightTheme(option.name);
                    onSelectTheme(option.name);
                  }}
                >
                  <box flexDirection="row" justifyContent="space-between">
                    <text fg={highlighted ? theme.colors.textHighlight : theme.colors.textPrimary}>
                      <strong>
                        {selected ? "[x]" : "[ ]"} {option.label}
                      </strong>
                    </text>
                    <text fg={theme.colors.textMuted}>
                      {selected ? "Active" : highlighted ? "Ready" : "Available"}
                    </text>
                  </box>
                  <text fg={theme.colors.textMuted}>{option.description}</text>
                  <ThemePreview themeName={option.name} />
                </box>
              );
            })}
          </box>
        </scrollbox>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.colors.textAccent}>
            Active theme: {THEMES[selectedThemeName].label}
          </text>
          <box
            border
            borderStyle="single"
            borderColor={theme.colors.border}
            paddingX={1}
            focusable
            onMouseDown={onClose}
          >
            <text fg={theme.colors.textSecondary}>Close</text>
          </box>
        </box>
      </box>
    </box>
  );
}

function ThemePreview({ themeName }: { themeName: ThemeName }) {
  const option = THEMES[themeName];
  return (
    <text fg={option.colors.textMuted}>
      <span fg={option.colors.textPrimary}>Aa</span>
      <span>  </span>
      <span fg={option.colors.textAccent}>Accent</span>
      <span>  </span>
      <span fg={option.colors.textHighlight}>Focus</span>
      <span>  </span>
      <span fg={option.colors.textSuccess}>Pass</span>
      <span>  </span>
      <span fg={option.colors.textFailure}>Fail</span>
    </text>
  );
}
