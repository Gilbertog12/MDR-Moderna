/**
 * Interface para el modelo de datos del tab Detalle en RKC (Actividad)
 * Representa la evaluación de riesgos con múltiples dimensiones:
 * - Seguridad y Salud Ocupacional
 * - Medio ambiente
 * - Operacional
 */
export interface RkcDetalleModel {
  /** Offset del registro */
  offset: string;

  /** ID de la tarea */
  tareaId: string;

  /** Descripción de la tarea */
  tareaDesc: string;

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
  probabilidadM: string;

  /** Severidad - Medio Puro */
  severidadM: string;

  /** Criticidad - Medio */
  criticidadM: string;

  // Medio Ambiente (N)
  /** Probabilidad - Medio Ambiente Puro */
  probabilidadN: string;

  /** Severidad - Medio Ambiente Puro */
  severidadN: string;

  /** Criticidad - Medio Ambiente */
  criticidadN: string;

  // Operacional (S)
  /** Probabilidad - Operacional Puro */
  probabilidadS: string;

  /** Severidad - Operacional Puro */
  severidadS: string;

  /** Criticidad - Operacional */
  criticidadS: string;
}
