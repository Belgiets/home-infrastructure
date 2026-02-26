export interface TokenPayload {
  sub: string;
  email: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}