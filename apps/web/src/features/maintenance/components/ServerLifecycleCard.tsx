import { useQuery } from '@tanstack/react-query';

import { SERVER_STATUS, type ServerSummaryDto } from '@aegis/api-contracts';
import { Card, StatusTag } from '@aegis/ui';
import {
  describeServerExit,
  getServerExitPresentation,
  getServerStatusPresentation,
  serverQueries,
} from '@aegis/web/core';

import { formatRuntime } from '../maintenance.utils';

import { ForceStopServerTile } from './ForceStopServerTile';
import { RestartServerTile } from './RestartServerTile';
import { StartServerTile } from './StartServerTile';
import { StopServerTile } from './StopServerTile';

export interface ServerLifecycleCardProps {
  server: ServerSummaryDto;
}

/**
 * "Server lifecycle" section of the Maintenance page: the live process state and one tile per
 * lifecycle action. Status comes from the live server list (DSM-00173/00164); the process line
 * from the server detail, which the SSE handler refetches on every status change.
 */
export function ServerLifecycleCard({ server }: ServerLifecycleCardProps) {
  const detail = useQuery(serverQueries.detail(server.id));
  const status = getServerStatusPresentation(server.status);
  const exit = getServerExitPresentation(server.status, server.lastExit);
  const runtime = detail.data?.runtime ?? null;
  // A deliberate stop is not an alert, so it stays out of the shell selector, but the operator
  // still needs to see how and when the last run ended (DSM-00350).
  const lastRun =
    server.status === SERVER_STATUS.STOPPED && server.lastExit
      ? describeServerExit(server.lastExit)
      : null;

  return (
    <Card
      title="Server lifecycle"
      subtitle="Start and stop the DayZ server process. These actions affect connected players."
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--color-border)] pb-4">
        <StatusTag status={status.tagStatus} label={status.label} />
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-[var(--color-text-secondary)]">
            {runtime && formatRuntime(runtime)}
            {!runtime && exit && <span title={exit.description}>{exit.label}</span>}
            {!runtime && !exit && 'No server process is running.'}
          </span>
          {!runtime && lastRun && (
            <span className="text-[var(--color-text-muted)]">Last run: {lastRun.description}</span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 divide-y divide-[var(--color-border)] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
        <StartServerTile server={server} />
        <StopServerTile server={server} />
        <RestartServerTile server={server} />
        <ForceStopServerTile server={server} />
      </div>
    </Card>
  );
}
