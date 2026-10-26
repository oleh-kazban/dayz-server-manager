import type { ReactNode, Ref } from 'react';

import type { TagColor } from '../tag';

export interface TagOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  color?: TagColor;
  disabled?: boolean;
}

export interface TagInputProps {
  /** React 19 native DOM ref forwarded directly to the <input> element */
  ref?: Ref<HTMLInputElement>;

  /** Form field identity */
  id?: string;

  /** Accessible field label rendered above the control */
  label?: string;

  /** Validation error message; switches field to error treatment and links aria-describedby */
  error?: string;

  /** Input placeholder displayed when no text is being typed */
  placeholder?: string;

  /** Controlled array of tag strings */
  value: string[];

  /** Change callback fired with the updated tag array */
  onChange: (tags: string[]) => void;

  /** Autocomplete suggestion list (either strings or TagOption objects) */
  suggestions?: (string | TagOption)[];

  /** Keys that commit the current typed text into a tag (default: ['Enter', ',']) */
  delimiters?: ('Enter' | ',' | 'Tab' | ' ')[];

  /** Custom validation hook returning true/false or an error message string */
  validateTag?: (tag: string) => boolean | string;

  /** Transform hook applied before committing (default: trims whitespace) */
  transformTag?: (tag: string) => string;

  /** Maximum number of tags allowed */
  maxTags?: number;

  /** Leading icon or visual element */
  leftIcon?: ReactNode;

  /** Whether the field is disabled */
  disabled?: boolean;

  /** Whether the field is read-only */
  readOnly?: boolean;

  /** Container styling escape hatch */
  containerClassName?: string;

  /** Suggestion popover menu styling escape hatch */
  popupClassName?: string;

  /** Input styling escape hatch */
  className?: string;
}

export interface TagSelectProps {
  /** React 19 native DOM ref forwarded directly to the trigger container */
  ref?: Ref<HTMLDivElement>;

  /** Form field identity */
  id?: string;

  /** Accessible field label rendered above the control */
  label?: string;

  /** Validation error message; switches field to error treatment and links aria-describedby */
  error?: string;

  /** Placeholder displayed when no items are selected */
  placeholder?: string;

  /** Predefined options dataset to select from */
  options: TagOption[];

  /** Selected option values */
  value: string[];

  /** Change callback fired with the updated array of selected values */
  onChange: (selectedValues: string[]) => void;

  /** Placeholder for the search input inside the popover */
  searchPlaceholder?: string;

  /** Text displayed when search query yields no matches */
  emptyText?: string;

  /** Maximum number of selectable options */
  maxSelections?: number;

  /** Whether a quick clear-all button is rendered when items are selected */
  clearable?: boolean;

  /** Whether the control is disabled */
  disabled?: boolean;

  /** Whether the control is read-only */
  readOnly?: boolean;

  /** Container styling escape hatch */
  containerClassName?: string;

  /** Popover menu styling escape hatch */
  popupClassName?: string;

  /** Trigger styling escape hatch */
  className?: string;
}
