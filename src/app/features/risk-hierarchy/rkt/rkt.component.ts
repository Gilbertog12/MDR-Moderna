import { Component, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { HierarchyService } from '../../../layout/rkmain/services/hierarchy.service';
import { AlertService } from '../../../shared/services/alert.service';
import { ApprovalFlowService } from '../../../layout/rkmain/services/approval-flow.service';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { StdjobTabComponent } from "../../../layout/rkmain/components/stdjob-tab/stdjob-tab.component";
import { RktDetalleComponent } from "../../../layout/rkmain/components/rkt-detalle/rkt-detalle.component";
import { RkcDetalleComponent } from '../../../layout/rkmain/components/rkc-detalle/rkc-detalle.component';

interface TareaDetail {
  offset: string;
  areaId: string;
  areaDescripcion: string;
  procesoId: string;
  procesoDescripcion: string;
  subprocesoId: string;
  subprocesoDescripcion: string;
  actividadId: string;
  actividadDescripcion: string;
  tareaId: string;
  tareaDescripcion: string;
  tareaDescripcionExt: string;
  tareaDocumentacion: string;
  tareaDescDocumentacion: string;
  tareaTipo: string;
  tareaDescTipo: string;
  tareaRiesgoPuroDesc: string;
  tareaRiesgoResidualDesc: string;
  key: string;
  statusParent: string;
  canAdd: string;
  canModify: string;
  creador: string;
  tareaStatus: string;
  tareaVersion: string;
  tareaNivel: string;
  tareaAtributos: string;
  tareaStatusId: string;
}

export interface DimensionWithRisk {
  offset: string;
  id: string;
  descripcion: string;
  dimensionRiesgoPuro: string;
  dimensionRiesgoResidual: string;
  estado: string;
  orderItem: string;
  pendingDelete: string;
  canNavigate: boolean;
}

@Component({
  selector: 'app-rkt',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    StdjobTabComponent,
    RktDetalleComponent
],
  templateUrl: './rkt.component.html',
  styleUrl: './rkt.component.scss'
})
export class RktComponent implements OnInit {
  // Parámetros de ruta
  areaId = signal<string>('');
  procesoId = signal<string>('');
  subprocesoId = signal<string>('');
  actividadId = signal<string>('');
  tareaId = signal<string>('');

  // Estado del componente
  tareaDetail = signal<TareaDetail | null>(null);
  dimensiones = signal<DimensionWithRisk[]>([]);
  isLoadingTarea = signal(false);
  isLoadingDimensiones = signal(false);
  selectedTab = signal<number>(0);

  // Permisos y flujo
  userProfile = signal<string>('');
  currentFlowButton = signal<string>('');
  showButtons = signal<boolean>(false);

  private destroy$ = new Subject<void>();

