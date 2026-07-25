import { useSyncExternalStore } from "react";
import { getAcceptAnyInput, setAcceptAnyInput, subscribeAcceptAnyInput } from "../lib/inputPreferences";

export function useInputMode(): [boolean, (value: boolean) => void] {
  const acceptAnyInput = useSyncExternalStore(subscribeAcceptAnyInput, getAcceptAnyInput);
  return [acceptAnyInput, setAcceptAnyInput];
}
