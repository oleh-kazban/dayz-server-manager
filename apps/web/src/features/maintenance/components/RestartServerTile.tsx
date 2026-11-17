import type { ServerSummaryDto } from '@aegis/api-contracts';

import { GracefulStopTile } from './GracefulStopTile';

export interface RestartServerTileProps {
  server: ServerSummaryDto;
}

/**
 * Restart control (DSM-00172): graceful stop now or after a delay, then start again; shows a
 * scheduled restart with a countdown and a restart that failed in its stop or start phase.
 */
export function RestartServerTile({ server }: RestartServerTileProps) {
  return <GracefulStopTile kind="restart" server={server} />;
}
