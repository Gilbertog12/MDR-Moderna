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

      // Guardar las posiciones y distritos disponibles para el modal de cambio
      this.saveAvailableCredentials(credentials.districts, credentials.positions);

      // Usar el primer distrito y posición
      const district = credentials.districts[0].name;
      const position = credentials.positions[0].name;

      // Guardar info del usuario
      localStorage.setItem('Usuario', username.toUpperCase());
      localStorage.setItem('Distrito', district);
      localStorage.setItem('Posicion', position);

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
    map(response => {
      localStorage.setItem('tk', response.access_token);

      // Guardar permisos del usuario
      this.saveUserPermissions(response);

      // Obtener y guardar perfil del usuario
      const username = localStorage.getItem('Usuario');
      if (username) {
        this.fetchAndSaveUserProfile(username);
      }

      return response;
    }),
    catchError(error => {
      console.error('Error en login:', error);
      return throwError(() => error);
    })
  );
  }

  /**
 * Guarda las credenciales disponibles para el modal de cambio de posición
 */
private saveAvailableCredentials(districts: District[], positions: Position[]): void {
  const availablePositions: any[] = [];

  // Crear combinaciones de distrito + posición
  districts.forEach(district => {
    positions.forEach(position => {
      availablePositions.push({
        positionCode: position.value,
        positionDesc: position.name,
        district: district.value,
        districtDesc: district.name
      });
    });
  });

  // Guardar en localStorage para el UserInfoService
  localStorage.setItem('availablePositions', JSON.stringify(availablePositions));
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

// ====================================
// AGREGAR ESTOS MÉTODOS A TU AUTH.SERVICE.TS
// ====================================

/**
 * Obtiene districts y positions en paralelo (útil para el modal de cambio)
 */
getDistrictsAndPositions(username: string, password: string): Observable<{districts: District[], positions: Position[]}> {
  return forkJoin({
    districts: this.getDistrictsList(username, password),
    positions: this.getPositionsList(username, password)
  });
}

/**
 * Login con distrito y posición específicos (para cambio de posición)
 * Similar a loginWithCredentials pero con parámetros explícitos
 */
loginWithCredentialsAndPosition(
  username: string,
  password: string,
  district: string,
  position: string
): Observable<any> {
  let body = new HttpParams()
    .append('grant_type', 'password')
    .append('username', username)
    .append('password', password)
    .append('district', district)
    .append('position', position);

  let headers = new HttpHeaders()
    .append('Content-Type', 'application/x-www-form-urlencoded');

  return from(this.getApiUrl()).pipe(
    switchMap(url => this.http.post<any>(url, body.toString(), { headers })),
    map(response => {
      if (response && response.access_token) {
        // Guardar token
        localStorage.setItem('tk', response.access_token);

        // Actualizar distrito y posición
        localStorage.setItem('Distrito', district);
        localStorage.setItem('Posicion', position);
        localStorage.setItem('Usuario', username);

        // Guardar permisos actualizados
        this.saveUserPermissions(response);

        // Obtener perfil actualizado
        this.fetchAndSaveUserProfile(username);
      }
      return response;
    }),
    catchError(error => {
      console.error('Error en login con posición:', error);
      return throwError(() => error);
    })
  );
}

/**
 * Obtiene el perfil del usuario y lo guarda en localStorage
 * Llama al action SESSION para obtener el PerfilRkj actualizado
 */
private fetchAndSaveUserProfile(username: string): void {
  const atts = [
    { name: 'scriptName', value: 'coemdr' },
    { name: 'action', value: 'SESSION' }
  ];

  const token = localStorage.getItem('tk') || '';
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `bearer ${token}`
  });

  this.http.post<ApiResponse>('/MatrizRsk/api/values/generic', { atts }, { headers })
    .subscribe({
      next: (response) => {
        if (response.success && response.data?.[0]?.atts) {
          // Buscar el perfil en los atributos
          // Ajusta estos índices según la respuesta real de tu backend
          const perfilAttr = response.data[0].atts.find(att =>
            att.name === 'perfilRkj' || att.name === 'perfil'
          );

          if (perfilAttr) {
            localStorage.setItem('PerfilRkj', perfilAttr.value);
          } else {
            // Si no viene el perfil, extraerlo de otros atributos
            // Formato esperado: adm, apr, con, cre, val
            const adm = response.data[0].atts[1]?.value || 'N';
            const apr = response.data[0].atts[2]?.value || 'N';
            const con = response.data[0].atts[3]?.value || 'N';
            const cre = response.data[0].atts[4]?.value || 'N';
            const val = response.data[0].atts[5]?.value || 'N';

            const perfilRkj = `${adm}${apr}${con}${cre}${val}`;
            localStorage.setItem('PerfilRkj', perfilRkj);
          }
        }
      },
      error: (error) => {
        console.error('Error obteniendo perfil:', error);
        // Usar un perfil por defecto si falla
        localStorage.setItem('PerfilRkj', 'NNNNN');
      }
    });
}

/**
 * Actualiza la función saveUserPermissions para también guardar el PerfilRkj
 * si viene en la respuesta del login
 */
private saveUserPermissions(loginResponse: any): void {
  // Si el perfil viene en la respuesta del login, guardarlo
  if (loginResponse.perfilRkj) {
    localStorage.setItem('PerfilRkj', loginResponse.perfilRkj);
  }

  // Determinar permisos basado en la respuesta del login
  if (loginResponse.permissions) {
    localStorage.setItem('allow', loginResponse.permissions);
  } else {
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
  }

  localStorage.setItem('canAdd', loginResponse.canAdd || 'Y');
}

/**
 * Método para logout (si no lo tienes)
 */
logout(): void {
  // Limpiar localStorage
  localStorage.removeItem('tk');
  localStorage.removeItem('Usuario');
  localStorage.removeItem('Posicion');
  localStorage.removeItem('Distrito');
  localStorage.removeItem('PerfilRkj');
  localStorage.removeItem('allow');
  localStorage.removeItem('canAdd');
  localStorage.removeItem('availablePositions');

  // Redirigir al login
  // Si tienes Router inyectado, usar:
  // this.router.navigate(['/login']);

  // O simplemente:
  window.location.href = '/login';
}
}
