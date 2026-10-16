const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(
  endpoint,
  { method = "GET", body, signal, headers = {} } = {},
) {
  if (!API_BASE_URL) {
    throw new ApiError("API base URL is not configured.");
  }

  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
    throw new ApiError("API endpoint must start with a single slash.");
  }

  const url = `${API_BASE_URL.replace(/\/$/, "")}${endpoint}`;

  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      "Unable to connect to the server. Check your connection.",
    );
  }

  let result = null;

  if (response.status !== 204) {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      try {
        result = await response.json();
      } catch {
        throw new ApiError(
          "The server returned invalid JSON.",
          response.status,
        );
      }
    } else if (response.ok) {
      throw new ApiError(
        "The server returned an unexpected response format.",
        response.status,
      );
    }
  }

  if (!response.ok) {
    throw new ApiError(
      result?.message ?? `Request failed (${response.status}).`,
      response.status,
      result?.errors ?? null,
    );
  }

  return result;
}
