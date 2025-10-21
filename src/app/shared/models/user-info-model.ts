/**
 * Modelo de información del usuario
 */
export interface UserInfo {
  usuario: string;
  posicion: string;
  distrito: string;
  perfilRkj: string; // Formato: "NYNNY" donde cada posición representa un permiso
}

/**
 * Permisos desglosados del usuario
 */
export interface UserPermissions {
  administrador: boolean;
  aprobador: boolean;
  consultor: boolean;
  creador: boolean;
  validador: boolean;
}

/**
 * Posición disponible para el usuario
 */
export interface Position {
  positionCode: string;
  positionDesc: string;
  district: string;
  districtDesc: string;
}

/**
 * Versión de la aplicación
 */
export interface AppVersion {
  frontendVersion: string;  // Versión del componente visual
  backendVersion: string;   // Versión de la API compilada
  fecha: string;            // Fecha de compilación del backend
  ambiente: 'DESARROLLO' | 'TEST' | 'PRODUCTIVO';
}

/**
 * Información completa para el header
 */
export interface HeaderInfo {
  userInfo: UserInfo;
  permissions: UserPermissions;
  version: AppVersion;
  availablePositions: Position[];
}
