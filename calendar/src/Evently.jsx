import { useEffect, useState, useCallback, useMemo } from "react"
import {
  categories,
  dateKey,
  addDays,
  formatDate,
  formatTime,
  startOfEvent,
  endOfEvent,
  eventsOn,
  monthDays,
} from "./data"

import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getDashboardStats,
} from "./services/events"

import {
  getStoredToken,
  getStoredUser,
  getMe,
  logout,
} from "./services/auth"

import {
  Icon,
  IconButton,
  EventRow,
  MiniCalendar,
  EventForm,
  PasswordForm,
  AuthModal,
  AdminPanel,
} from "./components"

export default function App() {
  const now = useMemo(() => new Date(), [])
  const today = useMemo(() => dateKey(now), [now])

  // Authentication state
  const [currentUser, setCurrentUser] = useState(() => getStoredUser())
  const [isAuthLoading, setIsAuthLoading] = useState(() => Boolean(getStoredToken() && !getStoredUser()))
  const [showAuthModal, setShowAuthModal] = useState(() => !getStoredToken())

  // Events & Dashboard state
  const [events, setEvents] = useState([])
  const [dashboardStats, setDashboardStats] = useState(null)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [apiError, setApiError] = useState("")
  const [feedbackNotice, setFeedbackNotice] = useState("")

  // Appearance & Calendar view state
  const [theme, setTheme] = useState(
    () => localStorage.getItem("evently-theme") || "dark"
  )
  const [date, setDate] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate())
  )
  const [miniDate, setMiniDate] = useState(date)
  const [collapsed, setCollapsed] = useState(false)
  const [view, setView] = useState("Month")
  const [page, setPage] = useState("calendar")
  const [panel, setPanel] = useState(null)
  const [menu, setMenu] = useState(null)
  const [query, setQuery] = useState("")
  const [searchDbResults, setSearchDbResults] = useState([])
  const [searchingDb, setSearchingDb] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [visibleCategories, setVisibleCategories] = useState(
    Object.keys(categories)
  )

  // Validate or fetch current user on initial mount
  useEffect(() => {
    if (getStoredToken()) {
      getMe()
        .then((user) => {
          setCurrentUser(user)
          setShowAuthModal(false)
        })
        .catch(() => {
          setCurrentUser(null)
          setShowAuthModal(true)
        })
        .finally(() => {
          setIsAuthLoading(false)
        })
    } else {
      setIsAuthLoading(false)
      setShowAuthModal(true)
    }

    const onSessionExpired = () => {
      setCurrentUser(null)
      setShowAuthModal(true)
      setEvents([])
      setDashboardStats(null)
      setApiError("Your session expired. Please sign in again.")
    }

    window.addEventListener("evently:session-expired", onSessionExpired)
    return () => window.removeEventListener("evently:session-expired", onSessionExpired)
  }, [])

  // Fetch events & statistics for authenticated user
  const refreshData = useCallback(async () => {
    if (!currentUser) return
    setLoadingEvents(true)
    try {
      const [loadedEvents, stats] = await Promise.all([
        getEvents({ paginate: "false" }),
        getDashboardStats().catch(() => null),
      ])
      setEvents(loadedEvents)
      if (stats) setDashboardStats(stats)
      setApiError("")
    } catch (error) {
      setApiError(error.message || "Could not load events from server.")
    } finally {
      setLoadingEvents(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      refreshData()
    } else {
      setEvents([])
      setDashboardStats(null)
    }
  }, [currentUser, refreshData])

  // Sync theme with HTML data attribute and localStorage
  useEffect(() => {
    localStorage.setItem("evently-theme", theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Dismiss overlays on Escape key
  useEffect(() => {
    const dismiss = (e) => {
      if (e.key === "Escape") {
        if (confirmLogout) setConfirmLogout(false)
        else if (menu) setMenu(null)
        else if (showAdminPanel) setShowAdminPanel(false)
        else setPanel(null)
      }
    }
    window.addEventListener("keydown", dismiss)
    return () => window.removeEventListener("keydown", dismiss)
  }, [menu, confirmLogout, showAdminPanel])

  // Auto-dismiss feedback notice
  useEffect(() => {
    if (!feedbackNotice) return
    const timer = setTimeout(() => setFeedbackNotice(""), 4000)
    return () => clearTimeout(timer)
  }, [feedbackNotice])

  // Live database search with debounce
  useEffect(() => {
    if (!query.trim() || !currentUser) {
      setSearchDbResults([])
      setSearchingDb(false)
      return
    }

    setSearchingDb(true)
    const timeoutId = setTimeout(() => {
      getEvents({ search: query.trim() })
        .then((res) => {
          setSearchDbResults(res)
        })
        .catch(() => {
          // Fallback to client-side filtering if search request fails
          setSearchDbResults(
            events.filter((e) =>
              [e.title, e.description, e.location, e.category, e.organizer].some(
                (val) => String(val || "").toLowerCase().includes(query.toLowerCase())
              )
            )
          )
        })
        .finally(() => {
          setSearchingDb(false)
        })
    }, 250)

    return () => clearTimeout(timeoutId)
  }, [query, currentUser, events])

  const upcoming = useMemo(
    () =>
      events
        .filter((event) => endOfEvent(event) >= now)
        .sort((a, b) => startOfEvent(a) - startOfEvent(b)),
    [events, now]
  )

  const past = useMemo(
    () =>
      events
        .filter((event) => endOfEvent(event) < now)
        .sort((a, b) => startOfEvent(b) - startOfEvent(a)),
    [events, now]
  )

  const displayed = useMemo(
    () => events.filter((event) => visibleCategories.includes(event.category)),
    [events, visibleCategories]
  )

  const show = (value) => {
    setMenu(null)
    setPanel(value)
  }

  const details = (event) => show({ type: "details", event })

  const openMenu = (event, e) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenu({
      event,
      left: Math.min(rect.right, window.innerWidth - 190),
      top: Math.min(rect.bottom + 4, window.innerHeight - 135),
    })
  }

  const create = (day = today) => show({ type: "form", date: day })

  const navigate = (delta) => {
    const next =
      view === "Month" || view === "Year"
        ? new Date(
            date.getFullYear() + (view === "Year" ? delta : 0),
            date.getMonth() + (view === "Month" ? delta : 0),
            1
          )
        : addDays(date, delta * (view === "Week" ? 7 : 1))
    setDate(next)
    setMiniDate(next)
  }

  function selectDate(day, e) {
    const rect = e.currentTarget.getBoundingClientRect()
    show({
      type: "date",
      date: dateKey(day),
      left: Math.max(12, Math.min(rect.left + 40, window.innerWidth - 360)),
      top: Math.max(12, Math.min(rect.top + 30, window.innerHeight - 380)),
    })
  }

  const row = (event) => (
    <EventRow
      key={event.id}
      event={event}
      onSelect={details}
      onMenu={openMenu}
    />
  )

  const weekStart = addDays(date, -date.getDay())
  const weekEnd = addDays(weekStart, 7)
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1)

  const inRange = (start, end) =>
    events.filter((e) => startOfEvent(e) < end && endOfEvent(e) >= start).length

  const days =
    view === "Day"
      ? [date]
      : view === "Week"
        ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
        : monthDays(date)

  const userInitials = useMemo(() => {
    if (!currentUser?.username) return "U"
    const name = currentUser.first_name || currentUser.username
    return name.slice(0, 2).toUpperCase()
  }, [currentUser])

  return (
    <div className={`app ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Toast feedback notice */}
      {feedbackNotice && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 90,
            background: "#2a3d31",
            color: "#a3e5bd",
            border: "1px solid #3c5e49",
            padding: "10px 18px",
            borderRadius: "6px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
            fontSize: "12px",
            fontWeight: "500",
          }}
        >
          {feedbackNotice}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand">
            <span className="brand-icon">
              <Icon name="calendar" size={20} />
            </span>
            {!collapsed && (
              <span>
                evently<span className="brand-period">.</span>
              </span>
            )}
          </div>
          <IconButton
            name="sidebar"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>

        {/* User Profile Trigger */}
        <button
          className="profile-button"
          onClick={() => show({ type: "profile" })}
          title="Account profile and settings"
        >
          <span className="avatar">{userInitials}</span>
          {!collapsed && (
            <>
              <span>
                <strong>{currentUser ? currentUser.username : "Guest"}</strong>
                <small>
                  {currentUser?.is_staff
                    ? "Administrator"
                    : "Personal workspace"}
                </small>
              </span>
              <Icon name="down" size={14} />
            </>
          )}
        </button>

        {/* Main Navigation */}
        <nav className="main-navigation">
          <button
            className={page === "calendar" ? "active" : ""}
            title="Calendar view"
            onClick={() => {
              setPage("calendar")
              setPanel(null)
            }}
          >
            <Icon name="calendar" />
            {!collapsed && (
              <>
                <span>Calendar</span>
                <span className="nav-shortcut">⌘ 1</span>
              </>
            )}
          </button>
          <button
            className={page === "dashboard" ? "active" : ""}
            title="Dashboard overview"
            onClick={() => {
              setPage("dashboard")
              setPanel(null)
            }}
          >
            <Icon name="grid" />
            {!collapsed && <span>Dashboard</span>}
          </button>

          {currentUser?.is_staff && (
            <button
              className={showAdminPanel ? "active" : ""}
              title="System administration"
              onClick={() => setShowAdminPanel(true)}
            >
              <Icon name="shield" />
              {!collapsed && <span>Administration</span>}
            </button>
          )}
        </nav>

        {/* Sidebar Upcoming Events */}
        <div className="sidebar-section">
          <button
            className="section-heading"
            title="Upcoming events"
            onClick={() => show({ type: "upcoming" })}
          >
            {collapsed ? (
              <Icon name="clock" />
            ) : (
              <>
                <span>UPCOMING</span>
                <Icon name="right" size={13} />
              </>
            )}
          </button>
          {!collapsed && (
            <div className="sidebar-events">
              {upcoming.slice(0, 6).map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onSelect={details}
                  onMenu={openMenu}
                  compact
                />
              ))}
              {!upcoming.length && (
                <div style={{ padding: "8px 7px", fontSize: "11px", color: "var(--muted)" }}>
                  No upcoming events
                </div>
              )}
            </div>
          )}
          <button
            className="past-button"
            title="Past events"
            onClick={() => show({ type: "past" })}
          >
            <Icon name="history" size={17} />
            {!collapsed && (
              <>
                <span>Past events</span>
                <span className="count">{past.length}</span>
              </>
            )}
          </button>
        </div>

        {/* Category Filter Checkboxes */}
        {!collapsed && (
          <div className="calendar-categories">
            <div className="section-heading">
              <span>MY CALENDARS</span>
              <Icon name="down" size={13} />
            </div>
            {Object.entries(categories).map(([category, color]) => (
              <button
                key={category}
                onClick={() =>
                  setVisibleCategories(
                    visibleCategories.includes(category)
                      ? visibleCategories.filter((c) => c !== category)
                      : [...visibleCategories, category]
                  )
                }
              >
                <span
                  className={`category-check ${
                    visibleCategories.includes(category) ? "checked" : ""
                  }`}
                  style={{ "--category": color }}
                >
                  {visibleCategories.includes(category) && (
                    <Icon name="check" size={11} />
                  )}
                </span>
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Sidebar Bottom: Mini Calendar & Theme Toggle */}
        <div className="sidebar-bottom">
          {!collapsed && (
            <MiniCalendar
              date={miniDate}
              today={today}
              onDate={(day) => {
                setDate(day)
                setPage("calendar")
              }}
              onNavigate={(delta) =>
                setMiniDate(
                  new Date(
                    miniDate.getFullYear(),
                    miniDate.getMonth() + delta,
                    1
                  )
                )
              }
            />
          )}
          <div className="sidebar-footer">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme appearance"
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
              {!collapsed && (
                <span>
                  {theme === "dark" ? "Light appearance" : "Dark appearance"}
                </span>
              )}
            </button>
            {!collapsed && (
              <span className="local-status">
                <span style={{ background: apiError ? "#d66b6b" : "#75a98a" }} />
                {apiError ? "Error" : "Cloud"}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="main-content">
        <header className="toolbar">
          <div className="toolbar-context">
            <Icon name={page === "calendar" ? "calendar" : "grid"} size={16} />
            <span>{page === "calendar" ? "My calendar" : "Overview"}</span>
            <span className="context-divider">/</span>
            <span className="muted">
              {currentUser?.username
                ? `${currentUser.username}'s workspace`
                : "Personal workspace"}
            </span>
          </div>

          {page === "calendar" && (
            <div className="view-selector">
              {["Day", "Week", "Month", "Year"].map((option) => (
                <button
                  key={option}
                  className={view === option ? "selected" : ""}
                  onClick={() => setView(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <div className="toolbar-actions">
            <IconButton
              name="search"
              title="Search all events"
              onClick={() => show({ type: "search" })}
            />
            <span className="toolbar-divider" />
            <button
              className="primary-button add-event"
              onClick={() => create()}
            >
              <Icon name="plus" size={16} />
              <span>Add Event</span>
            </button>
          </div>
        </header>

        {/* Title Bar & Period Navigation */}
        <div className="calendar-title">
          <div>
            <h1>
              {page === "dashboard" ? (
                "Your time, at a glance."
              ) : (
                <>
                  {date.toLocaleDateString("en-US", { month: "long" })}{" "}
                  <span>{date.getFullYear()}</span>
                </>
              )}
            </h1>
            <p>
              {page === "dashboard"
                ? "Live perspective on your personal schedule and metrics."
                : "A little structure. A lot of possibility."}
            </p>
          </div>

          {page === "calendar" && (
            <div className="date-navigation">
              <IconButton
                name="left"
                title="Previous period"
                onClick={() => navigate(-1)}
              />
              <button
                onClick={() => {
                  setDate(now)
                  setMiniDate(now)
                }}
                className="today-button"
              >
                Today
              </button>
              <IconButton
                name="right"
                title="Next period"
                onClick={() => navigate(1)}
              />
            </div>
          )}
        </div>

        {/* Dashboard or Calendar Views */}
        {page === "dashboard" ? (
          <section className="dashboard">
            <div className="stats">
              {[
                [
                  "Total events",
                  dashboardStats?.total_events ?? events.length,
                ],
                [
                  "Upcoming",
                  dashboardStats?.upcoming_count ?? upcoming.length,
                ],
                [
                  "This week",
                  dashboardStats?.this_week_count ?? inRange(weekStart, weekEnd),
                ],
                [
                  "This month",
                  dashboardStats?.this_month_count ?? inRange(monthStart, monthEnd),
                ],
              ].map(([label, count]) => (
                <div className="stat" key={label}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                  <Icon name="calendar" size={20} />
                </div>
              ))}
            </div>

            <div className="dashboard-columns">
              <section className="dashboard-card">
                <div className="panel-heading">
                  <h2>Your calendars</h2>
                  <small>
                    {dashboardStats?.total_events ?? events.length} events
                  </small>
                </div>
                <div className="distribution-bar">
                  {Object.entries(categories).map(([category, color]) => {
                    const count =
                      dashboardStats?.categories?.[category.toLowerCase()] ??
                      events.filter((e) => e.category === category).length
                    return (
                      <span
                        key={category}
                        style={{
                          background: color,
                          flex: count || 0.001,
                        }}
                      />
                    )
                  })}
                </div>
                {Object.entries(categories).map(([category, color]) => {
                  const count =
                    dashboardStats?.categories?.[category.toLowerCase()] ??
                    events.filter((e) => e.category === category).length
                  return (
                    <div className="distribution-row" key={category}>
                      <span className="dot" style={{ background: color }} />
                      <span>{category}</span>
                      <strong>{count}</strong>
                    </div>
                  )
                })}
              </section>

              <section className="dashboard-card">
                <div className="panel-heading">
                  <h2>Up next</h2>
                  <Icon name="clock" />
                </div>
                {upcoming.slice(0, 5).map(row)}
                {!upcoming.length && (
                  <p className="empty-state">
                    Your schedule is clear. Make room for something good.
                  </p>
                )}
              </section>
            </div>
          </section>
        ) : view === "Year" ? (
          <section className="year-view">
            {Array.from({ length: 12 }, (_, month) => (
              <MiniCalendar
                key={month}
                date={new Date(date.getFullYear(), month, 1)}
                today={today}
                small
                onDate={(day) => {
                  setDate(day)
                  setView("Month")
                }}
              />
            ))}
          </section>
        ) : (
          <section className={`calendar ${view.toLowerCase()}-view`}>
            <div className="weekday-row">
              {(view === "Day"
                ? [date.toLocaleDateString("en-US", { weekday: "long" })]
                : [
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ]
              ).map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div
              className="month-grid"
              style={{ "--rows": view === "Month" ? days.length / 7 : 1 }}
            >
              {days.map((day) => {
                const key = dateKey(day),
                  dayEvents = eventsOn(displayed, key)
                return (
                  <div
                    className={`date-cell ${
                      day.getMonth() !== date.getMonth() ? "adjacent" : ""
                    } ${
                      day.getDay() === 0 || day.getDay() === 6 ? "weekend" : ""
                    } ${key === today ? "current-day" : ""}`}
                    key={key}
                    onClick={(e) => selectDate(day, e)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Events on ${formatDate(key, { month: "long", day: "numeric", year: "numeric" })}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") selectDate(day, e)
                    }}
                  >
                    <div className="date-number">
                      {key === today && (
                        <span className="today-label">TODAY</span>
                      )}
                      <span className={key === today ? "today-circle" : ""}>
                        {day.getDate() === 1 &&
                          day.getMonth() !== date.getMonth() && (
                            <small>
                              {day.toLocaleDateString("en-US", {
                                month: "short",
                              })}{" "}
                            </small>
                          )}
                        {day.getDate()}
                      </span>
                    </div>
                    <div className="cell-events">
                      {dayEvents
                        .slice(0, view === "Month" ? 3 : 20)
                        .map((event) => (
                          <button
                            key={event.id}
                            className="event-pill"
                            style={{ "--category": categories[event.category] || "#6ba6f8" }}
                            onClick={(e) => {
                              e.stopPropagation()
                              details(event)
                            }}
                          >
                            <span className="pill-title">{event.title}</span>
                            <span className="pill-time">
                              {formatTime(event.startTime)
                                .replace(":00", "")
                                .replace(" ", "")
                                .toLowerCase()}
                            </span>
                          </button>
                        ))}
                      {view === "Month" && dayEvents.length > 3 && (
                        <span className="overflow-events">
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Footer Status Bar */}
        <footer className="main-footer">
          <span>
            <span
              className="sync-dot"
              style={{
                background: apiError
                  ? "#d66b6b"
                  : loadingEvents
                    ? "#d6a85a"
                    : "#75a98a",
              }}
            />
            {apiError
              ? `API Error: ${apiError}`
              : loadingEvents
                ? "Syncing events with Django backend..."
                : "Connected to Django API"}
          </span>
          <span>
            {events.length} events<span className="text-separator">·</span>
            {Object.keys(categories).length} calendars
          </span>
        </footer>
      </main>

      {/* Floating Detail / Form / Search / Profile Panels */}
      {panel && (
        <div
          className={`overlay ${
            ["date", "profile", "upcoming"].includes(panel.type)
              ? "popover-overlay"
              : ""
          }`}
          onMouseDown={() => {
            setPanel(null)
            setMenu(null)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={panel.type}
            className={`floating-panel panel-${panel.type}`}
            style={
              panel.type === "date" ? { left: panel.left, top: panel.top } : {}
            }
            onMouseDown={(e) => e.stopPropagation()}
          >
            {panel.type !== "form" && (
              <IconButton
                className="panel-close"
                name="close"
                title="Close panel"
                onClick={() => setPanel(null)}
              />
            )}

            {/* Event Form (Create / Edit) */}
            {panel.type === "form" && (
              <EventForm
                event={panel.event}
                selectedDate={panel.date || today}
                currentUser={currentUser}
                onCancel={() =>
                  panel.event ? details(panel.event) : setPanel(null)
                }
                onSave={async (eventData) => {
                  try {
                    const isUpdate = Boolean(eventData.id && typeof eventData.id === "number")
                    const savedEvent = isUpdate
                      ? await updateEvent(eventData.id, eventData)
                      : await createEvent(eventData)

                    setEvents((current) => {
                      const exists = current.some((item) => item.id === savedEvent.id)
                      return exists
                        ? current.map((item) =>
                            item.id === savedEvent.id ? savedEvent : item
                          )
                        : [...current, savedEvent]
                    })

                    setApiError("")
                    setFeedbackNotice(
                      isUpdate
                        ? `“${savedEvent.title}” updated successfully.`
                        : `“${savedEvent.title}” created successfully.`
                    )
                    details(savedEvent)
                    // Refresh aggregated statistics in background
                    getDashboardStats().then((s) => s && setDashboardStats(s)).catch(() => {})
                  } catch (error) {
                    setApiError(error.message || "Could not save the event.")
                    alert(`Could not save event: ${error.message || "Server error"}`)
                  }
                }}
              />
            )}

            {/* Event Details View */}
            {panel.type === "details" && (
              <>
                <span
                  className="category-label"
                  style={{ color: categories[panel.event.category] || "#6ba6f8" }}
                >
                  <span
                    className="dot"
                    style={{ background: categories[panel.event.category] || "#6ba6f8" }}
                  />
                  {panel.event.category}
                </span>
                <h2 className="detail-title">{panel.event.title}</h2>
                <p className="detail-description">
                  {panel.event.description || "No description added."}
                </p>
                <div className="detail-fields">
                  <div>
                    <Icon name="calendar" />
                    <span>
                      {formatDate(panel.event.startDate, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {panel.event.endDate !== panel.event.startDate && (
                        <> — {formatDate(panel.event.endDate)}</>
                      )}
                    </span>
                  </div>
                  <div>
                    <Icon name="clock" />
                    <span>
                      {formatTime(panel.event.startTime)} –{" "}
                      {formatTime(panel.event.endTime)}
                    </span>
                  </div>
                  <div>
                    <Icon name="pin" />
                    <span>{panel.event.location || "No location specified"}</span>
                  </div>
                  <div>
                    <Icon name="user" />
                    <span>{panel.event.organizer}</span>
                  </div>
                </div>
                <div className="detail-metadata">
                  Created {new Date(panel.event.createdAt).toLocaleDateString()}
                  <br />
                  Updated {new Date(panel.event.updatedAt).toLocaleDateString()}
                </div>
                <div className="detail-actions">
                  <button
                    className="delete-action"
                    onClick={() => show({ type: "delete", event: panel.event })}
                  >
                    <Icon name="trash" size={16} />
                    Delete
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => show({ type: "form", event: panel.event })}
                  >
                    <Icon name="edit" size={16} />
                    Edit event
                  </button>
                </div>
              </>
            )}

            {/* Event Deletion Confirmation */}
            {panel.type === "delete" && (
              <>
                <span className="delete-symbol">
                  <Icon name="trash" size={26} />
                </span>
                <h2>Delete this event?</h2>
                <p>
                  “{panel.event.title}” will be permanently removed from your calendar.
                  This operation cannot be undone.
                </p>
                <div className="confirmation-actions">
                  <button
                    className="secondary-button"
                    onClick={() => details(panel.event)}
                  >
                    Keep event
                  </button>
                  <button
                    className="danger-button"
                    onClick={async () => {
                      try {
                        await deleteEvent(panel.event.id)
                        setEvents((current) =>
                          current.filter((event) => event.id !== panel.event.id)
                        )
                        setApiError("")
                        setFeedbackNotice("Event removed successfully.")
                        setPanel(null)
                        getDashboardStats().then((s) => s && setDashboardStats(s)).catch(() => {})
                      } catch (error) {
                        setApiError(error.message || "Could not delete event.")
                        alert(`Could not delete event: ${error.message || "Server error"}`)
                      }
                    }}
                  >
                    Delete event
                  </button>
                </div>
              </>
            )}

            {/* Upcoming / Past / Date Popovers */}
            {["upcoming", "past", "date"].includes(panel.type) && (
              <>
                <span className="eyebrow">
                  {panel.type === "past"
                    ? "A LOOK BACK"
                    : panel.type === "date"
                      ? formatDate(panel.date, { weekday: "long" })
                      : "ON THE HORIZON"}
                </span>
                <h2>
                  {panel.type === "upcoming"
                    ? "Upcoming events"
                    : panel.type === "past"
                      ? "Past events"
                      : formatDate(panel.date, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                </h2>
                <div className="panel-event-list">
                  {(panel.type === "upcoming"
                    ? upcoming
                    : panel.type === "past"
                      ? past
                      : eventsOn(events, panel.date)
                  ).map(row)}
                  {!(
                    panel.type === "upcoming"
                      ? upcoming
                      : panel.type === "past"
                        ? past
                        : eventsOn(events, panel.date)
                  ).length && (
                    <div className="empty-state">
                      <Icon name="calendar" size={30} />
                      <p>
                        {panel.type === "past"
                          ? "No past events found."
                          : "A little breathing room."}
                      </p>
                      <small>
                        {panel.type === "past"
                          ? "Completed events will be archived here."
                          : "Nothing planned. The day is yours."}
                      </small>
                    </div>
                  )}
                </div>
                {panel.type === "date" && (
                  <button
                    className="date-add"
                    onClick={() => create(panel.date)}
                  >
                    <Icon name="plus" size={17} />
                    Add event on this day
                  </button>
                )}
              </>
            )}

            {/* Real Search Panel */}
            {panel.type === "search" && (
              <>
                <span className="eyebrow">DATABASE SEARCH</span>
                <h2>Search events</h2>
                <div className="search-input">
                  <Icon name="search" />
                  <input
                    autoFocus
                    placeholder="Search by title, location, category, description…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <IconButton
                      name="close"
                      title="Clear search"
                      onClick={() => setQuery("")}
                    />
                  )}
                </div>
                <div className="search-summary">
                  {searchingDb
                    ? "Querying database..."
                    : query
                      ? `${searchDbResults.length} matching events found`
                      : "Type keywords to search across your saved events"}
                </div>
                <div className="search-results">
                  {searchDbResults.map((event) => (
                    <div className="search-result" key={event.id}>
                      {row(event)}
                      {event.description && <p>{event.description}</p>}
                    </div>
                  ))}
                  {query && !searchingDb && !searchDbResults.length && (
                    <div className="empty-state">
                      <Icon name="search" size={30} />
                      <p>No matching events found.</p>
                      <small>Try another keyword, title, or category.</small>
                    </div>
                  )}
                </div>
                <button
                  className="back-calendar"
                  onClick={() => setPanel(null)}
                >
                  Return to calendar
                </button>
              </>
            )}

            {/* User Profile Panel */}
            {panel.type === "profile" && (
              <>
                <div className="profile-card">
                  <span className="avatar large">{userInitials}</span>
                  <h2>{currentUser?.username || "Guest"}</h2>
                  <p>{currentUser?.email || "No email registered"}</p>
                  {currentUser?.is_staff && (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "6px",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        background: "#3e3223",
                        color: "var(--accent)",
                        fontWeight: "600",
                      }}
                    >
                      Administrator
                    </span>
                  )}
                </div>
                <div className="settings-options">
                  <button onClick={() => setConfirmLogout(true)}>
                    <Icon name="logout" />
                    Sign out
                  </button>
                  <button onClick={() => show({ type: "password" })}>
                    <Icon name="edit" />
                    Change password
                  </button>
                  {currentUser?.is_staff && (
                    <button
                      onClick={() => {
                        setPanel(null)
                        setShowAdminPanel(true)
                      }}
                    >
                      <Icon name="shield" />
                      Administration dashboard
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                  >
                    <Icon name={theme === "dark" ? "sun" : "moon"} />
                    {theme === "dark"
                      ? "Switch to light theme"
                      : "Switch to dark theme"}
                  </button>
                </div>
                <small className="prototype-note">
                  Authenticated session · Encrypted private workspace
                </small>
              </>
            )}

            {/* Password Change Form */}
            {panel.type === "password" && (
              <PasswordForm
                onSuccess={() => {
                  setFeedbackNotice("Password changed successfully.")
                  setPanel(null)
                }}
              />
            )}
          </section>
        </div>
      )}

      {/* Context Action Menu for Event */}
      {menu && (
        <div className="menu-overlay" onMouseDown={() => setMenu(null)}>
          <div
            className="context-menu"
            style={{ left: menu.left, top: menu.top }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button onClick={() => details(menu.event)}>
              <Icon name="calendar" size={15} />
              View details
            </button>
            <button onClick={() => show({ type: "form", event: menu.event })}>
              <Icon name="edit" size={15} />
              Edit event
            </button>
            <button
              className="delete-action"
              onClick={() => show({ type: "delete", event: menu.event })}
            >
              <Icon name="trash" size={15} />
              Delete event
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      {confirmLogout && (
        <div className="overlay" onMouseDown={() => setConfirmLogout(false)}>
          <div
            className="floating-panel panel-delete"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span className="delete-symbol">
              <Icon name="logout" size={26} />
            </span>
            <h2>Sign out of Evently?</h2>
            <p>
              Your local session will be terminated. Your calendar events remain safely stored on the server.
            </p>
            <div className="confirmation-actions">
              <button
                className="secondary-button"
                onClick={() => setConfirmLogout(false)}
              >
                Stay signed in
              </button>
              <button
                className="danger-button"
                onClick={async () => {
                  setConfirmLogout(false)
                  setPanel(null)
                  await logout()
                  setCurrentUser(null)
                  setShowAuthModal(true)
                  setEvents([])
                  setDashboardStats(null)
                  setFeedbackNotice("You have been signed out.")
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      {showAuthModal && !isAuthLoading && (
        <AuthModal
          onAuthSuccess={(user) => {
            setCurrentUser(user)
            setShowAuthModal(false)
            setFeedbackNotice(`Signed in as ${user.username}`)
          }}
        />
      )}

      {/* Administration Modal Panel */}
      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  )
}
