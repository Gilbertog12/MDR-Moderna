import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { SelectionModel } from '@angular/cdk/collections';
import { HierarchyService } from '../../services/hierarchy.service';

export interface Notificacion {
  jerarquia: string;
  comentario: string;
  estado: string;
  keyValue: string;
  fecha: string;
  noItems: string;
  usuario: string;
  avance: string;
  habilitado: boolean;
}

export interface NotificacionDialogData {
  button_confirm?: string;
}

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.scss']
})
export class NotificacionesComponent implements OnInit {
  // Dependency Injection
  private readonly dialogRef = inject(MatDialogRef<NotificacionesComponent>);
  private readonly hierarchyService = inject(HierarchyService);
  readonly data = inject<NotificacionDialogData>(MAT_DIALOG_DATA);

  // Signals
  readonly notificaciones = signal<Notificacion[]>([]);
  readonly loading = signal(false);
  readonly currentUser = signal(this.getCurrentUserName());
  readonly selectionCount = signal(0); // 👈 Signal para trackear selección

  // Selection Model con comparador personalizado
  readonly selection = new SelectionModel<Notificacion>(
    true, // multiple
    [], // initial
    true, // emitChanges
    (o1, o2) => o1.keyValue === o2.keyValue // comparador por keyValue
  );

  // Computed - usando selectionCount signal
  readonly hasSelection = computed(() => {
    const count = this.selectionCount();
    console.log('💡 hasSelection computed, count:', count);
    return count > 0;
  });

  readonly allSelected = computed(() => {
    const numSelected = this.selectionCount();
    const selectableRows = this.notificaciones().filter(n => !n.habilitado);
    const numRows = selectableRows.length;
    console.log('💡 allSelected computed, selected:', numSelected, 'total:', numRows);
    return numSelected === numRows && numRows > 0;
  });

  readonly someSelected = computed(() => {
    const numSelected = this.selectionCount();
    const selectableRows = this.notificaciones().filter(n => !n.habilitado);
    const result = numSelected > 0 && numSelected < selectableRows.length;
    console.log('💡 someSelected computed, selected:', numSelected, 'result:', result);
    return result;
  });

  // Table columns
  readonly displayedColumns: string[] = [
    'select',
    'usuario',
    'fecha',
    'jerarquia',
    'estado',
    'accion',
    'items'
  ];

  ngOnInit(): void {
    setTimeout(() => {
      this.cargarNotificaciones();
    });
  }

  private getCurrentUserName(): string {
    const usuario = localStorage.getItem('Usuario') || '';
    const userName = usuario.includes('@') ? usuario.split('@')[0] : usuario;
    return userName.toUpperCase(); // Normalizar a mayúsculas
  }

  cargarNotificaciones(): void {
    this.loading.set(true);

    this.hierarchyService.getNotificaciones().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const notificacionesMapeadas = this.mapearNotificaciones(response.data);
          this.notificaciones.set(notificacionesMapeadas);
        } else {
          console.error('Error al cargar notificaciones:', response.message);

        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error inesperado:', error);

        this.loading.set(false);
      }
    });
  }

  private mapearNotificaciones(data: any[]): Notificacion[] {
    const currentUser = this.currentUser().toUpperCase();
    const storedUser = (localStorage.getItem('Usuario') || '').toUpperCase();

    return data.map(element => {
      const usuario = element.atts[7].value.trim().toUpperCase(); // Normalizar a mayúsculas

      const esUsuarioActual = usuario === currentUser ||
                              usuario === storedUser ||
                              storedUser.includes(usuario);

      return {
        jerarquia: element.atts[1].value.trim(),
        comentario: element.atts[2].value.trim(),
        estado: element.atts[3].value.trim(),
        keyValue: element.atts[4].value.trim(),
        fecha: element.atts[5].value.trim(),
        noItems: element.atts[6].value.trim(),
        usuario: element.atts[7].value.trim(), // Mantener original para display
        avance: `${element.atts[8].value.trim()}%`,
        habilitado: !esUsuarioActual
      };
    });
  }

  // Selection Methods
  toggleAllRows(): void {
    if (this.allSelected()) {
      this.selection.clear();
    } else {
      const selectableRows = this.notificaciones().filter(n => !n.habilitado);
      this.selection.clear();
      this.selection.select(...selectableRows);
    }
    this.selectionCount.set(this.selection.selected.length); // 👈 Actualizar signal
  }

  toggleRow(row: Notificacion): void {
    if (!row.habilitado) {
      this.selection.toggle(row);
      const newCount = this.selection.selected.length;
      console.log('🔄 toggleRow, new count:', newCount);
      this.selectionCount.set(newCount);
    }
  }

  isSelected(row: Notificacion): boolean {
    return this.selection.isSelected(row);
  }

  // Status helpers
  getStatusClass(comentario: string): string {
    switch (comentario) {
      case 'En Proceso':
        return 'status-process';
      case 'OK':
        return 'status-success';
      default:
        return 'status-error';
    }
  }

  getStatusIcon(comentario: string): string {
    switch (comentario) {
      case 'En Proceso':
        return 'autorenew';
      case 'OK':
        return 'check_circle';
      default:
        return 'error';
    }
  }

  getStatusText(comentario: string): string {
    switch (comentario) {
      case 'En Proceso':
        return 'En Ejecución';
      case 'OK':
        return 'Ejecución Exitosa';
      default:
        return `Ejecución fallida: ${comentario}`;
    }
  }

  getStatusColor(comentario: string): 'primary' | 'accent' | 'warn' {
    switch (comentario) {
      case 'En Proceso':
        return 'primary';
      case 'OK':
        return 'accent';
      default:
        return 'warn';
    }
  }

  // Actions
  confirmarEliminacion(): void {
    const selectedKeys = this.selection.selected
      .map(notif => notif.keyValue)
      .join(',');

    if (!selectedKeys) {
      this.dialogRef.close(false);
      return;
    }

    // Eliminar notificaciones

    const deletedCount = this.selection.selected.length;

    this.hierarchyService.deleteNotificaciones(selectedKeys).subscribe({
      next: (response) => {


        if (response.success) {


          // Cerrar el diálogo y notificar eliminación exitosa
          this.dialogRef.close({ deleted: true, count: deletedCount });
        } else {

        }
      },
      error: (error) => {

        console.error('Error:', error);
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  actualizar(): void {
    this.selection.clear();
    this.selectionCount.set(0); // 👈 Resetear signal
    this.cargarNotificaciones();
  }
}
