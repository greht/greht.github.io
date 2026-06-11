const TIMEZONE_OFFSETS = {
  AR: 0,
  BR: 0,
  CL: -1,
  CO: -2,
  EC: -2,
  MX: -3,
  PA: -2,
  PE: -2,
  PY: -1,
  US: -2,
  UY: 0,
  VE: -1,
  BO: -1,
};

export function getTimezoneOffset(countryCode) {
  return TIMEZONE_OFFSETS[countryCode?.toUpperCase()] ?? 0;
}

export function toLocalTime(argentinaDateStr, targetOffset) {
  const parts = String(argentinaDateStr).match(/(\d+)[-\sT]+(\d+)[-\sT]+(\d+)[\sT]+(\d+):(\d+):(\d+)/);
  if (!parts) return new Date(argentinaDateStr);
  const [, year, month, day, hour, minute, second] = parts.map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return new Date(utcDate.getTime() + targetOffset * 60 * 60 * 1000);
}

export function toRealUtcDate(argentinaDateStr) {
  const parts = String(argentinaDateStr).match(/(\d+)[-\sT]+(\d+)[-\sT]+(\d+)[\sT]+(\d+):(\d+):(\d+)/);
  if (!parts) return new Date(argentinaDateStr);
  const [, year, month, day, hour, minute, second] = parts.map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, second));
}

export function formatLocalDate(date, locale, options) {
  return date.toLocaleString(locale, { ...options, timeZone: 'UTC' });
}