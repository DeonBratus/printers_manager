/**
 * Utility functions for consistent time formatting across the application
 */

/**
 * Formats minutes into HH:mm format
 * @param {number} minutes - Minutes to format
 * @returns {string} Formatted time string
 */
export const formatMinutesToHHMM = (minutes) => {
  if (minutes === null || minutes === undefined) return '00:00';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Parses HH:mm format string into minutes
 * @param {string} timeStr - Time string in format "HH:mm"
 * @returns {number} Minutes
 */
export const parseHHMMToMinutes = (timeStr) => {
  if (!timeStr || timeStr.indexOf(':') === -1) return 0;
  
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  } catch (error) {
    console.error('Error parsing time:', error);
    return 0;
  }
};

/**
 * Formats minutes for human readable display (e.g. "2h 30m")
 * @param {number} minutes - Minutes to format
 * @returns {string} Formatted duration string
 */
export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  
  if (h === 0) {
    return `${m}m`;
  }
  
  return `${h}h ${m}m`;
}; 