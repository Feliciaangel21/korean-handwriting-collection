import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { CollectionProvider } from "./state/CollectionContext";
import { InputModeToggle } from "./components/InputModeToggle";

export function App() {
  return (
    <CollectionProvider>
      <InputModeToggle />
      <RouterProvider router={router} />
    </CollectionProvider>
  );
}
