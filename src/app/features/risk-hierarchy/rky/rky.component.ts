// src/app/features/risk-hierarchy/rky/rky.component.ts
import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
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
import { MatDialog } from '@angular/material/dialog';
import { RkycblandoTabComponent } from './rkycblando/rkycblando-tab.component';



interface ConsecuenciaDetail {
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
  consecuenciaId: string;
  consecuenciaDescripcion: string;
  consecuenciaDescripcionExt: string;

  // Evaluación de riesgo puro
  consecuenciaProbabilidadPura: string;
  consecuenciaProbabilidadPuraDesc: string;
  consecuenciaSeveridadPura: string;
  consecuenciaSeveridadPuraDesc: string;
  consecuenciaMRPuro: string;
  consecuenciaMRPuroDesc: string;
  consecuenciaCriticidadPura: string;
  consecuenciaColorPuro: string;

  // Evaluación de riesgo residual
  consecuenciaProbabilidadResidual: string;
  consecuenciaProbabilidadResidualDesc: string;
  consecuenciaSeveridadResidual: string;
  consecuenciaSeveridadResidualDesc: string;
  consecuenciaMRResidual: string;
  consecuenciaMRResidualDesc: string;
  consecuenciaCriticidadResidual: string;
  consecuenciaColorResidual: string;

  // Riesgo general
  consecuenciaRiesgoPuroDesc: string;
  consecuenciaRiesgoResidualDesc: string;

  // Metadatos
  consecuenciaStatus: string;
  consecuenciaStatusId: string;
  consecuenciaVersion: string;
  consecuenciaNivel: string;
  consecuenciaAtributos: string;
  key: string;
  statusParent: string;
  canAdd: string;
  canModify: string;
}

@Component({
  selector: 'app-rky',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    RkycblandoTabComponent
  ],
  templateUrl: './rky.component.html',
  styleUrl: './rky.component.scss'
})
export class RkyComponent implements OnInit {
  // Parámetros de ruta (8 niveles)
  areaId = signal<string>('');
  procesoId = signal<string>('');
  subprocesoId = signal<string>('');
  actividadId = signal<string>('');
  tareaId = signal<string>('');
  dimensionId = signal<string>('');
  riesgoId = signal<string>('');
  consecuenciaId = signal<string>('');

  // ViewChild para el tab de controles blandos
  private cblandoTab = viewChild<RkycblandoTabComponent>('cblandoTab');

  // Estado del componente
  consecuenciaDetail = signal<ConsecuenciaDetail | null>(null);
  isLoadingConsecuencia = signal(false);

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
        const consecuenciaId = params['consecuenciaId'];

        if (areaId && procesoId && subprocesoId && actividadId && tareaId && dimensionId && riesgoId && consecuenciaId) {
          this.areaId.set(areaId);
          this.procesoId.set(procesoId);
          this.subprocesoId.set(subprocesoId);
          this.actividadId.set(actividadId);
          this.tareaId.set(tareaId);
          this.dimensionId.set(dimensionId);
          this.riesgoId.set(riesgoId);
          this.consecuenciaId.set(consecuenciaId);
          this.loadData(areaId, procesoId, subprocesoId, actividadId, tareaId, dimensionId, riesgoId, consecuenciaId);
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
    riesgoId: string,
    consecuenciaId: string
  ): Promise<void> {
    this.consecuenciaDetail.set(null);
    await this.loadConsecuenciaDetail(areaId, procesoId, subprocesoId, actividadId, tareaId, dimensionId, riesgoId, consecuenciaId);
    this.determineFlowButton();
  }

