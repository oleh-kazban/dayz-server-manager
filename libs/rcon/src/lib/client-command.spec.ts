import dgram from 'node:dgram';
import { afterEach, describe, expect, it } from 'vitest';

import {
  FakeBattlEyeServer,
  type FakeBattlEyeServerOptions,
} from './__fixtures__/fake-battleye-server';
import {
  BattlEyeRconClient,
  type BattlEyeRconClientOptions,
  DEFAULT_COMMAND_ATTEMPT_TIMEOUT_MS,
  DEFAULT_COMMAND_RETRIES,
} from './client';
import { encodePacket, PACKET_TYPE } from './packet';

const PASSWORD = 'Rcon!Pass_42';
const servers: FakeBattlEyeServer[] = [];
const clients: BattlEyeRconClient[] = [];

async function session(
  serverOptions: Omit<FakeBattlEyeServerOptions, 'password'> = {},
  clientOptions: Partial<BattlEyeRconClientOptions> = {},
) {
  const server = await FakeBattlEyeServer.start({ password: PASSWORD, ...serverOptions });
  servers.push(server);
  let socket: dgram.Socket | undefined;
  const rcon = new BattlEyeRconClient({
    host: '127.0.0.1',
    port: server.port,
    password: PASSWORD,
    commandAttemptTimeoutMs: 150,
    createSocket: () => {
      socket = dgram.createSocket('udp4');
      return socket;
    },
    ...clientOptions,
  });
  clients.push(rcon);
  await expect(rcon.login()).resolves.toEqual({ ok: true });
  return { server, rcon, clientPort: (socket as dgram.Socket).address().port, socket };
}

const commandPacket = (payload: number[] | Buffer) =>
  encodePacket(PACKET_TYPE.COMMAND, Buffer.from(payload));

afterEach(async () => {
  await Promise.all(clients.splice(0).map(c => c.close()));
  await Promise.all(servers.splice(0).map(s => s.close()));
});

