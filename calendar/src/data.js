export const categories = {
  Personal: "#6ba6f8",
  "College & clubs": "#70bf91",
  "Holidays & occasions": "#b28aee",
  "Deadlines & tasks": "#e6a46a",
  Social: "#df8dab",
}
export const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
export const parseDate = (value) => new Date(`${value}T12:00:00`)
export const addDays = (date, count) => {
  const result = new Date(date)
  result.setDate(result.getDate() + count)
  return result
}
export const formatDate = (
  date,
  options = { month: "short", day: "numeric" },
) => parseDate(date).toLocaleDateString("en-US", options)
export const formatTime = (time) =>
  new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
export const startOfEvent = (event) =>
  new Date(`${event.startDate}T${event.startTime}`)
export const endOfEvent = (event) =>
  new Date(`${event.endDate}T${event.endTime}`)
export const eventsOn = (events, date) =>
  events
    .filter((event) => event.startDate <= date && event.endDate >= date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
export function monthDays(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const start = addDays(first, -first.getDay())
  const count =
    Math.ceil(
      (first.getDay() +
        new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) /
        7,
    ) * 7
  return Array.from({ length: count }, (_, index) => addDays(start, index))
}
export function seedEvents() {
  const today = new Date()
  const y = today.getFullYear(),
    m = today.getMonth()
  const samples = [
    [2, "Coffee with Maya", "Personal", "09:00", "Blue Bottle Coffee"],
    [3, "Design society meetup", "College & clubs", "16:00", "Student Center"],
    [5, "Fall reading week", "Holidays & occasions", "09:00", "Campus"],
    [7, "Portfolio review", "Deadlines & tasks", "14:00", "Design Studio"],
    [8, "Dinner with friends", "Social", "19:00", "The Common Table"],
    [10, "Morning run", "Personal", "07:00", "Riverside Park"],
    [11, "Sunday reset", "Personal", "10:00", "Home"],
    [12, "Design club workshop", "College & clubs", "14:00", "Studio 204"],
    [13, "Coffee with Alex", "Personal", "10:30", "Little Collins"],
    [
      14,
      "Research paper due",
      "Deadlines & tasks",
      "17:00",
      "Online submission",
    ],
    [15, "Movie night", "Social", "19:00", "Cinema Village"],
    [16, "Fall break begins", "Holidays & occasions", "09:00", "Campus"],
    [18, "Brunch with friends", "Social", "11:00", "Sunday in Brooklyn"],
    [19, "Photography walk", "Personal", "16:00", "Central Park"],
    [20, "Hackathon kickoff", "College & clubs", "09:00", "Innovation Lab"],
    [21, "Project proposal due", "Deadlines & tasks", "17:00", "Course portal"],
    [22, "Book club", "College & clubs", "18:00", "Campus Library"],
    [24, "Emma's birthday", "Holidays & occasions", "18:00", "West Village"],
    [26, "Dentist appointment", "Personal", "11:00", "Dr. Chen, 5th Avenue"],
    [28, "Semester check-in", "College & clubs", "13:00", "Faculty Office"],
    [30, "Submit final designs", "Deadlines & tasks", "16:00", "Design Studio"],
    [31, "Halloween get-together", "Social", "19:00", "Maya's apartment"],
    [34, "Team planning session", "College & clubs", "10:00", "Innovation Lab"],
    [39, "Weekend getaway", "Personal", "09:00", "Hudson Valley"],
  ]
  return samples.map(([day, title, category, startTime, location], index) => {
    const date = dateKey(new Date(y, m, day))
    return {
      id: `sample-${index}`,
      title,
      category,
      startDate: date,
      endDate: date,
      startTime,
      endTime: `${String(Number(startTime.split(":")[0]) + 1).padStart(2, "0")}:${startTime.split(":")[1]}`,
      location,
      organizer:
        category === "College & clubs" ? "Campus community" : "Alex Morgan",
      description: `A little time set aside for ${title.toLowerCase()}. Bring your ideas and enjoy the moment.`,
      createdAt: new Date(y, m, 1).toISOString(),
      updatedAt: new Date(y, m, 1).toISOString(),
    }
  })
}
