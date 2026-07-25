const ACCEPT_ANY_INPUT_STORAGE_KEY = "accept_any_input";
const listeners = new Set<() => void>();

function readStoredPreference(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.has("anyInput")) {
    const enabled = params.get("anyInput") === "1";
    localStorage.setItem(ACCEPT_ANY_INPUT_STORAGE_KEY, enabled ? "1" : "0");
  }
  return localStorage.getItem(ACCEPT_ANY_INPUT_STORAGE_KEY) === "1";
}

let cachedValue = readStoredPreference();

/**
 * Input mode preference: by default the handwriting canvases only accept
 * a stylus (pointerType "pen"), since this app collects genuine online
 * handwriting stroke data. Turning this on accepts touch/mouse input too
 * — useful for anyone testing or contributing without a stylus on hand.
 * It doesn't compromise data integrity: every recorded point already
 * carries its own true `pointerType`, so samples written with touch or
 * mouse are simply labeled as such, never mislabeled as pen input.
 */
export function getAcceptAnyInput(): boolean {
  return cachedValue;
}

export function setAcceptAnyInput(value: boolean): void {
  localStorage.setItem(ACCEPT_ANY_INPUT_STORAGE_KEY, value ? "1" : "0");
  cachedValue = value;
  listeners.forEach((listener) => listener());
}

export function subscribeAcceptAnyInput(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
