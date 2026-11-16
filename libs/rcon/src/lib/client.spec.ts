import dgram from 'node:dgram';
import { inspect } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

import { FakeBattlEyeServer } from './__fixtures__/fake-battleye-server';
import { BattlEyeRconClient, DEFAULT_RCON_TIMEOUT_MS } from './client';
import { decodePacket, encodePacket, PACKET_TYPE } from './packet';

const PASSWORD = 'Rcon!Pass_42';
const servers: FakeBattlEyeServer[] = [];
const clients: BattlEyeRconClient[] = [];

async function startServer(
  options: Partial<ConstructorParameters<typeof Object>[0]> & {
    silent?: boolean;
    noiseBeforeAnswer?: Buffer[];
  } = {},
) {
  const server = await FakeBattlEyeServer.start({ password: PASSWORD, ...options });
  servers.push(server);
  return server;
}

function client(
  port: number,
  overrides: Partial<{ password: string; host: string; timeoutMs: number }> = {},
) {
  const created = new BattlEyeRconClient({
    host: '127.0.0.1',
    port,
    password: PASSWORD,
    timeoutMs: 1_000,
    ...overrides,
  });
  clients.push(created);
  return created;
}

/** A local UDP port with nothing listening on it. */
async function closedPort(): Promise<number> {
  const probe = dgram.createSocket('udp4');
  await new Promise<void>(resolve => probe.bind(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise<void>(resolve => probe.close(() => resolve()));
  return port;
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map(c => c.close()));
  await Promise.all(servers.splice(0).map(s => s.close()));
});

describe('BattlEyeRconClient.login', () => {
  it('logs in with the right password and sends a well-formed login packet', async () => {
    const server = await startServer();
    const rcon = client(server.port);

    await expect(rcon.login()).resolves.toEqual({ ok: true });
    expect(rcon.isLoggedIn).toBe(true);
    expect(server.received).toHaveLength(1);
    expect(decodePacket(server.received[0])).toEqual({
      ok: true,
      packet: { type: 'login', success: false },
    });
    expect(server.received[0].subarray(8).toString('ascii')).toBe(PASSWORD);

    // A second call on an open session does not log in again.
    await expect(rcon.login()).resolves.toEqual({ ok: true });
    expect(server.received).toHaveLength(1);
  });

  it('returns login_failed for a wrong password', async () => {
    const server = await startServer();
    const rcon = client(server.port, { password: 'wrong-password' });
    await expect(rcon.login()).resolves.toEqual({
      ok: false,
      error: 'login_failed',
      message: 'BattlEye rejected the RCON password.',
    });
    expect(rcon.isLoggedIn).toBe(false);
  });

  it('returns timeout when the server never answers', async () => {
    const server = await startServer({ silent: true });
    const rcon = client(server.port, { timeoutMs: 300 });
    const result = await rcon.login();
    expect(result).toEqual({
      ok: false,
      error: 'timeout',
      message: `No RCON login response from 127.0.0.1:${server.port} within 300 ms.`,
    });
  });

  it('ignores malformed and unrelated packets while waiting for the login answer', async () => {
    const server = await startServer({
      noiseBeforeAnswer: [
        Buffer.from('garbage'),
        encodePacket(PACKET_TYPE.MESSAGE, Buffer.from([0, ...Buffer.from('hello')])),
      ],
    });
    await expect(client(server.port).login()).resolves.toEqual({ ok: true });
  });

  it('returns unreachable for an unresolvable host', async () => {
    const rcon = client(2302, { host: 'dsm-rcon-test.invalid' });
    const result = await rcon.login();
    expect(result).toMatchObject({ ok: false, error: 'unreachable' });
    expect(result.ok === false && result.message).toMatch(
      /^RCON endpoint dsm-rcon-test\.invalid:2302 is unreachable \(E[A-Z_]+\)\.$/,
    );
  });

  it('returns unreachable or timeout for a closed local port, never throws', async () => {
    // Linux reports ICMP port unreachable (ECONNREFUSED); Windows may stay silent until the timeout.
    const result = await client(await closedPort(), { timeoutMs: 500 }).login();
    expect(result.ok).toBe(false);
    expect(['unreachable', 'timeout']).toContain(result.ok === false && result.error);
  });

  it('never exposes the password through results, errors or inspection', async () => {
    const server = await startServer({ silent: true });
    const rcon = client(server.port, { timeoutMs: 200 });
    const result = await rcon.login();
    expect(JSON.stringify(result)).not.toContain(PASSWORD);
    expect(inspect(rcon, { depth: 5, showHidden: true })).not.toContain(PASSWORD);
    expect(JSON.stringify(rcon)).not.toContain(PASSWORD);

    expect(() => client(1, { password: 'bad\npass' })).toThrow(
      'RCON password must be non-empty printable ASCII.',
    );
    try {
      client(1, { password: 'pässword' });
    } catch (error) {
      expect(String(error)).not.toContain('pässword');
    }
  });

  it('validates host, port and password up front', () => {
    expect(() => client(2302, { host: '  ' })).toThrow('RCON host must not be empty.');
    expect(() => client(0)).toThrow('RCON port must be an integer between 1 and 65535.');
    expect(() => client(65536)).toThrow(RangeError);
    expect(() => client(2302.5)).toThrow(RangeError);
    expect(() => client(2302, { password: '' })).toThrow(RangeError);
  });
});

