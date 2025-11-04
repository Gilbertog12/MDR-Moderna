/**
 * Interface para el modelo de datos del tab Detalle en RKC (Actividad)
 * Representa la evaluación de riesgos con múltiples dimensiones:
 * - Seguridad y Salud Ocupacional
 * - Medio ambiente
 * - Operacional
 */
export interface RktDetalleModel {
  /** Offset del registro */
  offset: string;

  /** ID de la tarea */
  dimensionId: string;

  /** Descripción de la tarea */
  dimensionDesc: string;

  /** ID del riesgo */
  riesgoId: string;

  /** Descripción del riesgo */
  riesgoDesc: string;

  /** ID de la consecuencia */
  consecuenciaId: string;

  /** Descripción de la consecuencia */
  consecuenciaDesc: string;

  // Seguridad y Salud Ocupacional (M)
  /** Probabilidad - Medio Puro */
  probabilidad: string;

  /** Severidad - Medio Puro */
  severidad: string;

  /** Criticidad - Medio */
  criticidad: string;
}
