export type FileUploaderErrorType = 'FILE_TOO_LARGE' | 'INVALID_TYPE';

export interface FileUploaderError {
  type: FileUploaderErrorType;
  message: string;
  file?: File;
}

export interface FileUploaderProps {
  /** Optional form field identifier */
  id?: string;

  /** Controlled selected file value */
  value?: File | null;

  /** Initial selected file for uncontrolled state */
  defaultValue?: File | null;

  /** Callback fired when a valid file is selected or removed */
  onChange?: (file: File | null) => void;

  /**
   * Allowed file extensions or MIME patterns (e.g. `'.json'`, `['.json', '.xml']`, `'image/*'`).
   */
  accept?: string | string[];

  /** Maximum allowed file size in bytes */
  maxSizeBytes?: number;

  /** Disables the drop zone, native file input trigger, and removal action */
  disabled?: boolean;

  /** Explicit external error message to render */
  error?: string;

  /** Callback fired when a dropped or selected file fails validation */
  onError?: (error: FileUploaderError) => void;

  /** Label displayed above the drop zone */
  label?: string;

  /** Helper text displayed beneath the drop zone when there are no errors */
  helperText?: string;

  /** Styling classes applied to the drop zone or file card element */
  className?: string;

  /** Styling classes applied to the outer wrapper container */
  containerClassName?: string;

  /** Legacy styling classes alias for the outer container */
  customClassName?: string;

  /** Accessible label for screen readers */
  ariaLabel?: string;

  /** Accessible description IDs */
  'aria-describedby'?: string;

  /** Form field name for native form integration */
  name?: string;

  /** Whether a file selection is required */
  required?: boolean;
}
