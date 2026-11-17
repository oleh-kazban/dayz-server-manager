import type { ServerSummaryDto } from '@aegis/api-contracts';

import { GracefulStopTile } from './GracefulStopTile';

export interface StopServerTileProps {
  server: ServerSummaryDto;
}

/** Graceful stop control (DSM-00171): now or after a delay, with a scheduled-stop countdown. */
export function StopServerTile({ server }: StopServerTileProps) {
  return <GracefulStopTile kind="stop" server={server} />;
}
