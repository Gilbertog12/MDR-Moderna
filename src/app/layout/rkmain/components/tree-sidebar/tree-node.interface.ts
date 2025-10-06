export interface TreeNodeApiResponse {
  success: boolean;
  message: string;
  redirect: null | string;
  data: Array<{
    atts: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

/**
 * Nodo del árbol procesado para UI
 */
export interface TreeNode {
  // Datos básicos del nodo
  offset: string;           // atts[0] - Posición
  id: string;               // atts[1] - ID del nivel (areaId, procesoId, etc.)
  descripcion: string;      // atts[2] - Descripción
  status: string;           // atts[3] - Estado: 000-008
  version: string;          // atts[4] - Versión

  // Estructura jerárquica
  level: number;            // atts[5] - Nivel 1-8
  atributos: string;        // atts[6] - Atributos adicionales
  key: string;              // atts[7] - Clave única compuesta
  route: string;            // Ruta calculada: rka/01, rkp/01/0001, etc.

  // Estado de hijos
  itemsPending: string;     // atts[8] - Items pendientes
  hijo: 'Y' | 'N';          // atts[9] - Tiene hijos

  // Permisos y control
  canAdd: 'Y' | 'N';        // atts[12] - Puede agregar
  isAdmin: 'Y' | 'N';       // atts[15] - Es administrador
  isAprobador: 'Y' | 'N';   // atts[16] - Es aprobador
  isConsulta: 'Y' | 'N';    // atts[17] - Solo consulta
  isCreador: 'Y' | 'N';     // atts[18] - Es creador
  isValidador: 'Y' | 'N';   // atts[19] - Es validador
  perfiles: string;         // Concatenación: atts[15]+[16]+[17]+[18]+[19]

  // Estado de eliminación
  pendingDelete: 'Y' | 'N'; // atts[20] - Pendiente eliminar
  canDelete: 'Y' | 'N';     // atts[21] - Puede eliminar
  statusParent: string;     // atts[22] - Estado del padre
  displayDeleteIcon: 'Y' | 'N'; // atts[23] - Mostrar icono eliminar
  tareaInconclusa: string;  // atts[24] - Tarea inconclusa

  // Propiedades de UI (calculadas)
  item: string;
  expandable: boolean;      // Si puede expandirse
  isLoading: boolean;       // Cargando hijos
  permiso: string;          // canAdd + lectura (calculado)
  statusPadre: boolean;     // Status < statusParent

}

/**
 * Tipos de nivel jerárquico
 */
export type HierarchyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Mapeo de niveles a prefijos
 */
export const LEVEL_CONFIG = {
  1: { prefix: 'AR', name: 'Área', route: 'rka' },
  2: { prefix: 'PR', name: 'Proceso', route: 'rkp' },
  3: { prefix: 'SP', name: 'Subproceso', route: 'rks' },
  4: { prefix: 'AC', name: 'Actividad', route: 'rkc' },
  5: { prefix: 'TA', name: 'Tarea', route: 'rkt' },
  6: { prefix: 'DM', name: 'Dimensión', route: 'rkd' },
  7: { prefix: 'RG', name: 'Riesgo', route: 'rkr' },
  8: { prefix: 'CS', name: 'Consecuencia', route: 'rky' }
} as const;

/**
 * Estados del nodo
 */
export const NODE_STATUS = {
  '000': 'Rechazado',
  '001': 'Creación',
  '002': 'Modificación',
  '003': 'En construcción',
  '004': 'Pendiente validación',
  '006': 'Pendiente inactivación',
  '007': 'Pendiente aprobación',
  '008': 'Aprobado',
  '010': 'Archivado'
} as const;

/**
 * Parámetros para búsqueda de nodos
 */
export interface SearchNodeParams {
  scriptName: 'coersk' | 'coemdr';
  action: 'SEARCH_NODE';
  level: HierarchyLevel;
  id: string; // Key del padre, vacío para nivel 1
  mostrarTodo?: 'Y' | 'N'; // Mostrar aprobados
}
