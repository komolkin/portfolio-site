const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

export interface GitHubMonthCommits {
  commits: number;
  from: string;
  to: string;
  username: string;
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

/** Start of the calendar month (Paris) through now, as ISO timestamps for GitHub. */
export function getCurrentMonthRange(timeZone = "Europe/Paris"): {
  from: string;
  to: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);

  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
  const to = new Date().toISOString();

  return { from, to };
}

export async function getCurrentMonthCommits(): Promise<GitHubMonthCommits | null> {
  const { token, username, rawToken } = getCredentialStatus();
  if (!token || !rawToken) {
    console.error("GITHUB_TOKEN is not configured");
    return null;
  }

  const { from, to } = getCurrentMonthRange();

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
        }
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawToken}`,
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

    const commits =
      json.data?.user?.contributionsCollection?.totalCommitContributions ?? 0;

    return { commits, from, to, username };
  } catch (error) {
    console.error("Error fetching GitHub commits:", error);
    return null;
  }
}
