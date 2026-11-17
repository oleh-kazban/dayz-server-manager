import { type FormEvent, useId, useRef, useState } from 'react';

import { X } from 'lucide-react';

import {
  formatStopDelay,
  STOP_DELAY_PRESETS_SEC,
  STOP_MESSAGE_MAX_LENGTH,
  type StopServerRequestDto,
  stopServerRequestSchema,
} from '@aegis/api-contracts';
import { Button, Input } from '@aegis/ui';
import { useModalDialog } from '@aegis/web/core';

import { GRACEFUL_STOP_COPY, type GracefulStopKind } from '../graceful-stop.copy';
import { formatDelayPreset } from '../maintenance.utils';

export interface StopServerDialogProps {
  /** Stop on its own, or the stop part of a restart (wording only). @default 'stop' */
  kind?: GracefulStopKind;
  serverName: string;
  isPending: boolean;
  /** Resolved `fieldErrors` of the last failed request (inline, feedback contract). */
  fieldErrors: Record<string, string>;
  onSubmit: (request: StopServerRequestDto) => void;
  onClose: () => void;
}

/**
 * Stop / Restart dialog (DSM-00171/00172): now, or after a preset delay with an in-game warning
 * that may be customised. Validates with the same schema as the API before sending.
 */
export function StopServerDialog({
  kind = 'stop',
  serverName,
  isPending,
  fieldErrors,
  onSubmit,
  onClose,
}: StopServerDialogProps) {
  const titleId = useId();
  const messageRef = useRef<HTMLInputElement>(null);
  const [delaySec, setDelaySec] = useState<number>(STOP_DELAY_PRESETS_SEC[0]);
  const [message, setMessage] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const { dialogRef, handleBackdropClick } = useModalDialog({ onClose, isBusy: isPending });

  const copy = GRACEFUL_STOP_COPY[kind];
  const isDelayed = delaySec > 0;
  const messageError = clientError ?? fieldErrors.message;
  const delayError = fieldErrors.delaySec;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) {
      return;
    }
    const request: StopServerRequestDto =
      isDelayed && message.trim() ? { delaySec, message } : { delaySec };
    const parsed = stopServerRequestSchema.safeParse(request);
    if (!parsed.success) {
      setClientError(parsed.error.issues[0].message);
      messageRef.current?.focus();
      return;
    }
    setClientError(null);
    onSubmit(request);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div
        ref={dialogRef}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-[var(--color-text-main)]">
              {copy.dialogTitle(serverName)}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">{copy.dialogSubtitle}</p>
          </div>
          <Button
            variant="ghost"
            isIconOnly
            leftIcon={X}
            aria-label="Close dialog"
            disabled={isPending}
            onClick={onClose}
          />
        </div>

        <form noValidate onSubmit={handleSubmit} className="space-y-5 pt-5">
          <fieldset>
            <legend className="text-xs font-medium text-[var(--color-text-main)]">When</legend>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {STOP_DELAY_PRESETS_SEC.map(preset => (
                <label
                  key={preset}
                  className="flex cursor-pointer items-center justify-center rounded-lg border border-[var(--color-border)] px-2 py-2 text-sm text-[var(--color-text-main)] has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary-light)] has-[:checked]:font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-primary)]"
                >
                  <input
                    type="radio"
                    name="stop-delay"
                    value={preset}
                    checked={delaySec === preset}
                    disabled={isPending}
                    onChange={() => {
                      setDelaySec(preset);
                      setClientError(null);
                    }}
                    className="sr-only"
                  />
                  {formatDelayPreset(preset)}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              {isDelayed ? copy.delayedSummary(formatStopDelay(delaySec)) : copy.nowSummary}
            </p>
            {delayError && (
              <p role="alert" className="mt-1 text-xs text-[var(--color-danger)]">
                {delayError}
              </p>
            )}
          </fieldset>

          {isDelayed && (
            <Input
              ref={messageRef}
              label="In-game warning (optional)"
              placeholder={copy.defaultWarning(delaySec)}
              value={message}
              maxLength={STOP_MESSAGE_MAX_LENGTH}
              disabled={isPending}
              error={messageError}
              onChange={event => {
                setMessage(event.target.value);
                setClientError(null);
              }}
            />
          )}

          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" disabled={isPending} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              destructive
              leftIcon={copy.icon}
              isLoading={isPending}
            >
              {isDelayed ? copy.submitDelayed : copy.submitNow}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
