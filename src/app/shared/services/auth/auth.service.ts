import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, throwError, from, switchMap, Observable, forkJoin, map } from 'rxjs';
import { ConfigService } from './config.service';

// Interfaces actualizadas
interface Attribute {
  name: string;
  value: string;
}

interface DataItem {
  atts: Attribute[];
}

interface ApiResponse {
  redirect: boolean;
  success: boolean;
  message: string;
  data: DataItem[];
}

interface District {
  name: string;
  value: string;
}

interface Position {
  name: string;
  value: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http: HttpClient = inject(HttpClient);
  private configService = inject(ConfigService);

  constructor() { }

  private async getApiUrl(): Promise<string> {
    // Detectar si estamos en desarrollo o producción
    const isProduction = window.location.hostname !== 'localhost' &&
                        window.location.hostname !== '127.0.0.1';

    if (isProduction) {
      return await this.configService.getApiUrl('auth');
    } else {
      return '/MatrizRsk/token'; // URL del proxy para desarrollo
    }
  }

 // Actualiza los métodos para mapear la respuesta
getDistrictsList(username: string, password: string): Observable<District[]> {
  const url = '/MatrizRsk/api/values/districts/';
  const pwd = password || ' ';
  const body = { username, pwd };

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'username': username,
    'password': pwd
  });

  return this.http.post<ApiResponse>(url, body, { headers }).pipe(
    map(response => {
      if (response.success && response.data?.[0]?.atts) {
        return response.data[0].atts.map(att => ({
          name: att.name,
          value: att.value
        }));
      }
      return [];
    }),
    catchError(error => {
      console.error('Error obteniendo distritos:', error);
      return throwError(() => error);
    })
  );
}


getPositionsList(username: string, password: string): Observable<Position[]> {
  const url = '/MatrizRsk/api/values/positions/';
  const pwd = password || ' ';
  const body = { username, pwd };

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'username': username,
    'password': pwd
  });

  return this.http.post<ApiResponse>(url, body, { headers }).pipe(
    map(response => {
      if (response.success && response.data?.[0]?.atts) {
        return response.data[0].atts.map(att => ({
          name: att.name,
          value: att.value
        }));
      }
      return [];
    }),
    catchError(error => {
      console.error('Error obteniendo posiciones:', error);
      return throwError(() => error);
    })
  );
}

   // forkJoin ejecuta ambas peticiones EN PARALELO
  loginWithCredentials(username: string, password: string) {
    return forkJoin({
      districts: this.getDistrictsList(username, password),
      positions: this.getPositionsList(username, password)
    }).pipe(
      switchMap(credentials => {
        // Validar que existan datos
        if (!credentials.districts?.length || !credentials.positions?.length) {
          throw new Error('No se encontraron credenciales');
        }

        // Usar el primer distrito y posición
        const district = credentials.districts[0].name;
        const position = credentials.positions[0].name;



        // Hacer login con los datos obtenidos
        let body = new HttpParams()
          .append('grant_type', 'password')
          .append('username', username)
          .append('password', password)
          .append('district', district)
          .append('position', position);

        let headers = new HttpHeaders()
          .append('Content-Type', 'application/x-www-form-urlencoded');

        return from(this.getApiUrl()).pipe(
          switchMap(url => this.http.post<any>(url, body.toString(), { headers }))
        );
      }),
      map( response => {
         localStorage.setItem('tk', response.access_token);

        // AGREGAR: Guardar permisos del usuario
        // Estos valores deberían venir en la respuesta del backend
        // o ser determinados por la posición/distrito del usuario
        this.saveUserPermissions(response);
      }),
      catchError(error => {
        console.error('Error en login:', error);
        return throwError(() => error);
      })
    );
  }

  private saveUserPermissions(loginResponse: any): void {
  // Determinar permisos basado en la respuesta del login
  // Esto depende de cómo tu backend envíe los permisos

  // Opción 1: Si vienen en la respuesta
  if (loginResponse.permissions) {
    localStorage.setItem('allow', loginResponse.permissions);
  }

  // Opción 2: Si se determinan por posición (temporal)
  const position = localStorage.getItem('Posicion') || '';
  let permissions = '';

  if (position.includes('ADMIN')) {
    permissions = 'administrador';
  } else if (position.includes('VALID')) {
    permissions = 'validacion';
  } else if (position.includes('APROB')) {
    permissions = 'aprobacion';
  } else {
    permissions = 'creacion';
  }

  localStorage.setItem('allow', permissions);
  localStorage.setItem('canAdd', 'Y'); // O determinar basado en permisos


}

  getPositions(username: string, pwd: string) {
    let body = new HttpParams()
    body = body.append('grant_type', 'password');
    body = body.append('username', username);
    body = body.append('password', pwd);
    body = body.append('district', "COLL");
    body = body.append('position', 'ADMELLIPSE');

    let headers: HttpHeaders = new HttpHeaders()
    headers = headers.append('Content-Type', 'application/x-www-form-urlencoded');

    return from(this.getApiUrl()).pipe(
      switchMap(url => {

        return this.http.post<any>(url, body.toString(), { headers: headers });
      }),
      catchError(error => {
        console.error('HTTP Error:', error);
        return throwError(error);
      })
    );
  }


  botonesFlujoAprobacion(parametros: any[]): string {
  const [allow, statusId, canAdd] = parametros;

  // Administrador puede todo
  if (allow.includes('administrador')) {
    if (statusId === '004') return 'validar';
    if (statusId === '007') return 'aprobar';
    if (statusId === '001' || statusId === '002' || statusId === '006') return 'enviar-validar';
  }

  // Creador
  if (allow.includes('creacion') && canAdd === 'Y') {
    if (statusId === '001' || statusId === '002' || statusId === '006') return 'enviar-validar';
  }

  // Validador
  if (allow.includes('validacion')) {
    if (statusId === '004') return 'validar';
  }

  // Aprobador
  if (allow.includes('aprobacion')) {
    if (statusId === '007') return 'aprobar';
  }

  return '';
}
}
