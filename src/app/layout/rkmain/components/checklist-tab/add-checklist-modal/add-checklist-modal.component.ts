import { Component, inject, signal, computed, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {MatChipsModule} from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { AvailableChecklistItem } from '../../../../../shared/models/checklist.interface';
import { AlertService } from '../../../../../shared/services/alert.service';
import { HierarchyService } from '../../../services/hierarchy.service';
import { TextFieldModule } from '@angular/cdk/text-field';


export interface AddChecklistModalData {
  areaId: string;
  procesoId: string;
  subprocesoId: string;
  actividadId: string;
}

interface SelectedChecklistItem extends AvailableChecklistItem {
  applies: boolean;
  comment: string;
}

@Component({
  selector: 'app-add-checklist-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
    TextFieldModule
  ],
  templateUrl: './add-checklist-modal.component.html',
  styleUrls: ['./add-checklist-modal.component.scss']
})
export class AddChecklistModalComponent implements OnInit {
  // Signals
  availableItems = signal<AvailableChecklistItem[]>([]);
  selectedItems = signal<SelectedChecklistItem[]>([]);
  searchTerm = signal('');
  loading = signal(true);
  saving = signal(false);

  // Computed
  filteredItems = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.availableItems();

    return this.availableItems().filter(item =>
      item.id.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      item.fullDescription.toLowerCase().includes(term)
    );
  });

  selectedCount = computed(() => this.selectedItems().length);

  hasSelected = computed(() => this.selectedCount() > 0);

  selectedItemsWithoutComment = computed(() =>
    this.selectedItems().filter(item => !item.comment || item.comment.trim() === '')
  );

  canSave = computed(() => {
    const items = this.selectedItems();
    if (items.length === 0) return false;

    // Todos deben tener comentario
    return items.every(item => item.comment && item.comment.trim() !== '');
  });

  // Constructor con inyección tradicional
  constructor(
    private hierarchyService: HierarchyService,
    private alertService: AlertService,
    public dialogRef: MatDialogRef<AddChecklistModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddChecklistModalData
  ) {}

  ngOnInit(): void {
    this.loadAvailableChecklists();
  }

  /**
   * Carga la lista de checkboxes disponibles
   */
  loadAvailableChecklists(): void {
    this.loading.set(true);

    this.hierarchyService.getAvailableChecklists(
      this.data.areaId,
      this.data.procesoId,
      this.data.subprocesoId,
      this.data.actividadId
    ).subscribe({
      next: (response) => {
        if (response.success) {
          const items: AvailableChecklistItem[] = response.data.map((element: any) => ({
            id: element.atts[0].value.trim(),
            description: element.atts[1].value,
            fullDescription: element.atts[2].value,
            comentario: element.atts[3]?.value || ''
          }));

          this.availableItems.set(items);
        } else {
          this.alertService.error('Error', response.message);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.alertService.error('Error', 'No se pudieron cargar los checkboxes disponibles');
        this.loading.set(false);
        console.error('Error loading available checklists:', error);
      }
    });
  }

  /**
   * Verifica si un item ya está seleccionado
   */
  isSelected(itemId: string): boolean {
    return this.selectedItems().some(item => item.id === itemId);
  }

  /**
   * Agrega o quita un item de la selección
   */
  toggleSelection(item: AvailableChecklistItem): void {
    const isCurrentlySelected = this.isSelected(item.id);

    if (isCurrentlySelected) {
      // Remover
      this.selectedItems.update(items =>
        items.filter(i => i.id !== item.id)
      );
    } else {
      // Agregar con valores por defecto
      const newItem: SelectedChecklistItem = {
        ...item,
        applies: true, // Por defecto aplica
        comment: item.comentario || ''
      };

      this.selectedItems.update(items => [...items, newItem]);
    }
  }

  /**
   * Remueve un item seleccionado
   */
  removeSelected(itemId: string): void {
    this.selectedItems.update(items =>
      items.filter(item => item.id !== itemId)
    );
  }

  /**
   * Limpia toda la selección
   */
  clearSelection(): void {
    this.selectedItems.set([]);
  }

  /**
   * Actualiza el toggle de "Aplica"
   */
  onAppliesChange(itemId: string): void {
    this.selectedItems.update(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item }
          : item
      )
    );
  }

  /**
   * Actualiza el comentario
   */
  onCommentChange(itemId: string): void {
    this.selectedItems.update(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item }
          : item
      )
    );
  }

  /**
   * Guarda todos los checkboxes seleccionados
   */
  async save(): Promise<void> {
    const items = this.selectedItems();

    if (items.length === 0) {
      this.alertService.info('Info', 'Debe seleccionar al menos un checkbox');
      return;
    }

    // Validar comentarios
    const withoutComment = this.selectedItemsWithoutComment();
    if (withoutComment.length > 0) {
      this.alertService.warning(
        'Advertencia',
        `Hay ${withoutComment.length} checkbox(es) sin comentario. El comentario es obligatorio.`
      );
      return;
    }

    const result = await this.alertService.confirm({
      title :
      'Agregar CheckList',
      text :
      `¿Desea guardar los ${items.length} checkbox(es) seleccionados?`
    }
    );

    if (!result.isConfirmed) return;

    this.saving.set(true);

    // Preparar strings separados por coma/delimitadores
    const checkNos = items.map(item => item.id).join(',');
    const checkValidations = items.map(item => item.applies ? 'Y' : 'N').join(',');
    const comentarios = items.map(item => item.comment).join('^~|');

    this.hierarchyService.createChecklists(
      this.data.areaId,
      this.data.procesoId,
      this.data.subprocesoId,
      this.data.actividadId,
      checkNos,
      checkValidations,
      comentarios
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.alertService.success('Éxito', 'CheckList agregado correctamente');
          this.dialogRef.close(true);
        } else {
          this.alertService.error('Error', response.message);
          this.saving.set(false);
        }
      },
      error: (error) => {
        this.alertService.error('Error', 'No se pudieron guardar los checkboxes');
        this.saving.set(false);
        console.error('Error creating checklists:', error);
      }
    });
  }

  /**
   * Cierra el modal sin guardar
   */
  cancel(): void {
    if (this.hasSelected()) {
      this.alertService.confirm({
        title :
        'Confirmar',
        text :
        '¿Desea salir sin guardar? Se perderán los cambios.'
      }
      ).then(result => {
        if (result.isConfirmed) {
          this.dialogRef.close(false);
        }
      });
    } else {
      this.dialogRef.close(false);
    }
  }
}
