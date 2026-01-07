// src/app/features/risk-hierarchy/rkd/rkd.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HierarchyService } from '../../../layout/rkmain/services/hierarchy.service';
import { AlertService } from '../../../shared/services/alert.service';
import { ApprovalFlowService } from '../../../layout/rkmain/services/approval-flow.service';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';

interface DimensionDetail {
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
  dimensionId: string;
  dimensionDescripcion: string;
  dimensionDescripcionExt: string;
  dimensionIdClasificacion: string;
  dimensionDescClasificacion: string;
  dimensionRiesgoPuroDesc: string;
  dimensionRiesgoResidualDesc: string;
  dimensionStatus: string;
  dimensionVersion: string;
  dimensionNivel: string;
  dimensionAtributos: string;
  dimensionStatusId: string;
  key: string;
  statusParent: string;
  canAdd: string;
  canModify: string;
}

export interface RiesgoWithCategories {
  offset: string;
  id: string;
  descripcion: string;
  // Seguridad y Salud
  riesgoRiesgoPuroS: string;
  riesgoRiesgoResidualS: string;
  // Medio Ambiente
  riesgoRiesgoPuroM: string;
  riesgoRiesgoResidualM: string;
  // Operacional (Negocio)
  riesgoRiesgoPuroN: string;
  riesgoRiesgoResidualN: string;
  estado: string;
  orderItem: string;
  pendingDelete: string;
  canNavigate: boolean;
}

@Component({
  selector: 'app-rkd',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './rkd.component.html',
  styleUrl: './rkd.component.scss'
})
export class RkdComponent implements OnInit {
  // Parámetros de ruta (6 niveles)
  areaId = signal<string>('');
  procesoId = signal<string>('');
  subprocesoId = signal<string>('');
  actividadId = signal<string>('');
  tareaId = signal<string>('');
  dimensionId = signal<string>('');

  // Estado del componente
  dimensionDetail = signal<DimensionDetail | null>(null);
  riesgos = signal<RiesgoWithCategories[]>([]);
  isLoadingDimension = signal(false);
  isLoadingRiesgos = signal(false);

  // Permisos y flujo
  userProfile = signal<string>('');
  currentFlowButton = signal<string>('');
  showButtons = signal<boolean>(false);

  private destroy$ = new Subject<void>();

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
        const dimensionId = params['dimensionId'];