describe('BattlEyeRconClient.command', () => {
  it('sends commands with increasing sequence numbers and resolves their responses', async () => {
    const { server, rcon } = await session({ respond: command => `echo:${command}` });

    await expect(rcon.command('players')).resolves.toEqual({ ok: true, response: 'echo:players' });
    await expect(rcon.command('#lock')).resolves.toEqual({ ok: true, response: 'echo:#lock' });
    expect(server.commands).toEqual([
      { sequence: 0, command: 'players' },
      { sequence: 1, command: '#lock' },
    ]);
    expect(rcon.pendingCommands).toBe(0);
  });

  it('resolves an empty response (command acknowledged without output)', async () => {
    const { rcon } = await session();
    await expect(rcon.command('#shutdown')).resolves.toEqual({ ok: true, response: '' });
  });

  it.each([
    ['in order', false],
    ['last part first', true],
  ])('reassembles a multi-part response sent %s', async (_label, reverseParts) => {
    // Multi-byte characters are split across parts; decoding happens after reassembly.
    const text = `Players on server:\n${'Spieler-Ä-é-✓\n'.repeat(20)}(20 players in total)`;
    const { rcon } = await session({ respond: () => text, partSize: 7, reverseParts });
    await expect(rcon.command('players')).resolves.toEqual({ ok: true, response: text });
  });

  it('resolves concurrent commands independently', async () => {
    const { rcon } = await session({ respond: command => command.toUpperCase() });
    const results = await Promise.all(['a', 'b', 'c'].map(command => rcon.command(command)));
    expect(results).toEqual([
      { ok: true, response: 'A' },
      { ok: true, response: 'B' },
      { ok: true, response: 'C' },
    ]);
  });

  it('wraps the sequence number from 255 back to 0', async () => {
    const { server, rcon } = await session({ respond: () => 'ok' });
    for (let i = 0; i < 257; i++) {
      await rcon.command(`c${i}`);
    }
    expect(server.commands.slice(-2).map(c => c.sequence)).toEqual([255, 0]);
  });

  it('resends a lost command with the same sequence number', async () => {
    const { server, rcon } = await session({ respond: () => 'pong', dropCommands: 2 });
    await expect(rcon.command('ping')).resolves.toEqual({ ok: true, response: 'pong' });
    expect(server.commands).toEqual([
      { sequence: 0, command: 'ping' },
      { sequence: 0, command: 'ping' },
      { sequence: 0, command: 'ping' },
    ]);
  });

  it('fails with a typed timeout after the bounded retries', async () => {
    const { server, rcon } = await session(
      { dropCommands: 99 },
      { commandAttemptTimeoutMs: 80, commandRetries: 1 },
    );
    await expect(rcon.command('players')).resolves.toEqual({
      ok: false,
      error: 'timeout',
      message: 'No complete RCON response after 2 attempts of 80 ms.',
    });
    expect(server.commands).toHaveLength(2);
    expect(rcon.pendingCommands).toBe(0);
  });

  it('ignores malformed, unrelated, unknown-sequence and inconsistent packets', async () => {
    const { rcon } = await session({
      respond: () => 'ok-response',
      partSize: 4,
      noiseBeforeCommandAnswer: sequence => [
        Buffer.from('garbage'),
        encodePacket(PACKET_TYPE.MESSAGE, Buffer.from([0, ...Buffer.from('server says hi')])),
        commandPacket([(sequence + 9) % 256, ...Buffer.from('not for me')]),
        commandPacket([sequence, 0x00]), // invalid multi-part header
        commandPacket([sequence, 0x00, 9, 0, ...Buffer.from('xxxx')]), // part with another total
        commandPacket([sequence, 0x00, 2, 5]), // part index out of range
      ],
    });
    await expect(rcon.command('anything')).resolves.toEqual({ ok: true, response: 'ok-response' });
  });

  it('ignores a duplicate part of a response that is still incomplete', async () => {
    const { rcon, server, clientPort } = await session({ dropCommands: 99 });
    const pending = rcon.command('players');
    await new Promise(resolve => setTimeout(resolve, 30));
    const part = (index: number, text: string) =>
      commandPacket([0, 0x00, 2, index, ...Buffer.from(text)]);
    server.sendTo(part(1, 'world'), clientPort);
    server.sendTo(part(1, 'world'), clientPort);
    server.sendTo(part(0, 'hello '), clientPort);
    await expect(pending).resolves.toEqual({ ok: true, response: 'hello world' });
  });

  it('refuses commands before login and after close', async () => {
    const offline = new BattlEyeRconClient({ host: '127.0.0.1', port: 2302, password: PASSWORD });
    clients.push(offline);
    await expect(offline.command('players')).resolves.toEqual({
      ok: false,
      error: 'not_logged_in',
      message: 'RCON command sent before a successful login.',
    });

    const { rcon } = await session();
    await rcon.close();
    await expect(rcon.command('players')).resolves.toMatchObject({ error: 'not_logged_in' });
  });

  it('reports busy when all 256 sequence numbers are waiting, and close fails them', async () => {
    const { rcon } = await session({ dropCommands: 10_000 }, { commandAttemptTimeoutMs: 60_000 });
    const inFlight = Array.from({ length: 256 }, (_, i) => rcon.command(`c${i}`));
    expect(rcon.pendingCommands).toBe(256);
    await expect(rcon.command('one too many')).resolves.toEqual({
      ok: false,
      error: 'busy',
      message: 'All 256 RCON sequence numbers are waiting for a response.',
    });

    await rcon.close();
    const results = await Promise.all(inFlight);
    expect(results.every(r => !r.ok && r.error === 'connection_lost')).toBe(true);
    expect(results[0]).toEqual({
      ok: false,
      error: 'connection_lost',
      message: 'RCON client was closed.',
    });
  });

  it('fails pending commands with connection_lost on a socket error', async () => {
    const { rcon, server, socket } = await session(
      { dropCommands: 99 },
      { commandAttemptTimeoutMs: 60_000 },
    );
    const pending = rcon.command('players');
    socket?.emit('error', Object.assign(new Error('reset'), { code: 'ECONNRESET' }));
    await expect(pending).resolves.toEqual({
      ok: false,
      error: 'connection_lost',
      message: `RCON connection to 127.0.0.1:${server.port} was lost (ECONNRESET).`,
    });
    expect(rcon.isLoggedIn).toBe(false);
  });

  it('exposes the retry defaults', () => {
    const rcon = new BattlEyeRconClient({ host: '127.0.0.1', port: 2302, password: PASSWORD });
    clients.push(rcon);
    expect(rcon.commandAttemptTimeoutMs).toBe(DEFAULT_COMMAND_ATTEMPT_TIMEOUT_MS);
    expect(rcon.commandRetries).toBe(DEFAULT_COMMAND_RETRIES);
  });
});
