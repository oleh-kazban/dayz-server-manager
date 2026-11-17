import { describe, expect, it } from 'vitest';

import {
  formatFileSize,
  getConstraintsHint,
  getDropZoneBorderClasses,
  getFileCardBorderClasses,
  validateFileSize,
  validateFileType,
} from './FileUploader.utils';

describe('FileUploader.utils', () => {
  describe('formatFileSize', () => {
    it('returns "0 B" for 0, negative, or non-finite byte values', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(-100)).toBe('0 B');
      expect(formatFileSize(NaN)).toBe('0 B');
      expect(formatFileSize(Infinity)).toBe('0 B');
    });

    it('formats byte values under 1024 as B', () => {
      expect(formatFileSize(1)).toBe('1 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('formats values in KB with decimal rounding', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1023)).toBe('1023 KB');
    });

    it('formats values in MB, GB, and TB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });
  });

  describe('validateFileType', () => {
    it('returns true when accept is undefined or empty', () => {
      const file = new File(['{}'], 'test.json', { type: 'application/json' });
      expect(validateFileType(file, undefined)).toBe(true);
      expect(validateFileType(file, '')).toBe(true);
      expect(validateFileType(file, [])).toBe(true);
    });

    it('validates file extensions with case insensitivity', () => {
      const jsonFile = new File(['{}'], 'settings.JSON', { type: 'application/json' });
      const txtFile = new File(['text'], 'notes.txt', { type: 'text/plain' });

      expect(validateFileType(jsonFile, '.json')).toBe(true);
      expect(validateFileType(jsonFile, '.JSON')).toBe(true);
      expect(validateFileType(txtFile, '.json')).toBe(false);
    });

    it('supports comma-separated extension strings and array lists', () => {
      const jsonFile = new File(['{}'], 'preset.json', { type: 'application/json' });
      const xmlFile = new File(['<xml/>'], 'economy.xml', { type: 'application/xml' });
      const binFile = new File(['bin'], 'mod.bin', { type: 'application/octet-stream' });

      expect(validateFileType(jsonFile, '.json, .xml')).toBe(true);
      expect(validateFileType(xmlFile, '.json, .xml')).toBe(true);
      expect(validateFileType(binFile, '.json, .xml')).toBe(false);

      expect(validateFileType(jsonFile, ['.json', '.xml'])).toBe(true);
      expect(validateFileType(xmlFile, ['.json', '.xml'])).toBe(true);
      expect(validateFileType(binFile, ['.json', '.xml'])).toBe(false);
    });

    it('validates wildcard MIME types', () => {
      const pngFile = new File(['image'], 'hero.png', { type: 'image/png' });
      const textFile = new File(['hello'], 'doc.txt', { type: 'text/plain' });

      expect(validateFileType(pngFile, 'image/*')).toBe(true);
      expect(validateFileType(textFile, 'image/*')).toBe(false);
    });

    it('validates exact MIME types and JSON fallbacks', () => {
      const jsonFile = new File(['{}'], 'data.json', { type: 'application/json' });
      const jsonFallbackFile = new File(['{}'], 'data.json', { type: '' });
      const nonJsonFile = new File(['hello'], 'notes.txt', { type: '' });

      expect(validateFileType(jsonFile, 'application/json')).toBe(true);
      expect(validateFileType(jsonFallbackFile, 'application/json')).toBe(true);
      expect(validateFileType(nonJsonFile, 'application/json')).toBe(false);
    });

    it('returns false when explicit MIME patterns do not match the file', () => {
      const textFile = new File(['content'], 'notes.txt', { type: 'text/plain' });

      expect(validateFileType(textFile, 'application/pdf')).toBe(false);
      expect(validateFileType(textFile, ['application/pdf', 'text/csv'])).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('returns true when maxSizeBytes is undefined', () => {
      const file = new File(['abc'], 'test.txt');
      expect(validateFileSize(file, undefined)).toBe(true);
    });

    it('returns true when file size is within or exactly at maxSizeBytes', () => {
      const file = new File(['12345'], 'five-bytes.txt'); // 5 bytes
      expect(validateFileSize(file, 10)).toBe(true);
      expect(validateFileSize(file, 5)).toBe(true);
    });

    it('returns false when file size exceeds maxSizeBytes', () => {
      const file = new File(['1234567890'], 'ten-bytes.txt'); // 10 bytes
      expect(validateFileSize(file, 5)).toBe(false);
    });
  });

  describe('getConstraintsHint', () => {
    it('returns null when neither accept nor maxSizeBytes is provided', () => {
      expect(getConstraintsHint(undefined, undefined)).toBeNull();
    });

    it('formats accept hint only', () => {
      expect(getConstraintsHint('.json', undefined)).toBe('.json');
      expect(getConstraintsHint(['.json', '.xml'], undefined)).toBe('.json, .xml');
    });

    it('formats max size hint only', () => {
      expect(getConstraintsHint(undefined, 1024 * 1024)).toBe('up to 1 MB');
    });

    it('combines accept and max size hints with a bullet separator', () => {
      expect(getConstraintsHint('.json', 500 * 1024)).toBe('.json • up to 500 KB');
    });
  });

  describe('getDropZoneBorderClasses', () => {
    it('returns disabled styles when disabled is true regardless of dragging or error', () => {
      const classes = getDropZoneBorderClasses(true, true, true);
      expect(classes).toContain('cursor-not-allowed');
      expect(classes).toContain('opacity-50');
    });

    it('returns dragging active styles when isDragging is true and enabled', () => {
      const classes = getDropZoneBorderClasses(true, false, false);
      expect(classes).toContain('border-[var(--color-primary)]');
      expect(classes).toContain('bg-[var(--color-surface-hover)]');
    });

    it('returns error styles when hasError is true, not dragging, and enabled', () => {
      const classes = getDropZoneBorderClasses(false, true, false);
      expect(classes).toContain('border-[var(--color-status-danger)]');
    });

    it('returns default interactive styles when enabled, not dragging, and no error', () => {
      const classes = getDropZoneBorderClasses(false, false, false);
      expect(classes).toContain('border-[var(--color-border)]');
    });
  });

  describe('getFileCardBorderClasses', () => {
    it('returns disabled styles when disabled is true', () => {
      const classes = getFileCardBorderClasses(false, false, true);
      expect(classes).toContain('cursor-not-allowed');
      expect(classes).toContain('opacity-50');
    });

    it('returns dragging active styles when isDragging is true', () => {
      const classes = getFileCardBorderClasses(true, false, false);
      expect(classes).toContain('border-[var(--color-primary)]');
    });

    it('returns error styles when hasError is true', () => {
      const classes = getFileCardBorderClasses(false, true, false);
      expect(classes).toContain('border-[var(--color-status-danger)]');
    });

    it('returns default border styles otherwise', () => {
      const classes = getFileCardBorderClasses(false, false, false);
      expect(classes).toContain('border-[var(--color-border)]');
    });
  });
});
