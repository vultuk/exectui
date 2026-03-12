import type {
  CheckStatus,
  IssueComment,
  IssueDetail,
  IssueSummary,
  PullRequestComment,
  PullRequestDetail,
  PullRequestReview,
  PullRequestReviewComment,
  PullRequestSummary,
  RepoConfig,
  WorkflowOverview,
} from "../types";

const DEFAULT_REFRESH_INTERVAL_SECONDS = 30;

type GraphQlEnvelope<T> = {
  data?: T;
  errors?: { message?: string }[];
};

const OVERVIEW_QUERY = `
  query WorkflowOverview(
    $owner: String!
    $name: String!
    $issueLimit: Int!
    $prLimit: Int!
  ) {
    repository(owner: $owner, name: $name) {
      issues(
        first: $issueLimit
        states: OPEN
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        nodes {
          number
          title
          url
          body
          createdAt
          updatedAt
          author {
            login
          }
          comments {
            totalCount
          }
          labels(first: 20) {
            nodes {
              name
            }
          }
        }
      }
      pullRequests(
        first: $prLimit
        states: OPEN
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          number
          title
          url
          updatedAt
          state
          isDraft
          reviewDecision
          closingIssuesReferences(first: 20) {
            nodes {
              number
            }
          }
        }
      }
    }
  }
`;

const ISSUE_DETAIL_QUERY = `
  query IssueDetail($owner: String!, $name: String!, $issue: Int!) {
    repository(owner: $owner, name: $name) {
      issue(number: $issue) {
        number
        title
        url
        body
        createdAt
        updatedAt
        state
        author {
          login
        }
        labels(first: 20) {
          nodes {
            name
          }
        }
        comments(first: 100) {
          nodes {
            body
            createdAt
            url
            author {
              login
            }
          }
        }
      }
    }
  }
`;

const PR_DETAIL_QUERY = `
  query PullRequestDetail($owner: String!, $name: String!, $pr: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $pr) {
        number
        title
        url
        body
        createdAt
        updatedAt
        state
        isDraft
        mergeable
        mergeStateStatus
        reviewDecision
        author {
          login
        }
        labels(first: 20) {
          nodes {
            name
          }
        }
        comments(first: 100) {
          nodes {
            body
            createdAt
            url
            author {
              login
            }
          }
        }
        reviews(first: 100) {
          nodes {
            state
            body
            submittedAt
            url
            author {
              login
            }
            comments(first: 50) {
              nodes {
                body
                createdAt
                path
                url
                author {
                  login
                }
              }
            }
          }
        }
        statusCheckRollup {
          contexts(first: 50) {
            nodes {
              __typename
              ... on CheckRun {
                name
                status
                conclusion
                detailsUrl
              }
              ... on StatusContext {
                context
                state
                description
                targetUrl
              }
            }
          }
        }
      }
    }
  }
`;

export function getRepoConfig(): RepoConfig {
  const fullName =
    process.env.GITHUB_REPOSITORY?.trim() || process.env.GH_REPO?.trim() || "";
  const refreshIntervalSeconds =
    Number.parseInt(process.env.GITHUB_REFRESH_INTERVAL_SECONDS ?? "", 10) ||
    DEFAULT_REFRESH_INTERVAL_SECONDS;
  const refreshIntervalMs = Math.max(refreshIntervalSeconds, 10) * 1000;

  if (!fullName) {
    return {
      ok: false,
      error:
        "Set GITHUB_REPOSITORY=owner/repo before launching the TUI. Example: GITHUB_REPOSITORY=vultuk/exectui bun run start",
      refreshIntervalMs,
    };
  }

  const [owner, name, ...rest] = fullName.split("/");
  if (!owner || !name || rest.length > 0) {
    return {
      ok: false,
      error: `Invalid repository "${fullName}". Use the format owner/repo.`,
      refreshIntervalMs,
    };
  }

  return {
    ok: true,
      fullName,
      owner,
      name,
      refreshIntervalMs,
    };
}

export async function fetchWorkflowOverview(
  config: Extract<RepoConfig, { ok: true }>,
): Promise<WorkflowOverview> {
  const data = await runGraphql<OverviewResponse>(OVERVIEW_QUERY, {
    owner: config.owner,
    name: config.name,
    issueLimit: 50,
    prLimit: 100,
  });

  const repository = data.repository;
  if (!repository) {
    throw new Error(`Repository ${config.fullName} was not returned by GitHub.`);
  }

  const issues = (repository.issues.nodes ?? []).map(mapIssueSummary);
  const openPullRequests = (repository.pullRequests.nodes ?? []).map(mapPullRequestSummary);
  const openPullRequestsByIssueNumber: Record<number, PullRequestSummary> = {};

  for (const pullRequest of openPullRequests) {
    for (const issueNumber of pullRequest.issueNumbers) {
      if (!openPullRequestsByIssueNumber[issueNumber]) {
        openPullRequestsByIssueNumber[issueNumber] = pullRequest;
      }
    }
  }

  return {
    issues,
    openPullRequests,
    openPullRequestsByIssueNumber,
  };
}

