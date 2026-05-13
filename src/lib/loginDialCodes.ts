/** Country / region calling codes for login (value = digits only, no +). US is default. */
export const LOGIN_COUNTRY_DIAL_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '1', label: 'United States (+1)' },
  { value: '44', label: 'United Kingdom (+44)' },
  { value: '91', label: 'India (+91)' },
  { value: '61', label: 'Australia (+61)' },
  { value: '49', label: 'Germany (+49)' },
  { value: '33', label: 'France (+33)' },
  { value: '39', label: 'Italy (+39)' },
  { value: '34', label: 'Spain (+34)' },
  { value: '31', label: 'Netherlands (+31)' },
  { value: '353', label: 'Ireland (+353)' },
  { value: '92', label: 'Pakistan (+92)' },
  { value: '86', label: 'China (+86)' },
  { value: '81', label: 'Japan (+81)' },
  { value: '52', label: 'Mexico (+52)' },
  { value: '971', label: 'United Arab Emirates (+971)' },
  { value: '65', label: 'Singapore (+65)' },
  { value: '966', label: 'Saudi Arabia (+966)' },
  { value: '27', label: 'South Africa (+27)' },
  { value: '55', label: 'Brazil (+55)' },
] as const

export const DEFAULT_LOGIN_COUNTRY_DIAL = '1'
