export function normalizeFacilityName(name: string): string {
  // Convert to lowercase, remove special characters except spaces,
  // trim, and replace multiple spaces with single space.
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function toRegexCompatible(name: string): string {
  // Escape regex special characters and replace spaces with optional whitespace/hyphen/underscore
  return name
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '[\\s-_]+');
}

export function getBDNow(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 6));
}

export function getBDStartOfDay(date: Date = getBDNow()): Date {
  const bdDate = new Date(date);
  bdDate.setHours(0, 0, 0, 0);
  return bdDate;
}

export function getBDEndOfDay(date: Date = getBDNow()): Date {
  const bdDate = new Date(date);
  bdDate.setHours(23, 59, 59, 999);
  return bdDate;
}
