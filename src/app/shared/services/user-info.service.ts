import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { UserInfo, AppVersion, Position, UserPermissions } from '../models/user-info-model';


@Injectable({
  providedIn: 'root'
})
export class UserInfoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/MatrizRsk/api/values/generic';

  // Signals
  private readonly _userInfo = signal<UserInfo | null>(null);
  private readonly _appVersion = signal<AppVersion | null>(null);
  private readonly _availablePositions = signal<Position[]>([]);

  // Observable para notificaciones (compatibilidad con código existente)
  private readonly notificacionesSubject = new BehaviorSubject<boolean>(false);
  readonly notificaciones$ = this.notificacionesSubject.asObservable();

  // Computed signals
  readonly userInfo = this._userInfo.asReadonly();
  readonly appVersion = this._appVersion.asReadonly();
  readonly availablePositions = this._availablePositions.asReadonly();

  readonly permissions = computed<UserPermissions>(() => {
    const info = this._userInfo();
    if (!info || !info.perfilRkj || info.perfilRkj.length < 5) {
      return {
        administrador: false,
        aprobador: false,
        consultor: false,
        creador: false,
        validador: false
      };
    }

    const perfil = info.perfilRkj;
    return {
      administrador: perfil[0] === 'Y',
      aprobador: perfil[1] === 'Y',
      consultor: perfil[2] === 'Y',
      creador: perfil[3] === 'Y',
      validador: perfil[4] === 'Y'
    };
  });

  readonly displayName = computed(() => {
    const info = this._userInfo();
    if (!info) return '';
    return `${info.usuario} - ${info.distrito} - ${info.posicion}`;
  });

  readonly permissionsLabels = computed(() => {
    const perms = this.permissions();
    const labels: string[] = [];

    if (perms.aprobador) labels.push('Aprobador');
    if (perms.creador) labels.push('Creador');
    if (perms.validador) labels.push('Validador');
    // if (perms.consultor) labels.push('Consultor');
    if (perms.administrador) labels.push('Admin');

    return labels;
  });

  /**
   * Inicializa la información del usuario desde localStorage
   */
  initializeFromStorage(): void {
    const usuario = localStorage.getItem('Usuario');
    const posicion = localStorage.getItem('Posicion');
    const distrito = localStorage.getItem('Distrito');
    const perfilRkj = localStorage.getItem('PerfilRkj') || 'NNNNN';

    if (usuario && posicion && distrito) {
      this._userInfo.set({
        usuario,
        posicion,
        distrito,
        perfilRkj
      });
    }

    // Cargar posiciones desde localStorage si existen
    const savedPositions = localStorage.getItem('availablePositions');
    if (savedPositions) {
      try {
        const positions = JSON.parse(savedPositions);
        this._availablePositions.set(positions);
      } catch (error) {
        console.error('Error parseando posiciones:', error);
        this._availablePositions.set([]);
      }
    }

    // Cargar versión desde localStorage o detectar ambiente
    this.initializeAppVersion();
  }

  /**
   * Inicializa la versión de la aplicación
   */
  private initializeAppVersion(): void {
    const version: AppVersion = {
      frontendVersion: '0.0.0', // Versión del frontend Angular 19
      backendVersion: 'v4.5.1', // Se actualiza con fetchAppVersion()
      fecha: new Date().toISOString().split('T')[0],
      ambiente: this.detectEnvironment()
    };

    this._appVersion.set(version);
  }

  /**
   * Obtiene la versión de la aplicación desde el backend
   * (Opcional - solo si necesitas la fecha real del servidor)
   */
  fetchAppVersion(): Observable<AppVersion> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'VERSION' }
    ];

    return this.http.post<any>(this.apiUrl, { atts }, { headers: this.getHeaders() }).pipe(
      map(response => {
        if (response.success && response.data?.[0]?.atts) {
          // Buscar el atributo 'fecha' y 'version'
          const attsArray = response.data[0].atts;

          const fechaAttr = attsArray.find((att: any) => att.name === 'fecha');
          const versionAttr = attsArray.find((att: any) => att.name === 'version');

          const fecha = fechaAttr?.value || new Date().toISOString().split('T')[0];
          const backendVersion = versionAttr?.value || 'v4.15';

          const currentVersion = this._appVersion();
          const version: AppVersion = {
            frontendVersion: currentVersion?.frontendVersion || '0.0.0',
            backendVersion,
            fecha,
            ambiente: currentVersion?.ambiente || this.detectEnvironment()
          };

          this._appVersion.set(version);
          return version;
        }

        throw new Error('No se pudo obtener la versión');
      }),
      catchError(error => {
        console.error('Error obteniendo versión del servidor:', error);
        // Mantener la versión local
        return of(this._appVersion()!);
      })
    );
  }

  /**
   * Detecta el ambiente según la URL
   */
  private detectEnvironment(): 'DESARROLLO' | 'TEST' | 'PRODUCTIVO' {
    const url = window.location.href;

    if (url.includes('localhost') || url.includes('dev')) {
      return 'DESARROLLO';
    } else if (url.includes('tst') || url.includes('test')) {
      return 'TEST';
    }

    return 'PRODUCTIVO';
  }

  /**
   * Guarda las posiciones disponibles (desde el AuthService después del login)
   */
  setAvailablePositions(positions: Position[]): void {
    this._availablePositions.set(positions);
    localStorage.setItem('availablePositions', JSON.stringify(positions));
  }

  /**
   * Convierte las posiciones del formato del login al formato interno
   * (Ya no se usa aquí, se hace en AuthService)
   */
  parsePositionsFromLogin(districts: any[], positions: any[]): Position[] {
    const result: Position[] = [];

    // Crear combinaciones de distrito + posición
    if (districts && positions) {
      districts.forEach(district => {
        positions.forEach(position => {
          result.push({
            positionCode: position.value,
            positionDesc: position.name,
            district: district.value,
            districtDesc: district.name
          });
        });
      });
    }

    return result;
  }

  /**
   * Refresca los datos del usuario
   */
  refreshUserData(): void {
    this.initializeFromStorage();
    this.notificacionesSubject.next(true);
  }

  /**
   * Notifica cambios externos
   */
  notifyChange(): void {
    this.notificacionesSubject.next(true);
  }

  /**
   * Obtiene headers con token de autorización
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('tk') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `bearer ${token}`
    });
  }
}
