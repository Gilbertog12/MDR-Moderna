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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DashboardComponent } from '../../../shared/components/approvalFlow/dashboard/dashboard.component';

interface SubprocesoDetail {
  offset: string;
  areaId: string;
  areaDescripcion: string;
  procesoId: string;
  procesoDescripcion: string;
  subprocesoId: string;
  subprocesoDescripcion: string;
  subprocesoDescripcionExt: string;
  subprocesoIdClasificacion: string;
  subprocesoDescClasificacion: string;
  subprocesoRiesgoPuroDesc: string;
  subprocesoRiesgoResidualDesc: string;
  subprocesoStatus: string;
  subprocesoVersion: string;
  subprocesoNivel: string;
  subprocesoStatusId: string;
  key: string;
  statusParent: string;
  canAdd: string;
  canModify: string;
}

export interface ActividadWithRisk {
  offset: string;
  id: string;
  descripcion: string;
  actividadRiesgoPuroN: string;    // Operacional Puro
  actividadRiesgoPuroM: string;    // Medio Ambiente Puro
  actividadRiesgoPuroS: string;    // Seguridad Puro
  actividadRiesgoResidualN: string; // Operacional Residual
  actividadRiesgoResidualM: string; // Medio Ambiente Residual
  actividadRiesgoResidualS: string; // Seguridad Residual
  estado: string;
  pendingDelete: string;
  canNavigate: boolean;
}

