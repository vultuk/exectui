import type {
  CheckStatus,
  IssueSummary,
  PullRequestDetail,
  PullRequestReview,
  PullRequestSummary,
} from "../types";

export function formatTimestamp(value: string): string {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(value: string): string {
  const deltaMs = new Date(value).getTime() - Date.now();
  const deltaMinutes = Math.round(deltaMs / 60_000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, "minute");
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) {
    return formatter.format(deltaHours, "hour");
  }

  const deltaDays = Math.round(deltaHours / 24);
  if (Math.abs(deltaDays) < 30) {
    return formatter.format(deltaDays, "day");
  }

  const deltaMonths = Math.round(deltaDays / 30);
  return formatter.format(deltaMonths, "month");
}

export function toIssueSelectDescription(
  issue: IssueSummary,
  linkedPullRequest: PullRequestSummary | null,
): string {
  const prSuffix = linkedPullRequest ? ` · PR #${linkedPullRequest.number}` : "";
  return `#${issue.number} · ${issue.authorLogin} · ${formatRelativeTime(issue.updatedAt)}${prSuffix}`;
}

export function getIssuePreview(issue: IssueSummary): string {
  const firstLine = issue.body
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine ?? "No issue body";
}

export function summarizeChecks(checks: CheckStatus[]): string {
  if (checks.length === 0) {
    return "No CI checks reported";
  }

  let passing = 0;
  let running = 0;
  let failing = 0;

  for (const check of checks) {
    const normalized = normalizeCheckState(check);
    if (normalized === "passing") {
      passing += 1;
    } else if (normalized === "running") {
      running += 1;
    } else {
      failing += 1;
    }
  }

  return `${passing} passing · ${running} running · ${failing} failing`;
}

export function normalizeCheckState(
  check: CheckStatus,
): "passing" | "running" | "failing" {
  const conclusion = (check.conclusion ?? check.status).toUpperCase();

  if (conclusion === "SUCCESS" || conclusion === "EXPECTED") {
    return "passing";
  }

  if (
    conclusion === "QUEUED" ||
    conclusion === "IN_PROGRESS" ||
    conclusion === "PENDING" ||
    conclusion === "WAITING" ||
    conclusion === "REQUESTED" ||
    conclusion === "RUNNING"
  ) {
    return "running";
  }

  return "failing";
}

export function formatReviewHeading(review: PullRequestReview): string {
  const submittedAt = review.submittedAt
    ? formatTimestamp(review.submittedAt)
    : "pending";
  return `${review.authorLogin} · ${review.state} · ${submittedAt}`;
}

export function formatPullRequestMeta(pullRequest: PullRequestDetail): string {
  const draft = pullRequest.isDraft ? "Draft" : "Ready";
  const reviewDecision = pullRequest.reviewDecision ?? "No decision";
  const mergeable = pullRequest.mergeable ?? "UNKNOWN";
  return `${draft} · ${pullRequest.state} · ${reviewDecision} · mergeable ${mergeable}`;
}
