import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HierarchyService } from '../../../layout/rkmain/services/hierarchy.service';
import { AlertService } from '../../../shared/services/alert.service';
import { ApprovalFlowService } from '../../../layout/rkmain/services/approval-flow.service';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';

interface ProcesoDetail {
  offset: string;
  areaId: string;
  areaDescripcion: string;
  procesoId: string;
  procesoDescripcion: string;
  procesoDescripcionExt: string;
  procesoIdClasificacion: string;
  procesoDescClasificacion: string;
  procesoRiesgoPuro: string;
  procesoRiesgoResidual: string;
  procesoStatus: string;
  procesoVersion: string;
  procesoNivel: string;
  procesoStatusId: string;
  key: string;
  statusParent: string;
  canAdd: string;
  canModify: string;
}

export interface SubprocessWithRisk {
  offset: string;
  id: string;
  descripcion: string;
  subprocesoRiesgoPuroN: string;    // Operacional Puro
  subprocesoRiesgoPuroM: string;    // Medio Ambiente Puro
  subprocesoRiesgoPuroS: string;    // Seguridad Puro
  subprocesoRiesgoResidualN: string; // Operacional Residual
  subprocesoRiesgoResidualM: string; // Medio Ambiente Residual
  subprocesoRiesgoResidualS: string; // Seguridad Residual
  estado: string;
  pendingDelete: string;
  canNavigate: boolean;
}

@Component({
  selector: 'app-rkp',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './rkp.component.html',
  styleUrl: './rkp.component.scss'
})
export class RkpComponent implements OnInit {
  // Parámetros de ruta
  areaId = signal<string>('');
  procesoId = signal<string>('');

  // Estado del componente
  procesoDetail = signal<ProcesoDetail | null>(null);
  subprocesses = signal<SubprocessWithRisk[]>([]);
  isLoadingProceso = signal(false);
  isLoadingSubprocesses = signal(false);

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

