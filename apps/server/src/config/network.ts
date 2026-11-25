const LOOPBACK = /^(localhost|::1|127(\.\d{1,3}){3})$/i;

export function listenWarning(host: string): string | null {
  if (LOOPBACK.test(host)) {
    return null;
  }
  return `Aegis listens on ${host}, which is reachable from other machines. Production use needs HTTPS in front of Aegis, for example a reverse proxy. Aegis does not manage certificates.`;
}
