import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { CollectionProvider } from "./state/CollectionContext";
import { ALLOW_ANY_POINTER_TYPE } from "./lib/debugFlags";

export function App() {
  return (
    <CollectionProvider>
      {ALLOW_ANY_POINTER_TYPE && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "#c8463b",
            color: "#fff",
            textAlign: "center",
            fontSize: 13,
            fontWeight: 600,
            padding: "4px 8px",
          }}
        >
          DEBUG MODE: touch/mouse input is also accepted right now (not stylus-only). Visit with ?anyInput=0 to
          turn this off.
        </div>
      )}
      <RouterProvider router={router} />
    </CollectionProvider>
  );
}
