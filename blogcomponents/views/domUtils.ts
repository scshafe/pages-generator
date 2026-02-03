export function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, input, textarea, select, a, [contenteditable='true']"));
}
