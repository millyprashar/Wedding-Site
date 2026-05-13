/** Strip to digits only (used for invite phone matching). */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

/**
 * Build the digit string used to match `invites.phone`.
 * US (+1): same as today — only the digits the guest typed (no country prefix added).
 * Any other selected dial code: those digits are prepended to the guest’s local digits.
 */
export function buildPhoneDigitsForLogin(
  countryDialDigits: string,
  rawLocalPhone: string,
): string {
  const dial = digitsOnly(countryDialDigits)
  const local = digitsOnly(rawLocalPhone)
  if (!dial || dial === '1') return local
  return `${dial}${local}`
}
