import { useEffect, useRef, useState } from "react"
import { categories, dateKey, formatDate, formatTime, monthDays } from "./data"
import {
  changePassword,
  login,
  register,
  loginWithGoogle,
} from "./services/auth"
import {
  getAdminOverview,
  getAdminUsers,
  toggleAdminUserActive,
} from "./services/events"

export function Icon({ name, size = 18 }) {
  const paths = {
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2" />
      </>
    ),
    sidebar: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M9 4v16" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    left: <path d="m14 6-6 6 6 6" />,
    right: <path d="m10 6 6 6-6 6" />,
    down: <path d="m6 9 6 6 6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    history: (
      <>
        <path d="M3 10a9 9 0 1 1 1 7M3 4v6h6" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    moon: <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />,
    edit: (
      <>
        <path d="m15 4 5 5-11 11-6 1 1-6Z" />
        <path d="m13 6 5 5" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
      </>
    ),
    logout: (
      <>
        <path d="M9 4H4v16h5m5-8H8m7-5 5 5-5 5" />
      </>
    ),
    spinner: (
      <path
        d="M21 12a9 9 0 1 1-6.219-8.56"
        strokeLinecap="round"
        className="animate-spin"
      />
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.calendar}
    </svg>
  )
}

export function IconButton({ name, title, onClick, className = "", disabled = false }) {
  return (
    <button
      className={`icon-button ${className}`}
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name={name} />
    </button>
  )
}

export function EventRow({ event, onSelect, onMenu, compact = false }) {
  return (
    <div className={`event-row ${compact ? "compact" : ""}`}>
      <button className="event-row-main" onClick={() => onSelect(event)}>
        <span
          className="dot"
          style={{ background: categories[event.category] || "#6ba6f8" }}
        />
        <span className="event-row-text">
          <strong>{event.title}</strong>
          <small>
            {formatDate(event.startDate)}
            <span className="text-separator">·</span>
            {formatTime(event.startTime)}
          </small>
        </span>
      </button>
      {onMenu && (
        <IconButton
          name="more"
          title={`Options for ${event.title}`}
          onClick={(e) => onMenu(event, e)}
        />
      )}
    </div>
  )
}

export function MiniCalendar({
  date,
  today,
  onDate,
  onNavigate,
  small = false,
}) {
  return (
    <div className={`mini-calendar ${small ? "year-mini" : ""}`}>
      <div className="mini-heading">
        {onNavigate && (
          <IconButton
            name="left"
            title="Previous mini calendar month"
            onClick={() => onNavigate(-1)}
          />
        )}
        <strong>
          {date.toLocaleDateString("en-US", {
            month: "long",
            ...(small ? {} : { year: "numeric" }),
          })}
        </strong>
        {onNavigate && (
          <IconButton
            name="right"
            title="Next mini calendar month"
            onClick={() => onNavigate(1)}
          />
        )}
      </div>
      <div className="mini-days">
        {"SMTWTFS".split("").map((day, i) => (
          <span key={i}>{day}</span>
        ))}
        {monthDays(date).map((day) => (
          <button
            key={dateKey(day)}
            className={`${day.getMonth() !== date.getMonth() ? "muted" : ""} ${
              dateKey(day) === today ? "today" : ""
            }`}
            onClick={() => onDate(day)}
          >
            {day.getDate()}
          </button>
        ))}
      </div>
    </div>
  )
}

