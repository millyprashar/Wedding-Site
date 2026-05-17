import type { ReceptionEventDetails } from './eventMeta'

/** Venues are in California; `dateIso` / `endDateIso` in event meta is America/Los_Angeles wall time. */
const EVENT_WALL_TIME_ZONE = 'America/Los_Angeles'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/**
 * Interpret `isoLocal` (no Z offset) as a clock time in `timeZone` and return the UTC instant.
 */
function wallTimeInTimeZoneToUtc(isoLocal: string, timeZone: string): Date {
  const [dateStr, timeStr] = isoLocal.split('T')
  const year = Number(dateStr.slice(0, 4))
  const month = Number(dateStr.slice(5, 7))
  const day = Number(dateStr.slice(8, 10))
  const hour = Number(timeStr.slice(0, 2))
  const minute = Number(timeStr.slice(3, 5))
  const second = Number(timeStr.slice(6, 8) || 0)

  let ms = Date.UTC(year, month - 1, day, hour, minute, second)

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  for (let i = 0; i < 48; i++) {
    const d = new Date(ms)
    const parts = fmt.formatToParts(d)
    const pick = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value ?? NaN)
    const y = pick('year')
    const m = pick('month')
    const da = pick('day')
    const h = pick('hour')
    const mi = pick('minute')
    const s = pick('second')
    if (
      y === year &&
      m === month &&
      da === day &&
      h === hour &&
      mi === minute &&
      s === second
    ) {
      return d
    }
    ms +=
      Date.UTC(year, month - 1, day, hour, minute, second) -
      Date.UTC(y, m - 1, da, h, mi, s)
  }

  return new Date(ms)
}

function formatIcsUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  )
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) return line
  let out = ''
  let rest = line
  while (rest.length > 75) {
    out += `${rest.slice(0, 75)}\r\n `
    rest = rest.slice(75)
  }
  return out + rest
}

function buildLocation(details: ReceptionEventDetails): string {
  return [details.venueName, ...details.addressLines].filter(Boolean).join(', ')
}

export function downloadEventCalendarIcs(
  details: ReceptionEventDetails,
  options: { eventId: string; summary?: string },
) {
  const start = wallTimeInTimeZoneToUtc(details.dateIso, EVENT_WALL_TIME_ZONE)
  const summary =
    options.summary ??
    details.calendarSummary ??
    `Milly & Tariq — ${details.title}`
  let end: Date | null = null
  if (details.endDateIso) {
    end = wallTimeInTimeZoneToUtc(details.endDateIso, EVENT_WALL_TIME_ZONE)
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + 60 * 60 * 1000)
    }
  }
  const description = [
    `${details.startTimeLabel} · ${details.venueName}`,
    details.hostedByLine,
  ]
    .filter(Boolean)
    .join('\n')
  const location = buildLocation(details)
  const uid = `milly-tariq-${options.eventId}@wedding.local`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//M+T Wedding//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(start)}`,
    ...(end ? [`DTEND:${formatIcsUtc(end)}`] : []),
    `SUMMARY:${escapeIcsText(summary)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const icsBody = lines.map((l) => foldIcsLine(l)).join('\r\n') + '\r\n'

  const safeFile = `${details.title.replace(/[/\\:*?"<>|]/g, '')}.ics`
  const blob = new Blob([icsBody], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeFile
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
