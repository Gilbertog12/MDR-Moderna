/**
 * ==========================================
 * INTERFACES PARA FLUJO DE APROBACIÓN
 * ==========================================
 * Sistema modernizado para manejar el flujo completo de aprobación
 * con 4 tipos de modales: EV, RE, IV, IA
 */

// ==================== DASHBOARD ====================

/**
 * Configuración para abrir el dashboard de flujo de aprobación
 */
export interface DashboardConfig {
  /** Key jerárquica completa del nodo (ej: "010001000100010001") */
  key: string;

  /** Status ID del nodo (001, 002, 004, 007, etc.) */
  status: string;

  /** Nombre del nivel jerárquico (Área, Proceso, Subproceso, etc.) */
  nivel: string;

  /** Descripción del nodo */
  descripcion: string;
}

/**
 * Datos de contadores del dashboard
 */
export interface DashboardData {
  /** Items pendientes de enviar a validar */
  ENVIAR_A_VALIDAR: number;

  /** Items en construcción */
  ENVIAR_A_VALIDAR_CONSTRUCCION: number;

  /** Items rechazados */
  RECHAZADO: number;

  /** Items esperando validación */
  POR_VALIDAR: number;

  /** Items esperando aprobación */
  POR_APROBAR: number;
}

// ==================== MODAL DE ITEMS ====================

/**
 * Configuración dinámica para el modal de items
 * Un solo componente que se comporta diferente según el tipo
 */
export interface ItemsModalConfig {
  /** Key jerárquica completa del nodo padre */
  key: string;

  /** Status ID del nodo padre */
  status: string;

  /** Tipo de items a mostrar */
  tipo: 'EV' | 'RE' | 'IV' | 'IA';

  /** Título del modal */
  titulo: string;

  /** Nombre del nivel jerárquico (Área, Proceso, Subproceso, etc.) */
  nivel: string;

  /** Descripción del nodo padre */
  descripcion: string;

  /** ¿Permitir selección múltiple con checkboxes? */
  permitirSeleccion: boolean;

  /** ¿Mostrar columna de comentarios? */
  mostrarComentarios: boolean;

  /** ¿Los comentarios son editables? (textarea vs readonly) */
  comentariosEditables: boolean;

  /** Configuración de botones de acción */
  botones: ItemsModalBotones;
}

/**
 * Botones disponibles en el modal de items
 */
export interface ItemsModalBotones {
  /** Botón "Validar" - solo para tipo IV */
  validar?: boolean;

  /** Botón "Aprobar" - solo para tipo IA */
  aprobar?: boolean;

  /** Botón "Rechazar" - para tipos IV y IA */
  rechazar?: boolean;

  /** Botón "Restaurar" - solo para tipo RE */
  restaurar?: boolean;
}

/**
 * Item individual en la lista de pendientes
 */
export interface PendingItem {
  /** Tipo de acción (CREATE, MODIFY, DELETE) */
  accion: string;

  /** Tipo de entidad (AREA, PROCESO, SUBPROCESO, etc.) */
  entidad: string;

  /** ID del item */
  id: string;

  /** Descripción del item */
  descripcion: string;

  /** Key jerárquica completa */
  key: string;

  /** Versión del item */
  version: string;

  /** Fecha formateada (MM/DD/YYYY HH:mm) */
  fecha: string;

  /** Comentarios o razón de rechazo */
  comentarios: string;

  /** Status ID del item */
  status: string;

  /** Jerarquía en formato visual (01-0001-0002-0003) */
  jerarquia: string;

  /** Ruta jerárquica completa para mostrar debajo de entidad */
  rutaJerarquia: string;

  /** Estado de selección (para checkboxes) */
  check?: boolean;

  /** ¿Está bloqueado el checkbox? (para lógica jerárquica) */
  bloqueo?: boolean;
}

// ==================== TIPOS DE STATUS ====================

/**
 * Tipos de status para PENDIENTE_VALIDAR_LIST
 */
export type TipoStatusPendiente = 'EV' | 'RE' | 'IV' | 'IA';

/**
 * Mapeo de tipos a status del backend
 */
