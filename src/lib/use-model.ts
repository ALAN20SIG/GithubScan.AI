import { useCallback, useEffect, useState } from "react";
import { DEFAULT_MODEL, MODELS } from "./models";

const STORAGE_KEY = "codescan:model";
const EVENT = "codescan:model-change";

function read(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && MODELS.some((m) => m.id === stored) ? stored : DEFAULT_MODEL;
}

/** Shared, persisted selection of the AI model used for all analyses. */
export function useModel(): [string, (id: string) => void] {
  const [model, setModelState] = useState<string>(DEFAULT_MODEL);

  useEffect(() => {
    setModelState(read());
    const sync = () => setModelState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setModel = useCallback((id: string) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [model, setModel];
}