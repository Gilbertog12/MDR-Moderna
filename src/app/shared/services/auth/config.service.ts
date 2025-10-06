import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  apiBaseUrl: string;
  endpoints: {
    auth: string;
    positions: string;
  };
  environment: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: AppConfig | null = null;

  constructor(private http: HttpClient) {}

  async loadConfig(): Promise<AppConfig> {
    if (!this.config) {
      try {
        this.config = await firstValueFrom(
          this.http.get<AppConfig>('./assets/config/app-config.json')
        );
        console.log('Configuration loaded:', this.config);
      } catch (error) {
        console.error('Failed to load configuration:', error);
        throw error;
      }
    }
    return this.config;
  }

  getConfig(): AppConfig | null {
    return this.config;
  }

  async getApiUrl(endpoint: keyof AppConfig['endpoints']): Promise<string> {
    const config = await this.loadConfig();
    return `${config.apiBaseUrl}${config.endpoints[endpoint]}`;
  }
}
