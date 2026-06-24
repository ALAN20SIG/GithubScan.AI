import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SKILL, SKILLS } from "./skills";

const STORAGE_KEY = "codescan:skill";
const EVENT = "codescan:skill-change";

function read(): string {
  if (typeof window === "undefined") return DEFAULT_SKILL;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && SKILLS.some((s) => s.id === stored) ? stored : DEFAULT_SKILL;
}

/** Shared, persisted selection of the review skill profile. */
export function useSkill(): [string, (id: string) => void] {
  const [skill, setSkillState] = useState<string>(DEFAULT_SKILL);

  useEffect(() => {
    setSkillState(read());
    const sync = () => setSkillState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setSkill = useCallback((id: string) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [skill, setSkill];
}