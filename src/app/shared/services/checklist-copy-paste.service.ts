import { Injectable, signal, computed } from '@angular/core';
import { ChecklistItem } from '../models/checklist.interface';


/**
 * Interfaz para los datos copiados en localStorage
 */
export interface CopiedChecklistData {
  activityId: string;
  areaId: string;
  procesoId: string;
  subprocesoId: string;
  checkCodes: string;        // "00001,00003,00005"
  comments: string;          // "comentario1^~|comentario2^~|comentario3"
  validations: string;       // "Y,N,Y"
  timestamp: number;         // Para validar expiración
  itemCount: number;         // Cantidad de items copiados
}

/**
 * Servicio para manejar copy/paste de checkboxes entre actividades
 * Basado en el legacy de Angular 6
 */
@Injectable({
  providedIn: 'root'
})
export class ChecklistCopyPasteService {
  private readonly STORAGE_KEY = 'checklist_copied_data';
  private readonly EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 horas

  // Signal interno para forzar recálculo
  private _refreshTrigger = signal<number>(0);

  // Computed signal que verifica automáticamente si hay datos
  hasCopiedData = computed(() => {
    // Leer el trigger para forzar recálculo
    this._refreshTrigger();

    // Verificar si hay datos válidos
    const data = this.getCopiedDataInternal();
    return data !== null;
  });

  constructor() {
    // No necesita inicialización, el computed se evalúa automáticamente
  }

  /**
   * Método interno para obtener datos sin actualizar el trigger
   * (Previene loops infinitos en computed)
   */
  private getCopiedDataInternal(): CopiedChecklistData | null {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);

      if (!dataStr) {
        return null;
      }

      const data: CopiedChecklistData = JSON.parse(dataStr);

      // Validar expiración (24 horas)
      const now = Date.now();
      if (now - data.timestamp > this.EXPIRATION_TIME) {
        this.clearCopiedDataInternal();
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting copied data:', error);
      this.clearCopiedDataInternal();
      return null;
    }
  }

  /**
   * Copia el checklist completo al portapapeles (localStorage)
   * @param activityId ID de la actividad origen
   * @param areaId ID del área
   * @param procesoId ID del proceso
   * @param subprocesoId ID del subproceso
   * @param items Lista de items del checklist
   * @returns true si se copió exitosamente
   */
  copyChecklist(
    activityId: string,
    areaId: string,
    procesoId: string,
    subprocesoId: string,
    items: ChecklistItem[]
  ): boolean {
    try {
      if (!items || items.length === 0) {
        return false;
      }

      // Preparar datos en formato legacy: códigos separados por coma
      const checkCodes = items.map(item => item.checkCode).join(',');

      // Comentarios separados por ^~| (separador legacy)
      const comments = items.map(item => item.checkComment || '').join('^~|');

      // Validaciones separadas por coma
      const validations = items.map(item => item.checkValidation).join(',');

      const copiedData: CopiedChecklistData = {
        activityId,
        areaId,
        procesoId,
        subprocesoId,
        checkCodes,
        comments,
        validations,
        timestamp: Date.now(),
        itemCount: items.length
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(copiedData));

      // Actualizar trigger para que el computed se recalcule
      this._refreshTrigger.update(v => v + 1);

      return true;
    } catch (error) {
      console.error('Error copying checklist:', error);
      return false;
    }
  }

  /**
   * Obtiene los datos copiados del portapapeles
   * @returns Datos copiados o null si no hay o expiraron
   */
  getCopiedData(): CopiedChecklistData | null {
    return this.getCopiedDataInternal();
  }

  /**
   * Valida si se puede pegar en la actividad destino
   * @param currentActivityId ID de la actividad actual
   * @param activityStatus Estado de la actividad (001, 002, 008, etc.)
   * @returns true si se puede pegar
   */
  canPasteInActivity(currentActivityId: string, activityStatus: string): boolean {
    const copiedData = this.getCopiedData();

    if (!copiedData) {
      return false;
    }

    // No se puede pegar en la misma actividad
    if (copiedData.activityId === currentActivityId) {
      return false;
    }

    // Solo se puede pegar en estados 001, 002, 008 (estados editables)
    const allowedStatuses = ['001', '002', '008'];
    if (!allowedStatuses.includes(activityStatus)) {
      return false;
    }

    return true;
  }

  /**
   * Limpia los datos copiados del portapapeles (método interno)
   */
  private clearCopiedDataInternal(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing copied data:', error);
    }
  }

  /**
   * Limpia los datos copiados del portapapeles
   */
  clearCopiedData(): void {
    this.clearCopiedDataInternal();
    // Actualizar trigger para que el computed se recalcule
    this._refreshTrigger.update(v => v + 1);
  }


  /**
   * Obtiene información legible de los datos copiados para mostrar en toast
   * @returns String con información del origen
   */
  getCopiedDataInfo(): string {
    const data = this.getCopiedData();

    if (!data) {
      return '';
    }

    return `${data.itemCount} item(s) de la actividad ${data.activityId}`;
  }

  /**
   * Obtiene los datos formateados para enviar al endpoint CHECK_CREATE
   * @returns Objeto con los parámetros necesarios para el endpoint
   */
  getFormattedDataForAPI(): {
    checkCodes: string;
    comments: string;
    validations: string;
  } | null {
    const data = this.getCopiedData();

    if (!data) {
      return null;
    }

    return {
      checkCodes: data.checkCodes,
      comments: data.comments,
      validations: data.validations
    };
  }
}
