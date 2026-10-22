/**
 * Utility functions for 12-hour (AM/PM) time formatting in FinoWork frontend.
 * Backend stores 24-hour time ('HH:mm') for standard database compatibility.
 */

export function formatTime12h(
  time?: string | Date | null,
  options: { padZero?: boolean } = { padZero: true }
): string {
  if (!time) return '';
  if (time instanceof Date) {
    if (isNaN(time.getTime())) return '';
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 === 0 ? 12 : hours % 12;
    const hStr = options.padZero ? String(hours12).padStart(2, '0') : String(hours12);
    const mStr = String(minutes).padStart(2, '0');
    return `${hStr}:${mStr} ${period}`;
  }
  if (typeof time !== 'string' || time.trim() === '') return '';
  const trimmed = time.trim();

  // If already formatted with AM/PM
  if (/am|pm/i.test(trimmed)) return trimmed;

  // If ISO string like '2026-10-21T14:30:00' or '2026-10-21T14:30:00.000Z'
  let timeStr = trimmed;
  if (timeStr.includes('T')) {
    const afterT = timeStr.split('T')[1];
    const match = afterT.match(/^(\d{1,2}:\d{2}(?::\d{2})?)/);
    if (match) {
      timeStr = match[1];
    } else {
      timeStr = afterT;
    }
  }

  const parts = timeStr.split(':');
  if (parts.length < 2) return trimmed;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return trimmed;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const hStr = options.padZero ? String(hours12).padStart(2, '0') : String(hours12);
  const mStr = String(minutes).padStart(2, '0');

  return `${hStr}:${mStr} ${period}`;
}

export function formatTimeRange12h(
  startTime?: string | null,
  endTime?: string | null,
  options: { padZero?: boolean } = { padZero: true }
): string {
  if (!startTime && !endTime) return '';
  if (!endTime) return formatTime12h(startTime, options);
  if (!startTime) return formatTime12h(endTime, options);
  return `${formatTime12h(startTime, options)} - ${formatTime12h(endTime, options)}`;
}
