// src/app/features/risk-hierarchy/rkr/rkr.component.ts
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

interface RiesgoDetail {
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
  riesgoId: string;
  riesgoDescripcion: string;
  riesgoDescripcionExt: string;
  riesgoIdRama: string;
  riesgoDescRama: string;
  riesgoIdFamilia: string;
  riesgoDescFamilia: string;
  riesgoRiesgoPuroDesc: string;
  riesgoRiesgoResidualDesc: string;
  riesgoStatus: string;
  riesgoVersion: string;
  riesgoNivel: string;
  riesgoAtributos: string;
  riesgoStatusId: string;
  key: string;
  statusParent: string;
  canAdd: string;
  canModify: string;
}

export interface ConsecuenciaWithCategories {
  offset: string;
  id: string;
  descripcion: string;
  // Seguridad y Salud
  consecuenciaRiesgoPuroS: string;
  consecuenciaRiesgoResidualS: string;
  // Medio Ambiente
  consecuenciaRiesgoPuroM: string;
  consecuenciaRiesgoResidualM: string;
  // Operacional (Negocio)
  consecuenciaRiesgoPuroN: string;
  consecuenciaRiesgoResidualN: string;
  estado: string;
  orderItem: string;
  pendingDelete: string;
  canNavigate: boolean; // Las consecuencias NO navegan (nivel final)
}

@Component({
  selector: 'app-rkr',
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
  templateUrl: './rkr.component.html',
  styleUrl: './rkr.component.scss'
})
export class RkrComponent implements OnInit {
  // Parámetros de ruta (7 niveles)
  areaId = signal<string>('');
  procesoId = signal<string>('');
  subprocesoId = signal<string>('');
  actividadId = signal<string>('');
  tareaId = signal<string>('');
  dimensionId = signal<string>('');
  riesgoId = signal<string>('');

  // Estado del componente
  riesgoDetail = signal<RiesgoDetail | null>(null);
  consecuencias = signal<ConsecuenciaWithCategories[]>([]);
  isLoadingRiesgo = signal(false);
  isLoadingConsecuencias = signal(false);

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
        const riesgoId = params['riesgoId'];

        if (areaId && procesoId && subprocesoId && actividadId && tareaId && dimensionId && riesgoId) {
          this.areaId.set(areaId);
          this.procesoId.set(procesoId);
          this.subprocesoId.set(subprocesoId);
          this.actividadId.set(actividadId);
          this.tareaId.set(tareaId);
          this.dimensionId.set(dimensionId);
          this.riesgoId.set(riesgoId);
          this.loadData(areaId, procesoId, subprocesoId, actividadId, tareaId, dimensionId, riesgoId);
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
    dimensionId: string,
    riesgoId: string
  ): Promise<void> {
    this.riesgoDetail.set(null);
    this.consecuencias.set([]);

    await this.loadRiesgoDetail(areaId, procesoId, subprocesoId, actividadId, tareaId, dimensionId, riesgoId);
    await this.loadConsecuenciasWithCategories(areaId, procesoId, subprocesoId, actividadId, tareaId, dimensionId, riesgoId);
    this.determineFlowButton();
  }

