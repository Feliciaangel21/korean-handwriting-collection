import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { CollectionProvider } from "./state/CollectionContext";

export function App() {
  return (
    <CollectionProvider>
      <RouterProvider router={router} />
    </CollectionProvider>
  );
}
