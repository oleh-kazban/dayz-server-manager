import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  useId,
  useRef,
  useState,
} from 'react';

import { AlertCircle, FileText, UploadCloud, X } from 'lucide-react';

import type { FileUploaderProps } from './FileUploader.types';
import {
  formatFileSize,
  getConstraintsHint,
  getDropZoneBorderClasses,
  getFileCardBorderClasses,
  validateFileSize,
  validateFileType,
} from './FileUploader.utils';

interface SelectedFileCardProps {
  file: File;
  disabled: boolean;
  displayError: boolean;
  isDragging: boolean;
  className: string;
  onDragEnter: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onClear: (e?: MouseEvent | KeyboardEvent) => void;
}

function SelectedFileCard({
  file,
  disabled,
  displayError,
  isDragging,
  className,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onClear,
}: SelectedFileCardProps) {
  const borderClasses = getFileCardBorderClasses(isDragging, displayError, disabled);

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex items-center justify-between p-3 rounded-lg border shadow-xs transition-colors ${borderClasses} ${className}`.trim()}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-surface-subtle)] text-[var(--color-primary)] shrink-0">
          <FileText className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-xs font-medium text-[var(--color-text-main)] truncate">
            {file.name}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {formatFileSize(file.size)}
          </span>
        </div>
      </div>

      <button
        type="button"
        aria-label="Remove file"
        disabled={disabled}
        onClick={onClear}
        className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

interface DropZonePromptProps {
  disabled: boolean;
  displayError: boolean;
  isDragging: boolean;
  className: string;
  constraintsHint: string | null;
  computedDescribedBy?: string;
  ariaLabel?: string;
  label?: string;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  onDragEnter: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
}

function DropZonePrompt({
  disabled,
  displayError,
  isDragging,
  className,
  constraintsHint,
  computedDescribedBy,
  ariaLabel,
  label,
  onClick,
  onKeyDown,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}: DropZonePromptProps) {
  const borderClasses = getDropZoneBorderClasses(isDragging, displayError, disabled);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-disabled={disabled}
      aria-invalid={displayError}
      aria-describedby={computedDescribedBy}
      aria-label={ariaLabel ?? label ?? 'Upload file'}
      className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed transition-colors select-none text-center outline-none ${borderClasses} ${className}`.trim()}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] mb-3">
        <UploadCloud className="w-5 h-5" aria-hidden="true" />
      </div>
      <span className="text-xs font-medium text-[var(--color-text-main)]">
        Click to upload or drag and drop
      </span>
      {constraintsHint && (
        <span className="text-[11px] text-[var(--color-text-muted)] mt-1">{constraintsHint}</span>
      )}
    </div>
  );
}

export function FileUploader({
  id: externalId,
  value,
  defaultValue,
  onChange,
  accept,
  maxSizeBytes,
  disabled = false,
  error,
  onError,
  label,
  helperText,
  className = '',
  containerClassName = '',
  customClassName = '',
  ariaLabel,
  'aria-describedby': externalDescribedBy,
  name,
  required = false,
}: FileUploaderProps) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;
  const isControlled = value !== undefined;
  const [internalFile, setInternalFile] = useState<File | null>(defaultValue ?? null);
  const currentFile = isControlled ? value : internalFile;

  const [internalError, setInternalError] = useState<string | null>(null);
  const displayError = error ?? internalError;

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const computedDescribedBy =
    [
      externalDescribedBy,
      displayError ? errorId : null,
      helperText && !displayError ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  const handleFile = (file: File) => {
    // GUARD-03: Disabled State Precondition
    if (disabled) return;

    // GUARD-01: File Size Boundary Validation
    if (!validateFileSize(file, maxSizeBytes)) {
      const message = `File size exceeds the maximum allowed limit of ${formatFileSize(maxSizeBytes!)}.`;
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      setInternalError(message);
      onError?.({
        type: 'FILE_TOO_LARGE',
        message,
        file,
      });
      return;
    }

    // GUARD-02: File Extension & MIME Type Boundary Validation
    if (!validateFileType(file, accept)) {
      const message = 'File type is not supported. Please select an allowed file format.';
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      setInternalError(message);
      onError?.({
        type: 'INVALID_TYPE',
        message,
        file,
      });
      return;
    }

    setInternalError(null);
    if (!isControlled) {
      setInternalFile(file);
    }
    onChange?.(file);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // GUARD-03
    if (disabled) return;
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // GUARD-03
    if (disabled) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // GUARD-03
    if (disabled) return;
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    // GUARD-03
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDropZoneClick = () => {
    // GUARD-03
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleDropZoneKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // GUARD-03
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    // GUARD-03
    if (disabled) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Clear native input value so selecting the same file triggers change reliably
    e.target.value = '';
  };

  const handleClear = (e?: MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    // GUARD-03
    if (disabled) return;
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setInternalError(null);
    if (!isControlled) {
      setInternalFile(null);
    }
    onChange?.(null);
  };

  const resolvedContainerClass = containerClassName || customClassName || '';
  const constraintsHint = getConstraintsHint(accept, maxSizeBytes);

  return (
    <div className={`space-y-1.5 text-left ${resolvedContainerClass}`.trim()}>
      {label && (
        <label
          htmlFor={currentFile ? undefined : inputId}
          className={`block text-xs font-medium select-none ${
            disabled
              ? 'cursor-not-allowed opacity-50 text-[var(--color-text-muted)]'
              : 'text-[var(--color-text-main)]'
          }`}
        >
          {label}
        </label>
      )}

      <input
        ref={inputRef}
        type="file"
        id={inputId}
        name={name}
        required={required && !currentFile}
        accept={Array.isArray(accept) ? accept.join(',') : accept}
        disabled={disabled}
        aria-disabled={disabled}
        onChange={handleInputChange}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />

      {currentFile ? (
        <SelectedFileCard
          file={currentFile}
          disabled={disabled}
          displayError={Boolean(displayError)}
          isDragging={isDragging}
          className={className}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClear={handleClear}
        />
      ) : (
        <DropZonePrompt
          disabled={disabled}
          displayError={Boolean(displayError)}
          isDragging={isDragging}
          className={className}
          constraintsHint={constraintsHint}
          computedDescribedBy={computedDescribedBy}
          ariaLabel={ariaLabel}
          label={label}
          onClick={handleDropZoneClick}
          onKeyDown={handleDropZoneKeyDown}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      )}

      {displayError && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-[var(--color-status-danger)] flex items-center gap-1.5"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{displayError}</span>
        </p>
      )}

      {helperText && !displayError && (
        <p id={helperId} className="text-xs text-[var(--color-text-muted)]">
          {helperText}
        </p>
      )}
    </div>
  );
}