        if (areaId && procesoId) {
          this.areaId.set(areaId);
          this.procesoId.set(procesoId);
          this.loadData(areaId, procesoId);
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

  private async loadData(areaId: string, procesoId: string): Promise<void> {
    this.procesoDetail.set(null);
    this.subprocesses.set([]);

    await this.loadProcesoDetail(areaId, procesoId);
    await this.loadSubprocessesWithRisks(areaId, procesoId);
    this.determineFlowButton();
  }

  /**
   * Carga el detalle del proceso
   * MAPEO EXACTO DEL LEGACY:
   * atts[0]: offset
   * atts[1]: areaId
   * atts[2]: areaDescripcion
   * atts[3]: procesoId
   * atts[4]: procesoDescripcion
   * atts[5]: procesoDescripcionExt
   * atts[6]: procesoIdClasificacion
   * atts[7]: procesoDescClasificacion
   * atts[8]: procesoRiesgoPuro
   * atts[9]: procesoRiesgoResidual
   * atts[10]: procesoStatus
   * atts[11]: procesoVersion
   * atts[12]: procesoNivel
   * atts[13]: procesoAtributos
   * atts[14]: procesoStatusId
   * atts[15]: key
   * atts[16]: statusParent
   * atts[17]: CanAdd
   * atts[18]: CanModify
   */
  private async loadProcesoDetail(areaId: string, procesoId: string): Promise<void> {
    this.isLoadingProceso.set(true);

    try {
      const response = await firstValueFrom(
        this.hierarchyService.getNodeDetail(2, [areaId, procesoId])
      );

      if (response?.success && response.data?.[0]) {
        const atts = response.data[0].atts;

        // Validar que sea el registro principal (offset = '0')
        if (atts[0]?.value === '0') {
          this.procesoDetail.set({
            offset: atts[0]?.value || '',
            areaId: atts[1]?.value || '',
            areaDescripcion: atts[2]?.value || '',
            procesoId: atts[3]?.value || '',
            procesoDescripcion: atts[4]?.value || '',
            procesoDescripcionExt: atts[5]?.value || '',
            procesoIdClasificacion: atts[6]?.value || '',
            procesoDescClasificacion: atts[7]?.value || '',
            procesoRiesgoPuro: atts[8]?.value || '',
            procesoRiesgoResidual: atts[9]?.value || '',
            procesoStatus: atts[10]?.value || '',
            procesoVersion: atts[11]?.value || '',
            procesoNivel: atts[12]?.value || '',
            procesoStatusId: atts[14]?.value || '',
            key: atts[15]?.value || '',
            statusParent: atts[16]?.value || '',
            canAdd: atts[17]?.value || 'N',
            canModify: atts[18]?.value || 'N'
          });

          // Guardar en localStorage (igual que el legacy)
          localStorage.setItem('keySelected', atts[15]?.value || '');
          localStorage.setItem('versionSelected', atts[11]?.value || '');
          localStorage.setItem('statusSelected', atts[14]?.value || '');

          console.log('✅ Proceso cargado:', this.procesoDetail());
        }
      }
    } catch (error) {
      console.error('❌ Error loading proceso:', error);
      this.alertService.error('Error al cargar el proceso');
    } finally {
      this.isLoadingProceso.set(false);
    }
  }

  /**
   * Carga los subprocesos con sus riesgos
   * Usa ITEM_EVALRISK_DETAIL_READ igual que el legacy
   */
  private async loadSubprocessesWithRisks(areaId: string, procesoId: string): Promise<void> {
    this.isLoadingSubprocesses.set(true);

    try {
      const key = areaId + procesoId;
      const response = await firstValueFrom(
        this.hierarchyService.getNodeChildren(key)
      );

      if (response?.success && response.data) {
        const subprocessList: SubprocessWithRisk[] = [];

        response.data.forEach((element: any) => {
          const atts = element.atts;

          // Filtrar: excluir offset='0' y estado='010' (igual que legacy)
          if (atts[0]?.value !== '0' && atts[9]?.value !== '010') {
            subprocessList.push({
              offset: atts[0]?.value || '',
              id: atts[1]?.value?.trim() || '',
              descripcion: atts[2]?.value || '',
              subprocesoRiesgoPuroN: atts[3]?.value || '',       // Operacional Puro
              subprocesoRiesgoPuroM: atts[4]?.value || '',       // Medio Ambiente Puro
              subprocesoRiesgoPuroS: atts[5]?.value || '',       // Seguridad Puro
              subprocesoRiesgoResidualN: atts[6]?.value || '',   // Operacional Residual
              subprocesoRiesgoResidualM: atts[7]?.value || '',   // Medio Ambiente Residual
              subprocesoRiesgoResidualS: atts[8]?.value || '',   // Seguridad Residual
              estado: atts[9]?.value || '',
              pendingDelete: atts[11]?.value || 'N',
              canNavigate: true
            });
          }
        });

        this.subprocesses.set(subprocessList);
        console.log('✅ Subprocesos cargados:', subprocessList.length);
      }
    } catch (error) {
      console.error('❌ Error loading subprocesses:', error);
      this.alertService.error('Error al cargar subprocesos');
    } finally {
      this.isLoadingSubprocesses.set(false);
    }
  }

  /**
   * Determina qué botón del flujo mostrar
   */
  private determineFlowButton(): void {
    const proceso = this.procesoDetail();
    const allow = localStorage.getItem('allow') || '';

    if (!proceso || !allow) {
      this.currentFlowButton.set('');
      this.showButtons.set(false);
      return;
    }

    const parameters = [allow, proceso.procesoStatusId, proceso.canAdd];
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

      const status = this.procesoDetail()?.procesoStatusId;
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
        this.loadData(this.areaId(), this.procesoId());
      } else {
        this.alertService.error(response?.message || 'Error en el flujo de aprobación');
      }
    } catch (error: any) {
      this.alertService.error(error.message || 'Error en el flujo de aprobación');
    }
  }

  private getTituloFlujo(status: string, isReject: boolean): string {
    if (isReject) return 'Rechazo en Proceso';
    return status === '004' ? 'Envio a Validacion en Proceso' : 'Aprobacion en Proceso';
  }

  private async getPendingValidationUuid(status: string): Promise<string> {
    const key = this.areaId() + this.procesoId();
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
  // UTILIDADES
  // ============================================

  /**
   * Devuelve la clase CSS para el badge/cell de riesgo
   * Igual que en RKA
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
   * Navega al AREA seleccionado (RKA)
   */
   goToArea(): void {
    const subproceso = this.procesoDetail();
    if (!subproceso?.areaId) return;

    this.router.navigate(['/rkmain/rka', subproceso.areaId]);
  }

  /**
   * Navega al subproceso seleccionado (RKS)
   */
  goToSubprocess(subprocess: SubprocessWithRisk): void {
    if (subprocess.canNavigate) {
      this.router.navigate([
        '/rkmain/rks',
        this.areaId(),
        this.procesoId(),
        subprocess.id
      ]);
    }
  }

  /**
   * Genera el reporte del proceso
   */
  async generateReport(): Promise<void> {
    const procesoKey = this.procesoDetail()?.key;
    if (!procesoKey) return;

    this.approvalFlowService.generarReporte(procesoKey).subscribe({
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
  getStatusTooltip(subprocess: SubprocessWithRisk): string {
    if (subprocess.pendingDelete === 'Y') {
      return 'Pendiente Inactivación (Eliminación)';
    }

    switch (subprocess.estado) {
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
  getStatusIndicator(subprocess: SubprocessWithRisk): string {
    if (subprocess.estado === '008' && subprocess.pendingDelete === 'N') {
      return '';
    }

    if (subprocess.estado === '000') {
      return '(R)';
    }

    if (subprocess.pendingDelete === 'Y') {
      if (subprocess.estado === '004') return '(**)';
      if (subprocess.estado === '007') return '(***)';
      return '(*)';
    }

    if (subprocess.estado === '001' || subprocess.estado === '002' ||
        subprocess.estado === '003' || subprocess.estado === '006') {
      return '(*)';
    }

    if (subprocess.estado === '004') return '(**)';
    if (subprocess.estado === '007') return '(***)';

    return '';
  }
}