@Component({
  selector: 'app-rks',
  imports: [
   CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './rks.component.html',
  styleUrl: './rks.component.scss'
})
export class RksComponent {
  // Parámetros de ruta
  areaId = signal<string>('');
  procesoId = signal<string>('');
  subprocesoId = signal<string>('');

  // Estado del componente
  subprocesoDetail = signal<SubprocesoDetail | null>(null);
  actividades = signal<ActividadWithRisk[]>([]);
  isLoadingSubproceso = signal(false);
  isLoadingActividades = signal(false);

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
  private approvalFlowService: ApprovalFlowService,
  private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadUserPermissions();

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const areaId = params['areaId'];
        const procesoId = params['procesoId'];
        const subprocesoId = params['subprocesoId'];

        if (areaId && procesoId && subprocesoId) {
          this.areaId.set(areaId);
          this.procesoId.set(procesoId);
          this.subprocesoId.set(subprocesoId);
          this.loadData(areaId, procesoId, subprocesoId);
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

  private async loadData(areaId: string, procesoId: string, subprocesoId: string): Promise<void> {
    this.subprocesoDetail.set(null);
    this.actividades.set([]);

    await this.loadSubprocesoDetail(areaId, procesoId, subprocesoId);
    await this.loadActividadesWithRisks(areaId, procesoId, subprocesoId);
    this.determineFlowButton();
  }

  /**
   * Carga el detalle del subproceso
   * MAPEO BASADO EN EL BACKEND (SUBPROCESO_READ):
   * atts[0]: offset
   * atts[1]: areaId
   * atts[2]: areaDescripcion
   * atts[3]: procesoId
   * atts[4]: procesoDescripcion
   * atts[5]: subprocesoId
   * atts[6]: subprocesoDescripcion
   * atts[7]: subprocesoDescripcionExt
   * atts[8]: subprocesoIdClasificacion
   * atts[9]: subprocesoDescClasificacion
   * atts[10]: subprocesoRiesgoPuroDesc
   * atts[11]: subprocesoRiesgoResidualDesc
   * atts[12]: subprocesoStatus
   * atts[13]: subprocesoVersion
   * atts[14]: subprocesoNivel
   * atts[15]: subprocesoAtributos
   * atts[16]: subprocesoStatusId
   * atts[17]: key
   * atts[18]: statusParent
   * atts[19]: CanAdd
   * atts[20]: CanModify
   */
  private async loadSubprocesoDetail(areaId: string, procesoId: string, subprocesoId: string): Promise<void> {
    this.isLoadingSubproceso.set(true);

    try {
      const response = await firstValueFrom(
        this.hierarchyService.getNodeDetail(3, [areaId, procesoId, subprocesoId])
      );

      if (response?.success && response.data?.[0]) {
        const atts = response.data[0].atts;

        // Validar que sea el registro principal (offset = '0')
        if (atts[0]?.value === '0') {
          this.subprocesoDetail.set({
            offset: atts[0]?.value || '',
            areaId: atts[1]?.value || '',
            areaDescripcion: atts[2]?.value || '',
            procesoId: atts[3]?.value || '',
            procesoDescripcion: atts[4]?.value || '',
            subprocesoId: atts[5]?.value || '',
            subprocesoDescripcion: atts[6]?.value || '',
            subprocesoDescripcionExt: atts[7]?.value || '',
            subprocesoIdClasificacion: atts[8]?.value || '',
            subprocesoDescClasificacion: atts[9]?.value || '',
            subprocesoRiesgoPuroDesc: atts[10]?.value || '',
            subprocesoRiesgoResidualDesc: atts[11]?.value || '',
            subprocesoStatus: atts[12]?.value || '',
            subprocesoVersion: atts[13]?.value || '',
            subprocesoNivel: atts[14]?.value || '',
            subprocesoStatusId: atts[16]?.value || '',
            key: atts[17]?.value || '',
            statusParent: atts[18]?.value || '',
            canAdd: atts[19]?.value === 'true' ? 'Y' : 'N',
            canModify: atts[20]?.value === 'true' ? 'Y' : 'N'
          });

          // Guardar en localStorage (igual que el legacy)
          localStorage.setItem('keySelected', atts[17]?.value || '');
          localStorage.setItem('versionSelected', atts[13]?.value || '');
          localStorage.setItem('statusSelected', atts[16]?.value || '');

          console.log('✅ Subproceso cargado:', this.subprocesoDetail());
        }
      }
    } catch (error) {
      console.error('❌ Error loading subproceso:', error);
      this.alertService.error('Error al cargar el subproceso');
    } finally {
      this.isLoadingSubproceso.set(false);
    }
  }

  /**
   * Carga las actividades con sus riesgos
   * Usa ITEM_EVALRISK_DETAIL_READ igual que el legacy
   */
  private async loadActividadesWithRisks(areaId: string, procesoId: string, subprocesoId: string): Promise<void> {
    this.isLoadingActividades.set(true);

    try {
      const key = areaId + procesoId + subprocesoId;
      const response = await firstValueFrom(
        this.hierarchyService.getNodeChildren(key)
      );

      if (response?.success && response.data) {
        const actividadesList: ActividadWithRisk[] = [];

        response.data.forEach((element: any) => {
          const atts = element.atts;

          // Filtrar: excluir offset='0' y estado='010' (igual que legacy)
          if (atts[0]?.value !== '0' && atts[9]?.value !== '010') {
            actividadesList.push({
              offset: atts[0]?.value || '',
              id: atts[1]?.value?.trim() || '',
              descripcion: atts[2]?.value || '',
              actividadRiesgoPuroN: atts[3]?.value || '',       // Operacional Puro
              actividadRiesgoPuroM: atts[4]?.value || '',       // Medio Ambiente Puro
              actividadRiesgoPuroS: atts[5]?.value || '',       // Seguridad Puro
              actividadRiesgoResidualN: atts[6]?.value || '',   // Operacional Residual
              actividadRiesgoResidualM: atts[7]?.value || '',   // Medio Ambiente Residual
              actividadRiesgoResidualS: atts[8]?.value || '',   // Seguridad Residual
              estado: atts[9]?.value || '',
              pendingDelete: atts[11]?.value || 'N',
              canNavigate: true
            });
          }
        });

        this.actividades.set(actividadesList);
        console.log('✅ Actividades cargadas:', actividadesList.length);
      }
    } catch (error) {
      console.error('❌ Error loading actividades:', error);
      this.alertService.error('Error al cargar actividades');
    } finally {
      this.isLoadingActividades.set(false);
    }
  }

  /**
   * Determina qué botón del flujo mostrar
   */
  private determineFlowButton(): void {
    const subproceso = this.subprocesoDetail();
    const allow = localStorage.getItem('allow') || '';

    if (!subproceso || !allow) {
      this.currentFlowButton.set('');
      this.showButtons.set(false);
      return;
    }

    const parameters = [allow, subproceso.subprocesoStatusId, subproceso.canAdd];
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

      const status = this.subprocesoDetail()?.subprocesoStatusId;
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
        this.loadData(this.areaId(), this.procesoId(), this.subprocesoId());
      } else {
        this.alertService.error(response?.message || 'Error en el flujo de aprobación');
      }
    } catch (error: any) {
      this.alertService.error(error.message || 'Error en el flujo de aprobación');
    }
  }

  private getTituloFlujo(status: string, isReject: boolean): string {
    if (isReject) return 'Rechazo en Subproceso';
    return status === '004' ? 'Envio a Validacion en Subproceso' : 'Aprobacion en Subproceso';
  }

  private async getPendingValidationUuid(status: string): Promise<string> {
    const key = this.areaId() + this.procesoId() + this.subprocesoId();
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
   * Navega al proceso
   */
  goToProceso(): void {
    const subproceso = this.subprocesoDetail();
    if (!subproceso?.areaId || !subproceso?.procesoId) return;

    this.router.navigate(['/rkmain/rkp', subproceso.areaId, subproceso.procesoId]);
  }

  /**
   * Navega a la actividad seleccionada (RKC)
   */
  goToActividad(actividad: ActividadWithRisk): void {
    if (actividad.canNavigate) {
      this.router.navigate([
        '/rkmain/rkc',
        this.areaId(),
        this.procesoId(),
        this.subprocesoId(),
        actividad.id
      ]);
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Devuelve la clase CSS para el badge/cell de riesgo
   * Igual que en RKA y RKP
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
   * Genera el reporte del subproceso
   */
  async generateReport(): Promise<void> {
    const subprocesoKey = this.subprocesoDetail()?.key;
    if (!subprocesoKey) return;

    this.approvalFlowService.generarReporte(subprocesoKey).subscribe({
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
  async openDashboard(): Promise<void>  {
    const subproceso = this.subprocesoDetail();

  if (!subproceso) {
    await this.alertService.warning(
      'Sin Datos',
      'Debe cargar un subproceso primero'
    );
    return;
  }

  // Abrir dashboard
  const dialogRef = this.dialog.open(DashboardComponent, {
    width: '900px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    disableClose: false,
    data: {
      key: subproceso.key,
      status: subproceso.subprocesoStatusId || '',
      nivel: 'Subproceso',
      descripcion: subproceso.subprocesoDescripcion || ''
    }
  });

  // Manejar cierre del modal
  dialogRef.afterClosed().subscribe(result => {
    if (result?.refresh) {
      console.log('♻️ Recargando datos del subproceso');
      this.loadData(this.areaId(), this.procesoId(), this.subprocesoId());
    }
  });
  }

  /**
   * Determina el título del indicador de estado
   * Igual que en el legacy
   */
  getStatusTooltip(actividad: ActividadWithRisk): string {
    if (actividad.pendingDelete === 'Y') {
      return 'Pendiente Inactivación (Eliminación)';
    }

    switch (actividad.estado) {
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
  getStatusIndicator(actividad: ActividadWithRisk): string {
    if (actividad.estado === '008' && actividad.pendingDelete === 'N') {
      return '';
    }

    if (actividad.estado === '000') {
      return '(R)';
    }

    if (actividad.pendingDelete === 'Y') {
      if (actividad.estado === '004') return '(**)';
      if (actividad.estado === '007') return '(***)';
      return '(*)';
    }

    if (actividad.estado === '001' || actividad.estado === '002' ||
        actividad.estado === '003' || actividad.estado === '006') {
      return '(*)';
    }

    if (actividad.estado === '004') return '(**)';
    if (actividad.estado === '007') return '(***)';

    return '';
  }

  goToArea(): void {
    const subproceso = this.subprocesoDetail();
    if (!subproceso?.areaId) return;

    this.router.navigate(['/rkmain/rka', subproceso.areaId]);
  }
}


