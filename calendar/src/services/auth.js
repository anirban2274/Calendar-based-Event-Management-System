const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api";

const TOKEN_KEY = "evently_access_token";
const REFRESH_KEY = "evently_refresh_token";
const USER_KEY = "evently_user";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(tokens, user) {
  if (tokens?.access_token) {
    localStorage.setItem(TOKEN_KEY, tokens.access_token);
  }
  if (tokens?.refresh_token) {
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function requestAuth(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      body.detail ||
      Object.entries(body)
        .map(([key, value]) =>
          `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
        )
        .join("; ") ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.data = body;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function login({ username_or_email, password }) {
  const data = await requestAuth("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username_or_email, password }),
  });
  setSession(data.tokens, data.user);
  return data;
}

export async function register({ username, email, password, confirm_password }) {
  const data = await requestAuth("/auth/register/", {
    method: "POST",
    body: JSON.stringify({ username, email, password, confirm_password }),
  });
  setSession(data.tokens, data.user);
  return data;
}

export async function logout() {
  try {
    await requestAuth("/auth/logout/", { method: "POST" });
  } catch {
    // Ignore error if token was already expired
  } finally {
    clearSession();
  }
}

export async function getMe() {
  const user = await requestAuth("/auth/me/");
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function changePassword({ old_password, new_password, confirm_password }) {
  const data = await requestAuth("/auth/change-password/", {
    method: "POST",
    body: JSON.stringify({ old_password, new_password, confirm_password }),
  });
  if (data.tokens) {
    setSession(data.tokens);
  }
  return data;
}

export async function refreshAccessToken() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    clearSession();
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearSession();
      return null;
    }

    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      return data.access_token;
    }
  } catch {
    clearSession();
  }
  return null;
}

export async function loginWithGoogle(credential) {
  const data = await requestAuth("/auth/google/", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  setSession(data.tokens, data.user);
  return data;
}
