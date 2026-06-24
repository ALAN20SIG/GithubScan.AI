import { z } from "zod";

export interface ModelOption {
  id: string;
  label: string;
  tier: "Fast & cheap" | "Balanced" | "Best reasoning";
  note: string;
}

/** Models selectable in the configuration panel (Lovable AI Gateway allowlist). */
export const MODELS: ModelOption[] = [
  {
    id: "google/gemini-3-flash-preview",
    label: "Gemini 3 Flash (default)",
    tier: "Balanced",
    note: "Fast preview model, good for most reviews.",
  },
  {
    id: "google/gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    tier: "Balanced",
    note: "High-efficiency, strong at coding and reasoning.",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    tier: "Balanced",
    note: "Solid all-rounder, low cost and latency.",
  },
  {
    id: "google/gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    tier: "Fast & cheap",
    note: "Cost-efficient for high-volume, simple tasks.",
  },
  {
    id: "google/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    tier: "Fast & cheap",
    note: "Cheapest/fastest Gemini for simple work.",
  },
  {
    id: "openai/gpt-5-nano",
    label: "GPT-5 Nano",
    tier: "Fast & cheap",
    note: "Fast, low-cost OpenAI option.",
  },
  {
    id: "openai/gpt-5-mini",
    label: "GPT-5 Mini",
    tier: "Balanced",
    note: "Strong general performance at lower cost.",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    tier: "Best reasoning",
    note: "Stronger reasoning when quality matters most.",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    tier: "Best reasoning",
    note: "Strong multimodal and complex reasoning.",
  },
];

export const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const MODEL_IDS = MODELS.map((m) => m.id) as [string, ...string[]];

/** Server-side validator: accepts a known model id, defaults to the standard one. */
export const modelSchema = z
  .enum(MODEL_IDS)
  .optional()
  .default(DEFAULT_MODEL)
  .catch(DEFAULT_MODEL);

export function modelLabel(id: string): string {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}