export async function fetchIssueDetail(
  config: Extract<RepoConfig, { ok: true }>,
  issueNumber: number,
): Promise<IssueDetail> {
  const data = await runGraphql<IssueDetailResponse>(ISSUE_DETAIL_QUERY, {
    owner: config.owner,
    name: config.name,
    issue: issueNumber,
  });

  const issue = data.repository?.issue;
  if (!issue) {
    throw new Error(`Issue #${issueNumber} was not found in ${config.fullName}.`);
  }

  return mapIssueDetail(issue);
}

export async function fetchPullRequestDetail(
  config: Extract<RepoConfig, { ok: true }>,
  pullRequestNumber: number,
): Promise<PullRequestDetail> {
  const data = await runGraphql<PullRequestDetailResponse>(PR_DETAIL_QUERY, {
    owner: config.owner,
    name: config.name,
    pr: pullRequestNumber,
  });

  const pullRequest = data.repository?.pullRequest;
  if (!pullRequest) {
    throw new Error(
      `Pull request #${pullRequestNumber} was not found in ${config.fullName}.`,
    );
  }

  return mapPullRequestDetail(pullRequest);
}

async function runGraphql<T>(
  query: string,
  variables: Record<string, string | number>,
): Promise<T> {
  const args = ["api", "graphql", "-f", `query=${query}`];

  for (const [key, value] of Object.entries(variables)) {
    if (typeof value === "number") {
      args.push("-F", `${key}=${value}`);
      continue;
    }

    args.push("-f", `${key}=${value}`);
  }

  const stdout = await runGhJson<GraphQlEnvelope<T>>(args);
  if (stdout.errors?.length) {
    const firstMessage = stdout.errors[0]?.message ?? "GitHub GraphQL request failed.";
    throw new Error(firstMessage);
  }

  if (!stdout.data) {
    throw new Error("GitHub GraphQL response did not include data.");
  }

  return stdout.data;
}

