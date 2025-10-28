/**
 * Item de CheckList disponible para seleccionar
 */
export interface AvailableChecklistItem {
  id: string;
  description: string;
  fullDescription: string;
  comentario?: string;
}

/**
 * Item de CheckList guardado en una actividad
 */
export interface ChecklistItem {
  offset: string;
  checkCode: string;
  checkType: string;
  checkDescription: string;
  checkValidation: 'Y' | 'N';
  checkComment: string;
  versionId: string;
  statusId: string;
  pendingDelete: 'Y' | 'N';
  deleteIcon: 'Y' | 'N';
  check: boolean;
  modified: boolean;
  canDelete: boolean;
}

/**
 * Estado visual del checkbox según su statusId
 */
export interface ChecklistStatusBadge {
  label: string;
  icon: string;
  color: 'primary' | 'accent' | 'warn' | 'success' | 'error';
}

/**
 * Mapeo de estados a badges visuales
 */
export const CHECKLIST_STATUS_MAP: Record<string, ChecklistStatusBadge> = {
  '001': { label: '*', icon: 'edit', color: 'primary' },       // En Creación
  '002': { label: '*', icon: 'pending', color: 'primary' },    // En Validación
  '003': { label: '*', icon: 'pending', color: 'accent' },     // En proceso
  '004': { label: '**', icon: 'schedule', color: 'warn' },     // Pendiente Aprobación
  '006': { label: '*', icon: 'update', color: 'primary' },     // Actualización
  '007': { label: '***', icon: 'archive', color: 'error' },    // Archivado
  '008': { label: '', icon: 'check_circle', color: 'success' }, // Aprobado
  '000': { label: 'R', icon: 'undo', color: 'warn' },          // Rechazado
  '010': { label: 'R', icon: 'undo', color: 'warn' }           // Rechazado alternativo
};

/**
 * Permisos para operaciones en CheckList
 */
export interface ChecklistPermissions {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isCreator: boolean;
}
