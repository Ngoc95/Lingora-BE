export enum TokenType {
  accessToken,
  refreshToken,
  emailVerifyToken,
  resetPasswordToken
}

export const MAX_REQUESTS_VERIFY_EMAIL_PER_HOUR_ = 5