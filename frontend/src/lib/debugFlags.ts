const ANY_POINTER_STORAGE_KEY = "debug_allow_any_pointer";

function readAllowAnyPointerFlag(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.has("anyInput")) {
    const enabled = params.get("anyInput") === "1";
    localStorage.setItem(ANY_POINTER_STORAGE_KEY, enabled ? "1" : "0");
    return enabled;
  }
  return localStorage.getItem(ANY_POINTER_STORAGE_KEY) === "1";
}

/**
 * Debug-only escape hatch for diagnosing whether the "stylus only"
 * pointerType filter itself is related to the iPad stroke-interruption
 * bug. Off by default (real participants must still use a stylus).
 * Enable by visiting the app with `?anyInput=1` once — it then persists
 * for the rest of the session (across navigation) via localStorage.
 * Visit with `?anyInput=0` to turn it back off.
 */
export const ALLOW_ANY_POINTER_TYPE = readAllowAnyPointerFlag();
