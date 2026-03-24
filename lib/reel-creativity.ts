/** Admin slider 0–100 → LLM temperature for reel JSON generation (Gemini via OpenRouter). */

export const REEL_CREATIVITY_MIN = 0
export const REEL_CREATIVITY_MAX = 100
/** ~previous fixed temperature 0.88 */
export const REEL_CREATIVITY_DEFAULT = 66

export function reelCreativityToTemperature(creativity: number): number {
  const c = Math.min(REEL_CREATIVITY_MAX, Math.max(REEL_CREATIVITY_MIN, creativity))
  return 0.35 + (c / REEL_CREATIVITY_MAX) * 0.8
}
