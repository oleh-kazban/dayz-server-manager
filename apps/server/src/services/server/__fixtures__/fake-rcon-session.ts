import type { RconCommandResult, RconLoginResult } from '@aegis/rcon';

import type { RconSession, RconSessionFactory } from '../server-lifecycle.service';

export interface RconTarget {
  host: string;
  port: number;
  password: string;
}

/**
 * Scriptable RCON session for lifecycle tests: configurable login and command outcomes, with a
 * record of every target, command and close.
 */
export class FakeRconSessions {
  readonly targets: RconTarget[] = [];
  readonly commands: string[] = [];
  closed = 0;
  loginResult: RconLoginResult = { ok: true };
  commandResult: RconCommandResult = { ok: true, response: '' };
  /** Runs during login, before it resolves (e.g. to simulate a concurrent status change). */
  onLogin: (() => void) | null = null;

  readonly factory: RconSessionFactory = target => {
    this.targets.push(target);
    const session: RconSession = {
      login: async () => {
        this.onLogin?.();
        return this.loginResult;
      },
      command: async text => {
        this.commands.push(text);
        return this.commandResult;
      },
      close: async () => {
        this.closed += 1;
      },
    };
    return session;
  };
}