  /**
   * Carga el detalle de la consecuencia
   * MAPEO BASADO EN RKY.json:
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
   * atts[15]: consecuenciaId
   * atts[16]: consecuenciaDescripcion
   * atts[17]: consecuenciaDescripcionExt
   * atts[18]: consecuenciaIdProbRP (probabilidad pura)
   * atts[19]: consecuenciaDescPrbRP (descripción probabilidad pura)
   * atts[20]: consecuenciaIdSevRP (severidad pura)
   * atts[21]: consecuenciaDescSevRP (descripción severidad pura)
   * atts[22]: consecuenciaIdNivelRP (nivel/criticidad pura)
   * atts[23]: consecuenciaDescNivelRP (color puro)
   * atts[24]: consecuenciaIdProbRR (probabilidad residual)
   * atts[25]: consecuenciaDescPrbRR (descripción probabilidad residual)
   * atts[26]: consecuenciaIdSevRR (severidad residual)
   * atts[27]: consecuenciaDescSevRR (descripción severidad residual)
   * atts[28]: consecuenciaIdNivelRR (nivel/criticidad residual)
   * atts[29]: consecuenciaDescNivelRR (color residual)
   * atts[30]: consecuenciaRiesgoPuroDesc
   * atts[31]: consecuenciaRiesgoResidualDesc
   * atts[32]: consecuenciaStatus
   * atts[33]: consecuenciaVersion
   * atts[34]: consecuenciaNivel
   * atts[35]: consecuenciaAtributos
   * atts[36]: consecuenciaStatusId
   * atts[37]: consecuenciaIdMRRP (MR puro)
   * atts[38]: consecuenciaDescMRRP (descripción MR puro)
   * atts[39]: consecuenciaIdMRRR (MR residual)
   * atts[40]: consecuenciaDescMRRR (descripción MR residual)
   * atts[41]: key
   * atts[42]: statusParent
   * atts[43]: CanAdd
   * atts[44]: CanModify
   * atts[45]: Creador
   */
  private async loadConsecuenciaDetail(
    areaId: string,
    procesoId: string,
    subprocesoId: string,
    actividadId: string,
    tareaId: string,
    dimensionId: string,
    riesgoId: string,
    consecuenciaId: string
  ): Promise<void> {
    this.isLoadingConsecuencia.set(true);

    try {
      const response = await firstValueFrom(
        this.hierarchyService.getNodeDetail(8, [areaId, procesoId, subprocesoId, actividadId, tareaId, dimensionId, riesgoId, consecuenciaId])
      );

      if (response?.success && response.data?.[0]) {
        const atts = response.data[0].atts;

        // Validar que sea el registro principal (offset = '0')
        if (atts[0]?.value === '0') {
          this.consecuenciaDetail.set({
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
            consecuenciaId: atts[15]?.value || '',
            consecuenciaDescripcion: atts[16]?.value || '',
            consecuenciaDescripcionExt: atts[17]?.value || '',

            // Riesgo puro
            consecuenciaProbabilidadPura: atts[18]?.value || '',
            consecuenciaProbabilidadPuraDesc: atts[19]?.value || '',
            consecuenciaSeveridadPura: atts[20]?.value || '',
            consecuenciaSeveridadPuraDesc: atts[21]?.value || '',
            consecuenciaMRPuro: atts[37]?.value || '',
            consecuenciaMRPuroDesc: atts[38]?.value || '',
            consecuenciaCriticidadPura: atts[22]?.value || '',
            consecuenciaColorPuro: atts[23]?.value || '',

            // Riesgo residual
            consecuenciaProbabilidadResidual: atts[24]?.value || '',
            consecuenciaProbabilidadResidualDesc: atts[25]?.value || '',
            consecuenciaSeveridadResidual: atts[26]?.value || '',
            consecuenciaSeveridadResidualDesc: atts[27]?.value || '',
            consecuenciaMRResidual: atts[39]?.value || '',
            consecuenciaMRResidualDesc: atts[40]?.value || '',
            consecuenciaCriticidadResidual: atts[28]?.value || '',
            consecuenciaColorResidual: atts[29]?.value || '',

            // Riesgo general
            consecuenciaRiesgoPuroDesc: atts[30]?.value || '',
            consecuenciaRiesgoResidualDesc: atts[31]?.value || '',

            // Metadatos
            consecuenciaStatus: atts[32]?.value || '',
            consecuenciaVersion: atts[33]?.value || '',
            consecuenciaNivel: atts[34]?.value || '',
            consecuenciaAtributos: atts[35]?.value || '',
            consecuenciaStatusId: atts[36]?.value || '',
            key: atts[41]?.value || '',
            statusParent: atts[42]?.value || '',
            canAdd: atts[43]?.value || 'N',
            canModify: atts[44]?.value || 'N'
          });

          // Guardar en localStorage
          localStorage.setItem('keySelected', atts[41]?.value || '');
          localStorage.setItem('versionSelected', atts[33]?.value || '');
          localStorage.setItem('statusSelected', atts[36]?.value || '');

          console.log('✅ Consecuencia cargada:', this.consecuenciaDetail());
        }
      }
    } catch (error) {
      console.error('❌ Error loading consecuencia:', error);
      this.alertService.error('Error al cargar la consecuencia');
    } finally {
      this.isLoadingConsecuencia.set(false);
    }
  }

