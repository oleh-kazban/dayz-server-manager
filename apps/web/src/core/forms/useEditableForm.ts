import { type SyntheticEvent, useEffect, useRef, useState } from 'react';

import { extractApiFieldErrors, resolveFieldErrors } from '../i18n';

import { focusFirstInvalidField, isStructurallyEqual, readFieldValue } from './forms.utils';
import { useUnsavedChangesGuard } from './unsaved-changes';

/** Messages keyed by field name, or by a dotted path into nested values (`launchOptions.cpuCount`). */
export type FormErrors<TValues> = Partial<Record<keyof TValues & string, string>> &
  Record<string, string | undefined>;

export interface UseEditableFormOptions<TValues extends Record<string, unknown>> {
  /** Current field values, owned by the form component. */
  values: TValues;
  /** Last saved values, derived from server data on every render. `null` marks a create form. */
  baseline: TValues | null;
  /** Normalisation the submit applies (trim, defaults). Changes are compared on this payload. */
  toPayload?: (values: TValues) => unknown;
  /** Client-side validation; returns a message per invalid field. */
  validate: (values: TValues) => FormErrors<TValues>;
  /** True while the create/update request is in flight. */
  isPending: boolean;
}

interface ServerErrorState<TValues> {
  errors: Record<string, string>;
  /** Values at the moment the request was sent; an error shows only while its field still matches. */
  snapshot: TValues;
}

function identity<T>(value: T): unknown {
  return value;
}

/**
 * Shared behaviour of every create/update form (DSM-00137):
 * change-aware submit, validation on save with live re-validation afterwards,
 * client + server field errors, and focus on the first invalid field.
 */
export function useEditableForm<TValues extends Record<string, unknown>>({
  values,
  baseline,
  toPayload = identity,
  validate,
  isPending,
}: UseEditableFormOptions<TValues>) {
  const [formElement, setFormElement] = useState<HTMLFormElement | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<ServerErrorState<TValues> | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [initialValues] = useState(values);
  const submittedValuesRef = useRef(values);

  useEffect(() => {
    if (focusRequest > 0) {
      focusFirstInvalidField(formElement);
    }
  }, [focusRequest, formElement]);

  const hasChanges =
    baseline === null || !isStructurallyEqual(toPayload(values), toPayload(baseline));
  // Unsaved edits (DSM-00138): update forms reuse the change state; create forms compare
  // against the values they opened with, since their submit is always enabled.
  const isDirty =
    baseline === null
      ? !isStructurallyEqual(toPayload(values), toPayload(initialValues))
      : hasChanges;
  const { confirmDiscard, release: releaseUnsavedChanges } = useUnsavedChangesGuard(isDirty);

  const visibleServerErrors: Record<string, string> = {};
  if (serverErrors) {
    for (const [field, message] of Object.entries(serverErrors.errors)) {
      if (Object.is(readFieldValue(values, field), readFieldValue(serverErrors.snapshot, field))) {
        visibleServerErrors[field] = message;
      }
    }
  }
  const clientErrors = attempted ? validate(values) : {};
  const errors = { ...visibleServerErrors, ...clientErrors } as FormErrors<TValues>;

  /** Submit handler: `onSubmit={e => handleSubmit(e, save)}`; calls `onValid` only for valid, changed input. */
  const handleSubmit = (event: SyntheticEvent | undefined, onValid: () => void) => {
    event?.preventDefault();
    if (!hasChanges || isPending) {
      return;
    }
    setAttempted(true);
    if (Object.keys(validate(values)).length > 0) {
      setFocusRequest(request => request + 1);
      return;
    }
    submittedValuesRef.current = values;
    onValid();
  };

  /**
   * Shows the API `fieldErrors` of a failed request inline. `sentValues` defaults to the values
   * of the last submit; pass the values captured when a non-submit request (e.g. a validation
   * probe) was sent.
   */
  const reportServerErrors = (err: unknown, sentValues: TValues = submittedValuesRef.current) => {
    const resolved = resolveFieldErrors(extractApiFieldErrors(err));
    setServerErrors({ errors: resolved, snapshot: sentValues });
    if (Object.keys(resolved).length > 0) {
      setFocusRequest(request => request + 1);
    }
  };

  const clearServerErrors = (fields?: readonly string[]) => {
    setServerErrors(prev => {
      if (!prev || !fields) {
        return null;
      }
      const remaining = { ...prev.errors };
      for (const field of fields) {
        delete remaining[field];
      }
      return { ...prev, errors: remaining };
    });
  };

  const markSaved = () => {
    setAttempted(false);
    setServerErrors(null);
  };

  return {
    /** Callback ref for the <form>; scopes focus-first-invalid to this form. */
    registerForm: setFormElement,
    hasChanges,
    /** True while the form holds edits that would be lost on navigation or close. */
    isDirty,
    /** Runs `action` directly when the form is clean, otherwise after "Discard unsaved changes?". */
    confirmDiscard,
    /** Stops the unsaved-changes guard before a post-submit programmatic navigation. */
    releaseUnsavedChanges,
    errors,
    handleSubmit,
    reportServerErrors,
    clearServerErrors,
    markSaved,
  };
}
