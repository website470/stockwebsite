/**
 * Utility to handle NSE Market Hours (9:15 AM - 3:30 PM IST)
 */

export function getMarketStatus() {
  const now = new Date();
  
  // Get current time in IST (Asia/Kolkata)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

  const weekday = getPart('weekday');
  const hour = parseInt(getPart('hour'));
  const minute = parseInt(getPart('minute'));
  
  const isWeekend = weekday === 'Saturday' || weekday === 'Sunday';
  
  // Market hours: 9:15 AM to 3:30 PM IST
  const currentMinutes = hour * 60 + minute;
  const startMinutes = 9 * 60 + 15;
  const endMinutes = 15 * 60 + 30;

  const isOpen = !isWeekend && currentMinutes >= startMinutes && currentMinutes < endMinutes;
  const isPastSession = currentMinutes >= endMinutes;
  const isBeforeSession = currentMinutes < startMinutes;

  return {
    isOpen,
    isWeekend,
    isPastSession,
    isBeforeSession,
    currentMinutes,
    startMinutes,
    endMinutes,
    weekday
  };
}

export function getEffectiveEndTime(): number {
  const status = getMarketStatus();
  const now = new Date();
  const kolkataTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  if (status.isOpen) {
    return Math.floor(now.getTime() / 1000);
  }

  // If market is closed, we need to find the last 3:30 PM IST
  const target = new Date(kolkataTime);
  target.setHours(15, 30, 0, 0);

  if (status.isWeekend) {
    const daysToSubtract = status.weekday === 'Sunday' ? 2 : 1;
    target.setDate(target.getDate() - daysToSubtract);
  } else if (status.isBeforeSession) {
    // If it's Monday morning, go back to Friday
    const daysToSubtract = status.weekday === 'Monday' ? 3 : 1;
    target.setDate(target.getDate() - daysToSubtract);
  } else if (status.isPastSession) {
    // Today's 3:30 PM is already set in target
  }

  // Convert target (which is IST) back to UTC timestamp
  // Note: toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) gives us a string that looks like IST.
  // We need to ensure we return a correct Unix timestamp.
  
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  });
  
  // A better way to get the Unix timestamp for 3:30 PM IST of a given date:
  const offset = 5.5 * 60 * 60 * 1000; // IST is UTC+5.5
  
  // Clear time and set to 15:30:00 in IST
  const year = target.getFullYear();
  const month = target.getMonth();
  const day = target.getDate();
  
  // Create Date in UTC that represents 15:30 IST
  // 15:30 IST = 10:00 UTC
  const utcDate = new Date(Date.UTC(year, month, day, 10, 0, 0));
  
  // Adjustment: Date.UTC uses the year/month/day of the 'target' which was derived from 'now' in Kolkata.
  // This is correct.
  
  return Math.floor(utcDate.getTime() / 1000);
}
