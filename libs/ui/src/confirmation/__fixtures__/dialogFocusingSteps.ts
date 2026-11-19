const FOCUSABLE_SELECTOR = [
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'a[href]',
  '[tabindex]',
].join(', ');

/**
 * `showModal()` stub that follows the HTML "dialog focusing steps" real browsers run:
 * focus the first descendant carrying the native `autofocus` attribute, otherwise the
 * first enabled focusable descendant in tree order. React's `autoFocus` prop is not
 * consulted, because browsers never see it.
 */
export function showModalFollowingDialogFocusingSteps(this: HTMLDialogElement): void {
  this.open = true;
  const delegate =
    this.querySelector<HTMLElement>('[autofocus]:not(:disabled)') ??
    this.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  delegate?.focus();
}
