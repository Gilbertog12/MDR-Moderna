import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  apiBaseUrl: string;
  endpoints: {
    auth: string;
    positions: string;
    districts: string;
    generic: string;
  };
  environment: string;
  useProxy: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: AppConfig | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Carga la configuración desde el archivo JSON
   * Este archivo cambia según el ambiente (development, test, production)
   */
  async loadConfig(): Promise<AppConfig> {
    if (!this.config) {
      try {
        this.config = await firstValueFrom(
          this.http.get<AppConfig>('./assets/config/app-config.json')
        );
        console.log('✅ Configuration loaded:', this.config);
        console.log(`📍 Environment: ${this.config.environment}`);
        console.log(`🔗 API Base URL: ${this.config.apiBaseUrl}`);
        console.log(`🔌 Using Proxy: ${this.config.useProxy}`);
      } catch (error) {
        console.error('❌ Failed to load configuration:', error);
        throw error;
      }
    }
    return this.config;
  }

  /**
   * Obtiene la configuración actual (debe llamarse después de loadConfig)
   */
  getConfig(): AppConfig | null {
    return this.config;
  }

  /**
   * Construye la URL completa para un endpoint específico
   * @param endpoint - Nombre del endpoint (auth, positions, districts, generic)
   * @returns URL completa del endpoint
   *
   * Ejemplos:
   * - Development: "/MatrizRsk/api/values/positions/" (usa proxy)
   * - Test: "http://localhost:9002/MatrizRsk/api/values/positions/" (directo)
   * - Production: "https://mdr.collahuasi.cl/MatrizRsk/api/values/positions/" (directo)
   */
  async getApiUrl(endpoint: keyof AppConfig['endpoints']): Promise<string> {
    const config = await this.loadConfig();
    const fullUrl = `${config.apiBaseUrl}${config.endpoints[endpoint]}`;

    console.log(`🌐 API URL for '${endpoint}': ${fullUrl}`);

    return fullUrl;
  }

  /**
   * Obtiene la URL base de la API (sin el endpoint específico)
   * Útil para endpoints que no están predefinidos en la configuración
   */
  async getApiBaseUrl(): Promise<string> {
    const config = await this.loadConfig();
    return config.apiBaseUrl;
  }

  /**
   * Verifica si la aplicación está usando proxy
   * (Solo true en desarrollo)
   */
  async isUsingProxy(): Promise<boolean> {
    const config = await this.loadConfig();
    return config.useProxy;
  }

  /**
   * Obtiene el nombre del ambiente actual
   */
  async getEnvironment(): Promise<string> {
    const config = await this.loadConfig();
    return config.environment;
  }
}
