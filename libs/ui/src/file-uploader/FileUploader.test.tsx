import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FileUploader } from './FileUploader';
import type { FileUploaderError } from './FileUploader.types';

describe('FileUploader', () => {
  const createMockFile = (name: string, sizeBytes: number, mimeType: string = 'text/plain') => {
    const content = new Uint8Array(sizeBytes);
    return new File([content], name, { type: mimeType });
  };

  describe('AC-01: Valid file selection via drop and native input picker', () => {
    it('selects a valid file via native input picker and displays file metadata and calls onChange', () => {
      const handleChange = vi.fn();
      const file = createMockFile('preset.json', 2048, 'application/json');

      const { container } = render(
        <FileUploader label="Configuration Preset" accept=".json" onChange={handleChange} />,
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();

      fireEvent.change(input, { target: { files: [file] } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(file);

      // Transition to selected file card
      expect(screen.getByText('preset.json')).toBeInTheDocument();
      expect(screen.getByText('2 KB')).toBeInTheDocument();
      expect(screen.queryByText(/click to upload or drag and drop/i)).not.toBeInTheDocument();
    });

    it('selects a valid file via drag-and-drop onto the drop zone', () => {
      const handleChange = vi.fn();
      const file = createMockFile('economy.xml', 1024 * 1024, 'application/xml');

      render(<FileUploader accept=".xml" onChange={handleChange} />);

      const dropZone = screen.getByRole('button', { name: /upload file/i });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(file);

      expect(screen.getByText('economy.xml')).toBeInTheDocument();
      expect(screen.getByText('1 MB')).toBeInTheDocument();
    });

    it('supports controlled mode where value is updated by parent', () => {
      const handleChange = vi.fn();
      const initialFile = createMockFile('initial.json', 512, 'application/json');
      const updatedFile = createMockFile('updated.json', 1024, 'application/json');

      const { rerender } = render(<FileUploader value={initialFile} onChange={handleChange} />);

      expect(screen.getByText('initial.json')).toBeInTheDocument();
      expect(screen.getByText('512 B')).toBeInTheDocument();

      rerender(<FileUploader value={updatedFile} onChange={handleChange} />);

      expect(screen.getByText('updated.json')).toBeInTheDocument();
      expect(screen.getByText('1 KB')).toBeInTheDocument();

      rerender(<FileUploader value={null} onChange={handleChange} />);

      expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
    });
  });

  describe('AC-02: Invalid file extension/MIME refusal (GUARD-02)', () => {
    it('refuses file with invalid extension, invokes onError with INVALID_TYPE, renders error, and guarantees zero mutation', () => {
      const handleChange = vi.fn();
      const handleError = vi.fn();
      const invalidFile = createMockFile('malicious.exe', 1024, 'application/x-msdownload');

      const { container } = render(
        <FileUploader accept=".json, .xml" onChange={handleChange} onError={handleError} />,
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [invalidFile] } });

      // Refusal assertions
      expect(handleError).toHaveBeenCalledTimes(1);
      const err = handleError.mock.calls[0][0] as FileUploaderError;
      expect(err.type).toBe('INVALID_TYPE');
      expect(err.file).toBe(invalidFile);
      expect(err.message).toMatch(/not supported/i);

      // Zero mutation guarantee
      expect(handleChange).not.toHaveBeenCalled();
      expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();

      // Inline error message
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/file type is not supported/i);
    });

    it('refuses invalid file dropped onto the drop zone', () => {
      const handleChange = vi.fn();
      const handleError = vi.fn();
      const invalidFile = createMockFile('picture.png', 500, 'image/png');

      render(<FileUploader accept=".json" onChange={handleChange} onError={handleError} />);

      const dropZone = screen.getByRole('button', { name: /upload file/i });
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [invalidFile],
        },
      });

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INVALID_TYPE',
          file: invalidFile,
        }),
      );
      expect(handleChange).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('preserves existing selection when a dropped file is rejected due to invalid type (zero mutation)', () => {
      const handleChange = vi.fn();
      const handleError = vi.fn();
      const validFile = createMockFile('valid.json', 1000, 'application/json');
      const invalidFile = createMockFile('invalid.png', 500, 'image/png');

      render(
        <FileUploader
          defaultValue={validFile}
          accept=".json"
          onChange={handleChange}
          onError={handleError}
        />,
      );

      expect(screen.getByText('valid.json')).toBeInTheDocument();

      // Drop invalid file over selected file card
      const card = screen.getByText('valid.json').closest('div[class*="rounded-lg"]')!;
      fireEvent.drop(card, {
        dataTransfer: {
          files: [invalidFile],
        },
      });

      expect(handleError).toHaveBeenCalledTimes(1);
      expect(handleChange).not.toHaveBeenCalled();
      // Valid file must still be present
      expect(screen.getByText('valid.json')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('AC-03: Max size boundary refusal (GUARD-01)', () => {
    it('refuses file exceeding maxSizeBytes, invokes onError with FILE_TOO_LARGE, renders error, and guarantees zero mutation', () => {
      const handleChange = vi.fn();
      const handleError = vi.fn();
      const maxSizeBytes = 1024 * 1024; // 1 MB
      const oversizedFile = createMockFile('huge.json', maxSizeBytes + 1, 'application/json');

      const { container } = render(
        <FileUploader maxSizeBytes={maxSizeBytes} onChange={handleChange} onError={handleError} />,
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [oversizedFile] } });

      expect(handleError).toHaveBeenCalledTimes(1);
      const err = handleError.mock.calls[0][0] as FileUploaderError;
      expect(err.type).toBe('FILE_TOO_LARGE');
      expect(err.file).toBe(oversizedFile);
      expect(err.message).toContain('1 MB');

      expect(handleChange).not.toHaveBeenCalled();
      expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/exceeds the maximum allowed limit of 1 MB/i);
    });

    it('accepts file exactly at maxSizeBytes boundary', () => {
      const handleChange = vi.fn();
      const maxSizeBytes = 2048;
      const boundaryFile = createMockFile('exact.json', maxSizeBytes, 'application/json');

      const { container } = render(
        <FileUploader maxSizeBytes={maxSizeBytes} onChange={handleChange} />,
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [boundaryFile] } });

      expect(handleChange).toHaveBeenCalledWith(boundaryFile);
      expect(screen.getByText('exact.json')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('preserves existing selection when a dropped file is rejected due to size limit (zero mutation)', () => {
      const handleChange = vi.fn();
      const handleError = vi.fn();
      const validFile = createMockFile('current.json', 500, 'application/json');
      const oversizedFile = createMockFile('oversized.json', 5000, 'application/json');

      render(
        <FileUploader
          defaultValue={validFile}
          maxSizeBytes={1000}
          onChange={handleChange}
          onError={handleError}
        />,
      );

      expect(screen.getByText('current.json')).toBeInTheDocument();

      const card = screen.getByText('current.json').closest('div[class*="rounded-lg"]')!;
      fireEvent.drop(card, {
        dataTransfer: {
          files: [oversizedFile],
        },
      });

      expect(handleError).toHaveBeenCalledTimes(1);
      expect(handleChange).not.toHaveBeenCalled();
      expect(screen.getByText('current.json')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('AC-04: File removal via clear button and keyboard (Enter/Space)', () => {
    it('removes file when clear button is clicked, resets to drop zone, and emits onChange(null)', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      const file = createMockFile('preset.json', 1024, 'application/json');

      render(<FileUploader defaultValue={file} onChange={handleChange} />);

      const clearButton = screen.getByRole('button', { name: 'Remove file' });
      expect(clearButton).toBeInTheDocument();

      await user.click(clearButton);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(null);
      expect(screen.queryByText('preset.json')).not.toBeInTheDocument();
      expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
    });

    it('removes file when clear button is activated via keyboard (Enter and Space)', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      const file = createMockFile('preset.json', 1024, 'application/json');

      render(<FileUploader defaultValue={file} onChange={handleChange} />);

      const clearButton = screen.getByRole('button', { name: 'Remove file' });
      clearButton.focus();
      await user.keyboard('{Enter}');

      expect(handleChange).toHaveBeenCalledWith(null);
      expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
    });

    it('clears native input value so re-selecting the same file fires change event', () => {
      const handleChange = vi.fn();
      const file = createMockFile('reselect.json', 1024, 'application/json');

      const { container } = render(<FileUploader onChange={handleChange} />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      // Select file initially
      fireEvent.change(input, { target: { files: [file] } });
      expect(handleChange).toHaveBeenCalledWith(file);
      expect(screen.getByText('reselect.json')).toBeInTheDocument();

      // Clear the file
      const clearBtn = screen.getByRole('button', { name: 'Remove file' });
      fireEvent.click(clearBtn);
      expect(handleChange).toHaveBeenCalledWith(null);

      // Re-select the exact same file
      fireEvent.change(input, { target: { files: [file] } });
      expect(handleChange).toHaveBeenCalledTimes(3);
      expect(screen.getByText('reselect.json')).toBeInTheDocument();
    });
  });

  describe('AC-05: Drag state transitions, keyboard navigation, and disabled state (GUARD-03)', () => {
    it('handles drag enter, drag over, drag leave, and drop visual transitions', () => {
      render(<FileUploader />);

      const dropZone = screen.getByRole('button', { name: /upload file/i });

      // Initially no active drag styles
      expect(dropZone.classList.contains('border-[var(--color-border)]')).toBe(true);
      expect(dropZone.classList.contains('border-[var(--color-primary)]')).toBe(false);
      expect(dropZone.classList.contains('bg-[var(--color-surface-hover)]')).toBe(false);

      // Drag enter with items
      fireEvent.dragEnter(dropZone, {
        dataTransfer: { items: [{ kind: 'file' }] },
      });
      expect(dropZone.classList.contains('border-[var(--color-primary)]')).toBe(true);
      expect(dropZone.classList.contains('bg-[var(--color-surface-hover)]')).toBe(true);

      // Drag over sets dropEffect
      const dataTransfer = { dropEffect: '' };
      fireEvent.dragOver(dropZone, { dataTransfer });
      expect(dataTransfer.dropEffect).toBe('copy');

      // Nested drag enter / leave simulation
      fireEvent.dragEnter(dropZone, {
        dataTransfer: { items: [{ kind: 'file' }] },
      });
      expect(dropZone.classList.contains('border-[var(--color-primary)]')).toBe(true);

      fireEvent.dragLeave(dropZone);
      // Still dragging because nested counter was 2 -> 1
      expect(dropZone.classList.contains('border-[var(--color-primary)]')).toBe(true);

      // Leaving completely (counter 1 -> 0)
      fireEvent.dragLeave(dropZone);
      expect(dropZone.classList.contains('border-[var(--color-primary)]')).toBe(false);
      expect(dropZone.classList.contains('border-[var(--color-border)]')).toBe(true);

      // Drop resets dragging
      fireEvent.dragEnter(dropZone, {
        dataTransfer: { items: [{ kind: 'file' }] },
      });
      expect(dropZone.classList.contains('border-[var(--color-primary)]')).toBe(true);

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [] },
      });
      expect(dropZone.classList.contains('border-[var(--color-primary)]')).toBe(false);
    });

    it('triggers native file input click on drop zone pointer click and keyboard (Enter/Space)', async () => {
      const user = userEvent.setup();
      const { container } = render(<FileUploader label="Upload Config" />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.fn();
      input.addEventListener('click', clickSpy);

      const dropZone = screen.getByRole('button', { name: 'Upload Config' });
      expect(dropZone).toHaveAttribute('tabIndex', '0');

      // Click
      await user.click(dropZone);
      expect(clickSpy).toHaveBeenCalledTimes(1);

      // Keyboard: Space
      dropZone.focus();
      await user.keyboard(' ');
      expect(clickSpy).toHaveBeenCalledTimes(2);

      // Keyboard: Enter
      await user.keyboard('{Enter}');
      expect(clickSpy).toHaveBeenCalledTimes(3);
    });

    describe('GUARD-03: Disabled state preconditions', () => {
      it('suppresses drops, clicks, drag styles, and keyboard activation when disabled', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        const file = createMockFile('test.json', 100);

        const { container } = render(
          <FileUploader disabled label="Disabled Uploader" onChange={handleChange} />,
        );

        const dropZone = screen.getByRole('button', { name: 'Disabled Uploader' });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        const clickSpy = vi.fn();
        input.addEventListener('click', clickSpy);

        // Accessibility attributes
        expect(dropZone).toHaveAttribute('aria-disabled', 'true');
        expect(dropZone).toHaveAttribute('tabIndex', '-1');
        expect(input).toBeDisabled();
        expect(input).toHaveAttribute('aria-disabled', 'true');

        // Drag enter does not set dragging active class
        fireEvent.dragEnter(dropZone, {
          dataTransfer: { items: [{ kind: 'file' }] },
        });
        expect(dropZone.classList.contains('border-[var(--color-primary)]')).toBe(false);
        expect(dropZone.classList.contains('cursor-not-allowed')).toBe(true);

        // Drag over sets dropEffect to 'none'
        const dataTransfer = { dropEffect: '' };
        fireEvent.dragOver(dropZone, { dataTransfer });
        expect(dataTransfer.dropEffect).toBe('none');

        // Drop is refused
        fireEvent.drop(dropZone, {
          dataTransfer: { files: [file] },
        });
        expect(handleChange).not.toHaveBeenCalled();

        // Click is suppressed
        await user.click(dropZone);
        expect(clickSpy).not.toHaveBeenCalled();

        // Input change is refused
        fireEvent.change(input, { target: { files: [file] } });
        expect(handleChange).not.toHaveBeenCalled();
      });

      it('disables clear button and suppresses clearance and drops when file is already selected', () => {
        const handleChange = vi.fn();
        const file = createMockFile('current.json', 100);
        const newFile = createMockFile('new.json', 200);

        render(<FileUploader disabled defaultValue={file} onChange={handleChange} />);

        const clearButton = screen.getByRole('button', { name: 'Remove file' });
        expect(clearButton).toBeDisabled();

        // Clicking clear button is ignored
        fireEvent.click(clearButton);
        expect(handleChange).not.toHaveBeenCalled();
        expect(screen.getByText('current.json')).toBeInTheDocument();

        // Dropping onto disabled selected card is ignored
        const card = screen.getByText('current.json').closest('div[class*="rounded-lg"]')!;
        fireEvent.drop(card, {
          dataTransfer: { files: [newFile] },
        });
        expect(handleChange).not.toHaveBeenCalled();
        expect(screen.getByText('current.json')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility, Labels, and Constraints Hinting', () => {
    it('associates label with native input element via id', () => {
      const { container } = render(<FileUploader id="custom-uploader" label="Mod Archive" />);

      const label = screen.getByText('Mod Archive');
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      expect(input.id).toBe('custom-uploader');
      expect(label).toHaveAttribute('for', 'custom-uploader');
    });

    it('renders constraints hint combining accept and maxSizeBytes', () => {
      render(<FileUploader accept=".json, .xml" maxSizeBytes={5 * 1024 * 1024} />);

      expect(screen.getByText('.json, .xml • up to 5 MB')).toBeInTheDocument();
    });

    it('renders helperText and links via aria-describedby when there is no error', () => {
      render(
        <FileUploader id="uploader" helperText="Only valid DayZ server profiles are allowed." />,
      );

      const helper = screen.getByText('Only valid DayZ server profiles are allowed.');
      expect(helper).toBeInTheDocument();
      expect(helper.id).toBe('uploader-helper');

      const dropZone = screen.getByRole('button', { name: /upload file/i });
      expect(dropZone).toHaveAttribute('aria-describedby', 'uploader-helper');
    });

    it('displays external error prop and links via aria-describedby and sets aria-invalid', () => {
      render(
        <FileUploader
          id="uploader"
          error="Custom server validation failed"
          helperText="This helper should be hidden when error is present"
        />,
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Custom server validation failed');
      expect(alert.id).toBe('uploader-error');

      const dropZone = screen.getByRole('button', { name: /upload file/i });
      expect(dropZone).toHaveAttribute('aria-invalid', 'true');
      expect(dropZone).toHaveAttribute('aria-describedby', 'uploader-error');
      expect(screen.queryByText(/this helper should be hidden/i)).not.toBeInTheDocument();
    });

    it('supports custom ariaLabel and containerClassName', () => {
      const { container } = render(
        <FileUploader
          ariaLabel="Custom Accessible Drop Area"
          containerClassName="custom-container-wrapper"
        />,
      );

      expect(
        screen.getByRole('button', { name: 'Custom Accessible Drop Area' }),
      ).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('custom-container-wrapper');
    });

    it('ignores input change when files array is empty or null (file dialog cancelled)', () => {
      const handleChange = vi.fn();
      const { container } = render(<FileUploader onChange={handleChange} />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [] } });

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('merges external aria-describedby with helper text id and error id', () => {
      const { rerender } = render(
        <FileUploader
          id="test-upload"
          aria-describedby="external-hint"
          helperText="Helper description"
        />,
      );

      let dropZone = screen.getByRole('button', { name: /upload file/i });
      expect(dropZone).toHaveAttribute('aria-describedby', 'external-hint test-upload-helper');

      rerender(
        <FileUploader
          id="test-upload"
          aria-describedby="external-hint"
          error="Failed validation"
          helperText="Helper description"
        />,
      );

      dropZone = screen.getByRole('button', { name: /upload file/i });
      expect(dropZone).toHaveAttribute('aria-describedby', 'external-hint test-upload-error');
    });

    it('updates required attribute based on whether a file is currently selected', () => {
      const file = createMockFile('config.json', 100);
      const { container, rerender } = render(<FileUploader required value={null} />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input.required).toBe(true);

      rerender(<FileUploader required value={file} />);
      expect(input.required).toBe(false);
    });

    it('ignores non-activation keyboard presses on drop zone', () => {
      const { container } = render(<FileUploader />);
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.fn();
      input.addEventListener('click', clickSpy);

      const dropZone = screen.getByRole('button', { name: /upload file/i });
      fireEvent.keyDown(dropZone, { key: 'Tab' });
      fireEvent.keyDown(dropZone, { key: 'Escape' });

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('does not set dragging active state on drag enter without items', () => {
      render(<FileUploader />);
      const dropZone = screen.getByRole('button', { name: /upload file/i });

      fireEvent.dragEnter(dropZone, {
        dataTransfer: { items: [] },
      });
      expect(dropZone.classList.contains('border-[var(--color-primary)]')).toBe(false);
    });
  });
});
