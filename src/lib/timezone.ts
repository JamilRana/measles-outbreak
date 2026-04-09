export const BD_TIMEZONE = "Asia/Dhaka";

export function getBdTime(): Date {
  return toBdTime(new Date());
}

export function toBdTime(date: Date): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: BD_TIMEZONE }));
}

export function getBdDateString(date?: Date): string {
  const d = date ? toBdTime(date) : getBdTime();
  return d.toISOString().split("T")[0];
}

export function getBdStartOfDay(date?: Date): Date {
  const d = date ? toBdTime(date) : getBdTime();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getBdEndOfDay(date?: Date): Date {
  const d = date ? toBdTime(date) : getBdTime();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isAfterCutoffHour(cutoffHour: number, cutoffMinute: number): boolean {
  const now = getBdTime();
  const cutoff = new Date(now);
  cutoff.setHours(cutoffHour, cutoffMinute, 0, 0);
  return now > cutoff;
}

export function isEditable(editDeadlineHour: number, editDeadlineMinute: number): boolean {
  const now = getBdTime();
  const deadline = new Date(now);
  deadline.setHours(editDeadlineHour, editDeadlineMinute, 0, 0);
  return now <= deadline;
}