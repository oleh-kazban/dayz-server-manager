import { RotateCw, Square } from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import {
  defaultRestartWarning,
  defaultStopWarning,
  type ServerDetailDto,
  type StopServerRequestDto,
} from '@aegis/api-contracts';
import type { NotificationCode } from '@aegis/web/core';

/** A graceful stop on its own, or the stop part of a restart (DSM-00171 / DSM-00172). */
export type GracefulStopKind = 'stop' | 'restart';

export interface GracefulStopCopy {
  title: string;
  description: string;
  button: string;
  icon: typeof Square;
  dialogTitle: (serverName: string) => string;
  dialogSubtitle: string;
  nowSummary: string;
  delayedSummary: (delay: string) => string;
  submitNow: string;
  submitDelayed: string;
  defaultWarning: (delaySec: number) => string;
  scheduledFor: string;
  countdown: string;
  due: string;
  cancel: string;
  requested: NotificationCode;
  scheduled: NotificationCode;
  cancelled: NotificationCode;
  errorTitle: string;
  request: (serverId: string, request: StopServerRequestDto) => Promise<ServerDetailDto>;
}

/** Everything that differs between the Stop and the Restart tile and dialog. */
export const GRACEFUL_STOP_COPY: Record<GracefulStopKind, GracefulStopCopy> = {
  stop: {
    title: 'Stop server',
    description:
      'Save the world and shut the server down through RCON, now or after warning players.',
    button: 'Stop server',
    icon: Square,
    dialogTitle: name => `Stop "${name}"`,
    dialogSubtitle: 'DayZ saves the world and shuts down through RCON.',
    nowSummary: 'The server stops right away and players are disconnected.',
    delayedSummary: delay =>
      `Players are warned now and the server stops in ${delay}. You can cancel until then.`,
    submitNow: 'Stop now',
    submitDelayed: 'Schedule stop',
    defaultWarning: defaultStopWarning,
    scheduledFor: 'Stop scheduled for',
    countdown: 'Stops in',
    due: 'Stopping now…',
    cancel: 'Cancel scheduled stop',
    requested: 'SERVER_STOP_REQUESTED',
    scheduled: 'SERVER_STOP_SCHEDULED',
    cancelled: 'SERVER_STOP_CANCELLED',
    errorTitle: 'Stop Failed',
    request: (serverId, request) => apiClient.servers.stop(serverId, request),
  },
  restart: {
    title: 'Restart server',
    description:
      'Save the world, shut down through RCON and start again, now or after warning players.',
    button: 'Restart server',
    icon: RotateCw,
    dialogTitle: name => `Restart "${name}"`,
    dialogSubtitle: 'DayZ saves the world, shuts down through RCON, then starts again.',
    nowSummary: 'The server restarts right away; players are disconnected until it is back.',
    delayedSummary: delay =>
      `Players are warned now and the server restarts in ${delay}. You can cancel until then.`,
    submitNow: 'Restart now',
    submitDelayed: 'Schedule restart',
    defaultWarning: defaultRestartWarning,
    scheduledFor: 'Restart scheduled for',
    countdown: 'Restarts in',
    due: 'Restarting now…',
    cancel: 'Cancel scheduled restart',
    requested: 'SERVER_RESTART_REQUESTED',
    scheduled: 'SERVER_RESTART_SCHEDULED',
    cancelled: 'SERVER_RESTART_CANCELLED',
    errorTitle: 'Restart Failed',
    request: (serverId, request) => apiClient.servers.restart(serverId, request),
  },
};
