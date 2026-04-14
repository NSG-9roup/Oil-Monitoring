export function generateIcsContent(
  machineName: string,
  customerName: string,
  dueDate: Date,
  durationHours = 1
): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const startDate = formatDate(dueDate)
  const endDateObj = new Date(dueDate.getTime() + durationHours * 60 * 60 * 1000)
  const endDate = formatDate(endDateObj)
  const now = formatDate(new Date())

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OilTrack//Sampling Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTAMP:${now}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:Oil Sampling Reminder - ${machineName}`,
    `DESCRIPTION:Reminder to perform routine oil sampling for machine ${machineName} (Customer: ${customerName}).`,
    `UID:oil-sample-${now}-${Math.random().toString(36).substr(2, 9)}@oiltrack.com`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Oil Sampling Due Tomorrow',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcsFile(content: string, filename = 'sampling-reminder.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
