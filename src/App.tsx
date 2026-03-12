import { useEffect, useState } from "react";
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
import { FiltersModal } from "./components/FiltersModal";
import { IssueDetailPane } from "./components/IssueDetailPane";
import { IssueListPane } from "./components/IssueListPane";
import { PullRequestPane } from "./components/PullRequestPane";
import {
  fetchIssueDetail,
  fetchPullRequestDetail,
  fetchWorkflowOverview,
  getRepoConfig,
} from "./lib/github";
import { formatTimestamp } from "./lib/format";
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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const visiblePanes = getVisiblePanes(showIssueList);

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
      setIsFilterModalOpen((current) => !current);
      return;
    }

    if (isFilterModalOpen) {
      if (key.name === "escape") {
        setIsFilterModalOpen(false);
        return;
      }

      if (key.name === "space" || key.name === "enter") {
        toggleOpenPrOnlyFilter();
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
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      backgroundColor="#071015"
      padding={1}
      gap={1}
    >
      <Header
        config={config}
        activePane={activePane}
        showIssueList={showIssueList}
        issueCount={overview?.issues.length ?? 0}
        pullRequestCount={overview?.openPullRequests.length ?? 0}
        lastRefreshedAt={lastRefreshedAt}
        loading={overviewLoading || issueDetailLoading || pullRequestDetailLoading}
      />

      <box flexDirection="row" flexGrow={1} gap={1}>
        {showIssueList ? (
          <IssueListPane
            issues={visibleIssues}
            linkedPullRequestsByIssueNumber={
              overview?.openPullRequestsByIssueNumber ?? {}
            }
            selectedIssueNumber={selectedIssueNumber}
            focused={activePane === "issues"}
            loading={overviewLoading}
            error={overviewError}
            onActivatePane={() => setActivePane("issues")}
            onSelectIssue={setSelectedIssueNumber}
          />
        ) : null}
        <IssueDetailPane
          issue={issueDetail}
          loading={issueDetailLoading}
          error={issueDetailError}
          focused={activePane === "issue-detail"}
        />
        <PullRequestPane
          pullRequestSummary={selectedPullRequestSummary}
          pullRequest={pullRequestDetail}
          loading={pullRequestDetailLoading}
          error={pullRequestDetailError}
          focused={activePane === "pull-request"}
        />
      </box>
      {isFilterModalOpen ? (
        <FiltersModal
          filters={filters}
          issueCount={overview?.issues.length ?? 0}
          matchingIssueCount={visibleIssues.length}
          onToggleOpenPrOnly={toggleOpenPrOnlyFilter}
          onClose={() => setIsFilterModalOpen(false)}
        />
      ) : null}
    </box>
  );
}

function Header({
  config,
  activePane,
  showIssueList,
  issueCount,
  pullRequestCount,
  lastRefreshedAt,
  loading,
}: {
  config: RepoConfig;
  activePane: AppPane;
  showIssueList: boolean;
  issueCount: number;
  pullRequestCount: number;
  lastRefreshedAt: string | null;
  loading: boolean;
}) {
  const { width } = useTerminalDimensions();
  const repoText = config.ok ? config.fullName : "Repository not configured";
  const refreshText = lastRefreshedAt
    ? `Last refresh ${formatTimestamp(lastRefreshedAt)}`
    : "Waiting for initial sync";
  const leftChars = Math.max(18, Math.floor(width * 0.32));
  const centerChars = Math.max(14, Math.floor(width * 0.2));
  const rightChars = Math.max(20, Math.floor(width * 0.28));

  return (
    <box
      border
      borderStyle="rounded"
      borderColor="#315a72"
      padding={1}
      minHeight={5}
      backgroundColor="#0b141b"
      flexDirection="row"
      alignItems="flex-start"
      gap={1}
    >
      <box width="35%" flexDirection="column">
        <text fg="#f9f6ef">
          <strong>ExecTUI</strong>
          <span fg="#6f91a4"> · workflow cockpit for Codex issues</span>
        </text>
        <text fg="#8ed7c6">{truncateHeaderText(repoText, leftChars)}</text>
      </box>

      <box width="30%" flexDirection="column" alignItems="center">
        <text fg="#f5b85c">
          <strong>{truncateHeaderText(activePaneLabel(activePane), centerChars)}</strong>
        </text>
        <text fg="#6f91a4">
          {truncateHeaderText(
            `${issueCount} issues · ${pullRequestCount} open PRs`,
            centerChars,
          )}
        </text>
      </box>

      <box width="35%" flexDirection="column" alignItems="flex-end">
        <text fg={loading ? "#f5b85c" : "#8ed7c6"}>
          {truncateHeaderText(
            loading ? "Refreshing GitHub data..." : refreshText,
            rightChars,
          )}
        </text>
        <text fg="#6f91a4">
          {truncateHeaderText(
            `Ctrl+D ${showIssueList ? "hide" : "show"} issues · Ctrl+F filters · Esc quit`,
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
