/**
 * GitHub API Utilities
 *
 * Centralized GitHub API operations for CSV file operations.
 * These functions centralize GitHub API logic to follow DRY principles.
 */

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

interface GitHubFileResponse {
  content: string;
  sha: string;
}

export interface GitHubCommitResponse {
  commit: {
    html_url: string;
  };
}

/**
 * Get GitHub configuration from environment variables
 * @throws Error if required environment variables are not set
 */
function getGitHubConfig(): GitHubConfig {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !owner || !repo) {
    throw new Error(
      'GitHub credentials not configured (GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME)'
    );
  }

  return { token, owner, repo, branch };
}

/**
 * Fetch file content from GitHub repository
 *
 * @param filePath - Path to file in repository (e.g., 'data/akyo-data-ja.csv')
 * @param config - GitHub configuration (optional, uses environment variables by default)
 * @param timeoutMs - Request timeout in milliseconds (default: 30000)
 * @returns File content and SHA
 * @throws Error if request fails or times out
 */
async function fetchFileFromGitHub(
  filePath: string,
  config?: GitHubConfig,
  timeoutMs: number = 30000
): Promise<GitHubFileResponse> {
  const githubConfig = config || getGitHubConfig();
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/contents/${filePath}?ref=${githubConfig.branch}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${githubConfig.token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Akyodex-App',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`GitHub API error: ${response.status} ${body}`);
    }

    const data = (await response.json()) as { content: string; sha: string };
    return {
      content: Buffer.from(data.content, 'base64').toString('utf-8'),
      sha: data.sha,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`GitHub API request timed out (${timeoutMs}ms)`);
    }
    throw error;
  }
}

/**
 * Commit file update to GitHub repository
 *
 * @param filePath - Path to file in repository
 * @param content - New file content
 * @param sha - Current file SHA (required for update)
 * @param message - Commit message
 * @param config - GitHub configuration (optional)
 * @param timeoutMs - Request timeout in milliseconds (default: 30000)
 * @returns Commit information
 * @throws Error if commit fails or times out
 */
async function commitFileToGitHub(
  filePath: string,
  content: string,
  sha: string,
  message: string,
  config?: GitHubConfig,
  timeoutMs: number = 30000
): Promise<GitHubCommitResponse> {
  const githubConfig = config || getGitHubConfig();
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/contents/${filePath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${githubConfig.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Akyodex-App',
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch: githubConfig.branch,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      let message = `GitHub commit failed: ${response.status}`;
      // Try to parse JSON error for clarity
      try {
        const json = JSON.parse(errorBody);
        if (json.message) {
          message += ` ${json.message}`;
        }
      } catch {
        if (errorBody) {
          message += ` ${errorBody}`;
        }
      }
      throw new Error(message);
    }

    return (await response.json()) as GitHubCommitResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`GitHub API commit timed out (${timeoutMs}ms)`);
    }
    throw error;
  }
}

/**
 * Fetch CSV file from GitHub
 * Convenience wrapper for fetchFileFromGitHub with CSV-specific path
 *
 * @param csvFileName - CSV filename (default: 'akyo-data-ja.csv')
 * @param config - GitHub configuration (optional)
 * @returns CSV content and SHA
 */
export async function fetchCSVFromGitHub(
  csvFileName: string = 'akyo-data-ja.csv',
  config?: GitHubConfig
): Promise<GitHubFileResponse> {
  const filePath = `data/${csvFileName}`;
  return fetchFileFromGitHub(filePath, config);
}

/**
 * Commit CSV update to GitHub
 * Convenience wrapper for commitFileToGitHub with CSV-specific path
 *
 * @param content - New CSV content
 * @param sha - Current file SHA
 * @param message - Commit message
 * @param csvFileName - CSV filename (default: 'akyo-data-ja.csv')
 * @param config - GitHub configuration (optional)
 * @returns Commit information
 */
export async function commitCSVToGitHub(
  content: string,
  sha: string,
  message: string,
  csvFileName: string = 'akyo-data-ja.csv',
  config?: GitHubConfig
): Promise<GitHubCommitResponse> {
  const filePath = `data/${csvFileName}`;
  return commitFileToGitHub(filePath, content, sha, message, config);
}
