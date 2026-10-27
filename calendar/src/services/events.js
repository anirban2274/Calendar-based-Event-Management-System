import {
  getStoredToken,
  refreshAccessToken,
  clearSession,
} from "./auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api";

const UI_TO_API_CATEGORY = {
  Personal: "personal",
  "College & clubs": "college",
  "Holidays & occasions": "holiday",
  "Deadlines & tasks": "deadline",
  Social: "social",
  Other: "other",
};

const API_TO_UI_CATEGORY = Object.fromEntries(
  Object.entries(UI_TO_API_CATEGORY).map(([ui, api]) => [api, ui])
);

API_TO_UI_CATEGORY.other = "Personal";

function datePart(value) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timePart(value) {
  if (!value) return "09:00";
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromApi(event) {
  return {
    id: event.id,
    title: event.title,
    description: event.description || "",
    startDate: datePart(event.start_datetime),
    endDate: datePart(event.end_datetime),
    startTime: timePart(event.start_datetime),
    endTime: timePart(event.end_datetime),
    location: event.location || "",
    category: API_TO_UI_CATEGORY[event.category] || "Personal",
    organizer: event.organizer_name || "You",
    createdAt: event.created_at || new Date().toISOString(),
    updatedAt: event.updated_at || new Date().toISOString(),
  };
}

export function toApi(event) {
  return {
    title: event.title,
    description: event.description || "",
    start_datetime: new Date(
      `${event.startDate}T${event.startTime}:00`
    ).toISOString(),
    end_datetime: new Date(
      `${event.endDate}T${event.endTime}:00`
    ).toISOString(),
    location: event.location || "",
    category: UI_TO_API_CATEGORY[event.category] || "personal",
  };
}

export async function request(path, options = {}, isRetry = false) {
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

  // Handle expired access token with automatic refresh
  if (response.status === 401 && !isRetry && !path.startsWith("/auth/")) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request(path, options, true);
    } else {
      clearSession();
      window.dispatchEvent(new CustomEvent("evently:session-expired"));
      throw new Error("Session expired. Please log in again.");
    }
  }

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

export async function getEvents(params = {}) {
  const query = new URLSearchParams(params).toString();
  const result = await request(`/events/${query ? `?${query}` : ""}`);

  const records = Array.isArray(result)
    ? result
    : result.results || [];

  return records.map(fromApi);
}

export async function getDashboardStats() {
  return request("/events/dashboard-stats/");
}

export async function createEvent(event) {
  const saved = await request("/events/", {
    method: "POST",
    body: JSON.stringify(toApi(event)),
  });

  return fromApi(saved);
}

export async function updateEvent(id, event) {
  const saved = await request(`/events/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(toApi(event)),
  });

  return fromApi(saved);
}

export function deleteEvent(id) {
  return request(`/events/${id}/`, {
    method: "DELETE",
  });
}

// Administrative API methods
export async function getAdminOverview() {
  return request("/admin/overview/");
}

export async function getAdminUsers() {
  return request("/admin/users/");
}

export async function toggleAdminUserActive(userId) {
  return request(`/admin/users/${userId}/toggle-active/`, {
    method: "POST",
  });
}
