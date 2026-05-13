const SWEDISH_WORDS = [
  'noll', 'en', 'två', 'tre', 'fyra', 'fem',
  'sex', 'sju', 'åtta', 'nio', 'tio', 'elva',
]

/**
 * Convert a number < 12 to its Swedish word form.
 * Numbers >= 12 are returned as-is (string).
 */
export function numWord(n: number): string {
  if (n >= 0 && n < 12 && Number.isInteger(n)) return SWEDISH_WORDS[n]
  return String(n)
}
