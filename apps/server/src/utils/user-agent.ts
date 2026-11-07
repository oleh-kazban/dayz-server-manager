function detectOs(ua: string): string {
  if (/Windows NT 10|Windows NT 11|Windows/i.test(ua)) return 'Windows';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Linux/i.test(ua)) return 'Linux';
  return '';
}

function detectBrowser(ua: string, os: string): string {
  if (/Edg(?:e)?\//i.test(ua)) return 'Edge';
  if (/OPR\/|Opera\//i.test(ua)) return 'Opera';
  if (/Firefox\/|FxiOS\//i.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS\//i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua)) {
    return os === 'iOS' ? 'Mobile Safari' : 'Safari';
  }
  return '';
}

export function parseUserAgent(uaString?: string | null): string {
  if (!uaString || typeof uaString !== 'string' || !uaString.trim()) {
    return 'Unknown Device';
  }

  const ua = uaString.trim();
  const os = detectOs(ua);
  const browser = detectBrowser(ua, os);

  if (browser === 'Mobile Safari' && os === 'iOS') {
    return 'Mobile Safari on iOS';
  }

  if (browser && os) {
    return `${browser} on ${os}`;
  }

  return browser || os || 'Unknown Device';
}