  private stdJobTab = viewChild<StdjobTabComponent>('stdJobTab');
  private detalleTab = viewChild<RkcDetalleComponent>('detalleTab');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hierarchyService: HierarchyService,
    private alertService: AlertService,
    private approvalFlowService: ApprovalFlowService
  ) {}

  ngOnInit(): void {
    this.loadUserPermissions();

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const areaId = params['areaId'];
        const procesoId = params['procesoId'];
        const subprocesoId = params['subprocesoId'];
        const actividadId = params['actividadId'];
        const tareaId = params['tareaId'];

        if (areaId && procesoId && subprocesoId && actividadId && tareaId) {
          this.areaId.set(areaId);
          this.procesoId.set(procesoId);
          this.subprocesoId.set(subprocesoId);
          this.actividadId.set(actividadId);
          this.tareaId.set(tareaId);
          this.loadData(areaId, procesoId, subprocesoId, actividadId, tareaId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserPermissions(): void {
    let allow = localStorage.getItem('allow') || '';

    if (!allow || allow.trim() === '') {
      console.log('⚠️ Allow está vacío, simulando administrador');
      allow = 'administrador';
      localStorage.setItem('allow', allow);
    }

    this.userProfile.set(allow);
  }

  private async loadData(areaId: string, procesoId: string, subprocesoId: string, actividadId: string, tareaId: string): Promise<void> {
    this.tareaDetail.set(null);
    this.dimensiones.set([]);

    await this.loadTareaDetail(areaId, procesoId, subprocesoId, actividadId, tareaId);
    await this.loadDimensionesWithRisks(areaId, procesoId, subprocesoId, actividadId, tareaId);
    this.determineFlowButton();
  }

  /**
   * Carga el detalle de la tarea
   * MAPEO BASADO EN EL BACKEND (TAREA_READ):
   * atts[0]: offset
   * atts[1]: areaId
   * atts[2]: areaDescripcion
   * atts[3]: procesoId
   * atts[4]: procesoDescripcion
   * atts[5]: subprocesoId
   * atts[6]: subprocesoDescripcion
   * atts[7]: actividadId
   * atts[8]: actividadDescripcion
   * atts[9]: tareaId
   * atts[10]: tareaDescripcion
   * atts[11]: tareaDescripcionExt
   * atts[12]: tareaDocumentacion
   * atts[13]: tareaDescDocumentacion
   * atts[14]: tareaTipo
   * atts[15]: tareaDescTipo
   * atts[16]: tareaRiesgoPuroDesc
   * atts[17]: tareaRiesgoResidualDesc
   * atts[18]: key
   * atts[19]: statusParent
   * atts[20]: CanAdd
   * atts[21]: CanModify
   * atts[22]: Creador
   * atts[23]: tareaStatus
   * atts[24]: tareaVersion
   * atts[25]: tareaNivel
   * atts[26]: tareaAtributos
   * atts[27]: tareaStatusId
   */
  private async loadTareaDetail(areaId: string, procesoId: string, subprocesoId: string, actividadId: string, tareaId: string): Promise<void> {
    this.isLoadingTarea.set(true);

    try {
      const response = await firstValueFrom(
        this.hierarchyService.getNodeDetail(5, [areaId, procesoId, subprocesoId, actividadId, tareaId])
      );

      if (response?.success && response.data?.[0]) {
        const atts = response.data[0].atts;

        // Validar que sea el registro principal (offset = '0')
        if (atts[0]?.value === '0') {
          this.tareaDetail.set({
            offset: atts[0]?.value || '',
            areaId: atts[1]?.value || '',
            areaDescripcion: atts[2]?.value || '',
            procesoId: atts[3]?.value || '',
            procesoDescripcion: atts[4]?.value || '',
            subprocesoId: atts[5]?.value || '',
            subprocesoDescripcion: atts[6]?.value || '',
            actividadId: atts[7]?.value || '',
            actividadDescripcion: atts[8]?.value || '',
            tareaId: atts[9]?.value || '',
            tareaDescripcion: atts[10]?.value || '',
            tareaDescripcionExt: atts[11]?.value || '',
            tareaDocumentacion: atts[12]?.value || '',
            tareaDescDocumentacion: atts[13]?.value || '',
            tareaTipo: atts[14]?.value || '',
            tareaDescTipo: atts[15]?.value || '',
            tareaRiesgoPuroDesc: atts[16]?.value || '',
            tareaRiesgoResidualDesc: atts[17]?.value || '',
            key: atts[18]?.value || '',
            statusParent: atts[19]?.value || '',
            canAdd: atts[20]?.value || 'N',
            canModify: atts[21]?.value || 'N',
            creador: atts[22]?.value || 'N',
            tareaStatus: atts[23]?.value || '',
            tareaVersion: atts[24]?.value || '',
            tareaNivel: atts[25]?.value || '',
            tareaAtributos: atts[26]?.value || '',
            tareaStatusId: atts[27]?.value || ''
          });

          // Guardar en localStorage (igual que el legacy)
          localStorage.setItem('keySelected', atts[18]?.value || '');
          localStorage.setItem('versionSelected', atts[24]?.value || '');
          localStorage.setItem('statusSelected', atts[27]?.value || '');

          console.log('✅ Tarea cargada:', this.tareaDetail());
        }
      }
    } catch (error) {
      console.error('❌ Error loading tarea:', error);
      this.alertService.error('Error al cargar la tarea');
    } finally {
      this.isLoadingTarea.set(false);
    }
  }

  /**
   * Carga las dimensiones con sus riesgos
   * Usa ITEM_EVALRISK_DETAIL_READ igual que el legacy
   */
  private async loadDimensionesWithRisks(areaId: string, procesoId: string, subprocesoId: string, actividadId: string, tareaId: string): Promise<void> {
    this.isLoadingDimensiones.set(true);

    try {
      const key = areaId + procesoId + subprocesoId + actividadId + tareaId;
      const response = await firstValueFrom(
        this.hierarchyService.getNodeChildren(key)
      );

      if (response?.success && response.data) {
        const dimensionesList: DimensionWithRisk[] = [];

        response.data.forEach((element: any) => {
          const atts = element.atts;

          // Filtrar: excluir offset='0' (igual que legacy)
          if (atts[0]?.value !== '0') {
            dimensionesList.push({
              offset: atts[0]?.value || '',
              id: atts[1]?.value?.trim() || '',
              descripcion: atts[2]?.value || '',
              dimensionRiesgoPuro: atts[3]?.value || '',
              dimensionRiesgoResidual: atts[4]?.value || '',
              estado: atts[5]?.value || '',
              orderItem: atts[6]?.value || '',
              pendingDelete: atts[7]?.value || 'N',
              canNavigate: true // Las dimensiones no tienen navegación siguiente
            });
          }
        });

        this.dimensiones.set(dimensionesList);
        console.log('✅ Dimensiones cargadas:', dimensionesList.length);
      }
    } catch (error) {
      console.error('❌ Error loading dimensiones:', error);
      this.alertService.error('Error al cargar dimensiones');
    } finally {
      this.isLoadingDimensiones.set(false);
    }
  }

  /**
   * Determina qué botón del flujo mostrar
   */
  private determineFlowButton(): void {
    const tarea = this.tareaDetail();
    const allow = localStorage.getItem('allow') || '';

    if (!tarea || !allow) {
      this.currentFlowButton.set('');
      this.showButtons.set(false);
      return;
    }

    const parameters = [allow, tarea.tareaStatusId, tarea.canAdd];
    const buttonType = this.approvalFlowService.botonesFlujoAprobacion(parameters);

    this.currentFlowButton.set(buttonType || '');
    this.showButtons.set(!!buttonType);
  }

  shouldShowApprovalButtons(): boolean {
    return this.showButtons();
  }

  getFlowButton(): string {
    return this.currentFlowButton();
  }

  // ============================================
  // FLUJO DE APROBACIÓN
  // ============================================

  async enviarAValidar(): Promise<void> {
    try {
      await this.executeApprovalFlow('004', false);
    } catch (error) {
      console.error('Error en enviar a validar:', error);
    }
  }

  async validar(): Promise<void> {
    try {
      await this.executeApprovalFlow('004', false);
    } catch (error) {
      console.error('Error en validar:', error);
    }
  }

  async aprobar(): Promise<void> {
    try {
      await this.executeApprovalFlow('007', false);
    } catch (error) {
      console.error('Error en aprobar:', error);
    }
  }

  async rechazar(): Promise<void> {
    try {
      const reason = await this.alertService.reasonReject('Razón de Rechazo');
      if (!reason) return;

      const status = this.tareaDetail()?.tareaStatusId;
      await this.executeApprovalFlow(status!, true, reason);
    } catch (error) {
      console.error('Error en rechazar:', error);
    }
  }

  private async executeApprovalFlow(
    status: string,
    isReject: boolean = false,
    comments?: string
  ): Promise<void> {
    try {
      const uuid = await this.getPendingValidationUuid(status);

      const atts = [
        { name: 'scriptName', value: 'coemdr' },
        { name: 'action', value: 'VALIDATE' },
        { name: 'onlyActualNode', value: 'Y' },
        { name: 'uuid', value: uuid }
      ];

      if (isReject) {
        atts.push(
          { name: 'approveInd', value: 'U' },
          { name: 'comments', value: comments || '' }
        );
      }

      const response = await firstValueFrom(
        this.approvalFlowService.generic(atts)
      );

      if (response?.success) {
        const titulo = this.getTituloFlujo(status, isReject);
        this.approvalFlowService.mensajeFlujoAprobacion(titulo);
        this.loadData(this.areaId(), this.procesoId(), this.subprocesoId(), this.actividadId(), this.tareaId());
      } else {
        this.alertService.error(response?.message || 'Error en el flujo de aprobación');
      }
    } catch (error: any) {
      this.alertService.error(error.message || 'Error en el flujo de aprobación');
    }
  }

  private getTituloFlujo(status: string, isReject: boolean): string {
    if (isReject) return 'Rechazo en Tarea';
    return status === '004' ? 'Envio a Validacion en Tarea' : 'Aprobacion en Tarea';
  }

  private async getPendingValidationUuid(status: string): Promise<string> {
    const key = this.areaId() + this.procesoId() + this.subprocesoId() + this.actividadId() + this.tareaId();
    const tipo = status === '004' ? 'IV' : 'IA';

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'PENDIENTE_VALIDAR_LIST' },
      { name: 'status', value: tipo },
      { name: 'key', value: key },
      { name: 'soloNodos', value: 'Y' },
      { name: 'statusItem', value: status },
      { name: 'showCompleted', value: 'Y' },
      { name: 'empezarDesde', value: '0' }
    ];

    const response = await firstValueFrom(
      this.approvalFlowService.generic(atts)
    );

    if (!response?.success) {
      throw new Error('Error al obtener UUID de validación');
    }

    if (response.data?.[0]?.atts?.[0]?.name === 'TIMEOUT') {
      const count = response.data[0].atts[0].value?.trim();
      throw new Error(`Número de items en Validación/Construcción excedido: ${count}`);
    }

    const uuidElement = response.data?.find((element: any) =>
      element.atts?.[0]?.name === 'uuid'
    );

    if (!uuidElement) {
      throw new Error('No se pudo obtener UUID de validación');
    }

    return uuidElement.atts[0].value;
  }

  // ============================================
  // NAVEGACIÓN
  // ============================================

  /**
   * Navega al área
   */
  goToArea(): void {
    const tarea = this.tareaDetail();
    if (!tarea?.areaId) return;

    this.router.navigate(['/rkmain/rka', tarea.areaId]);
  }

  /**
   * Navega al proceso
   */
  goToProceso(): void {
    const tarea = this.tareaDetail();
    if (!tarea?.areaId || !tarea?.procesoId) return;

    this.router.navigate(['/rkmain/rkp', tarea.areaId, tarea.procesoId]);
  }

  /**
   * Navega al subproceso
   */
  goToSubproceso(): void {
    const tarea = this.tareaDetail();
    if (!tarea?.areaId || !tarea?.procesoId || !tarea?.subprocesoId) return;

    this.router.navigate(['/rkmain/rks', tarea.areaId, tarea.procesoId, tarea.subprocesoId]);
  }

  /**
   * Navega a la actividad
   */
  goToActividad(): void {
    const tarea = this.tareaDetail();
    if (!tarea?.areaId || !tarea?.procesoId || !tarea?.subprocesoId || !tarea?.actividadId) return;

    this.router.navigate(['/rkmain/rkc', tarea.areaId, tarea.procesoId, tarea.subprocesoId, tarea.actividadId]);
  }

  /**
   * Click en dimensión (no navega, solo información)
   */
  goToDimension(dimension: DimensionWithRisk): void {

    console.log(dimension)
    if (dimension.canNavigate) {
      this.router.navigate([
        '/rkmain/rkd',
        this.areaId(),
        this.procesoId(),
        this.subprocesoId(),
        this.actividadId(),
        this.tareaId(),
        dimension.id
      ]);
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Devuelve la clase CSS para el badge/cell de riesgo
   * Igual que en los componentes anteriores
   */
  getRiskClass(riskValue: string | undefined): string {
    if (!riskValue || riskValue.trim() === '' || riskValue === ' ') {
      return '';
    }

    const risk = riskValue.toUpperCase().trim();

    if (risk.includes('INTOLERABLE')) return 'risk-intolerable';
    if (risk.includes('TOLERABLE')) return 'risk-tolerable';
    if (risk.includes('INSIGNIFICANTE')) return 'risk-insignificant';

    return '';
  }

  /**
   * Genera el reporte de la tarea
   */
  async generateReport(): Promise<void> {
    const tareaKey = this.tareaDetail()?.key;
    if (!tareaKey) return;

    this.approvalFlowService.generarReporte(tareaKey).subscribe({
      next: (response: any) => {
        if (response?.success) {
          const message = response.data?.[0]?.atts?.[1]?.value || 'Reporte generado correctamente';
          this.alertService.success(message);
        } else {
          this.alertService.error('No se pudo generar el reporte');
        }
      },
      error: () => {
        this.alertService.error('Error al generar reporte');
      }
    });
  }

  /**
   * Abre el dashboard (en desarrollo)
   */
  openDashboard(): void {
    this.alertService.toast('success', 'Dashboard en desarrollo');
  }

  /**
   * Determina el título del indicador de estado
   * Igual que en el legacy
   */
  getStatusTooltip(dimension: DimensionWithRisk): string {
    if (dimension.pendingDelete === 'Y') {
      return 'Pendiente Inactivación (Eliminación)';
    }

    switch (dimension.estado) {
      case '001':
      case '002':
      case '003':
      case '006':
        return 'Ítem pendiente por enviar a validar';
      case '004':
        return 'Ítem pendiente de validar';
      case '007':
        return 'Ítem pendiente por aprobar';
      case '000':
        return 'Registro';
      default:
        return '';
    }
  }

  /**
   * Determina el indicador visual del estado
   * Igual que en el legacy
   */
  getStatusIndicator(dimension: DimensionWithRisk): string {
    if (dimension.estado === '008' && dimension.pendingDelete === 'N') {
      return '';
    }

    if (dimension.estado === '000') {
      return '(R)';
    }

    if (dimension.pendingDelete === 'Y') {
      if (dimension.estado === '004') return '(**)';
      if (dimension.estado === '007') return '(***)';
      return '(*)';
    }

    if (dimension.estado === '001' || dimension.estado === '002' ||
        dimension.estado === '003' || dimension.estado === '006') {
      return '(*)';
    }

    if (dimension.estado === '004') return '(**)';
    if (dimension.estado === '007') return '(***)';

    return '';
  }


  onTabChange(index: number): void {

    switch(index){

      case 1 :
         const stdJobComponent = this.stdJobTab();
      if (stdJobComponent) {
        stdJobComponent.loadData();
      }
        break
      case 2 :
            const detalleComponent = this.detalleTab();
        if (detalleComponent) {
          detalleComponent.loadData();
        }
        break
    }


  }
}
