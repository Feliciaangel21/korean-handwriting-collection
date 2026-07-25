import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { CollectionProvider } from "./state/CollectionContext";
import { useAllowAnyPointerType } from "./hooks/useAllowAnyPointerType";

function DebugInputToggle() {
  const [allowAnyPointerType, setAllowAnyPointerType] = useAllowAnyPointerType();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: allowAnyPointerType ? "#c8463b" : "rgba(0,0,0,0.55)",
        color: "#fff",
        textAlign: "center",
        fontSize: 12,
        padding: "3px 8px",
        display: "flex",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={allowAnyPointerType}
          onChange={(e) => setAllowAnyPointerType(e.target.checked)}
        />
        Debug: allow any input (touch/mouse), not stylus-only
      </label>
    </div>
  );
}

export function App() {
  return (
    <CollectionProvider>
      <DebugInputToggle />
      <RouterProvider router={router} />
    </CollectionProvider>
  );
}
