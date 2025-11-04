import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatTableModule } from '@angular/material/table';
import { AlertService } from '../../../../shared/services/alert.service';
import { HierarchyService } from '../../services/hierarchy.service';
import { StdJobTaskModalData, StdJobTask } from './stdjob-tab.interface';

@Component({
  selector: 'app-stdjob-task-modal',
  imports: [
     CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatRadioModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './stdjob-task-modal.component.html',
  styleUrl: './stdjob-task-modal.component.scss'
})
export class StdjobTaskModalComponent {

  // Servicios
  private hierarchyService = inject(HierarchyService);
  private alertService = inject(AlertService);
  private dialogRef = inject(MatDialogRef<StdjobTaskModalComponent>);
  private data = inject<StdJobTaskModalData>(MAT_DIALOG_DATA);

  // Signals de estado
  isLoading = signal<boolean>(false);
  tasks = signal<StdJobTask[]>([]);
  selectedTask = signal<StdJobTask | null>(null);

  // Computed signals
  hasTasks = computed(() => this.tasks().length > 0);
  hasSelection = computed(() => this.selectedTask() !== null);
  isEmpty = computed(() => !this.isLoading() && !this.hasTasks());

  // Columnas de la tabla
  displayedColumns = ['select', 'stdJobTask', 'taskDesc'];

  ngOnInit(): void {
    this.loadTasks();
  }

  /**
   * Cargar las tareas del Std Job desde la API
   */
  private loadTasks(): void {
    this.isLoading.set(true);

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'LISTA_STD_JOB_TASK' },
      { name: 'id', value: this.data.areaId },
      { name: 'stdJobNo', value: this.data.stdJobNo }
    ];

    this.hierarchyService.executeGenericAction({ atts }).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        if (response.success) {
          const tasks = this.parseTasksResponse(response);
          this.tasks.set(tasks);

          if (tasks.length === 0) {
            this.alertService.info(
              'Sin tareas',
              'Este Std Job no tiene tareas definidas'
            );
          }
        } else {
          this.alertService.error('Error', response.message || 'No se pudieron cargar las tareas');
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error al cargar tareas:', error);
        this.alertService.error('Error', 'Error al cargar las tareas del Std Job');
      }
    });
  }

  /**
   * Parsear la respuesta de la API
   */
  private parseTasksResponse(response: any): StdJobTask[] {
    // La respuesta puede venir en response.data (array directo) o response.element.elements
    const dataArray = response?.data || response?.element?.elements;

    if (!dataArray || !Array.isArray(dataArray)) {
      return [];
    }

    return dataArray.map((element: any) => {
      const atts = element.atts || [];
      return {
        stdJobTask: (atts[1]?.value || '').trim(), // Eliminar espacios
        taskDesc: (atts[2]?.value || '').trim(), // Eliminar espacios
        selected: false
      };
    });
  }

  /**
   * Seleccionar una tarea
   */
  selectTask(task: StdJobTask): void {
    // Marcar la tarea seleccionada y desmarcar las demás
    const updatedTasks = this.tasks().map(t => ({
      ...t,
      selected: t.stdJobTask === task.stdJobTask
    }));

    this.tasks.set(updatedTasks);
    this.selectedTask.set(task);
  }

  /**
   * Guardar la selección
   */
  saveSelection(): void {
    const selected = this.selectedTask();

    if (!selected) {
      this.alertService.warning('Selección requerida', 'Debe seleccionar una tarea');
      return;
    }

    // Cerrar el modal con la tarea seleccionada
    this.dialogRef.close(selected);
  }

  /**
   * Cerrar el modal sin guardar
   */
  cancel(): void {
    this.dialogRef.close();
  }

  /**
   * Obtener el título del modal
   */
  getTitle(): string {
    return `Seleccionar Tarea - Std. Job ${this.data.stdJobNo}`;
  }

  /**
   * Obtener la descripción del Std Job
   */
  getDescription(): string {
    return this.data.stdJobDesc;
  }

}
