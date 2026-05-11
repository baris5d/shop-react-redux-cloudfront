import axios from "axios";
import API_PATHS from "~/constants/apiPaths";

const AUTH_TOKEN_KEY = "authorization_token";

export function getAuthorizationToken(): string | null {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token || token === "null" || token === "undefined") {
    return null;
  }
  return token;
}

export function getBasicAuthHeaders(): Record<string, string> | undefined {
  const token = getAuthorizationToken();
  return token ? { Authorization: `Basic ${token}` } : undefined;
}

export async function ensureAuthorizationToken(): Promise<void> {
  if (getAuthorizationToken()) {
    return;
  }

  const username = import.meta.env.VITE_AUTH_USERNAME || "baris_dede";
  const password = import.meta.env.VITE_AUTH_PASSWORD || "TEST_PASSWORD";

  try {
    await axios.post(`${API_PATHS.cart}/auth/register`, {
      name: username,
      password,
    });
  } catch {
    // Ignore registration conflicts and continue with login.
  }

  const loginResponse = await axios.post<{ access_token?: string }>(
    `${API_PATHS.cart}/auth/login`,
    {
      username,
      password,
    },
  );

  const token = loginResponse.data?.access_token;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}