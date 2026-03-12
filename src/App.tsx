import { useEffect, useState } from "react";
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
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
  AppPane,
  IssueDetail,
  PullRequestDetail,
  RepoConfig,
  WorkflowOverview,
} from "./types";

const panes: AppPane[] = ["issues", "issue-detail", "pull-request"];

export function App() {
  const renderer = useRenderer();
  const [activePane, setActivePane] = useState<AppPane>("issues");
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

  const selectedIssue =
    overview?.issues.find((issue) => issue.number === selectedIssueNumber) ?? null;
  const selectedPullRequestSummary =
    selectedIssue && overview
      ? overview.openPullRequestsByIssueNumber[selectedIssue.number] ?? null
      : null;

  useKeyboard((key) => {
    if (key.name === "escape") {
      renderer.destroy();
      return;
    }

    if (key.name === "tab" || key.name === "right") {
      setActivePane((current) => nextPane(current, 1));
      return;
    }

    if ((key.shift && key.name === "tab") || key.name === "left") {
      setActivePane((current) => nextPane(current, -1));
      return;
    }

    if (key.name === "1") {
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
      overview?.issues.length &&
      (key.name === "down" || key.name === "j")
    ) {
      setSelectedIssueNumber((current) => moveSelectedIssue(overview, current, 1));
      return;
    }

    if (
      activePane === "issues" &&
      overview?.issues.length &&
      (key.name === "up" || key.name === "k")
    ) {
      setSelectedIssueNumber((current) => moveSelectedIssue(overview, current, -1));
      return;
    }

    if (key.name === "q") {
      renderer.destroy();
    }
  }, { release: false });

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
        issueCount={overview?.issues.length ?? 0}
        pullRequestCount={overview?.openPullRequests.length ?? 0}
        lastRefreshedAt={lastRefreshedAt}
        loading={overviewLoading || issueDetailLoading || pullRequestDetailLoading}
      />

      <box flexDirection="row" flexGrow={1} gap={1}>
        <IssueListPane
          issues={overview?.issues ?? []}
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
    </box>
  );
}

function Header({
  config,
  activePane,
  issueCount,
  pullRequestCount,
  lastRefreshedAt,
  loading,
}: {
  config: RepoConfig;
  activePane: AppPane;
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
            "Tab/Shift+Tab switch panes · R refresh · Esc quit",
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
  if (overview.issues.length === 0) {
    return null;
  }

  if (current && overview.issues.some((issue) => issue.number === current)) {
    return current;
  }

  return overview.issues[0]?.number ?? null;
}

function nextPane(current: AppPane, delta: 1 | -1): AppPane {
  const index = panes.indexOf(current);
  const nextIndex = (index + delta + panes.length) % panes.length;
  return panes[nextIndex] ?? "issues";
}

function moveSelectedIssue(
  overview: WorkflowOverview,
  current: number | null,
  delta: 1 | -1,
): number | null {
  if (overview.issues.length === 0) {
    return null;
  }

  const currentIndex = overview.issues.findIndex((issue) => issue.number === current);
  const baseIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = Math.max(0, Math.min(overview.issues.length - 1, baseIndex + delta));
  return overview.issues[nextIndex]?.number ?? current;
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