async function runGhJson<T>(args: string[]): Promise<T> {
  const child = Bun.spawn({
    cmd: ["gh", ...args],
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      GH_PAGER: "cat",
    },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || stdout.trim() || `gh exited with code ${exitCode}`);
  }

  try {
    return JSON.parse(stdout) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse GitHub response: ${message}`);
  }
}

function mapIssueSummary(node: OverviewIssueNode): IssueSummary {
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    body: node.body ?? "",
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    authorLogin: node.author?.login ?? "ghost",
    commentCount: node.comments.totalCount,
    labels: compactNames(node.labels.nodes),
  };
}

function mapIssueDetail(node: IssueDetailNode): IssueDetail {
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    body: node.body ?? "",
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    state: node.state,
    authorLogin: node.author?.login ?? "ghost",
    labels: compactNames(node.labels.nodes),
    comments: (node.comments.nodes ?? []).map(mapIssueComment),
  };
}

function mapIssueComment(node: IssueCommentNode): IssueComment {
  return {
    authorLogin: node.author?.login ?? "ghost",
    body: node.body ?? "",
    createdAt: node.createdAt,
    url: node.url,
  };
}

function mapPullRequestSummary(node: OverviewPullRequestNode): PullRequestSummary {
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    updatedAt: node.updatedAt,
    state: node.state,
    isDraft: node.isDraft,
    reviewDecision: node.reviewDecision,
    issueNumbers: (node.closingIssuesReferences.nodes ?? [])
      .map((issue) => issue?.number)
      .filter((value): value is number => typeof value === "number"),
  };
}

function mapPullRequestDetail(node: PullRequestDetailNode): PullRequestDetail {
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    body: node.body ?? "",
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    state: node.state,
    isDraft: node.isDraft,
    mergeable: node.mergeable,
    mergeStateStatus: node.mergeStateStatus,
    reviewDecision: node.reviewDecision,
    authorLogin: node.author?.login ?? "ghost",
    labels: compactNames(node.labels.nodes),
    comments: (node.comments.nodes ?? []).map(mapPullRequestComment),
    reviews: (node.reviews.nodes ?? []).map(mapPullRequestReview),
    checks: mapCheckStatuses(node.statusCheckRollup?.contexts.nodes ?? []),
  };
}

function mapPullRequestComment(node: PullRequestCommentNode): PullRequestComment {
  return {
    authorLogin: node.author?.login ?? "ghost",
    body: node.body ?? "",
    createdAt: node.createdAt,
    url: node.url,
  };
}

function mapPullRequestReview(node: PullRequestReviewNode): PullRequestReview {
  return {
    authorLogin: node.author?.login ?? "ghost",
    state: node.state,
    body: node.body ?? "",
    submittedAt: node.submittedAt,
    url: node.url,
    comments: (node.comments.nodes ?? []).map(mapPullRequestReviewComment),
  };
}

function mapPullRequestReviewComment(
  node: PullRequestReviewCommentNode,
): PullRequestReviewComment {
  return {
    authorLogin: node.author?.login ?? "ghost",
    body: node.body ?? "",
    createdAt: node.createdAt,
    path: node.path,
    url: node.url,
  };
}

function mapCheckStatuses(nodes: CheckStatusNode[]): CheckStatus[] {
  const checks: CheckStatus[] = [];

  for (const node of nodes) {
    if (!node) {
      continue;
    }

    if (node.__typename === "CheckRun") {
      checks.push({
        kind: "check",
        name: node.name,
        status: node.status,
        conclusion: node.conclusion,
        description: null,
        url: node.detailsUrl,
      });
      continue;
    }

    if (node.__typename === "StatusContext") {
      checks.push({
        kind: "status",
        name: node.context,
        status: node.state,
        conclusion: node.state,
        description: node.description,
        url: node.targetUrl,
      });
    }
  }

  return checks;
}

function compactNames(nodes: Array<{ name?: string | null } | null> | null | undefined): string[] {
  return (nodes ?? [])
    .map((node) => node?.name?.trim())
    .filter((value): value is string => Boolean(value));
}

type OverviewResponse = {
  repository: {
    issues: {
      nodes: OverviewIssueNode[];
    };
    pullRequests: {
      nodes: OverviewPullRequestNode[];
    };
  } | null;
};

type OverviewIssueNode = {
  number: number;
  title: string;
  url: string;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    login: string | null;
  } | null;
  comments: {
    totalCount: number;
  };
  labels: {
    nodes: Array<{ name?: string | null } | null>;
  };
};

type OverviewPullRequestNode = {
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  state: string;
  isDraft: boolean;
  reviewDecision: string | null;
  closingIssuesReferences: {
    nodes: Array<{ number?: number | null } | null>;
  };
};

type IssueDetailResponse = {
  repository: {
    issue: IssueDetailNode | null;
  } | null;
};

type IssueDetailNode = {
  number: number;
  title: string;
  url: string;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  state: string;
  author: {
    login: string | null;
  } | null;
  labels: {
    nodes: Array<{ name?: string | null } | null>;
  };
  comments: {
    nodes: IssueCommentNode[];
  };
};

type IssueCommentNode = {
  body: string | null;
  createdAt: string;
  url: string;
  author: {
    login: string | null;
  } | null;
};

type PullRequestDetailResponse = {
  repository: {
    pullRequest: PullRequestDetailNode | null;
  } | null;
};

type PullRequestDetailNode = {
  number: number;
  title: string;
  url: string;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  state: string;
  isDraft: boolean;
  mergeable: string | null;
  mergeStateStatus: string | null;
  reviewDecision: string | null;
  author: {
    login: string | null;
  } | null;
  labels: {
    nodes: Array<{ name?: string | null } | null>;
  };
  comments: {
    nodes: PullRequestCommentNode[];
  };
  reviews: {
    nodes: PullRequestReviewNode[];
  };
  statusCheckRollup: {
    contexts: {
      nodes: CheckStatusNode[];
    };
  } | null;
};

type PullRequestCommentNode = {
  body: string | null;
  createdAt: string;
  url: string;
  author: {
    login: string | null;
  } | null;
};

type PullRequestReviewNode = {
  state: string;
  body: string | null;
  submittedAt: string | null;
  url: string;
  author: {
    login: string | null;
  } | null;
  comments: {
    nodes: PullRequestReviewCommentNode[];
  };
};

type PullRequestReviewCommentNode = {
  body: string | null;
  createdAt: string;
  path: string | null;
  url: string;
  author: {
    login: string | null;
  } | null;
};

type CheckRunNode = {
  __typename: "CheckRun";
  name: string;
  status: string;
  conclusion: string | null;
  detailsUrl: string | null;
};

type StatusContextNode = {
  __typename: "StatusContext";
  context: string;
  state: string;
  description: string | null;
  targetUrl: string | null;
};

type CheckStatusNode = CheckRunNode | StatusContextNode | null;