        if (areaId && procesoId && subprocesoId && actividadId && tareaId && dimensionId) {
          this.areaId.set(areaId);
          this.procesoId.set(procesoId);
          this.subprocesoId.set(subprocesoId);
          this.actividadId.set(actividadId);
          this.tareaId.set(tareaId);
          this.dimensionId.set(dimensionId);
          this.loadData(areaId, procesoId, subprocesoId, actividadId, tareaId, dimensionId);
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

  private async loadData(
    areaId: string,
    procesoId: string,
    subprocesoId: string,
    actividadId: string,
    tareaId: string,
    dimensionId: string
  ): Promise<void> {
    this.dimensionDetail.set(null);
    this.riesgos.set([]);

    await this.loadDimensionDetail(areaId, procesoId, subprocesoId, actividadId, tareaId, dimensionId);
    await this.loadRiesgosWithCategories(areaId, procesoId, subprocesoId, actividadId, tareaId, dimensionId);
    this.determineFlowButton();
  }

  /**
   * Carga el detalle de la dimensión
   * MAPEO BASADO EN RKD.json:
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
   * atts[11]: dimensionId
   * atts[12]: dimensiondescripcion
   * atts[13]: dimensiondescripcionExt
   * atts[14]: dimensionIdClasificacion
   * atts[15]: dimensionDescClasificacion
   * atts[16]: dimensionRiesgoPuroDesc
   * atts[17]: dimensionRiesgoResidualDesc
   * atts[18]: dimensionStatus
   * atts[19]: dimensionVersion
   * atts[20]: dimensionNivel
   * atts[21]: dimensionAtributos
   * atts[22]: dimensionStatusId
   * atts[23]: key
   * atts[24]: statusParent
   * atts[25]: CanAdd
   * atts[26]: CanModify
   */
  private async loadDimensionDetail(
    areaId: string,
    procesoId: string,
    subprocesoId: string,
    actividadId: string,
    tareaId: string,
    dimensionId: string
  ): Promise<void> {
    this.isLoadingDimension.set(true);

    try {
      const response = await firstValueFrom(
        this.hierarchyService.getNodeDetail(6, [areaId, procesoId, subprocesoId, actividadId, tareaId, dimensionId])
      );

      if (response?.success && response.data?.[0]) {
        const atts = response.data[0].atts;

        // Validar que sea el registro principal (offset = '0')
        if (atts[0]?.value === '0') {
          this.dimensionDetail.set({
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
            dimensionId: atts[11]?.value || '',
            dimensionDescripcion: atts[12]?.value || '',
            dimensionDescripcionExt: atts[13]?.value || '',
            dimensionIdClasificacion: atts[14]?.value || '',
            dimensionDescClasificacion: atts[15]?.value || '',
            dimensionRiesgoPuroDesc: atts[16]?.value || '',
            dimensionRiesgoResidualDesc: atts[17]?.value || '',
            dimensionStatus: atts[18]?.value || '',
            dimensionVersion: atts[19]?.value || '',
            dimensionNivel: atts[20]?.value || '',
            dimensionAtributos: atts[21]?.value || '',
            dimensionStatusId: atts[22]?.value || '',
            key: atts[23]?.value || '',
            statusParent: atts[24]?.value || '',
            canAdd: atts[17]?.value === 'true' ? 'Y' : 'N',
            canModify: atts[18]?.value === 'true' ? 'Y' : 'N'
          });

          // Guardar en localStorage
          localStorage.setItem('keySelected', atts[23]?.value || '');
          localStorage.setItem('versionSelected', atts[19]?.value || '');
          localStorage.setItem('statusSelected', atts[22]?.value || '');

          console.log('✅ Dimensión cargada:', this.dimensionDetail());
        }
      }
    } catch (error) {
      console.error('❌ Error loading dimension:', error);
      this.alertService.error('Error al cargar la dimensión');
    } finally {
      this.isLoadingDimension.set(false);
    }
  }

  /**
   * Carga los riesgos con sus categorías (Seguridad, Medio Ambiente, Operacional)
   * MAPEO BASADO EN RKD_.json:
   * atts[0]: offset
   * atts[1]: id (riesgo ID)
   * atts[2]: descripcion
   * atts[3]: riesgoRiesgoPuroN (Operacional - Puro)
   * atts[4]: riesgoRiesgoPuroM (Medio Ambiente - Puro)
   * atts[5]: riesgoRiesgoPuroS (Seguridad - Puro)
   * atts[6]: riesgoRiesgoResidualN (Operacional - Residual)
   * atts[7]: riesgoRiesgoResidualM (Medio Ambiente - Residual)
   * atts[8]: riesgoRiesgoResidualS (Seguridad - Residual)
   * atts[9]: estado
   * atts[10]: order_item
   * atts[11]: pendingDelete
   */
  private async loadRiesgosWithCategories(
    areaId: string,
    procesoId: string,
    subprocesoId: string,
    actividadId: string,
    tareaId: string,
    dimensionId: string
  ): Promise<void> {
    this.isLoadingRiesgos.set(true);

    try {
      const key = areaId + procesoId + subprocesoId + actividadId + tareaId + dimensionId;
      const response = await firstValueFrom(
        this.hierarchyService.getNodeChildren(key)
      );

      if (response?.success && response.data) {
        const riesgosList: RiesgoWithCategories[] = [];

        response.data.forEach((element: any) => {
          const atts = element.atts;

          // Filtrar: excluir offset='0'
          if (atts[0]?.value !== '0') {
            riesgosList.push({
              offset: atts[0]?.value || '',
              id: atts[1]?.value?.trim() || '',
              descripcion: atts[2]?.value || '',
              riesgoRiesgoPuroN: atts[3]?.value || '',
              riesgoRiesgoPuroM: atts[4]?.value || '',
              riesgoRiesgoPuroS: atts[5]?.value || '',
              riesgoRiesgoResidualN: atts[6]?.value || '',
              riesgoRiesgoResidualM: atts[7]?.value || '',
              riesgoRiesgoResidualS: atts[8]?.value || '',
              estado: atts[9]?.value || '',
              orderItem: atts[10]?.value || '',
              pendingDelete: atts[11]?.value || 'N',
              canNavigate: true // Los riesgos navegan a RKR
            });
          }
        });

        this.riesgos.set(riesgosList);
        console.log('✅ Riesgos cargados:', riesgosList.length);
      }
    } catch (error) {
      console.error('❌ Error loading riesgos:', error);
      this.alertService.error('Error al cargar riesgos');
    } finally {
      this.isLoadingRiesgos.set(false);
    }
  }

  /**
   * Determina qué botón del flujo mostrar
   */
  private determineFlowButton(): void {
    const dimension = this.dimensionDetail();
    const allow = localStorage.getItem('allow') || '';

    if (!dimension || !allow) {
      this.currentFlowButton.set('');
      this.showButtons.set(false);
      return;
    }

    const parameters = [allow, dimension.dimensionStatusId, dimension.canAdd];
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

      const status = this.dimensionDetail()?.dimensionStatusId;
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
        this.loadData(
          this.areaId(),
          this.procesoId(),
          this.subprocesoId(),
          this.actividadId(),
          this.tareaId(),
          this.dimensionId()
        );
      } else {
        this.alertService.error(response?.message || 'Error en el flujo de aprobación');
      }
    } catch (error: any) {
      this.alertService.error(error.message || 'Error en el flujo de aprobación');
    }
  }

  private getTituloFlujo(status: string, isReject: boolean): string {
    if (isReject) return 'Rechazo en Dimensión';
    return status === '004' ? 'Envio a Validacion en Dimensión' : 'Aprobacion en Dimensión';
  }

  private async getPendingValidationUuid(status: string): Promise<string> {
    const key = this.areaId() + this.procesoId() + this.subprocesoId() +
                this.actividadId() + this.tareaId() + this.dimensionId();
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

  goToArea(): void {
    const dimension = this.dimensionDetail();
    if (!dimension?.areaId) return;
    this.router.navigate(['/rkmain/rka', dimension.areaId]);
  }

  goToProceso(): void {
    const dimension = this.dimensionDetail();
    if (!dimension?.areaId || !dimension?.procesoId) return;
    this.router.navigate(['/rkmain/rkp', dimension.areaId, dimension.procesoId]);
  }

  goToSubproceso(): void {
    const dimension = this.dimensionDetail();
    if (!dimension?.areaId || !dimension?.procesoId || !dimension?.subprocesoId) return;
    this.router.navigate(['/rkmain/rks', dimension.areaId, dimension.procesoId, dimension.subprocesoId]);
  }

  goToActividad(): void {
    const dimension = this.dimensionDetail();
    if (!dimension?.areaId || !dimension?.procesoId || !dimension?.subprocesoId || !dimension?.actividadId) return;
    this.router.navigate(['/rkmain/rkc', dimension.areaId, dimension.procesoId, dimension.subprocesoId, dimension.actividadId]);
  }

  goToTarea(): void {
    const dimension = this.dimensionDetail();
    if (!dimension?.areaId || !dimension?.procesoId || !dimension?.subprocesoId ||
        !dimension?.actividadId || !dimension?.tareaId) return;
    this.router.navigate(['/rkmain/rkt', dimension.areaId, dimension.procesoId, dimension.subprocesoId, dimension.actividadId, dimension.tareaId]);
  }

  /**
   * Navega al riesgo (RKR - Nivel 7)
   */
  goToRiesgo(riesgo: RiesgoWithCategories): void {
    console.log(riesgo.id);
     if (riesgo.canNavigate) {
      this.router.navigate([
        '/rkmain/rkr',
        this.areaId(),
        this.procesoId(),
        this.subprocesoId(),
        this.actividadId(),
        this.tareaId(),
        this.dimensionId(),
        riesgo.id
      ]);
    }

  }

  // ============================================
  // UTILIDADES
  // ============================================

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

  async generateReport(): Promise<void> {
    const dimensionKey = this.dimensionDetail()?.key;
    if (!dimensionKey) return;

    this.approvalFlowService.generarReporte(dimensionKey).subscribe({
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

  openDashboard(): void {
    this.alertService.toast('success', 'Dashboard en desarrollo');
  }

  getStatusTooltip(riesgo: RiesgoWithCategories): string {
    if (riesgo.pendingDelete === 'Y') {
      return 'Pendiente Inactivación (Eliminación)';
    }

    switch (riesgo.estado) {
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

  getStatusIndicator(riesgo: RiesgoWithCategories): string {
    if (riesgo.estado === '008' && riesgo.pendingDelete === 'N') {
      return '';
    }

    if (riesgo.estado === '000') {
      return '(R)';
    }

    if (riesgo.pendingDelete === 'Y') {
      if (riesgo.estado === '004') return '(**)';
      if (riesgo.estado === '007') return '(***)';
      return '(*)';
    }

    if (riesgo.estado === '001' || riesgo.estado === '002' ||
        riesgo.estado === '003' || riesgo.estado === '006') {
      return '(*)';
    }

    if (riesgo.estado === '004') return '(**)';
    if (riesgo.estado === '007') return '(***)';

    return '';
  }
}
