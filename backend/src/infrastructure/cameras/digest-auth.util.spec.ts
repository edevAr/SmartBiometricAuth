import { buildDigestAuthorizationHeader, parseDigestChallenge } from './digest-auth.util';

describe('digest-auth.util', () => {
  it('parseDigestChallenge extrae realm y nonce', () => {
    const h =
      'Digest realm="cam", nonce="abc", qop="auth", opaque="op"';
    const p = parseDigestChallenge(h);
    expect(p.realm).toBe('cam');
    expect(p.nonce).toBe('abc');
    expect(p.qop).toBe('auth');
    expect(p.opaque).toBe('op');
  });

  it('parseDigestChallenge acepta valores entre comillas simples o sin comillas', () => {
    const p = parseDigestChallenge("Digest realm='r', nonce=naked");
    expect(p.realm).toBe('r');
    expect(p.nonce).toBe('naked');
  });

  it('buildDigestAuthorizationHeader retorna null si no es Digest o sin nonce', () => {
    expect(buildDigestAuthorizationHeader('GET', '/x', 'u', 'p', 'Basic realm=x')).toBeNull();
    expect(
      buildDigestAuthorizationHeader('GET', '/x', 'u', 'p', 'Digest realm="r"'),
    ).toBeNull();
  });

  it('genera cabecera con qop=auth y sin qop', () => {
    const www = 'Digest realm="r", nonce="n", qop="auth"';
    const withQop = buildDigestAuthorizationHeader('GET', '/uri', 'user', 'pass', www);
    expect(withQop).toContain('Digest ');
    expect(withQop).toContain('qop=auth');
    expect(withQop).toContain('response=');

    const www2 = 'Digest realm="r", nonce="n2"';
    const noQop = buildDigestAuthorizationHeader('POST', '/path', 'u', 'p', www2);
    expect(noQop).toContain('response=');
    expect(noQop).not.toContain('qop=');
  });

  it('incluye opaque si viene en el challenge', () => {
    const www = 'Digest realm="r", nonce="n", opaque="opq"';
    const h = buildDigestAuthorizationHeader('GET', '/', 'u', 'p', www);
    expect(h).toContain('opaque=');
  });
});
