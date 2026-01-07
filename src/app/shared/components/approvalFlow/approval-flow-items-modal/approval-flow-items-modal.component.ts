import { Component, computed, inject, Inject, signal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApprovalFlowService } from '../../../../layout/rkmain/services/approval-flow.service';
import { PendingItem, ItemsModalConfig, ModalCloseResult } from '../../../models/approval_flow.interface';
import { AlertService } from '../../../services/alert.service';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-approval-flow-items-modal',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    ScrollingModule
  ],
  templateUrl: './approval-flow-items-modal.component.html',
  styleUrl: './approval-flow-items-modal.component.scss'
})
export class ApprovalFlowItemsModalComponent {

   // Servicios
  private alertService = inject(AlertService);
  private approvalFlowService = inject(ApprovalFlowService);
  private router = inject(Router);

  // Signals
  items = signal<PendingItem[]>([]);
  itemsFiltrados = signal<PendingItem[]>([]);
  loading = signal<boolean>(true);
  procesando = signal<boolean>(false);
  filtroEntidad = signal<string>('');

  // Computed signals
  itemsSeleccionados = computed(() =>
    this.items().filter(i => i.check === true)
  );

  contadorSeleccionados = computed(() =>
    this.itemsSeleccionados().length
  );

  totalItems = computed(() =>
    this.items().length
  );

  haySeleccion = computed(() =>
    this.contadorSeleccionados() > 0
  );

  // Niveles jerárquicos para lógica de marcado
  private readonly NIVELES_LONGITUD = [2, 6, 10, 14, 18, 19, 23, 27, 31];

  constructor(
    public dialogRef: MatDialogRef<ApprovalFlowItemsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public config: ItemsModalConfig
  ) {}

  ngOnInit(): void {
    this.cargarItems();
  }

  /**
   * Carga los items desde el backend
   */
  private async cargarItems(): Promise<void> {
    this.loading.set(true);

    try {
      const items = await firstValueFrom(
        this.approvalFlowService.getItemsPendientes(
          this.config.key,
          this.config.status,
          this.config.tipo,
          0
        )
      );

      this.items.set(items);
      this.itemsFiltrados.set(items);

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
          'Error al cargar items',
          error.message
        );
      }
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Filtra items por entidad
   */
  filtrarPorEntidad(): void {
    const filtro = this.filtroEntidad().toLowerCase().trim();

    if (!filtro) {
      this.itemsFiltrados.set(this.items());
      return;
    }

    const filtrados = this.items().filter(item =>
      item.entidad.toLowerCase().includes(filtro) ||
      item.descripcion.toLowerCase().includes(filtro)
    );

    this.itemsFiltrados.set(filtrados);
  }

  /**
   * Limpia el filtro
   */
  limpiarFiltro(): void {
    this.filtroEntidad.set('');
    this.itemsFiltrados.set(this.items());
  }

  // ==================== SELECCIÓN JERÁRQUICA ====================

  /**
   * Marca/desmarca un item con lógica jerárquica
   * Al marcar: marca automáticamente padres y todos los hijos
   */
  toggleItem(item: PendingItem): void {
    const nuevoEstado = !item.check;

    // Actualizar el item
    this.actualizarCheck(item, nuevoEstado);

    if (nuevoEstado) {
      // Si se marca: marcar padres y todos los hijos
      this.marcarPadres(item.key);
      this.marcarHijos(item.key);
    }

    // Forzar actualización de signals
    this.items.set([...this.items()]);
    this.itemsFiltrados.set([...this.itemsFiltrados()]);
  }

  /**
   * Marca/desmarca todos los items visibles
   */
  toggleTodos(estado: boolean): void {
    this.itemsFiltrados().forEach(item => {
      this.actualizarCheck(item, estado);
    });

    // Forzar actualización
    this.items.set([...this.items()]);
    this.itemsFiltrados.set([...this.itemsFiltrados()]);
  }

  /**
   * Desmarca todos los items
   */
  desmarcarTodos(): void {
    this.items().forEach(item => {
      item.check = false;
    });

    // Forzar actualización
    this.items.set([...this.items()]);
    this.itemsFiltrados.set([...this.itemsFiltrados()]);
  }

  /**
   * Actualiza el estado check de un item
   */
  private actualizarCheck(item: PendingItem, estado: boolean): void {
    const itemEnLista = this.items().find(i => i.key === item.key);
    if (itemEnLista) {
      itemEnLista.check = estado;
    }
  }

  /**
   * Marca todos los padres de un item
   */
  private marcarPadres(key: string): void {
    const nivel = this.determinarNivel(key);

    // Recorrer todos los niveles superiores
    for (let i = 0; i < nivel; i++) {
      const longitudPadre = this.NIVELES_LONGITUD[i];
      const keyPadre = key.substring(0, longitudPadre);

      const padre = this.items().find(item => item.key === keyPadre);
      if (padre) {
        padre.check = true;
      }
    }
  }

  /**
   * Marca todos los hijos de un item
   */
  private marcarHijos(keyPadre: string): void {
    this.items().forEach(item => {
      if (item.key.startsWith(keyPadre) && item.key !== keyPadre) {
        item.check = true;
      }
    });
  }

  /**
   * Determina el nivel jerárquico de una key
   */
  private determinarNivel(key: string): number {
    const longitud = key.length;
    return this.NIVELES_LONGITUD.indexOf(longitud);
  }

