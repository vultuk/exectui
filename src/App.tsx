import { useEffect, useState } from "react";
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
import { FiltersModal } from "./components/FiltersModal";
import { IssueDetailPane } from "./components/IssueDetailPane";
import { IssueListPane } from "./components/IssueListPane";
import { PullRequestPane } from "./components/PullRequestPane";
import { SettingsModal } from "./components/SettingsModal";
import {
  fetchIssueDetail,
  fetchPullRequestDetail,
  fetchWorkflowOverview,
  getRepoConfig,
} from "./lib/github";
import { formatTimestamp } from "./lib/format";
import { loadThemePreference, saveThemePreference } from "./lib/settings";
import {
  DEFAULT_THEME_NAME,
  getThemeList,
  THEMES,
  ThemeProvider,
  type ThemeName,
  useTheme,
} from "./lib/theme";
import type {
  AppFilters,
  AppPane,
  IssueDetail,
  IssueSummary,
  PullRequestDetail,
  PullRequestSummary,
  RepoConfig,
  WorkflowOverview,
} from "./types";

const allPanes: AppPane[] = ["issues", "issue-detail", "pull-request"];

export function App() {
  const renderer = useRenderer();
  const { width } = useTerminalDimensions();
  const layoutMode = getLayoutMode(width);
  const issueListWidth = getIssueListWidth(layoutMode, width);
  const issueTitleMaxLength = getIssueTitleMaxLength(layoutMode, issueListWidth);
  const [activePane, setActivePane] = useState<AppPane>("issues");
  const [showIssueList, setShowIssueList] = useState(true);
  const [config] = useState<RepoConfig>(() => getRepoConfig());
  const [overview, setOverview] = useState<WorkflowOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(
    config.ok ? null : config.error,
  );
  const [selectedIssueNumber, setSelectedIssueNumber] = useState<number | null>(null);
  const [issueDetail, setIssueDetail] = useState<IssueDetail | null>(null);
  const [issueDetailLoading, setIssueDetailLoading] = useState(false);
  const [issueDetailError, setIssueDetailError] = useState<string | null>(null);
  const [pullRequestDetail, setPullRequestDetail] = useState<PullRequestDetail | null>(null);
  const [pullRequestDetailLoading, setPullRequestDetailLoading] = useState(false);
  const [pullRequestDetailError, setPullRequestDetailError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [filters, setFilters] = useState<AppFilters>({ openPrOnly: false });
  const [activeModal, setActiveModal] = useState<"filters" | "settings" | null>(null);
  const [themeName, setThemeName] = useState<ThemeName>(() => loadThemePreference());
  const [highlightedThemeName, setHighlightedThemeName] =
    useState<ThemeName>(() => loadThemePreference());
  const theme = THEMES[themeName];
  const visiblePanes = getVisiblePanes(showIssueList);
  const primaryContentPane = activePane === "pull-request" ? "pull-request" : "issue-detail";
  const isFilterModalOpen = activeModal === "filters";
  const isSettingsModalOpen = activeModal === "settings";

  const visibleIssues = applyIssueFilters(
    overview?.issues ?? [],
    overview?.openPullRequestsByIssueNumber ?? {},
    filters,
  );

  const selectedIssue =
    visibleIssues.find((issue) => issue.number === selectedIssueNumber) ?? null;
  const selectedPullRequestSummary =
    selectedIssue && overview
      ? overview.openPullRequestsByIssueNumber[selectedIssue.number] ?? null
      : null;

  const toggleOpenPrOnlyFilter = () => {
    const nextFilters = { ...filters, openPrOnly: !filters.openPrOnly };
    const nextVisibleIssues = applyIssueFilters(
      overview?.issues ?? [],
      overview?.openPullRequestsByIssueNumber ?? {},
      nextFilters,
    );

    setFilters(nextFilters);
    setSelectedIssueNumber((current) =>
      chooseNextSelectedIssueNumberFromList(current, nextVisibleIssues),
    );
  };

  useEffect(() => {
    if (isSettingsModalOpen) {
      setHighlightedThemeName(themeName);
    }
  }, [isSettingsModalOpen, themeName]);

  useEffect(() => {
    saveThemePreference(themeName);
  }, [themeName]);

  useKeyboard((key) => {
    if (key.ctrl && key.name === "d") {
      setShowIssueList((current) => {
        const next = !current;
        if (!next && activePane === "issues") {
          setActivePane("issue-detail");
        }
        return next;
      });
      return;
    }

    if (key.ctrl && key.name === "f") {
      setActiveModal((current) => (current === "filters" ? null : "filters"));
      return;
    }

    if (key.ctrl && key.name === "t") {
      setActiveModal((current) => (current === "settings" ? null : "settings"));
      return;
    }

    if (isFilterModalOpen) {
      if (key.name === "escape") {
        setActiveModal(null);
        return;
      }

      if (key.name === "space" || key.name === "enter") {
        toggleOpenPrOnlyFilter();
        return;
      }

      return;
    }

    if (isSettingsModalOpen) {
      if (key.name === "escape") {
        setActiveModal(null);
        return;
      }

      if (key.name === "down" || key.name === "j" || key.name === "right") {
        setHighlightedThemeName((current) => moveThemeSelection(current, 1));
        return;
      }

      if (key.name === "up" || key.name === "k" || key.name === "left") {
        setHighlightedThemeName((current) => moveThemeSelection(current, -1));
        return;
      }

      if (key.name === "space" || key.name === "enter") {
        setThemeName(highlightedThemeName);
        return;
      }

      return;
    }

    if (key.name === "escape") {
      renderer.destroy();
      return;
    }

    if (key.name === "tab" || key.name === "right") {
      setActivePane((current) => nextPane(current, 1, visiblePanes));
      return;
    }

    if ((key.shift && key.name === "tab") || key.name === "left") {
      setActivePane((current) => nextPane(current, -1, visiblePanes));
      return;
    }

    if (key.name === "1" && showIssueList) {
      setActivePane("issues");
      return;
    }

    if (key.name === "2") {
      setActivePane("issue-detail");
      return;
    }

    if (key.name === "3") {
      setActivePane("pull-request");
      return;
    }

    if (key.name === "r") {
      setRefreshNonce((value) => value + 1);
      return;
    }

    if (
      activePane === "issues" &&
      visibleIssues.length &&
      (key.name === "down" || key.name === "j")
    ) {
      setSelectedIssueNumber((current) => moveSelectedIssue(visibleIssues, current, 1));
      return;
    }

    if (
      activePane === "issues" &&
      visibleIssues.length &&
      (key.name === "up" || key.name === "k")
    ) {
      setSelectedIssueNumber((current) => moveSelectedIssue(visibleIssues, current, -1));
      return;
    }

    if (key.name === "q") {
      renderer.destroy();
    }
  }, { release: false });

  useEffect(() => {
    if (!visiblePanes.includes(activePane)) {
      setActivePane(visiblePanes[0] ?? "issue-detail");
    }
  }, [activePane, visiblePanes]);

  useEffect(() => {
    if (!config.ok) {
      return;
    }

    let cancelled = false;

    const loadOverview = async () => {
      setOverviewLoading(true);

      try {
        const nextOverview = await fetchWorkflowOverview(config);
        if (cancelled) {
          return;
        }

        setOverview(nextOverview);
        setOverviewError(null);
        setLastRefreshedAt(new Date().toISOString());
        setSelectedIssueNumber((current) =>
          chooseNextSelectedIssueNumber(current, nextOverview),
        );
      } catch (error) {
        if (!cancelled) {
          setOverviewError(toErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setOverviewLoading(false);
        }
      }
    };

    void loadOverview();
    const timer = setInterval(() => {
      void loadOverview();
    }, config.refreshIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [config, refreshNonce]);

  useEffect(() => {
    setSelectedIssueNumber((current) =>
      chooseNextSelectedIssueNumberFromList(current, visibleIssues),
    );
  }, [visibleIssues]);

  useEffect(() => {
    if (!config.ok || !selectedIssueNumber) {
      setIssueDetail(null);
      setIssueDetailError(null);
      setIssueDetailLoading(false);
      return;
    }

    let cancelled = false;
    setIssueDetailLoading(true);
    setIssueDetailError(null);

    void fetchIssueDetail(config, selectedIssueNumber)
      .then((detail) => {
        if (!cancelled) {
          setIssueDetail(detail);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setIssueDetailError(toErrorMessage(error));
          setIssueDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIssueDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config, selectedIssueNumber, refreshNonce, lastRefreshedAt]);

  useEffect(() => {
    if (!config.ok || !selectedPullRequestSummary) {
      setPullRequestDetail(null);
      setPullRequestDetailError(null);
      setPullRequestDetailLoading(false);
      return;
    }

    let cancelled = false;
    setPullRequestDetailLoading(true);
    setPullRequestDetailError(null);

    void fetchPullRequestDetail(config, selectedPullRequestSummary.number)
      .then((detail) => {
        if (!cancelled) {
          setPullRequestDetail(detail);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPullRequestDetailError(toErrorMessage(error));
          setPullRequestDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPullRequestDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config, selectedPullRequestSummary, refreshNonce, lastRefreshedAt]);

  return (
    <ThemeProvider theme={theme}>
      <box
        width="100%"
        height="100%"
        flexDirection="column"
        backgroundColor={theme.colors.appBackground}
        padding={1}
        gap={1}
      >
        <Header
          config={config}
          activePane={activePane}
          layoutMode={layoutMode}
          showIssueList={showIssueList}
          issueCount={overview?.issues.length ?? 0}
          pullRequestCount={overview?.openPullRequests.length ?? 0}
          lastRefreshedAt={lastRefreshedAt}
          loading={overviewLoading || issueDetailLoading || pullRequestDetailLoading}
        />

        <ResponsiveBody
          layoutMode={layoutMode}
          showIssueList={showIssueList}
          activePane={activePane}
          primaryContentPane={primaryContentPane}
          issueListWidth={issueListWidth}
          issueTitleMaxLength={issueTitleMaxLength}
          issues={visibleIssues}
          linkedPullRequestsByIssueNumber={overview?.openPullRequestsByIssueNumber ?? {}}
          selectedIssueNumber={selectedIssueNumber}
          overviewLoading={overviewLoading}
          overviewError={overviewError}
          issueDetail={issueDetail}
          issueDetailLoading={issueDetailLoading}
          issueDetailError={issueDetailError}
          pullRequestSummary={selectedPullRequestSummary}
          pullRequestDetail={pullRequestDetail}
          pullRequestDetailLoading={pullRequestDetailLoading}
          pullRequestDetailError={pullRequestDetailError}
          onActivatePane={setActivePane}
          onSelectIssue={setSelectedIssueNumber}
        />
        {isFilterModalOpen ? (
          <FiltersModal
            filters={filters}
            issueCount={overview?.issues.length ?? 0}
            matchingIssueCount={visibleIssues.length}
            onToggleOpenPrOnly={toggleOpenPrOnlyFilter}
            onClose={() => setActiveModal(null)}
          />
        ) : null}
        {isSettingsModalOpen ? (
          <SettingsModal
            selectedThemeName={themeName}
            highlightedThemeName={highlightedThemeName}
            onHighlightTheme={setHighlightedThemeName}
            onSelectTheme={setThemeName}
            onClose={() => setActiveModal(null)}
          />
        ) : null}
      </box>
    </ThemeProvider>
  );
}

function Header({
  config,
  activePane,
  layoutMode,
  showIssueList,
  issueCount,
  pullRequestCount,
  lastRefreshedAt,
  loading,
}: {
  config: RepoConfig;
  activePane: AppPane;
  layoutMode: LayoutMode;
  showIssueList: boolean;
  issueCount: number;
  pullRequestCount: number;
  lastRefreshedAt: string | null;
  loading: boolean;
}) {
  const theme = useTheme();
  const { width } = useTerminalDimensions();
  const repoText = config.ok ? config.fullName : "Repository not configured";
  const refreshText = lastRefreshedAt
    ? `Last refresh ${formatTimestamp(lastRefreshedAt)}`
    : "Waiting for initial sync";
  const compact = layoutMode === "phone";
  const leftChars = compact ? Math.max(14, Math.floor(width * 0.4)) : Math.max(18, Math.floor(width * 0.32));
  const centerChars = compact ? Math.max(12, Math.floor(width * 0.18)) : Math.max(14, Math.floor(width * 0.2));
  const rightChars = compact ? Math.max(16, Math.floor(width * 0.32)) : Math.max(20, Math.floor(width * 0.28));

  return (
    <box
      border
      borderStyle="rounded"
      borderColor={theme.colors.border}
      padding={1}
      minHeight={compact ? 4 : 5}
      backgroundColor={theme.colors.chromeBackground}
      flexDirection={compact ? "column" : "row"}
      alignItems={compact ? "stretch" : "flex-start"}
      gap={1}
    >
      <box width={compact ? "100%" : "35%"} flexDirection="column">
        <text fg={theme.colors.textPrimary}>
          <strong>ExecTUI</strong>
          <span fg={theme.colors.textMuted}> · workflow cockpit for Codex issues</span>
        </text>
        <text fg={theme.colors.textAccent}>{truncateHeaderText(repoText, leftChars)}</text>
      </box>

      {compact ? (
        <box width="100%" flexDirection="row" justifyContent="space-between">
          <text fg={theme.colors.textHighlight}>
            <strong>{truncateHeaderText(activePaneLabel(activePane), centerChars)}</strong>
          </text>
          <text fg={theme.colors.textMuted}>
            {truncateHeaderText(
              `${issueCount} issues · ${pullRequestCount} PRs`,
              rightChars,
            )}
          </text>
        </box>
      ) : (
        <box width="30%" flexDirection="column" alignItems="center">
          <text fg={theme.colors.textHighlight}>
            <strong>{truncateHeaderText(activePaneLabel(activePane), centerChars)}</strong>
          </text>
          <text fg={theme.colors.textMuted}>
            {truncateHeaderText(
              `${issueCount} issues · ${pullRequestCount} open PRs`,
              centerChars,
            )}
          </text>
        </box>
      )}

      <box width={compact ? "100%" : "35%"} flexDirection="column" alignItems={compact ? "flex-start" : "flex-end"}>
        <text fg={loading ? theme.colors.textWarning : theme.colors.textAccent}>
          {truncateHeaderText(
            loading ? "Refreshing GitHub data..." : refreshText,
            rightChars,
          )}
        </text>
        <text fg={theme.colors.textMuted}>
          {truncateHeaderText(
            compact
              ? `←/→ switch · Ctrl+D ${showIssueList ? "hide" : "show"} · Ctrl+F filters · Ctrl+T theme`
              : `Ctrl+D ${showIssueList ? "hide" : "show"} issues · Ctrl+F filters · Ctrl+T settings · Esc quit`,
            rightChars,
          )}
        </text>
      </box>
    </box>
  );
}

function chooseNextSelectedIssueNumber(
  current: number | null,
  overview: WorkflowOverview,
): number | null {
  return chooseNextSelectedIssueNumberFromList(current, overview.issues);
}

function moveSelectedIssue(
  issues: IssueSummary[],
  current: number | null,
  delta: 1 | -1,
): number | null {
  if (issues.length === 0) {
    return null;
  }

  const currentIndex = issues.findIndex((issue) => issue.number === current);
  const baseIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = Math.max(0, Math.min(issues.length - 1, baseIndex + delta));
  return issues[nextIndex]?.number ?? current;
}

function activePaneLabel(activePane: AppPane): string {
  switch (activePane) {
    case "issues":
      return "Pane 1 · Issues";
    case "issue-detail":
      return "Pane 2 · Issue Thread";
    case "pull-request":
      return "Pane 3 · Pull Request";
  }
}

function ResponsiveBody({
  layoutMode,
  showIssueList,
  activePane,
  primaryContentPane,
  issueListWidth,
  issueTitleMaxLength,
  issues,
  linkedPullRequestsByIssueNumber,
  selectedIssueNumber,
  overviewLoading,
  overviewError,
  issueDetail,
  issueDetailLoading,
  issueDetailError,
  pullRequestSummary,
  pullRequestDetail,
  pullRequestDetailLoading,
  pullRequestDetailError,
  onActivatePane,
  onSelectIssue,
}: {
  layoutMode: LayoutMode;
  showIssueList: boolean;
  activePane: AppPane;
  primaryContentPane: AppPane;
  issueListWidth: number;
  issueTitleMaxLength: number;
  issues: IssueSummary[];
  linkedPullRequestsByIssueNumber: Record<number, PullRequestSummary>;
  selectedIssueNumber: number | null;
  overviewLoading: boolean;
  overviewError: string | null;
  issueDetail: IssueDetail | null;
  issueDetailLoading: boolean;
  issueDetailError: string | null;
  pullRequestSummary: PullRequestSummary | null;
  pullRequestDetail: PullRequestDetail | null;
  pullRequestDetailLoading: boolean;
  pullRequestDetailError: string | null;
  onActivatePane: (pane: AppPane) => void;
  onSelectIssue: (issueNumber: number) => void;
}) {
  const issueListPane = (
    <IssueListPane
      issues={issues}
      linkedPullRequestsByIssueNumber={linkedPullRequestsByIssueNumber}
      selectedIssueNumber={selectedIssueNumber}
      width={layoutMode === "phone" ? "100%" : issueListWidth}
      minWidth={layoutMode === "phone" ? 0 : Math.max(42, issueListWidth - 10)}
      maxWidth={layoutMode === "phone" ? undefined : issueListWidth + 4}
      titleMaxLength={issueTitleMaxLength}
      focused={activePane === "issues"}
      loading={overviewLoading}
      error={overviewError}
      onActivatePane={() => onActivatePane("issues")}
      onSelectIssue={onSelectIssue}
    />
  );

  const issueDetailPane = (
    <IssueDetailPane
      issue={issueDetail}
      loading={issueDetailLoading}
      error={issueDetailError}
      focused={activePane === "issue-detail"}
    />
  );

  const pullRequestPane = (
    <PullRequestPane
      pullRequestSummary={pullRequestSummary}
      pullRequest={pullRequestDetail}
      loading={pullRequestDetailLoading}
      error={pullRequestDetailError}
      focused={activePane === "pull-request"}
    />
  );

  if (layoutMode === "phone") {
    return (
      <box flexDirection="column" flexGrow={1} gap={1}>
        <PaneTabs
          panes={getVisiblePanes(showIssueList)}
          activePane={activePane}
          onSelectPane={onActivatePane}
          compact
        />
        {activePane === "issues" && showIssueList ? issueListPane : null}
        {activePane === "issue-detail" || (!showIssueList && activePane === "issues")
          ? issueDetailPane
          : null}
        {activePane === "pull-request" ? pullRequestPane : null}
      </box>
    );
  }

  if (layoutMode === "tablet") {
    return (
      <box flexDirection="row" flexGrow={1} gap={1}>
        {showIssueList ? issueListPane : null}
        <box flexDirection="column" flexGrow={1} flexBasis={0} gap={1}>
          <PaneTabs
            panes={["issue-detail", "pull-request"]}
            activePane={primaryContentPane}
            onSelectPane={onActivatePane}
          />
          {primaryContentPane === "pull-request" ? pullRequestPane : issueDetailPane}
        </box>
      </box>
    );
  }

  return (
    <box flexDirection="row" flexGrow={1} gap={1}>
      {showIssueList ? issueListPane : null}
      {issueDetailPane}
      {pullRequestPane}
    </box>
  );
}

function PaneTabs({
  panes,
  activePane,
  onSelectPane,
  compact = false,
}: {
  panes: AppPane[];
  activePane: AppPane;
  onSelectPane: (pane: AppPane) => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  return (
    <box
      border
      borderStyle="rounded"
      borderColor={theme.colors.border}
      backgroundColor={theme.colors.chromeBackground}
      padding={1}
      flexDirection="row"
      gap={1}
      justifyContent={compact ? "space-between" : "flex-start"}
    >
      {panes.map((pane) => {
        const selected = pane === activePane;
        return (
          <box
            key={pane}
            border
            borderStyle="single"
            borderColor={selected ? theme.colors.focusBorder : theme.colors.border}
            backgroundColor={
              selected
                ? theme.colors.panelBackgroundSelected
                : theme.colors.panelBackgroundMuted
            }
            paddingX={compact ? 1 : 2}
            paddingY={0}
            focusable
            onMouseDown={() => onSelectPane(pane)}
          >
            <text fg={selected ? theme.colors.textHighlight : theme.colors.textSecondary}>
              <strong>{compact ? compactPaneLabel(pane) : fullPaneLabel(pane)}</strong>
            </text>
          </box>
        );
      })}
    </box>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function truncateHeaderText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function nextPane(current: AppPane, delta: 1 | -1, panes: AppPane[]): AppPane {
  if (panes.length === 0) {
    return current;
  }

  const index = panes.indexOf(current);
  const baseIndex = index >= 0 ? index : 0;
  const nextIndex = (baseIndex + delta + panes.length) % panes.length;
  return panes[nextIndex] ?? panes[0] ?? current;
}

function getVisiblePanes(showIssueList: boolean): AppPane[] {
  return allPanes.filter((pane) => showIssueList || pane !== "issues");
}

function moveThemeSelection(current: ThemeName, delta: 1 | -1): ThemeName {
  const themes = getThemeList();
  const index = themes.findIndex((theme) => theme.name === current);
  const baseIndex = index >= 0 ? index : 0;
  const nextIndex = (baseIndex + delta + themes.length) % themes.length;
  return themes[nextIndex]?.name ?? current;
}

function fullPaneLabel(pane: AppPane) {
  switch (pane) {
    case "issues":
      return "Issues";
    case "issue-detail":
      return "Issue";
    case "pull-request":
      return "PR";
  }
}

function compactPaneLabel(pane: AppPane) {
  switch (pane) {
    case "issues":
      return "List";
    case "issue-detail":
      return "Issue";
    case "pull-request":
      return "PR";
  }
}

function chooseNextSelectedIssueNumberFromList(
  current: number | null,
  issues: IssueSummary[],
): number | null {
  if (issues.length === 0) {
    return null;
  }

  if (current && issues.some((issue) => issue.number === current)) {
    return current;
  }

  return issues[0]?.number ?? null;
}

function applyIssueFilters(
  issues: IssueSummary[],
  openPullRequestsByIssueNumber: Record<number, PullRequestSummary>,
  filters: AppFilters,
) {
  return issues.filter((issue) => {
    if (filters.openPrOnly && !openPullRequestsByIssueNumber[issue.number]) {
      return false;
    }

    return true;
  });
}

type LayoutMode = "phone" | "tablet" | "desktop" | "superwide";

function getLayoutMode(width: number): LayoutMode {
  if (width < 110) {
    return "phone";
  }

  if (width < 180) {
    return "tablet";
  }

  if (width < 260) {
    return "desktop";
  }

  return "superwide";
}

function getIssueListWidth(layoutMode: LayoutMode, width: number) {
  switch (layoutMode) {
    case "phone":
      return width;
    case "tablet":
      return Math.max(42, Math.min(54, Math.floor(width * 0.34)));
    case "desktop":
      return Math.max(58, Math.min(72, Math.floor(width * 0.24)));
    case "superwide":
      return Math.max(72, Math.min(92, Math.floor(width * 0.22)));
  }
}

function getIssueTitleMaxLength(layoutMode: LayoutMode, issueListWidth: number) {
  switch (layoutMode) {
    case "phone":
      return Math.max(40, issueListWidth - 12);
    case "tablet":
      return Math.max(30, issueListWidth - 14);
    case "desktop":
      return Math.max(40, issueListWidth - 16);
    case "superwide":
      return Math.max(48, issueListWidth - 18);
  }
}
