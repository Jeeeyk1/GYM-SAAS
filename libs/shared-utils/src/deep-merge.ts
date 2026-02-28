/**
 * Deeply merges source into target. Arrays are replaced, not concatenated.
 * Used by the feature resolver to merge default_config with client overrides.
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key in source) {
    const sourceVal = source[key];
    const targetVal = result[key];

    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      ) as T[Extract<keyof T, string>];
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[Extract<keyof T, string>];
    }
  }

  return result;
}
