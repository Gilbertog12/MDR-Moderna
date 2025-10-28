import { Component, input, signal, computed, effect, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {MatChipsModule} from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { HierarchyService } from '../../services/hierarchy.service';
import { ChecklistPermissions, ChecklistItem, CHECKLIST_STATUS_MAP } from '../../../../shared/models/checklist.interface';
import { AlertService } from '../../../../shared/services/alert.service';
import { AddChecklistModalComponent, AddChecklistModalData } from './add-checklist-modal/add-checklist-modal.component';
import { ChecklistCopyPasteService } from '../../../../shared/services/checklist-copy-paste.service';



@Component({
  selector: 'app-checklist-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './checklist-tab.component.html',
  styleUrls: ['./checklist-tab.component.scss']
})
export class ChecklistTabComponent {
  // Inputs
  areaId = input.required<string>();
  procesoId = input.required<string>();
  subprocesoId = input.required<string>();
  actividadId = input.required<string>();
  permissions = input.required<ChecklistPermissions>();
  activityStatus = input.required<string>();

  // Signals
  checklists = signal<ChecklistItem[]>([]);
  loading = signal(false);
  savingAll = signal(false);

  // Computed
  modifiedChecklists = computed(() =>
    this.checklists().filter(item => item.modified)
  );

  modifiedCount = computed(() => this.modifiedChecklists().length);

  hasChecklists = computed(() => this.checklists().length > 0);

  canSaveAll = computed(() =>
    this.modifiedCount() > 0 && !this.savingAll()
  );

  // Computed para Copy/Paste
  canCopyChecklist = computed(() =>
    this.hasChecklists() &&
    this.permissions().canAdd &&
    !this.loading()
  );

  canPasteChecklist = computed(() => {
    const copiedData = this.copyPasteService.getCopiedData();

    // 🐛 DEBUG TEMPORAL - Eliminar después de probar
    console.log('🔍 DEBUG canPasteChecklist:', {
      copiedData: copiedData,
      currentActivityId: this.actividadId(),
      activityStatus: this.activityStatus(),
      canAdd: this.permissions().canAdd,
      loading: this.loading(),
      canPasteResult: copiedData ? this.copyPasteService.canPasteInActivity(
        this.actividadId(),
        this.activityStatus()
      ) : false
    });
    // 🐛 FIN DEBUG

    if (!copiedData) return false;

    return this.copyPasteService.canPasteInActivity(
      this.actividadId(),
      this.activityStatus()
    ) && this.permissions().canAdd && !this.loading();
  });

  hasCopiedData = computed(() => this.copyPasteService.hasCopiedData());

  // Constructor con inyección tradicional
  constructor(
    private hierarchyService: HierarchyService,
    private alertService: AlertService,
    private dialog: MatDialog,
    private copyPasteService: ChecklistCopyPasteService
  ) {
    // Effect para cargar datos cuando cambian los IDs
     effect(() => {
    const areaId = this.areaId();
    const procesoId = this.procesoId();
    const subprocesoId = this.subprocesoId();
    const actividadId = this.actividadId();

    // Si algún ID cambió, resetear el flag para que vuelva a cargar
    if (areaId && procesoId && subprocesoId && actividadId) {
      this.hasLoaded.set(false);
    }
  });

  }

  private hasLoaded = signal(false);

initTab(): void {
  if (!this.hasLoaded() && this.areaId() && this.procesoId() &&
      this.subprocesoId() && this.actividadId()) {
    this.loadChecklists();
    this.hasLoaded.set(true);
  }
}

  /**
   * Carga los checkboxes de la actividad
   */
  loadChecklists(): void {
    this.loading.set(true);

    this.hierarchyService.getActivityChecklists(
      this.areaId(),
      this.procesoId(),
      this.subprocesoId(),
      this.actividadId()
    ).subscribe({
      next: (response) => {
        if (response.success) {
          const items: ChecklistItem[] = response.data.map((element: any) => ({
            offset: element.atts[0].value,
            checkCode: element.atts[1].value,
            checkType: element.atts[2].value,
            checkDescription: element.atts[3].value,
            checkValidation: element.atts[4].value,
            checkComment: element.atts[5].value || '',
            versionId: element.atts[6].value,
            statusId: element.atts[7].value,
            pendingDelete: element.atts[8].value,
            deleteIcon: element.atts[9].value,
            check: element.atts[4].value === 'Y',
            modified: false,
            canDelete: this.canDeleteItem(
              element.atts[7].value,
              element.atts[8].value,
              element.atts[9].value
            )
          }));

          this.checklists.set(items);
        } else {
          this.alertService.error('Error', response.message);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.alertService.error('Error', 'No se pudieron cargar los checkboxes');
        this.loading.set(false);
        console.error('Error loading checklists:', error);
      }
    });
  }

  /**
   * Abre el modal para agregar checkboxes (con lazy loading para evitar dependencia circular)
   */
  async openAddModal(): Promise<void> {
    // Lazy loading del modal para evitar dependencia circular
    const { AddChecklistModalComponent } = await import('./add-checklist-modal/add-checklist-modal.component');

    const dialogRef = this.dialog.open(AddChecklistModalComponent, {
       width: '1200px',        // ✅ CAMBIAR de '1000px' a '1200px' o más
    maxWidth: '95vw',       // ✅ AGREGAR esto para responsive
    height: '80vh',         // ✅ AGREGAR altura fija
    maxHeight: '90vh',
      disableClose: true,
      data: {
        areaId: this.areaId(),
        procesoId: this.procesoId(),
        subprocesoId: this.subprocesoId(),
        actividadId: this.actividadId()
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadChecklists();
      }
    });
  }

  /**
   * Marca un checkbox como modificado cuando cambia el toggle
   */
  onToggleChange(item: ChecklistItem): void {
    item.checkValidation = item.check ? 'Y' : 'N';
    item.modified = true;

    // Actualizar el signal para que los computed se recalculen
    this.checklists.update(items => [...items]);
  }

  /**
   * Marca un checkbox como modificado cuando cambia el comentario
   */
  onCommentChange(item: ChecklistItem): void {
    item.modified = true;

    // Actualizar el signal
    this.checklists.update(items => [...items]);
  }

  /**
   * Guarda un checkbox individual
   */
  async saveIndividual(item: ChecklistItem): Promise<void> {
    // Validar comentario obligatorio
    if (!item.checkComment || item.checkComment.trim() === '') {
      this.alertService.warning('Advertencia', 'El comentario es obligatorio');
      return;
    }

    const result = await this.alertService.confirm({
      title :
      'Guardar CheckList',
      text :
      '¿Desea guardar este registro?'
    }
    );

    if (!result.isConfirmed) return;

    this.loading.set(true);

    this.hierarchyService.updateChecklist(
      this.areaId(),
      this.procesoId(),
      this.subprocesoId(),
      this.actividadId(),
      item.checkCode,
      item.checkValidation,
      item.checkComment
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.alertService.success('Éxito', 'CheckList actualizado correctamente');
          item.modified = false;
          this.checklists.update(items => [...items]);
        } else {
          this.alertService.error('Error', response.message);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.alertService.error('Error', 'No se pudo actualizar el checkbox');
        this.loading.set(false);
        console.error('Error updating checklist:', error);
      }
    });
  }

  /**
   * Guarda todos los checkboxes modificados en batch
   */
  async saveAll(): Promise<void> {
    const modified = this.modifiedChecklists();

    if (modified.length === 0) {
      this.alertService.info('Info', 'No hay cambios para guardar');
      return;
    }

    // Validar que todos tengan comentario
    const withoutComment = modified.filter(item => !item.checkComment || item.checkComment.trim() === '');
    if (withoutComment.length > 0) {
      this.alertService.warning(
        'Advertencia',
        `${withoutComment.length} checkbox(es) no tienen comentario. El comentario es obligatorio.`
      );
      return;
    }

    const result = await this.alertService.confirm({
      title :
      'Guardar Todos',
      text :
      `¿Desea guardar los ${modified.length} checkbox(es) modificados?`
    }
    );

    if (!result.isConfirmed) return;

    this.savingAll.set(true);

    // Preparar strings separados por coma para el batch
    const checkNos = modified.map(item => item.checkCode).join(',');
    const checkValidations = modified.map(item => item.checkValidation).join(',');
    const comentarios = modified.map(item => item.checkComment).join('^~|');

    this.hierarchyService.updateChecklistsBatch(
      this.areaId(),
      this.procesoId(),
      this.subprocesoId(),
      this.actividadId(),
      checkNos,
      checkValidations,
      comentarios
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.alertService.success('Éxito', 'Todos los checkboxes fueron actualizados');

          // Marcar todos como no modificados
          modified.forEach(item => item.modified = false);
          this.checklists.update(items => [...items]);
        } else {
          this.alertService.error('Error', response.message);
        }
        this.savingAll.set(false);
      },
      error: (error) => {
        this.alertService.error('Error', 'No se pudieron actualizar los checkboxes');
        this.savingAll.set(false);
        console.error('Error updating checklists batch:', error);
      }
    });
  }

  /**
   * Elimina un checkbox
   */
  async deleteItem(item: ChecklistItem): Promise<void> {
    const result = await this.alertService.confirm({
      title :
      'Eliminar CheckList',
      text :
      `¿Desea eliminar el checkbox ${item.checkCode}?`
    }
    );

    if (!result.isConfirmed) return;

    this.loading.set(true);

    this.hierarchyService.deleteChecklist(
      this.areaId(),
      this.procesoId(),
      this.subprocesoId(),
      this.actividadId(),
      item.checkCode
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.alertService.success('Éxito', 'CheckList eliminado correctamente');
          this.loadChecklists();
        } else {
          this.alertService.error('Error', response.message);
          this.loading.set(false);
        }
      },
      error: (error) => {
        this.alertService.error('Error', 'No se pudo eliminar el checkbox');
        this.loading.set(false);
        console.error('Error deleting checklist:', error);
      }
    });
  }

  /**
   * Obtiene el badge visual del estado
   */
  getStatusBadge(statusId: string) {
    return CHECKLIST_STATUS_MAP[statusId] || {
      label: '',
      icon: 'help',
      color: 'primary' as const
    };
  }

  /**
   * Determina si se puede eliminar un item según estado y permisos
   */
  private canDeleteItem(statusId: string, pendingDelete: string, deleteIcon: string): boolean {
    const perms = this.permissions();

    // No es creador o no tiene permisos
    if (!perms.isCreator || !perms.canDelete) {
      return false;
    }

    // Estados no editables
    if (statusId === '004' || statusId === '007') {
      return false;
    }

    // Ya está pendiente de eliminación
    if (pendingDelete === 'Y') {
      return false;
    }

    // No tiene ícono de eliminación habilitado
    if (deleteIcon === 'N') {
      return false;
    }

    // Estados editables
    return ['001', '002', '006', '008', '000'].includes(statusId);
  }

  /**
   * Determina si se puede editar un item según estado
   */
  canEditItem(item: ChecklistItem): boolean {
    const perms = this.permissions();

    // No es creador o no tiene permisos
    if (!perms.isCreator || !perms.canEdit) {
      return false;
    }

    // Solo estados editables
    return item.statusId === '001' || item.statusId === '002' || item.statusId === '008';
  }


  /**
   * Copia el checklist completo al portapapeles
   */
  async copyChecklist(): Promise<void> {
    const items = this.checklists();

    if (items.length === 0) {
      this.alertService.info('Información', 'No hay items para copiar');
      return;
    }

    const result = await this.alertService.confirm({
      title: 'Copiar CheckList',
      text: `¿Desea copiar ${items.length} item(s) al portapapeles?`
    });

    if (!result.isConfirmed) return;

    const success = this.copyPasteService.copyChecklist(
      this.actividadId(),
      this.areaId(),
      this.procesoId(),
      this.subprocesoId(),
      items
    );

    if (success) {
      const info = this.copyPasteService.getCopiedDataInfo();
      this.alertService.success(
        'Copiado Exitosamente',
        `✓ ${info} han sido copiados al portapapeles`
      );
    } else {
      this.alertService.error('Error', 'No se pudo copiar el checklist');
    }
  }

  /**
   * Pega el checklist desde el portapapeles
   */
  async pasteChecklist(): Promise<void> {
    // Validar que se pueda pegar
    if (!this.canPasteChecklist()) {
      this.alertService.warning(
        'No se puede pegar',
        'No se puede pegar en la actividad actual. Verifique que:\n' +
        '- No sea la misma actividad de origen\n' +
        '- El estado sea 001, 002 o 008\n' +
        '- Tenga permisos para agregar'
      );
      return;
    }

    const copiedData = this.copyPasteService.getCopiedData();
    if (!copiedData) {
      this.alertService.error('Error', 'No hay datos copiados en el portapapeles');
      return;
    }

    // Confirmar con el usuario
    const result = await this.alertService.confirm({
      title: 'Pegar CheckList',
      text: `¿Desea pegar ${copiedData.itemCount} item(s) en esta actividad?\n\n` +
            `Origen: Actividad ${copiedData.activityId}`,
      confirmButtonText: 'Sí, pegar'
    });

    if (!result.isConfirmed) return;

    this.loading.set(true);

    // Obtener los datos formateados para el API
    const apiData = this.copyPasteService.getFormattedDataForAPI();
    if (!apiData) {
      this.alertService.error('Error', 'Datos copiados inválidos');
      this.loading.set(false);
      return;
    }

    // Llamar al endpoint CHECK_CREATE con confirm='Y'
    this.hierarchyService.createChecklists(
      this.areaId(),
      this.procesoId(),
      this.subprocesoId(),
      this.actividadId(),
      apiData.checkCodes,
      apiData.validations,
      apiData.comments,
      // confirm = 'Y' para paste
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.alertService.success(
            'Éxito',
            `${copiedData.itemCount} item(s) pegados correctamente`
          );

          // Recargar la lista
          this.loadChecklists();

          // Limpiar el portapapeles después de pegar exitosamente
          this.copyPasteService.clearCopiedData();
        } else {
          this.alertService.error('Error', response.message);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.alertService.error('Error', 'No se pudo pegar el checklist');
        this.loading.set(false);
        console.error('Error pasting checklist:', error);
      }
    });
  }
  /**
   * Columnas de la tabla
   */
  displayedColumns: string[] = [
    'index',
    'save',
    'delete',
    'code',
    'description',
    'applies',
    'comment'
  ];
}
