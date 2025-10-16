/**
 * Item de jerarquía (Área, Proceso, Subproceso, etc.)
 */
export interface HierarchyItem {
  Id: string;
  Descripcion: string;
  selected: boolean;
}

/**
 * Atributo del backend (estructura legacy)
 */
export interface BackendAtts {
  name: string;
  value: string;
}

/**
 * Respuesta del backend
 */
export interface BackendResponse {
  redirect: any;
  success: boolean;
  message: string;
  data: Array<{ atts: BackendAtts[] }>;
}

/**
 * Configuración del diálogo
 */
export interface AddItemsDialogData {
  title: string;                  // "Agregar Proceso"
  button_confirm: string;         // "Guardar"
  button_close: string;           // "Cancelar"
  ok: string;                     // "Proceso Agregado"
  accion: string;                 // "PROCESO_LIST"
  crear: string;                  // "PROCESO_CREATE"
  nuevo?: boolean;                // Mostrar botón "Nueva Entidad"

  // IDs de jerarquía padre
  areaId?: string;
  procesoId?: string;
  subprocesoId?: string;
  actividadId?: string;
  tareaId?: string;
  dimensionId?: string;
  riesgoId?: string;
}

/**
 * Mapper de backend a HierarchyItem (lógica legacy)
 * atts[0] = ID
 * atts[2] = Descripción
 */
export function mapBackendItem(element: { atts: BackendAtts[] }): HierarchyItem | null {
  if (!element.atts || element.atts.length < 3) {
    return null;
  }

  return {
    Id: element.atts[0].value.trim(),
    Descripcion: element.atts[2].value.trim(),
    selected: false
  };
}
