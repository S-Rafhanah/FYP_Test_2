// src/utils/ipFormatter.js
// Utility functions for formatting IP addresses in the dashboard

/**
 * Detect if an IP address is IPv6
 * @param {string} ip - IP address string
 * @returns {boolean} - true if IPv6, false if IPv4
 */
export const isIPv6 = (ip) => {
  if (!ip || typeof ip !== 'string') return false;
  return ip.includes(':') && !ip.includes('.');
};

/**
 * Get IP version (IPv4 or IPv6)
 * @param {string} ip - IP address string
 * @returns {string} - "IPv6", "IPv4", or "Unknown"
 */
export const getIPVersion = (ip) => {
  if (!ip || typeof ip !== 'string') return 'Unknown';
  if (isIPv6(ip)) return 'IPv6';
  if (ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) return 'IPv4';
  return 'Unknown';
};

/**
 * Format IP address for display - truncate if too long
 * @param {string} ip - IP address string
 * @param {number} maxLength - Maximum length before truncation (default: 20)
 * @returns {string} - Formatted IP address
 */
export const formatIP = (ip, maxLength = 20) => {
  if (!ip || typeof ip !== 'string') return '—';

  // If IP is short enough, return as-is
  if (ip.length <= maxLength) return ip;

  // For IPv6, try to compress it intelligently
  if (isIPv6(ip)) {
    // Show first part and last part with ellipsis in middle
    const truncateLength = Math.floor((maxLength - 3) / 2); // Reserve 3 chars for "..."
    return `${ip.substring(0, truncateLength)}...${ip.substring(ip.length - truncateLength)}`;
  }

  // For other long strings, just truncate at end
  return ip.substring(0, maxLength - 3) + '...';
};

/**
 * Get shortened IP for compact display (more aggressive truncation)
 * @param {string} ip - IP address string
 * @returns {string} - Shortened IP address
 */
export const getShortIP = (ip) => {
  if (!ip || typeof ip !== 'string') return '—';

  // IPv4 - return as-is
  if (!isIPv6(ip)) return ip;

  // IPv6 - show first 12 chars + ...
  if (ip.length > 15) {
    return ip.substring(0, 12) + '...';
  }

  return ip;
};

/**
 * Format IP with version badge info
 * Returns object with formatted IP and version for badge display
 * @param {string} ip - IP address string
 * @returns {object} - { display: string, version: string, isLong: boolean }
 */
export const formatIPWithVersion = (ip) => {
  const version = getIPVersion(ip);
  const isLong = ip && ip.length > 20;
  const display = formatIP(ip);

  return {
    display,
    version,
    isLong,
    original: ip || '—'
  };
};

/**
 * Get color scheme for IP version badge
 * @param {string} version - IP version ("IPv4" or "IPv6")
 * @returns {string} - Chakra UI color scheme
 */
export const getIPVersionColorScheme = (version) => {
  if (version === 'IPv6') return 'purple';
  if (version === 'IPv4') return 'blue';
  return 'gray';
};
