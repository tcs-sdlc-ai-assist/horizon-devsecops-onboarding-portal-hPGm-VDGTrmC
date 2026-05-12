/**
 * Data formatting utilities for Horizon DevSecOps Portal
 * @module utils/formatters
 */

import { DATE_FORMATS } from '../constants/constants.js';

// ---------------------------------------------------------------------------
// Number Formatting
// ---------------------------------------------------------------------------

/**
 * Format a number as a percentage string with exactly 2 decimal places.
 * @param {number|string|null|undefined} value - The numeric value to format.
 * @param {Object} [options]
 * @param {boolean} [options.includeSymbol=true] - Whether to append the `%` symbol.
 * @returns {string} Formatted percentage string, e.g. "94.50%" or "N/A" when invalid.
 */
export const formatPercentage = (value, options = {}) => {
  const { includeSymbol = true } = options;

  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof num !== 'number' || Number.isNaN(num)) {
    return 'N/A';
  }

  const formatted = num.toFixed(2);
  return includeSymbol ? `${formatted}%` : formatted;
};

/**
 * Format a number with locale-aware thousand separators and optional decimal places.
 * @param {number|string|null|undefined} value - The numeric value to format.
 * @param {Object} [options]
 * @param {number} [options.decimals] - Number of decimal places. When omitted the
 *   native toLocaleString behaviour is used (trailing zeros are trimmed).
 * @param {string} [options.locale='en-US'] - BCP 47 locale tag.
 * @param {string} [options.fallback='N/A'] - Returned when value is not a valid number.
 * @returns {string} Formatted number string.
 */
export const formatNumber = (value, options = {}) => {
  const { decimals, locale = 'en-US', fallback = 'N/A' } = options;

  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof num !== 'number' || Number.isNaN(num)) {
    return fallback;
  }

  const localeOptions = {};
  if (decimals !== undefined && decimals !== null) {
    localeOptions.minimumFractionDigits = decimals;
    localeOptions.maximumFractionDigits = decimals;
  }

  return num.toLocaleString(locale, localeOptions);
};

// ---------------------------------------------------------------------------
// Date / Time Formatting
// ---------------------------------------------------------------------------

/**
 * Format a date value into a human-readable string.
 *
 * Supported format tokens (subset aligned with DATE_FORMATS constants):
 * - `'MMM dd, yyyy'`          → Nov 10, 2024
 * - `'MMM dd, yyyy HH:mm'`   → Nov 10, 2024 14:30
 * - `'yyyy-MM-dd'`            → 2024-11-10
 * - `"yyyy-MM-dd'T'HH:mm:ss"` → 2024-11-10T14:30:00
 * - `'HH:mm:ss'`             → 14:30:00
 * - `'relative'`             → "2 hours ago", "3 days ago", etc.
 *
 * @param {string|number|Date|null|undefined} value - ISO string, timestamp, or Date.
 * @param {Object} [options]
 * @param {string} [options.format='MMM dd, yyyy'] - One of the format tokens above.
 * @param {string} [options.fallback='N/A'] - Returned when value is invalid.
 * @returns {string} Formatted date string.
 */
export const formatDate = (value, options = {}) => {
  const { format = DATE_FORMATS.DISPLAY, fallback = 'N/A' } = options;

  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  if (format === 'relative') {
    return formatRelativeTime(date);
  }

  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const pad = (n) => String(n).padStart(2, '0');

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  switch (format) {
    case DATE_FORMATS.DISPLAY:
      // MMM dd, yyyy
      return `${monthNames[month]} ${pad(day)}, ${year}`;

    case DATE_FORMATS.DISPLAY_WITH_TIME:
      // MMM dd, yyyy HH:mm
      return `${monthNames[month]} ${pad(day)}, ${year} ${pad(hours)}:${pad(minutes)}`;

    case DATE_FORMATS.ISO:
      // yyyy-MM-dd
      return `${year}-${pad(month + 1)}-${pad(day)}`;

    case DATE_FORMATS.ISO_WITH_TIME:
      // yyyy-MM-dd'T'HH:mm:ss
      return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    case DATE_FORMATS.TIME_ONLY:
      // HH:mm:ss
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    default:
      return `${monthNames[month]} ${pad(day)}, ${year}`;
  }
};

