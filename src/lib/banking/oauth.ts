import axios from 'axios';

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
}

class BankingOAuth {
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  // Generate authorization URL
  getAuthorizationUrl(state: string, scope: string = 'AIS'): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope,
      state,
    });
    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  // Exchange code for tokens
  async getTokens(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    const response = await axios.post(this.config.tokenUrl, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    } as any, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await axios.post(this.config.tokenUrl, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    } as any, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in,
    };
  }
}

// BBVA PSD2 config (sandbox example)
export const bbvaOAuth = new BankingOAuth({
  clientId: process.env.BBVA_CLIENT_ID || '',
  clientSecret: process.env.BBVA_CLIENT_SECRET || '',
  redirectUri: process.env.BBVA_REDIRECT_URI || '',
  authorizationUrl: 'https://api.sandbox.bbva.com/psd2/xs2a/authorize',
  tokenUrl: 'https://api.sandbox.bbva.com/psd2/xs2a/token',
});

export default BankingOAuth;