  /**
   * Carga el detalle del riesgo
   * MAPEO BASADO EN rkr.json:
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
   * atts[12]: dimensionDescripcion
   * atts[13]: riesgoId
   * atts[14]: riesgoDescripcion
   * atts[15]: riesgoDescripcionExt
   * atts[16]: riesgoIdRama
   * atts[17]: riesgoDescRama
   * atts[18]: riesgoIdFamilia
   * atts[19]: riesgoDescFamilia
   * atts[20]: riesgoRiesgoPuroDesc
   * atts[21]: riesgoRiesgoResidualDesc
   * atts[22]: riesgoStatus
   * atts[23]: riesgoVersion
   * atts[24]: riesgoNivel
   * atts[25]: riesgoAtributos
   * atts[26]: riesgoStatusId
   * atts[27]: key
   * atts[28]: statusParent
   * atts[29]: CanAdd
   * atts[30]: CanModify
   */
  private async loadRiesgoDetail(
    areaId: string,
    procesoId: string,
    subprocesoId: string,
    actividadId: string,
    tareaId: string,
    dimensionId: string,
    riesgoId: string
  ): Promise<void> {
    this.isLoadingRiesgo.set(true);

    try {
      const response = await firstValueFrom(
        this.hierarchyService.getNodeDetail(7, [areaId, procesoId, subprocesoId, actividadId, tareaId, dimensionId, riesgoId])
      );

      if (response?.success && response.data?.[0]) {
        const atts = response.data[0].atts;

        // Validar que sea el registro principal (offset = '0')
        if (atts[0]?.value === '0') {
          this.riesgoDetail.set({
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
            riesgoId: atts[13]?.value || '',
            riesgoDescripcion: atts[14]?.value || '',
            riesgoDescripcionExt: atts[15]?.value || '',
            riesgoIdRama: atts[16]?.value || '',
            riesgoDescRama: atts[17]?.value || '',
            riesgoIdFamilia: atts[18]?.value || '',
            riesgoDescFamilia: atts[19]?.value || '',
            riesgoRiesgoPuroDesc: atts[20]?.value || '',
            riesgoRiesgoResidualDesc: atts[21]?.value || '',
            riesgoStatus: atts[22]?.value || '',
            riesgoVersion: atts[23]?.value || '',
            riesgoNivel: atts[24]?.value || '',
            riesgoAtributos: atts[25]?.value || '',
            riesgoStatusId: atts[26]?.value || '',
            key: atts[27]?.value || '',
            statusParent: atts[28]?.value || '',
            canAdd: atts[17]?.value === 'true' ? 'Y' : 'N',
            canModify: atts[18]?.value === 'true' ? 'Y' : 'N'
          });

          // Guardar en localStorage
          localStorage.setItem('keySelected', atts[27]?.value || '');
          localStorage.setItem('versionSelected', atts[23]?.value || '');
          localStorage.setItem('statusSelected', atts[26]?.value || '');

          console.log('✅ Riesgo cargado:', this.riesgoDetail());
        }
      }
    } catch (error) {
      console.error('❌ Error loading riesgo:', error);
      this.alertService.error('Error al cargar el riesgo');
    } finally {
      this.isLoadingRiesgo.set(false);
    }
  }

  /**
   * Carga las consecuencias con sus categorías (Seguridad, Medio Ambiente, Operacional)
   * MAPEO BASADO EN RKR_.json:
   * atts[0]: offset
   * atts[1]: id (consecuencia ID)
   * atts[2]: descripcion
   * atts[3]: consecuenciaRiesgoPuroN (Operacional - Puro)
   * atts[4]: consecuenciaRiesgoPuroM (Medio Ambiente - Puro)
   * atts[5]: consecuenciaRiesgoPuroS (Seguridad - Puro)
   * atts[6]: consecuenciaRiesgoResidualN (Operacional - Residual)
   * atts[7]: consecuenciaRiesgoResidualM (Medio Ambiente - Residual)
   * atts[8]: consecuenciaRiesgoResidualS (Seguridad - Residual)
   * atts[9]: estado
   * atts[10]: order_item
   * atts[11]: pendingDelete
   */
  private async loadConsecuenciasWithCategories(
    areaId: string,
    procesoId: string,
    subprocesoId: string,
    actividadId: string,
    tareaId: string,
    dimensionId: string,
    riesgoId: string
  ): Promise<void> {
    this.isLoadingConsecuencias.set(true);

    try {
      const key = areaId + procesoId + subprocesoId + actividadId + tareaId + dimensionId + riesgoId;
      const response = await firstValueFrom(
        this.hierarchyService.getNodeChildren(key)
      );

      if (response?.success && response.data) {
        const consecuenciasList: ConsecuenciaWithCategories[] = [];

        response.data.forEach((element: any) => {
          const atts = element.atts;

          // Filtrar: excluir offset='0' y estado='010' (archivados)
          if (atts[0]?.value !== '0' && atts[9]?.value !== '010') {
            consecuenciasList.push({
              offset: atts[0]?.value || '',
              id: atts[1]?.value?.trim() || '',
              descripcion: atts[2]?.value || '',
              consecuenciaRiesgoPuroN: atts[3]?.value || '',
              consecuenciaRiesgoPuroM: atts[4]?.value || '',
              consecuenciaRiesgoPuroS: atts[5]?.value || '',
              consecuenciaRiesgoResidualN: atts[6]?.value || '',
              consecuenciaRiesgoResidualM: atts[7]?.value || '',
              consecuenciaRiesgoResidualS: atts[8]?.value || '',
              estado: atts[9]?.value || '',
              orderItem: atts[10]?.value || '',
              pendingDelete: atts[11]?.value || 'N',
              canNavigate: true // Las consecuencias NO navegan (nivel final)
            });
          }
        });

        this.consecuencias.set(consecuenciasList);
        console.log('✅ Consecuencias cargadas:', consecuenciasList.length);
      }
    } catch (error) {
      console.error('❌ Error loading consecuencias:', error);
      this.alertService.error('Error al cargar consecuencias');
    } finally {
      this.isLoadingConsecuencias.set(false);
    }
  }

