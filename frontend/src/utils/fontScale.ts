const FONT_SCALE_KEY = 'projectmanager_font_scale';
export const DEFAULT_FONT_SCALE = 1.1;
const MIN_FONT_SCALE = 0.8;
const MAX_FONT_SCALE = 1.5;

export function normalizeFontScale(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_FONT_SCALE;
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, numeric));
}

export function applyFontScale(value: unknown, options: { persist?: boolean } = {}): number {
  const scale = normalizeFontScale(value);
  document.documentElement.style.fontSize = `${scale * 16}px`;
  if (options.persist ?? true) {
    localStorage.setItem(FONT_SCALE_KEY, String(scale));
  }
  return scale;
}

export function loadStoredFontScale(): number {
  return normalizeFontScale(localStorage.getItem(FONT_SCALE_KEY));
}

export function getStoredFontScale(): number | null {
  const storedValue = localStorage.getItem(FONT_SCALE_KEY);
  return storedValue === null ? null : normalizeFontScale(storedValue);
}

export function applyStoredFontScale(): void {
  const storedScale = getStoredFontScale();
  if (storedScale === null) {
    applyFontScale(DEFAULT_FONT_SCALE, { persist: false });
    return;
  }

  applyFontScale(storedScale);
}
