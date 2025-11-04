/**
 * Control Blando asociado a una consecuencia
 * Representa un control blando que ya está asociado a una consecuencia específica
 */
export interface ControlBlando {
  offset: string;
  cblandoId: string;
  cblandoDescripcion: string;
  cblandoFamiliaId: string;
  cblandoFamiliaDesc: string;
  cblandoStatus: string;
  cblandoVersion: string;
  pendingDelete: 'Y' | 'N';
  displayDeleteIcon: 'Y' | 'N';
  cblandoDescripcionExt: string;
}

/**
 * Control Blando disponible para agregar
 * Representa un control blando disponible en el sistema que puede ser asociado
 */
export interface ControlBlandoDisponible {
  id: string;
  descripcion: string;
  selected: boolean;
}

/**
 * Data para el modal de agregar control blando
 * Información necesaria para abrir el modal de selección
 */
export interface ControlesBlandosDialogData {
  title: string;
  areaId: string;
  procesoId: string;
  subprocesoId: string;
  actividadId: string;
  tareaId: string;
  dimensionId: string;
  riesgoId: string;
  consecuenciaId: string;
  button_confirm?: string;
  button_close?: string;
  nuevo?: boolean;
  tabla?: string;
}

/**
 * Resultado del modal de agregar control blando
 * Información devuelta al cerrar el modal
 */
export interface ControlesBlandosDialogResult {
  success: boolean;
  idsCreados?: string[];
}
