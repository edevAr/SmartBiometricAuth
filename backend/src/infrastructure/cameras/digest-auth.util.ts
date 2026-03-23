import * as crypto from 'crypto';

function md5(s: string): string {
  return crypto.createHash('md5').update(s, 'utf8').digest('hex');
}

export function parseDigestChallenge(wwwAuthenticate: string): Record<string, string> {
  const params: Record<string, string> = {};
  const s = wwwAuthenticate.replace(/^\s*Digest\s+/i, '');
  const re = /(\w+)=("([^"]*)"|'([^']*)'|([^,\s]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const key = m[1].toLowerCase();
    const value = m[3] ?? m[4] ?? m[5]?.trim() ?? '';
    params[key] = value;
  }
  return params;
}

/**
 * Genera cabecera Authorization completa para Digest (tras un 401).
 */
export function buildDigestAuthorizationHeader(
  method: string,
  requestUri: string,
  username: string,
  password: string,
  wwwAuthenticate: string,
): string | null {
  if (!/digest/i.test(wwwAuthenticate)) return null;
  const p = parseDigestChallenge(wwwAuthenticate);
  const realm = p.realm ?? '';
  const nonce = p.nonce ?? '';
  if (!nonce) return null;

  const qopRaw = (p.qop ?? '').toLowerCase();
  const useQop = qopRaw.includes('auth');
  const qop = useQop ? 'auth' : '';

  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${requestUri}`);
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');

  let response: string;
  if (useQop) {
    response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
  } else {
    response = md5(`${ha1}:${nonce}:${ha2}`);
  }

  const q = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const parts: string[] = [
    `username="${q(username)}"`,
    `realm="${q(realm)}"`,
    `nonce="${q(nonce)}"`,
    `uri="${q(requestUri)}"`,
    `response="${response}"`,
  ];
  if (useQop) {
    parts.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  }
  if (p.opaque) parts.push(`opaque="${q(p.opaque)}"`);
  return `Digest ${parts.join(', ')}`;
}
