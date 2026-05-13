export function toggleMultiSelect(
  currentValue: readonly string[],
  toggledValue: string,
  exclusiveValues: readonly string[] = [],
): string[] {
  const isExclusive = exclusiveValues.includes(toggledValue);
  const wasSelected = currentValue.includes(toggledValue);

  if (wasSelected) return currentValue.filter((x) => x !== toggledValue);
  if (isExclusive) return [toggledValue];

  const cleaned = currentValue.filter((x) => !exclusiveValues.includes(x));
  return [...cleaned, toggledValue];
}