  /**
   * Determina qué botón del flujo mostrar
   */
  private determineFlowButton(): void {
    const riesgo = this.riesgoDetail();
    const allow = localStorage.getItem('allow') || '';

    if (!riesgo || !allow) {
      this.currentFlowButton.set('');
      this.showButtons.set(false);
      return;
    }

    const parameters = [allow, riesgo.riesgoStatusId, riesgo.canAdd];
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

      const status = this.riesgoDetail()?.riesgoStatusId;
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
          this.dimensionId(),
          this.riesgoId()
        );
      } else {
        this.alertService.error(response?.message || 'Error en el flujo de aprobación');
      }
    } catch (error: any) {
      this.alertService.error(error.message || 'Error en el flujo de aprobación');
    }
  }

  private getTituloFlujo(status: string, isReject: boolean): string {
    if (isReject) return 'Rechazo en Riesgo';
    return status === '004' ? 'Envio a Validacion en Riesgo' : 'Aprobacion en Riesgo';
  }

  private async getPendingValidationUuid(status: string): Promise<string> {
    const key = this.areaId() + this.procesoId() + this.subprocesoId() +
                this.actividadId() + this.tareaId() + this.dimensionId() + this.riesgoId();
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
    const riesgo = this.riesgoDetail();
    if (!riesgo?.areaId) return;
    this.router.navigate(['/rkmain/rka', riesgo.areaId]);
  }

  goToProceso(): void {
    const riesgo = this.riesgoDetail();
    if (!riesgo?.areaId || !riesgo?.procesoId) return;
    this.router.navigate(['/rkmain/rkp', riesgo.areaId, riesgo.procesoId]);
  }

  goToSubproceso(): void {
    const riesgo = this.riesgoDetail();
    if (!riesgo?.areaId || !riesgo?.procesoId || !riesgo?.subprocesoId) return;
    this.router.navigate(['/rkmain/rks', riesgo.areaId, riesgo.procesoId, riesgo.subprocesoId]);
  }

  goToActividad(): void {
    const riesgo = this.riesgoDetail();
    if (!riesgo?.areaId || !riesgo?.procesoId || !riesgo?.subprocesoId || !riesgo?.actividadId) return;
    this.router.navigate(['/rkmain/rkc', riesgo.areaId, riesgo.procesoId, riesgo.subprocesoId, riesgo.actividadId]);
  }

  goToTarea(): void {
    const riesgo = this.riesgoDetail();
    if (!riesgo?.areaId || !riesgo?.procesoId || !riesgo?.subprocesoId ||
        !riesgo?.actividadId || !riesgo?.tareaId) return;
    this.router.navigate(['/rkmain/rkt', riesgo.areaId, riesgo.procesoId, riesgo.subprocesoId, riesgo.actividadId, riesgo.tareaId]);
  }

  goToDimension(): void {
    const riesgo = this.riesgoDetail();
    if (!riesgo?.areaId || !riesgo?.procesoId || !riesgo?.subprocesoId ||
        !riesgo?.actividadId || !riesgo?.tareaId || !riesgo?.dimensionId) return;
    this.router.navigate(['/rkmain/rkd', riesgo.areaId, riesgo.procesoId, riesgo.subprocesoId,
                          riesgo.actividadId, riesgo.tareaId, riesgo.dimensionId]);
  }

  /**
   * Click en consecuencia (NO navega - solo informativo)
   */
  onConsecuenciaClick(consecuencia: ConsecuenciaWithCategories): void {

     this.router.navigate([
        '/rkmain/rky',
        this.areaId(),
        this.procesoId(),
        this.subprocesoId(),
        this.actividadId(),
        this.tareaId(),
        this.dimensionId(),
        this.riesgoId(),
        consecuencia.id
      ]);
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
    const riesgoKey = this.riesgoDetail()?.key;
    if (!riesgoKey) return;

    this.approvalFlowService.generarReporte(riesgoKey).subscribe({
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

  getStatusTooltip(consecuencia: ConsecuenciaWithCategories): string {
    if (consecuencia.pendingDelete === 'Y') {
      return 'Pendiente Inactivación (Eliminación)';
    }

    switch (consecuencia.estado) {
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

  getStatusIndicator(consecuencia: ConsecuenciaWithCategories): string {
    if (consecuencia.estado === '008' && consecuencia.pendingDelete === 'N') {
      return '';
    }

    if (consecuencia.estado === '000') {
      return '(R)';
    }

    if (consecuencia.pendingDelete === 'Y') {
      if (consecuencia.estado === '004') return '(**)';
      if (consecuencia.estado === '007') return '(***)';
      return '(*)';
    }

    if (consecuencia.estado === '001' || consecuencia.estado === '002' ||
        consecuencia.estado === '003' || consecuencia.estado === '006') {
      return '(*)';
    }

    if (consecuencia.estado === '004') return '(**)';
    if (consecuencia.estado === '007') return '(***)';

    return '';
  }
}