  /**
   * Determina qué botón del flujo mostrar
   */
  private determineFlowButton(): void {
    const consecuencia = this.consecuenciaDetail();
    const allow = localStorage.getItem('allow') || '';

    if (!consecuencia || !allow) {
      this.currentFlowButton.set('');
      this.showButtons.set(false);
      return;
    }

    const parameters = [allow, consecuencia.consecuenciaStatusId, consecuencia.canAdd];
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

      const status = this.consecuenciaDetail()?.consecuenciaStatusId;
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
          this.riesgoId(),
          this.consecuenciaId()
        );
      } else {
        this.alertService.error(response?.message || 'Error en el flujo de aprobación');
      }
    } catch (error: any) {
      this.alertService.error(error.message || 'Error en el flujo de aprobación');
    }
  }

  private getTituloFlujo(status: string, isReject: boolean): string {
    if (isReject) return 'Rechazo en Consecuencia';
    return status === '004' ? 'Envio a Validacion en Consecuencia' : 'Aprobacion en Consecuencia';
  }

  private async getPendingValidationUuid(status: string): Promise<string> {
    const key = this.areaId() + this.procesoId() + this.subprocesoId() +
                this.actividadId() + this.tareaId() + this.dimensionId() +
                this.riesgoId() + this.consecuenciaId();
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
    const consecuencia = this.consecuenciaDetail();
    if (!consecuencia?.areaId) return;
    this.router.navigate(['/rkmain/rka', consecuencia.areaId]);
  }

  goToProceso(): void {
    const consecuencia = this.consecuenciaDetail();
    if (!consecuencia?.areaId || !consecuencia?.procesoId) return;
    this.router.navigate(['/rkmain/rkp', consecuencia.areaId, consecuencia.procesoId]);
  }

  goToSubproceso(): void {
    const consecuencia = this.consecuenciaDetail();
    if (!consecuencia?.areaId || !consecuencia?.procesoId || !consecuencia?.subprocesoId) return;
    this.router.navigate(['/rkmain/rks', consecuencia.areaId, consecuencia.procesoId, consecuencia.subprocesoId]);
  }

  goToActividad(): void {
    const consecuencia = this.consecuenciaDetail();
    if (!consecuencia?.areaId || !consecuencia?.procesoId || !consecuencia?.subprocesoId || !consecuencia?.actividadId) return;
    this.router.navigate(['/rkmain/rkc', consecuencia.areaId, consecuencia.procesoId, consecuencia.subprocesoId, consecuencia.actividadId]);
  }

  goToTarea(): void {
    const consecuencia = this.consecuenciaDetail();
    if (!consecuencia?.areaId || !consecuencia?.procesoId || !consecuencia?.subprocesoId ||
        !consecuencia?.actividadId || !consecuencia?.tareaId) return;
    this.router.navigate(['/rkmain/rkt', consecuencia.areaId, consecuencia.procesoId, consecuencia.subprocesoId, consecuencia.actividadId, consecuencia.tareaId]);
  }

  goToDimension(): void {
    const consecuencia = this.consecuenciaDetail();
    if (!consecuencia?.areaId || !consecuencia?.procesoId || !consecuencia?.subprocesoId ||
        !consecuencia?.actividadId || !consecuencia?.tareaId || !consecuencia?.dimensionId) return;
    this.router.navigate(['/rkmain/rkd', consecuencia.areaId, consecuencia.procesoId, consecuencia.subprocesoId,
                          consecuencia.actividadId, consecuencia.tareaId, consecuencia.dimensionId]);
  }

  goToRiesgo(): void {
    const consecuencia = this.consecuenciaDetail();
    if (!consecuencia?.areaId || !consecuencia?.procesoId || !consecuencia?.subprocesoId ||
        !consecuencia?.actividadId || !consecuencia?.tareaId || !consecuencia?.dimensionId ||
        !consecuencia?.riesgoId) return;
    this.router.navigate(['/rkmain/rkr', consecuencia.areaId, consecuencia.procesoId, consecuencia.subprocesoId,
                          consecuencia.actividadId, consecuencia.tareaId, consecuencia.dimensionId, consecuencia.riesgoId]);
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
    const consecuenciaKey = this.consecuenciaDetail()?.key;
    if (!consecuenciaKey) return;

    this.approvalFlowService.generarReporte(consecuenciaKey).subscribe({
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

  onTabChange(index: number): void {
    switch (index) {
      case 1:
        // Tab de Controles Blandos
        const cblandoComponent = this.cblandoTab();
        if (cblandoComponent) {
          cblandoComponent.initTab();
        }
        break;
      default:
        break;
    }
  }
}
