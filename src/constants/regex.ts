export const Regex = {
  EMAIL: /^[\w.-]+@([\w-]+\.)+[\w-]{2,20}$/,
  PASSWORD: /^(?=.*[A-Z]).{6,}$/, // Min: 6 chars, 1 upper_case
  ONLY_LETTER_AND_NUMBER: /^(?=.*[a-zA-Z])[a-zA-Z0-9]$/ // only letter and number, at least 1 char
}