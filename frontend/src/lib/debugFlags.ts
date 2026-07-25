const ANY_POINTER_STORAGE_KEY = "debug_allow_any_pointer";
const listeners = new Set<() => void>();

function readStoredFlag(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.has("anyInput")) {
    const enabled = params.get("anyInput") === "1";
    localStorage.setItem(ANY_POINTER_STORAGE_KEY, enabled ? "1" : "0");
  }
  return localStorage.getItem(ANY_POINTER_STORAGE_KEY) === "1";
}

let cachedValue = readStoredFlag();

/**
 * Debug-only escape hatch for diagnosing whether the "stylus only"
 * pointerType filter itself is related to input-recognition issues on a
 * given device. Off by default (real participants must still use a
 * stylus) — toggle it via the on-screen checkbox, or by visiting the app
 * with `?anyInput=1` / `?anyInput=0` once (it then persists across
 * navigation for the rest of the session via localStorage).
 */
export function getAllowAnyPointerType(): boolean {
  return cachedValue;
}

export function setAllowAnyPointerType(value: boolean): void {
  localStorage.setItem(ANY_POINTER_STORAGE_KEY, value ? "1" : "0");
  cachedValue = value;
  listeners.forEach((listener) => listener());
}

export function subscribeAllowAnyPointerType(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