export const STATUS_MAP: Record<TipoStatusPendiente, string> = {
  'EV': 'EV',  // Enviar Validar (Items en construcción/pendientes)
  'RE': 'RE',  // Rechazado
  'IV': 'IV',  // Ir a Validar (Items por validar)
  'IA': 'IA'   // Ir a Aprobar (Items por aprobar)
};

// ==================== RESPUESTAS DEL BACKEND ====================

/**
 * Respuesta del backend para TABLERO_LIST
 */
export interface TableroListResponse {
  success: boolean;
  message?: string;
  data?: Array<{
    atts: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

/**
 * Respuesta del backend para PENDIENTE_VALIDAR_LIST
 */
export interface PendienteValidarListResponse {
  success: boolean;
  message?: string;
  data?: Array<{
    atts: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

/**
 * Respuesta del backend para VALIDATE
 */
export interface ValidateResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// ==================== HELPERS ====================

/**
 * Resultado de cierre del modal
 */
export interface ModalCloseResult {
  /** ¿Se debe refrescar el componente padre? */
  refresh: boolean;
}

/**
 * Configuración para la lógica de marcado jerárquico
 */
export interface HierarchyMarkingConfig {
  /** Longitudes de keys por nivel [2, 6, 10, 14, 18, 19, 23, 27, 31] */
  nivelesLongitud: number[];

  /** ¿Marcar padres automáticamente? */
  marcarPadres: boolean;

  /** ¿Marcar hijos automáticamente? */
  marcarHijos: boolean;
}

/**
 * Datos para enviar al aprobar items
 */
export interface AprobarItemsData {
  /** Keys de items a aprobar */
  keys: string[];

  /** Comentarios editados por key */
  comentarios: { [key: string]: string };
}

/**
 * Datos para enviar al rechazar items
 */
export interface RechazarItemsData {
  /** Keys de items a rechazar */
  keys: string[];

  /** Razón del rechazo */
  razon: string;
}

// ==================== PERMISOS ====================

/**
 * Permisos del usuario para flujo de aprobación
 */
export interface ApprovalFlowPermissions {
  /** Permiso de creación */
  canCreate: boolean;

  /** Permiso de validación */
  canValidate: boolean;

  /** Permiso de aprobación */
  canApprove: boolean;

  /** Es administrador */
  isAdmin: boolean;

  /** String de permisos del localStorage (PerfilRkj) */
  perfilRkj: string;
}

/**
 * Determina si el usuario puede ver un botón específico
 */
export interface ButtonVisibility {
  /** ¿Mostrar botón "Enviar a Validar"? */
  enviarValidar: boolean;

  /** ¿Mostrar botón "Validar"? */
  validar: boolean;

  /** ¿Mostrar botón "Aprobar"? */
  aprobar: boolean;

  /** ¿Mostrar botón "Rechazar"? */
  rechazar: boolean;

  /** ¿Mostrar botón "Restaurar"? */
  restaurar: boolean;
}

// ==================== CONSTANTES ====================

/**
 * Configuraciones por defecto para cada tipo de modal
 */
export const MODAL_CONFIGS: Record<TipoStatusPendiente, Partial<ItemsModalConfig>> = {
  'EV': {
    titulo: 'Items en Construcción',
    permitirSeleccion: false,
    mostrarComentarios: false,
    comentariosEditables: false,
    botones: {}
  },
  'RE': {
    titulo: 'Items Rechazados',
    permitirSeleccion: true,
    mostrarComentarios: true,
    comentariosEditables: false,
    botones: {
      restaurar: true
    }
  },
  'IV': {
    titulo: 'Items Por Validar',
    permitirSeleccion: true,
    mostrarComentarios: true,
    comentariosEditables: false,
    botones: {
      validar: true,
      rechazar: true
    }
  },
  'IA': {
    titulo: 'Items Por Aprobar',
    permitirSeleccion: true,
    mostrarComentarios: true,
    comentariosEditables: true,  // ⭐ EDITABLES
    botones: {
      aprobar: true,
      rechazar: true
    }
  }
};

/**
 * Tamaño de página para paginación
 */
export const PAGE_SIZE = 20;

/**
 * Tamaño de lote para envío masivo
 */
export const BATCH_SIZE = 1000;

/**
 * Límite de timeout del backend
 */
export const TIMEOUT_LIMIT = 3000;
