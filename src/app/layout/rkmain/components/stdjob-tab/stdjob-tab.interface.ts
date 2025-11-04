/**
 * Interfaces para el tab Std. Job
 * Angular 19 - Gestión de Std Jobs asociados a actividades
 */

/**
 * Std Job disponible para búsqueda (desde Ellipse)
 */
export interface StdJob {
  stdJobNo: string;      // Código del Std Job
  stdJobDesc: string;    // Descripción del Std Job
  numTareas: string;     // Número de tareas del Std Job
  selected?: boolean;    // Para selección en el modal
}

/**
 * Tarea individual de un Std Job
 */
export interface StdJobTask {
  stdJobTask: string;    // Código de la tarea
  taskDesc: string;      // Descripción de la tarea
  selected?: boolean;    // Para selección en el modal
}

/**
 * Std Job ya asociado a la actividad
 */
export interface StdJobAssociated {
  offset: string;        // Número de fila (viene del backend)
  stdJobNo: string;      // Código del Std Job
  stdJobDesc: string;    // Descripción del Std Job
  stdJobTaskNo: string;  // Código de la tarea asociada
  taskDesc: string;      // Descripción de la tarea
  canDelete: boolean;    // Si se puede eliminar o no
}

/**
 * Parámetros para buscar Std Jobs
 */
export interface StdJobSearchParams {
  codigo?: string;       // Filtro por código
  descripcion?: string;  // Filtro por descripción
  pagina: number;        // Número de página (comienza en 1)
}

/**
 * Datos del modal de selección de Std Job
 */
export interface StdJobModalData {
  areaId: string;
  currentPage: number;
  searchParams?: StdJobSearchParams;
}

/**
 * Datos del modal de selección de tarea
 */
export interface StdJobTaskModalData {
  areaId: string;
  stdJobNo: string;
  stdJobDesc: string;
}

/**
 * Resultado de la selección en modales
 */
export interface StdJobSelectionResult {
  stdJob: StdJob;
  task?: StdJobTask;  // Opcional: si selecciona una tarea específica, sino se asignan todas (*)
}
