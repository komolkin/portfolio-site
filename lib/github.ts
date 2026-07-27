const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const REST_ENDPOINT = "https://api.github.com";

export interface GitHubMonthCommits {
  commits: number;
  from: string;
  to: string;
  username: string;
  source: "repos" | "contributions";
}

function getCredentialStatus() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const username = process.env.GITHUB_USERNAME?.trim() || "komolkin";
  return {
    token: Boolean(token),
    username,
    rawToken: token,
  };
}

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Start of the calendar month (Paris) through now. */
export function getCurrentMonthRange(timeZone = "Europe/Paris"): {
  from: string;
  to: string;
  fromDate: string;
  toDate: string;
  year: number;
  month: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
  const to = new Date().toISOString();
  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const toDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return { from, to, fromDate, toDate, year, month };
}

async function countCommitsInRepo(
  token: string,
  owner: string,
  repo: string,
  since: string,
  author: string
): Promise<number | null> {
  let page = 1;
  let total = 0;

  while (page <= 10) {
    const url = new URL(`${REST_ENDPOINT}/repos/${owner}/${repo}/commits`);
    url.searchParams.set("since", since);
    url.searchParams.set("author", author);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const response = await fetch(url, {
      headers: githubHeaders(token),
      cache: "no-store",
    });

    if (response.status === 404 || response.status === 409) {
      // Missing access, empty repo, or git repo not ready
      return page === 1 ? null : total;
    }

    if (!response.ok) {
      console.error(
        `GitHub commits failed for ${owner}/${repo}:`,
        response.status,
        await response.text()
      );
      return page === 1 ? null : total;
    }

    const commits = (await response.json()) as unknown[];
    if (!Array.isArray(commits) || commits.length === 0) break;

    total += commits.length;
    if (commits.length < 100) break;
    page += 1;
  }

  return total;
}

/** Count commits across repos the token can access (includes private with `repo` scope). */
async function countCommitsAcrossRepos(
  token: string,
  username: string,
  since: string
): Promise<number | null> {
  const reposUrl = new URL(`${REST_ENDPOINT}/user/repos`);
  reposUrl.searchParams.set("affiliation", "owner,collaborator,organization_member");
  reposUrl.searchParams.set("per_page", "100");
  reposUrl.searchParams.set("sort", "pushed");
  reposUrl.searchParams.set("direction", "desc");

  const response = await fetch(reposUrl, {
    headers: githubHeaders(token),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(
      "GitHub list repos failed:",
      response.status,
      await response.text()
    );
    return null;
  }

  const repos = (await response.json()) as Array<{
    name: string;
    full_name: string;
    owner: { login: string };
    pushed_at: string | null;
    fork: boolean;
  }>;

  if (!Array.isArray(repos)) return null;

  const sinceMs = Date.parse(since);
  const candidates = repos.filter(
    (repo) => repo.pushed_at && Date.parse(repo.pushed_at) >= sinceMs && !repo.fork
  );

  // Always try explicitly configured extras (e.g. private portfolio) even if missing from list
  const extraRepos = (process.env.GITHUB_COMMIT_REPOS || "komolkin/portfolio-site")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set(candidates.map((r) => r.full_name));
  const targets = [
    ...candidates.map((r) => ({ owner: r.owner.login, repo: r.name, full: r.full_name })),
    ...extraRepos
      .filter((full) => !seen.has(full))
      .map((full) => {
        const [owner, repo] = full.split("/");
        return owner && repo ? { owner, repo, full } : null;
      })
      .filter((v): v is { owner: string; repo: string; full: string } => Boolean(v)),
  ];

  let total = 0;
  let anyAccessible = false;

  for (const target of targets) {
    const count = await countCommitsInRepo(
      token,
      target.owner,
      target.repo,
      since,
      username
    );
    if (count !== null) {
      anyAccessible = true;
      total += count;
    }
  }

  return anyAccessible ? total : null;
}

async function countContributionCommits(
  token: string,
  username: string,
  from: string,
  to: string
): Promise<number | null> {
  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
        }
      }
    }
  `;

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { login: username, from, to },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(
      "GitHub GraphQL request failed:",
      response.status,
      await response.text()
    );
    return null;
  }

  const json = (await response.json()) as {
    data?: {
      user?: {
        contributionsCollection?: {
          totalCommitContributions?: number;
        };
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    console.error("GitHub GraphQL errors:", json.errors);
    return null;
  }

  return (
    json.data?.user?.contributionsCollection?.totalCommitContributions ?? 0
  );
}

export async function getCurrentMonthCommits(): Promise<GitHubMonthCommits | null> {
  const { token, username, rawToken } = getCredentialStatus();
  if (!token || !rawToken) {
    console.error("GITHUB_TOKEN is not configured");
    return null;
  }

  const { from, to } = getCurrentMonthRange();

  try {
    const repoCount = await countCommitsAcrossRepos(rawToken, username, from);
    if (repoCount !== null) {
      return { commits: repoCount, from, to, username, source: "repos" };
    }

    const contributionCount = await countContributionCommits(
      rawToken,
      username,
      from,
      to
    );
    if (contributionCount === null) return null;

    return {
      commits: contributionCount,
      from,
      to,
      username,
      source: "contributions",
    };
  } catch (error) {
    console.error("Error fetching GitHub commits:", error);
    return null;
  }
}