  // ==================== NAVEGACIÓN ====================

  /**
   * Navega al item seleccionado
   */
  navegarAItem(item: PendingItem): void {
    const nivel = this.determinarNivel(item.key);
    const rutas = ['/rka', '/rkp', '/rks', '/rkc', '/rkt', '/rkd', '/rkr', '/rky'];

    if (nivel >= 0 && nivel < rutas.length) {
      this.router.navigate([rutas[nivel]], {
        queryParams: { key: item.key }
      });
      this.cerrar(false);
    }
  }

  // ==================== ACCIONES ====================

  /**
   * Valida los items seleccionados (solo tipo IV)
   */
  async validar(): Promise<void> {
    const seleccionados = this.itemsSeleccionados();

    if (seleccionados.length === 0) {
      await this.alertService.info(
        'Sin Selección',
        'Debe seleccionar al menos un item para validar'
      );
      return;
    }

    const result = await this.alertService.confirm({
      title: '¿Validar Items?',
      html: `<p>Se validarán <strong>${seleccionados.length}</strong> item(s).</p>
             <p>Los items pasarán al estado "Por Aprobar".</p>`,
      icon: 'question'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.procesando.set(true);

    try {
      const keys = seleccionados.map(i => i.key);
      await this.approvalFlowService.validarItems(keys);

      // Modal se cierra automáticamente con mensaje de éxito
      // (el servicio navega a /rkmain y muestra mensaje)

    } catch (error: any) {
      await this.alertService.error(
        'Error al Validar',
        error.message
      );
      this.procesando.set(false);
    }
  }

  /**
   * Aprueba los items seleccionados con comentarios editados (solo tipo IA)
   */
  async aprobar(): Promise<void> {
    const seleccionados = this.itemsSeleccionados();

    if (seleccionados.length === 0) {
      await this.alertService.info(
        'Sin Selección',
        'Debe seleccionar al menos un item para aprobar'
      );
      return;
    }

    const result = await this.alertService.confirm({
      title: '¿Aprobar Items?',
      html: `<p>Se aprobarán <strong>${seleccionados.length}</strong> item(s).</p>
             <p>Los items pasarán al estado "Aprobado".</p>`,
      icon: 'question'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.procesando.set(true);

    try {
      // Recopilar comentarios editados
      const comentarios: { [key: string]: string } = {};
      seleccionados.forEach(item => {
        comentarios[item.key] = item.comentarios || '';
      });

      const keys = seleccionados.map(i => i.key);
      await this.approvalFlowService.aprobarItems(keys, comentarios);

      // Modal se cierra automáticamente con mensaje de éxito

    } catch (error: any) {
      await this.alertService.error(
        'Error al Aprobar',
        error.message
      );
      this.procesando.set(false);
    }
  }

  /**
   * Rechaza los items seleccionados (tipos IV y IA)
   */
  async rechazar(): Promise<void> {
    const seleccionados = this.itemsSeleccionados();

    if (seleccionados.length === 0) {
      await this.alertService.info(
        'Sin Selección',
        'Debe seleccionar al menos un item para rechazar'
      );
      return;
    }

    // Solicitar razón del rechazo
    const razon = await this.alertService.reasonReject('Razón del Rechazo');

    if (!razon) {
      return;
    }

    this.procesando.set(true);

    try {
      const keys = seleccionados.map(i => i.key);
      await this.approvalFlowService.rechazarItems(keys, razon);

      // Modal se cierra automáticamente con mensaje de éxito

    } catch (error: any) {
      await this.alertService.error(
        'Error al Rechazar',
        error.message
      );
      this.procesando.set(false);
    }
  }

  /**
   * Restaura los items seleccionados (solo tipo RE)
   */
  async restaurar(): Promise<void> {
    const seleccionados = this.itemsSeleccionados();

    if (seleccionados.length === 0) {
      await this.alertService.info(
        'Sin Selección',
        'Debe seleccionar al menos un item para restaurar'
      );
      return;
    }

    const result = await this.alertService.confirm({
      title: '¿Restaurar Items?',
      html: `<p>Se restaurarán <strong>${seleccionados.length}</strong> item(s) rechazado(s).</p>
             <p>Los items volverán al estado "En Construcción".</p>`,
      icon: 'question'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.procesando.set(true);

    try {
      const keys = seleccionados.map(i => i.key);
      await this.approvalFlowService.restaurarItems(keys);

      // Cerrar modal y refrescar
      this.cerrar(true);

    } catch (error: any) {
      await this.alertService.error(
        'Error al Restaurar',
        error.message
      );
      this.procesando.set(false);
    }
  }

  /**
   * Cierra el modal
   */
  cerrar(refresh: boolean = false): void {
    const result: ModalCloseResult = { refresh };
    this.dialogRef.close(result);
  }

  /**
   * Obtiene el ícono según el tipo de acción
   */
  getAccionIcon(accion: string): string {
    const iconos: { [key: string]: string } = {
      'CREATE': 'add_circle',
      'MODIFY': 'edit',
      'DELETE': 'delete'
    };
    return iconos[accion] || 'help';
  }

  /**
   * Obtiene el color según el tipo de acción
   */
  getAccionColor(accion: string): string {
    const colores: { [key: string]: string } = {
      'CREATE': 'success',
      'MODIFY': 'warning',
      'DELETE': 'danger'
    };
    return colores[accion] || 'default';
  }

}
