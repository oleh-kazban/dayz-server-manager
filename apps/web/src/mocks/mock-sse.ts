import type { ServerStatus, TelemetrySample } from '@/types/server';

type SSEEventListener = (_data: unknown) => void;

class MockSSEBus {
  private listeners: Map<string, Set<SSEEventListener>> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentStatus: ServerStatus = 'RUNNING';

  public on(event: string, listener: SSEEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  public emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(fn => fn(data));
    }
  }

  public setServerStatus(status: ServerStatus): void {
    this.currentStatus = status;
    this.emit('server.status.changed', {
      status,
      pid: status === 'STOPPED' || status === 'FAILED' ? null : 14208,
      timestamp: Date.now(),
    });
  }

  public startTelemetryStream(intervalMs = 2000): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      if (this.currentStatus !== 'RUNNING') return;

      const sample: TelemetrySample = {
        hostCpuPercent: Math.round((20 + Math.random() * 25) * 10) / 10,
        hostRamUsedMb: Math.round(6144 + (Math.random() * 512 - 256)),
        hostRamTotalMb: 32768,
        serverFps: Math.round((54 + Math.random() * 6) * 10) / 10,
        timestamp: Date.now(),
      };

      this.emit('telemetry.updated', sample);
    }, intervalMs);
  }

  public stopTelemetryStream(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const mockSSE = new MockSSEBus();