describe('BattlEyeRconClient lifecycle', () => {
  it('uses the default timeout and a udp4 socket when not configured', () => {
    const rcon = new BattlEyeRconClient({ host: '127.0.0.1', port: 2302, password: PASSWORD });
    clients.push(rcon);
    expect(rcon.timeoutMs).toBe(DEFAULT_RCON_TIMEOUT_MS);
  });

  it('close is idempotent and a closed client refuses to log in', async () => {
    const server = await startServer();
    const rcon = client(server.port);
    await rcon.login();
    await rcon.close();
    await rcon.close();
    expect(rcon.isLoggedIn).toBe(false);
    await expect(rcon.login()).rejects.toThrow('RCON client is closed.');
  });

  it('refuses a concurrent second login while the first is pending', async () => {
    const server = await startServer({ silent: true });
    const rcon = client(server.port, { timeoutMs: 200 });
    const first = rcon.login();
    await expect(rcon.login()).rejects.toThrow('RCON login is already in progress.');
    await expect(first).resolves.toMatchObject({ error: 'timeout' });
  });

  it('reports socket errors after login as a lost session without crashing', async () => {
    const server = await startServer();
    let socket: dgram.Socket | undefined;
    const rcon = new BattlEyeRconClient({
      host: '127.0.0.1',
      port: server.port,
      password: PASSWORD,
      createSocket: () => {
        socket = dgram.createSocket('udp4');
        return socket;
      },
    });
    clients.push(rcon);
    await rcon.login();
    socket?.emit('error', Object.assign(new Error('reset'), { code: 'ECONNRESET' }));
    expect(rcon.isLoggedIn).toBe(false);
  });

  it('maps send failures and code-less errors to unreachable', async () => {
    const server = await startServer();
    const failing = new BattlEyeRconClient({
      host: '127.0.0.1',
      port: server.port,
      password: PASSWORD,
      createSocket: () => {
        const socket = dgram.createSocket('udp4');
        socket.send = ((_msg: Buffer, cb: (error: Error | null) => void) => {
          cb(new Error('no code'));
        }) as unknown as typeof socket.send;
        return socket;
      },
    });
    clients.push(failing);
    await expect(failing.login()).resolves.toEqual({
      ok: false,
      error: 'unreachable',
      message: `RCON endpoint 127.0.0.1:${server.port} is unreachable (UNKNOWN).`,
    });
  });

  it('tolerates closing a socket that is already closed', async () => {
    const server = await startServer();
    let socket: dgram.Socket | undefined;
    const rcon = new BattlEyeRconClient({
      host: '127.0.0.1',
      port: server.port,
      password: PASSWORD,
      createSocket: () => {
        socket = dgram.createSocket('udp4');
        return socket;
      },
    });
    await rcon.login();
    socket?.close();
    await expect(rcon.close()).resolves.toBeUndefined();
  });
});