export function EventForm({ event, selectedDate, onSave, onCancel, currentUser }) {
  const [form, setForm] = useState(
    event || {
      title: "",
      description: "",
      startDate: selectedDate,
      endDate: selectedDate,
      startTime: "09:00",
      endTime: "10:00",
      location: "",
      category: "Personal",
      organizer: currentUser?.username || "You",
    },
  )
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  async function save(e) {
    e.preventDefault()
    if (submitting) return

    const next = {}
    if (!form.title.trim()) next.title = "Give your event a title."
    if (!form.startDate || !form.startTime)
      next.startDate = "Choose a start date and time."
    if (!form.endDate || !form.endTime)
      next.endDate = "Choose an end date and time."
    else if (
      new Date(`${form.endDate}T${form.endTime}`) <=
      new Date(`${form.startDate}T${form.startTime}`)
    ) {
      next.endDate = "End datetime must be later than the start datetime."
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      await onSave({
        ...form,
        title: form.title.trim(),
        organizer: currentUser?.username || form.organizer,
      })
    } finally {
      setSubmitting(false)
    }
  }

  function field(key, label, type = "text") {
    return (
      <label
        className={key === "title" || key === "description" ? "full-width" : ""}
      >
        {label}
        {key === "description" ? (
          <textarea
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            rows="3"
            placeholder="Add notes, links, or agenda..."
          />
        ) : (
          <input
            autoFocus={key === "title"}
            type={type}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        )}
        {errors[key] && <small className="error">{errors[key]}</small>}
      </label>
    )
  }

  return (
    <form onSubmit={save} className="event-form">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            {event ? "MAKE IT YOURS" : "SOMETHING TO LOOK FORWARD TO"}
          </span>
          <h2>{event ? "Edit event" : "New event"}</h2>
        </div>
        <button
          type="submit"
          title={submitting ? "Saving..." : "Save event"}
          aria-label={submitting ? "Saving..." : "Save event"}
          className="save-check"
          disabled={submitting}
          style={{ background: categories[form.category] || "#6ba6f8" }}
        >
          {submitting ? (
            <Icon name="spinner" size={20} />
          ) : (
            <Icon name="check" size={23} />
          )}
        </button>
      </div>
      <div className="form-grid">
        {field("title", "Event title *")}
        {field("description", "Description")}
        {field("startDate", "Start date *", "date")}
        {field("endDate", "End date *", "date")}
        {field("startTime", "Start time *", "time")}
        {field("endTime", "End time *", "time")}
        {field("location", "Location")}
        <label>
          Category
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {Object.keys(categories).map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          Organizer
          <input
            type="text"
            value={currentUser?.username || form.organizer}
            readOnly
            className="opacity-75 cursor-not-allowed"
          />
        </label>
      </div>
      <div className="form-footer">
        <span>Saved securely to your account</span>
        <button
          type="button"
          className="secondary-button"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export function PasswordForm({ onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.")
      return
    }

    setSubmitting(true)
    try {
      await changePassword({
        old_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      setSuccess("Your password was updated successfully.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      if (onSuccess) setTimeout(onSuccess, 1500)
    } catch (err) {
      setError(err.message || "Failed to change password. Please check your current password.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="password-form" onSubmit={handleSubmit}>
      <span className="eyebrow">SECURITY SETTINGS</span>
      <h2>Change password</h2>
      <p>Ensure your account is protected with a strong password.</p>

      {error && <p className="error" role="alert" style={{ margin: "10px 0" }}>{error}</p>}
      {success && <p className="success" role="status" style={{ color: "#70bf91", margin: "10px 0" }}>{success}</p>}

      <label>
        Current password
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </label>
      <label>
        New password (min 8 chars)
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </label>
      <label>
        Confirm new password
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </label>

      <button
        type="submit"
        className="primary-button"
        disabled={submitting}
        style={{ marginTop: "18px" }}
      >
        {submitting ? "Updating password..." : "Save password"}
      </button>
    </form>
  )
}

export function AuthModal({ onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const googleBtnRef = useRef(null)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!googleClientId) return

    // Dynamically load Google Identity Services if client ID is configured
    if (!window.google?.accounts?.id) {
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.onload = initializeGoogleSignIn
      document.body.appendChild(script)
    } else {
      initializeGoogleSignIn()
    }

    function initializeGoogleSignIn() {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response.credential) return
            setLoading(true)
            setError("")
            try {
              const res = await loginWithGoogle(response.credential)
              onAuthSuccess(res.user)
            } catch (err) {
              setError(err.message || "Google sign-in failed.")
            } finally {
              setLoading(false)
            }
          },
        })
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
        })
      } catch (e) {
        console.error("GIS initialization error:", e)
      }
    }
  }, [googleClientId, onAuthSuccess])

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")

    if (isRegister) {
      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.")
        return
      }
    }

    setLoading(true)
    try {
      let res
      if (isRegister) {
        res = await register({
          username: username.trim(),
          email: email.trim(),
          password,
          confirm_password: confirmPassword,
        })
      } else {
        res = await login({
          username_or_email: username.trim(),
          password,
        })
      }
      onAuthSuccess(res.user)
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" style={{ zIndex: 100 }}>
      <div className="floating-panel" style={{ width: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div className="brand" style={{ justifyContent: "center", marginBottom: "8px" }}>
            <span className="brand-icon">
              <Icon name="calendar" size={26} />
            </span>
            <span>
              evently<span className="brand-period">.</span>
            </span>
          </div>
          <span className="eyebrow">
            {isRegister ? "CREATE YOUR PRIVATE WORKSPACE" : "SIGN IN TO YOUR CALENDAR"}
          </span>
          <h2>{isRegister ? "Create account" : "Welcome back"}</h2>
        </div>

        {error && (
          <div
            className="error"
            role="alert"
            style={{
              padding: "10px 14px",
              background: "#382323",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "11px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <label>
            Username {isRegister ? "*" : "or Email *"}
            <input
              type="text"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isRegister ? "yourusername" : "Username or email"}
            />
          </label>

          {isRegister && (
            <label>
              Email address *
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </label>
          )}

          <label>
            Password *
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {isRegister && (
            <label>
              Confirm password *
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
            style={{ width: "100%", padding: "12px", marginTop: "8px" }}
          >
            {loading
              ? isRegister
                ? "Creating account..."
                : "Signing in..."
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        {googleClientId && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                margin: "18px 0 12px",
                color: "var(--muted)",
                fontSize: "10px",
              }}
            >
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span>OR</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>
            <div
              ref={googleBtnRef}
              style={{ display: "flex", justifyContent: "center", minHeight: "44px" }}
            />
          </>
        )}

        <div style={{ textAlign: "center", marginTop: "22px", fontSize: "11px", color: "var(--secondary)" }}>
          {isRegister ? (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false)
                  setError("")
                }}
                style={{ color: "var(--accent)", textDecoration: "underline" }}
              >
                Sign in
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true)
                  setError("")
                }}
                style={{ color: "var(--accent)", textDecoration: "underline" }}
              >
                Create one
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function AdminPanel({ onClose }) {
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [confirmUser, setConfirmUser] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([getAdminOverview(), getAdminUsers()])
      .then(([ov, us]) => {
        if (!active) return
        setOverview(ov)
        setUsers(us)
        setError("")
      })
      .catch((err) => {
        if (!active) return
        setError(err.message || "Could not load administrative data.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleToggleActive(user) {
    setActionLoading(true)
    try {
      const res = await toggleAdminUserActive(user.id)
      setUsers((current) =>
        current.map((u) => (u.id === user.id ? { ...u, is_active: res.is_active } : u))
      )
      setConfirmUser(null)
    } catch (err) {
      alert(`Action failed: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="floating-panel"
        style={{ width: "700px", maxWidth: "calc(100vw - 32px)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <IconButton
          className="panel-close"
          name="close"
          title="Close admin panel"
          onClick={onClose}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <Icon name="shield" size={20} />
          <span className="eyebrow">SYSTEM ADMINISTRATION</span>
        </div>
        <h2>Administrative Dashboard</h2>

        {loading ? (
          <p className="empty-state">Loading administration overview...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              <div className="stat" style={{ padding: "14px" }}>
                <span>Total Users</span>
                <strong style={{ fontSize: "28px" }}>{overview?.total_users || 0}</strong>
              </div>
              <div className="stat" style={{ padding: "14px" }}>
                <span>Active Users</span>
                <strong style={{ fontSize: "28px" }}>{overview?.active_users || 0}</strong>
              </div>
              <div className="stat" style={{ padding: "14px" }}>
                <span>Total System Events</span>
                <strong style={{ fontSize: "28px" }}>{overview?.total_events || 0}</strong>
              </div>
            </div>

            <h3 style={{ fontSize: "14px", fontWeight: "600", margin: "18px 0 10px" }}>
              Registered Users & Event Counts
            </h3>
            <div style={{ maxHeight: "300px", overflow: "auto", border: "1px solid var(--border)", borderRadius: "6px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--hover)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "8px 12px" }}>User</th>
                    <th style={{ padding: "8px 12px" }}>Email</th>
                    <th style={{ padding: "8px 12px" }}>Events</th>
                    <th style={{ padding: "8px 12px" }}>Role</th>
                    <th style={{ padding: "8px 12px" }}>Status</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 12px", fontWeight: "500" }}>{u.username}</td>
                      <td style={{ padding: "8px 12px", color: "var(--secondary)" }}>{u.email || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{u.event_count}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {u.is_superuser ? "Superuser" : u.is_staff ? "Staff" : "Member"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "9px",
                            background: u.is_active ? "#2b4033" : "#402626",
                            color: u.is_active ? "#70bf91" : "#ee9696",
                          }}
                        >
                          {u.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        {!u.is_superuser && (
                          <button
                            className="secondary-button"
                            style={{ padding: "4px 8px", fontSize: "10px" }}
                            onClick={() => setConfirmUser(u)}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {confirmUser && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "14px",
                  borderRadius: "6px",
                  background: "var(--hover)",
                  border: "1px solid var(--border)",
                }}
              >
                <strong style={{ display: "block", marginBottom: "6px" }}>
                  Confirm {confirmUser.is_active ? "Deactivation" : "Activation"}
                </strong>
                <p style={{ margin: "0 0 12px", fontSize: "11px", color: "var(--secondary)" }}>
                  Are you sure you want to {confirmUser.is_active ? "deactivate" : "activate"} user{" "}
                  <strong>{confirmUser.username}</strong>?
                </p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button
                    className="secondary-button"
                    onClick={() => setConfirmUser(null)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className={confirmUser.is_active ? "danger-button" : "primary-button"}
                    onClick={() => handleToggleActive(confirmUser)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
