const BASE_URL = "https://api.sleeper.app/v1";

export class SleeperUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SleeperUnavailableError";
  }
}

export async function sleeperFetch<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      // Trending data is meaningfully fresh for at most a few minutes;
      // Next's default fetch cache would otherwise serve a stale count.
      next: { revalidate: 120 },
    });
  } catch {
    throw new SleeperUnavailableError("Could not reach Sleeper. Network error or Sleeper is down.");
  }

  if (!response.ok) {
    throw new SleeperUnavailableError(`Sleeper returned ${response.status} ${response.statusText}.`);
  }

  return (await response.json()) as T;
}
