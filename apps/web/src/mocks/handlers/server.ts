import { delay, http, HttpResponse } from 'msw';

import { mockSSE } from '@/mocks/mock-sse';
import type { ServerActionResponse, ServerStatusResponse, TelemetrySample } from '@/types/server';

const state: ServerStatusResponse = {
  status: 'RUNNING',
  pid: 14208,
  port: 2302,
  rconPort: 2306,
  uptimeSeconds: 86400,
  serverName: 'DayZ Dedicated (ChernarusPlus)',
  maxPlayers: 60,
  activePlayers: 18,
  ip: '127.0.0.1',
  version: '1.26.159040',
  map: 'ChernarusPlus',
};

export const serverHandlers = [
  http.get('/api/v1/server/status', async () => {
    await delay(120);

    return HttpResponse.json<ServerStatusResponse>(state);
  }),

  http.post('/api/v1/server/start', async () => {
    await delay(200);

    state.status = 'STARTING';
    mockSSE.setServerStatus('STARTING');

    setTimeout(() => {
      state.status = 'RUNNING';
      state.pid = 14208;
      state.uptimeSeconds = 0;
      mockSSE.setServerStatus('RUNNING');
    }, 2500);

    const response: ServerActionResponse = {
      success: true,
      message: 'Server start initiated',
      taskId: 'task-start-001',
    };

    return HttpResponse.json<ServerActionResponse>(response);
  }),

  http.post('/api/v1/server/stop', async () => {
    await delay(200);

    state.status = 'STOPPING';
    mockSSE.setServerStatus('STOPPING');

    setTimeout(() => {
      state.status = 'STOPPED';
      state.pid = null;
      state.activePlayers = 0;
      mockSSE.setServerStatus('STOPPED');
    }, 2500);

    const response: ServerActionResponse = {
      success: true,
      message: 'Graceful shutdown initiated (delay: 60s)',
      taskId: 'task-stop-001',
    };

    return HttpResponse.json<ServerActionResponse>(response);
  }),

  http.post('/api/v1/server/restart', async () => {
    await delay(200);

    state.status = 'STOPPING';
    mockSSE.setServerStatus('STOPPING');

    setTimeout(() => {
      state.status = 'STARTING';
      mockSSE.setServerStatus('STARTING');

      setTimeout(() => {
        state.status = 'RUNNING';
        state.pid = 14208;
        state.uptimeSeconds = 0;
        mockSSE.setServerStatus('RUNNING');
      }, 2500);
    }, 2500);

    const response: ServerActionResponse = {
      success: true,
      message: 'Server restart initiated',
      taskId: 'task-restart-001',
    };

    return HttpResponse.json<ServerActionResponse>(response);
  }),

  http.get('/api/v1/server/telemetry', async () => {
    await delay(100);

    const sample: TelemetrySample = {
      hostCpuPercent: 24.6,
      hostRamUsedMb: 6240,
      hostRamTotalMb: 32768,
      serverFps: 58.2,
      timestamp: Date.now(),
    };

    return HttpResponse.json<TelemetrySample>(sample);
  }),
];