/**
 * Format a Date as a relative time string (e.g. "2 hours ago").
 * @param {Date} date
 * @returns {string}
 */
const formatRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isFuture = diffMs < 0;

  const seconds = Math.floor(absDiffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const suffix = isFuture ? 'from now' : 'ago';

  if (seconds < 60) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${suffix}`;
  }
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${suffix}`;
  }
  if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} ${suffix}`;
  }
  if (weeks < 5) {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ${suffix}`;
  }
  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'} ${suffix}`;
  }
  return `${years} ${years === 1 ? 'year' : 'years'} ${suffix}`;
};

// ---------------------------------------------------------------------------
// Duration Formatting
// ---------------------------------------------------------------------------

/**
 * Format a duration in seconds into a human-readable string.
 *
 * @param {number|null|undefined} seconds - Duration in seconds.
 * @param {Object} [options]
 * @param {boolean} [options.compact=false] - Use compact notation (e.g. "27m 0s" vs "27 minutes").
 * @param {string} [options.fallback='N/A'] - Returned when value is invalid.
 * @returns {string} Formatted duration string.
 */
export const formatDuration = (seconds, options = {}) => {
  const { compact = false, fallback = 'N/A' } = options;

  if (seconds === null || seconds === undefined || typeof seconds !== 'number' || Number.isNaN(seconds)) {
    return fallback;
  }

  if (seconds < 0) {
    return fallback;
  }

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (compact) {
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  const parts = [];
  if (hrs > 0) {
    parts.push(`${hrs} ${hrs === 1 ? 'hour' : 'hours'}`);
  }
  if (mins > 0) {
    parts.push(`${mins} ${mins === 1 ? 'minute' : 'minutes'}`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`);
  }

  return parts.join(' ');
};

// ---------------------------------------------------------------------------
// Byte Formatting
// ---------------------------------------------------------------------------

/**
 * Format a byte count into a human-readable string (e.g. "1.50 MB").
 *
 * @param {number|null|undefined} bytes - Number of bytes.
 * @param {Object} [options]
 * @param {number} [options.decimals=2] - Number of decimal places.
 * @param {string} [options.fallback='N/A'] - Returned when value is invalid.
 * @returns {string} Formatted byte string.
 */
export const formatBytes = (bytes, options = {}) => {
  const { decimals = 2, fallback = 'N/A' } = options;

  if (bytes === null || bytes === undefined || typeof bytes !== 'number' || Number.isNaN(bytes)) {
    return fallback;
  }

  if (bytes < 0) {
    return fallback;
  }

  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const index = Math.min(i, units.length - 1);

  const value = bytes / Math.pow(k, index);
  return `${value.toFixed(decimals)} ${units[index]}`;
};

// ---------------------------------------------------------------------------
// String Formatting
// ---------------------------------------------------------------------------

/**
 * Truncate a string to a maximum length, appending an ellipsis when truncated.
 *
 * @param {string|null|undefined} text - The string to truncate.
 * @param {number} [maxLength=50] - Maximum character length (including ellipsis).
 * @param {Object} [options]
 * @param {string} [options.suffix='…'] - The suffix appended when truncated.
 * @returns {string} Truncated string or empty string when input is invalid.
 */
export const truncateText = (text, maxLength = 50, options = {}) => {
  const { suffix = '…' } = options;

  if (text === null || text === undefined) {
    return '';
  }

  const str = String(text);

  if (str.length <= maxLength) {
    return str;
  }

  const truncatedLength = maxLength - suffix.length;
  if (truncatedLength <= 0) {
    return suffix.slice(0, maxLength);
  }

  return str.slice(0, truncatedLength) + suffix;
};

/**
 * Capitalise the first character of a string.
 *
 * @param {string|null|undefined} text - The input string.
 * @returns {string} String with the first character in upper case, or empty string.
 */
export const capitalizeFirst = (text) => {
  if (text === null || text === undefined) {
    return '';
  }

  const str = String(text);

  if (str.length === 0) {
    return '';
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert a string into a URL-friendly slug.
 *
 * @param {string|null|undefined} text - The input string.
 * @returns {string} Lowercased, hyphen-separated slug, or empty string.
 */
export const slugify = (text) => {
  if (text === null || text === undefined) {
    return '';
  }

  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};