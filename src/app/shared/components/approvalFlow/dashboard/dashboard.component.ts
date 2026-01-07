import { CommonModule } from '@angular/common';
import { Component, computed, inject, Inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApprovalFlowService } from '../../../../layout/rkmain/services/approval-flow.service';
import { DashboardData, DashboardConfig, ModalCloseResult } from '../../../models/approval_flow.interface';
import { AlertService } from '../../../services/alert.service';
import { ApprovalFlowItemsModalComponent } from '../approval-flow-items-modal/approval-flow-items-modal.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

   // Servicios
  private alertService = inject(AlertService);
  private approvalFlowService = inject(ApprovalFlowService);
  private dialog = inject(MatDialog);

  // Signals
  contadores = signal<DashboardData>({
    ENVIAR_A_VALIDAR: 0,
    ENVIAR_A_VALIDAR_CONSTRUCCION: 0,
    RECHAZADO: 0,
    POR_VALIDAR: 0,
    POR_APROBAR: 0
  });

  loading = signal<boolean>(true);
  enviandoValidar = signal<boolean>(false);
  generandoReporte = signal<boolean>(false);

  // Computed signals
  hayItemsPendientes = computed(() =>
    this.contadores().ENVIAR_A_VALIDAR > 0 ||
    this.contadores().ENVIAR_A_VALIDAR_CONSTRUCCION > 0
  );

  hayItemsRechazados = computed(() =>
    this.contadores().RECHAZADO > 0
  );

  hayItemsPorValidar = computed(() =>
    this.contadores().POR_VALIDAR > 0
  );

  hayItemsPorAprobar = computed(() =>
    this.contadores().POR_APROBAR > 0
  );

  totalItems = computed(() =>
    this.contadores().ENVIAR_A_VALIDAR +
    this.contadores().ENVIAR_A_VALIDAR_CONSTRUCCION +
    this.contadores().RECHAZADO +
    this.contadores().POR_VALIDAR +
    this.contadores().POR_APROBAR
  );

  constructor(
    public dialogRef: MatDialogRef<ApprovalFlowItemsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DashboardConfig
  ) {}

  ngOnInit(): void {
    this.cargarContadores();
  }

  /**
   * Carga los contadores del dashboard desde el backend
   */
  private async cargarContadores(): Promise<void> {
    this.loading.set(true);

    try {
      const contadores = await firstValueFrom(
        this.approvalFlowService.getContadores(this.data.key, this.data.status)
      );

      this.contadores.set(contadores);

    } catch (error: any) {
      // Manejar error de TIMEOUT
      if (error.message?.includes('excedido')) {
        await this.alertService.info(
          'Límite Excedido',
          error.message
        );
        this.cerrar(false);
      } else {
        await this.alertService.error(
          'Error al cargar contadores',
          error.message
        );
      }
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Envía todos los items pendientes a validar (acción global)
   */
  async enviarAValidar(): Promise<void> {
    const total = this.contadores().ENVIAR_A_VALIDAR;

    if (total === 0) {
      await this.alertService.info(
        'Sin Items',
        'No hay items pendientes para enviar a validar'
      );
      return;
    }

    // Confirmación
    const result = await this.alertService.confirm({
      title: 'Enviar a Validar',
      html: `<p>Se enviarán <strong>${total}</strong> item(s) a validación.</p>
             <p>¿Desea continuar?</p>`,
      icon: 'question'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.enviandoValidar.set(true);

    try {
      await this.approvalFlowService.enviarAValidarGlobal(
        this.data.key,
        this.data.status
      );

      // Cerrar modal y refrescar componente padre
      this.cerrar(true);

    } catch (error: any) {
      await this.alertService.error(
        'Error al Enviar',
        error.message
      );
    } finally {
      this.enviandoValidar.set(false);
    }
  }

  /**
   * Genera el reporte del nodo actual
   */
  async generarReporte(): Promise<void> {
    this.generandoReporte.set(true);

    try {
      const response = await firstValueFrom(
        this.approvalFlowService.generarReporte(this.data.key)
      );

      if (response.success) {
        const mensaje = response.data?.[0]?.atts?.[1]?.value || 'Reporte generado exitosamente';
        await this.alertService.info('Reporte', mensaje);
      } else {
        await this.alertService.error(
          'Error',
          response.message || 'No se pudo generar el reporte'
        );
      }

    } catch (error: any) {
      await this.alertService.error(
        'Error al Generar Reporte',
        error.message
      );
    } finally {
      this.generandoReporte.set(false);
    }
  }

  /**
   * Abre el modal de items en construcción (EV)
   * Solo visualización, sin acciones
   */
  async verItemsEnConstruccion(): Promise<void> {
    const total = this.contadores().ENVIAR_A_VALIDAR_CONSTRUCCION;

    if (total === 0) {
      await this.alertService.info(
        'Sin Items',
        'No hay items en construcción'
      );
      return;
    }

    // Importación dinámica del modal de items
    const { ApprovalFlowItemsModalComponent } = await import(
      '../approval-flow-items-modal/approval-flow-items-modal.component'
    );

    const dialogRef = this.dialog.open(ApprovalFlowItemsModalComponent, {
      width: '90vw',
      maxWidth: '1400px',
      height: '85vh',
      disableClose: false,
      data: {
        key: this.data.key,
        status: this.data.status,
        tipo: 'EV',
        titulo: 'Items en Construcción',
        permitirSeleccion: false,
        mostrarComentarios: false,
        comentariosEditables: false,
        botones: {}
      }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());

    if (result?.refresh) {
      await this.cargarContadores();
    }
  }

  /**
   * Abre el modal de items rechazados (RE)
   * Con selección múltiple y botón Restaurar
   */
  async verItemsRechazados(): Promise<void> {
    const total = this.contadores().RECHAZADO;

    if (total === 0) {
      await this.alertService.info(
        'Sin Items',
        'No hay items rechazados'
      );
      return;
    }

    const { ApprovalFlowItemsModalComponent } = await import(
      '../approval-flow-items-modal/approval-flow-items-modal.component'
    );

    const dialogRef = this.dialog.open(ApprovalFlowItemsModalComponent, {
      width: '90vw',
      maxWidth: '1400px',
      height: '85vh',
      disableClose: false,
      data: {
        key: this.data.key,
        status: this.data.status,
        tipo: 'RE',
        titulo: 'Items Rechazados',
        permitirSeleccion: true,
        mostrarComentarios: true,
        comentariosEditables: false,
        botones: {
          restaurar: true
        }
      }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());

    if (result?.refresh) {
      await this.cargarContadores();
    }
  }

  /**
   * Abre el modal de items por validar (IV)
   * Con selección múltiple y botones Validar/Rechazar
   */
  async verItemsPorValidar(): Promise<void> {
    const total = this.contadores().POR_VALIDAR;

    if (total === 0) {
      await this.alertService.info(
        'Sin Items',
        'No hay items por validar'
      );
      return;
    }

    const { ApprovalFlowItemsModalComponent } = await import(
      '../approval-flow-items-modal/approval-flow-items-modal.component'
    );

    const dialogRef = this.dialog.open(ApprovalFlowItemsModalComponent, {
      width: '90vw',
      maxWidth: '1400px',
      height: '85vh',
      disableClose: false,
      data: {
        key: this.data.key,
        status: this.data.status,
        tipo: 'IV',
        titulo: 'Items Por Validar',
        permitirSeleccion: true,
        mostrarComentarios: true,
        comentariosEditables: false,
        botones: {
          validar: true,
          rechazar: true
        }
      }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());

    if (result?.refresh) {
      await this.cargarContadores();
    }
  }

  /**
   * Abre el modal de items por aprobar (IA)
   * Con selección múltiple, comentarios editables y botones Aprobar/Rechazar
   */
  async verItemsPorAprobar(): Promise<void> {
    const total = this.contadores().POR_APROBAR;

    if (total === 0) {
      await this.alertService.info(
        'Sin Items',
        'No hay items por aprobar'
      );
      return;
    }

    const { ApprovalFlowItemsModalComponent } = await import(
      '../approval-flow-items-modal/approval-flow-items-modal.component'
    );

    const dialogRef = this.dialog.open(ApprovalFlowItemsModalComponent, {
      width: '90vw',
      maxWidth: '1400px',
      height: '85vh',
      disableClose: false,
      data: {
        key: this.data.key,
        status: this.data.status,
        tipo: 'IA',
        titulo: 'Items Por Aprobar',
        permitirSeleccion: true,
        mostrarComentarios: true,
        comentariosEditables: true,  // ⭐ EDITABLES
        botones: {
          aprobar: true,
          rechazar: true
        }
      }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());

    if (result?.refresh) {
      await this.cargarContadores();
    }
  }

  /**
   * Cierra el modal
   */
  cerrar(refresh: boolean = false): void {
    const result: ModalCloseResult = { refresh };
    this.dialogRef.close(result);
  }

}
