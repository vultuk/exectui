export type AppPane = "issues" | "issue-detail" | "pull-request";

export type AppFilters = {
  openPrOnly: boolean;
};

export type RepoConfig =
  | {
      ok: true;
      fullName: string;
      owner: string;
      name: string;
      refreshIntervalMs: number;
    }
  | {
      ok: false;
      error: string;
      refreshIntervalMs: number;
    };

export type IssueSummary = {
  number: number;
  title: string;
  url: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorLogin: string;
  commentCount: number;
  labels: string[];
};

export type IssueComment = {
  authorLogin: string;
  body: string;
  createdAt: string;
  url: string;
};

export type IssueDetail = {
  number: number;
  title: string;
  url: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  state: string;
  authorLogin: string;
  labels: string[];
  comments: IssueComment[];
};

export type CheckStatus = {
  kind: "check" | "status";
  name: string;
  status: string;
  conclusion: string | null;
  description: string | null;
  url: string | null;
};

export type PullRequestSummary = {
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  state: string;
  isDraft: boolean;
  reviewDecision: string | null;
  issueNumbers: number[];
};

export type PullRequestComment = {
  authorLogin: string;
  body: string;
  createdAt: string;
  url: string;
};

export type PullRequestReviewComment = {
  authorLogin: string;
  body: string;
  createdAt: string;
  path: string | null;
  url: string;
};

export type PullRequestReview = {
  authorLogin: string;
  state: string;
  body: string;
  submittedAt: string | null;
  url: string;
  comments: PullRequestReviewComment[];
};

export type PullRequestDetail = {
  number: number;
  title: string;
  url: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  state: string;
  isDraft: boolean;
  mergeable: string | null;
  mergeStateStatus: string | null;
  reviewDecision: string | null;
  authorLogin: string;
  labels: string[];
  comments: PullRequestComment[];
  reviews: PullRequestReview[];
  checks: CheckStatus[];
};

export type WorkflowOverview = {
  issues: IssueSummary[];
  openPullRequests: PullRequestSummary[];
  openPullRequestsByIssueNumber: Record<number, PullRequestSummary>;
};
