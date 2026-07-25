import { useSyncExternalStore } from "react";
import { getAllowAnyPointerType, setAllowAnyPointerType, subscribeAllowAnyPointerType } from "../lib/debugFlags";

export function useAllowAnyPointerType(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribeAllowAnyPointerType, getAllowAnyPointerType);
  return [value, setAllowAnyPointerType];
}
