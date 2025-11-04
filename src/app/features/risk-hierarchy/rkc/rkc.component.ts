import { Component, computed, effect, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { HierarchyService } from '../../../layout/rkmain/services/hierarchy.service';
import { AlertService } from '../../../shared/services/alert.service';
import { ApprovalFlowService } from '../../../layout/rkmain/services/approval-flow.service';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { ChecklistTabComponent } from '../../../layout/rkmain/components/checklist-tab/checklist-tab.component';
import { ChecklistPermissions } from '../../../shared/models/checklist.interface';
import { RkcDetalleComponent } from "../../../layout/rkmain/components/rkc-detalle/rkc-detalle.component";
import { StdjobTabComponent } from '../../../layout/rkmain/components/stdjob-tab/stdjob-tab.component'


interface ActividadDetail {
  offset: string;
  areaId: string;
  areaDescripcion: string;
  procesoId: string;
  procesoDescripcion: string;
  subprocesoId: string;
  subprocesoDescripcion: string;
  actividadId: string;
  actividadDescripcion: string;
  actividadDescripcionExt: string;
  actividadIdClasificacion: string;
  actividadDescClasificacion: string;
  actividadRiesgoPuroDesc: string;
  actividadRiesgoResidualDesc: string;
  actividadStatus: string;
  actividadVersion: string;
  actividadNivel: string;
  actividadStatusId: string;
  key: string;
  approvedDate: string;
  statusParent: string;
  canAdd: string;
  canModify: string;
  creador: string;
}

export interface TareaWithRisk {
  offset: string;
  id: string;
  descripcion: string;
  tareaRiesgoPuroN: string;    // Operacional Puro
  tareaRiesgoPuroM: string;    // Medio Ambiente Puro
  tareaRiesgoPuroS: string;    // Seguridad Puro
  tareaRiesgoResidualN: string; // Operacional Residual
  tareaRiesgoResidualM: string; // Medio Ambiente Residual
  tareaRiesgoResidualS: string; // Seguridad Residual
  estado: string;
  pendingDelete: string;
  canNavigate: boolean;
}

@Component({
  selector: 'app-rkc',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    ChecklistTabComponent,
    RkcDetalleComponent,
    StdjobTabComponent
  ],
  templateUrl: './rkc.component.html',
  styleUrl: './rkc.component.scss'
})
export class RkcComponent implements OnInit {
  // Parámetros de ruta
  areaId = signal<string>('');
  procesoId = signal<string>('');
  subprocesoId = signal<string>('');
  actividadId = signal<string>('');

  private stdJobTab = viewChild<StdjobTabComponent>('stdJobTab');
  private tabGroup = viewChild<MatTabGroup>('tabGroup');
  private checklistTab = viewChild<ChecklistTabComponent>('checklistTab');
  private detalleTab = viewChild<RkcDetalleComponent>('detalleTab');


  checklistPermissions = computed((): ChecklistPermissions => ({
    canAdd: this.actividadDetail()?.canAdd === 'true',
    canEdit: this.actividadDetail()?.canModify === 'true',
    canDelete: this.actividadDetail()?.canModify === 'true',
    isCreator: this.actividadDetail()?.creador === 'true'
  }));

  // Estado del componente
  actividadDetail = signal<ActividadDetail | null>(null);
  tareas = signal<TareaWithRisk[]>([]);
  isLoadingActividad = signal(false);
  isLoadingTareas = signal(false);
  selectedTab = signal<number>(0);



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
  ) {

    effect(() => {
      const actividadId = this.actividadDetail()?.actividadId

      if (actividadId) {
        this.selectedTab.set(0)
      }
    })
  }



  ngOnInit(): void {
    this.loadUserPermissions();

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const areaId = params['areaId'];
        const procesoId = params['procesoId'];
        const subprocesoId = params['subprocesoId'];
        const actividadId = params['actividadId'];

        if (areaId && procesoId && subprocesoId && actividadId) {
          this.areaId.set(areaId);
          this.procesoId.set(procesoId);
          this.subprocesoId.set(subprocesoId);
          this.actividadId.set(actividadId);
          this.loadData(areaId, procesoId, subprocesoId, actividadId);
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

      allow = 'administrador';
      localStorage.setItem('allow', allow);
    }

    this.userProfile.set(allow);
  }

  private async loadData(areaId: string, procesoId: string, subprocesoId: string, actividadId: string): Promise<void> {
    this.actividadDetail.set(null);
    this.tareas.set([]);

    await this.loadActividadDetail(areaId, procesoId, subprocesoId, actividadId);
    await this.loadTareasWithRisks(areaId, procesoId, subprocesoId, actividadId);
    this.determineFlowButton();
  }

  /**
   * Carga el detalle de la actividad
   * MAPEO BASADO EN EL BACKEND (ACTIVIDAD_READ):
   * atts[0]: offset
   * atts[1]: areaId
   * atts[2]: areaDescripcion
   * atts[3]: procesoId
   * atts[4]: procesoDescripcion
   * atts[5]: subprocesoId
   * atts[6]: subprocesoDescripcion
   * atts[7]: actividadId
   * atts[8]: actividadDescripcion
   * atts[9]: actividadDescripcionExt
   * atts[10]: actividadIdClasificacion
   * atts[11]: actividadDescClasificacion
   * atts[12]: actividadRiesgoPuroDesc
   * atts[13]: actividadRiesgoResidualDesc
   * atts[14]: actividadStatus
   * atts[15]: actividadVersion
   * atts[16]: actividadNivel
   * atts[17]: actividadAtributos
   * atts[18]: actividadStatusId
   * atts[19]: key
   * atts[20]: approvedDate
   * atts[21]: statusParent
   * atts[22]: CanAdd
   * atts[23]: CanModify
   * atts[24]: Creador
   */
  private async loadActividadDetail(areaId: string, procesoId: string, subprocesoId: string, actividadId: string): Promise<void> {
    this.isLoadingActividad.set(true);

    try {
      const response = await firstValueFrom(
        this.hierarchyService.getNodeDetail(4, [areaId, procesoId, subprocesoId, actividadId])
      );

      if (response?.success && response.data?.[0]) {
        const atts = response.data[0].atts;

        // Validar que sea el registro principal (offset = '0')
        if (atts[0]?.value === '0') {
          this.actividadDetail.set({
            offset: atts[0]?.value || '',
            areaId: atts[1]?.value || '',
            areaDescripcion: atts[2]?.value || '',
            procesoId: atts[3]?.value || '',
            procesoDescripcion: atts[4]?.value || '',
            subprocesoId: atts[5]?.value || '',
            subprocesoDescripcion: atts[6]?.value || '',
            actividadId: atts[7]?.value || '',
            actividadDescripcion: atts[8]?.value || '',
            actividadDescripcionExt: atts[9]?.value || '',
            actividadIdClasificacion: atts[10]?.value || '',
            actividadDescClasificacion: atts[11]?.value || '',
            actividadRiesgoPuroDesc: atts[12]?.value || '',
            actividadRiesgoResidualDesc: atts[13]?.value || '',
            actividadStatus: atts[14]?.value || '',
            actividadVersion: atts[15]?.value || '',
            actividadNivel: atts[16]?.value || '',
            actividadStatusId: atts[18]?.value || '',
            key: atts[19]?.value || '',
            approvedDate: atts[20]?.value || '',
            statusParent: atts[21]?.value || '',
            canAdd: atts[22]?.value || 'N',
            canModify: atts[23]?.value || 'N',
            creador: atts[24]?.value || 'N'
          });

          // Guardar en localStorage (igual que el legacy)
          localStorage.setItem('keySelected', atts[19]?.value || '');
          localStorage.setItem('versionSelected', atts[15]?.value || '');
          localStorage.setItem('statusSelected', atts[18]?.value || '');

          console.log('✅ Actividad cargada:', this.actividadDetail());
        }
      }
    } catch (error) {
      console.error('❌ Error loading actividad:', error);
      this.alertService.error('Error al cargar la actividad');
    } finally {
      this.isLoadingActividad.set(false);
    }
  }

  /**
   * Carga las tareas con sus riesgos
   * Usa ITEM_EVALRISK_DETAIL_READ igual que el legacy
   */
  private async loadTareasWithRisks(areaId: string, procesoId: string, subprocesoId: string, actividadId: string): Promise<void> {
    this.isLoadingTareas.set(true);

    try {
      const key = areaId + procesoId + subprocesoId + actividadId;
      const response = await firstValueFrom(
        this.hierarchyService.getNodeChildren(key)
      );

      if (response?.success && response.data) {
        const tareasList: TareaWithRisk[] = [];

        response.data.forEach((element: any) => {
          const atts = element.atts;

          // Filtrar: excluir offset='0' y estado='010' (igual que legacy)
          if (atts[0]?.value !== '0' && atts[9]?.value !== '010') {
            tareasList.push({
              offset: atts[0]?.value || '',
              id: atts[1]?.value?.trim() || '',
              descripcion: atts[2]?.value || '',
              tareaRiesgoPuroN: atts[3]?.value || '',       // Operacional Puro
              tareaRiesgoPuroM: atts[4]?.value || '',       // Medio Ambiente Puro
              tareaRiesgoPuroS: atts[5]?.value || '',       // Seguridad Puro
              tareaRiesgoResidualN: atts[6]?.value || '',   // Operacional Residual
              tareaRiesgoResidualM: atts[7]?.value || '',   // Medio Ambiente Residual
              tareaRiesgoResidualS: atts[8]?.value || '',   // Seguridad Residual
              estado: atts[9]?.value || '',
              pendingDelete: atts[11]?.value || 'N',
              canNavigate: true
            });
          }
        });

        this.tareas.set(tareasList);
        console.log('✅ Tareas cargadas:', tareasList.length);
      }
    } catch (error) {
      console.error('❌ Error loading tareas:', error);
      this.alertService.error('Error al cargar tareas');
    } finally {
      this.isLoadingTareas.set(false);
    }
  }

  /**
   * Determina qué botón del flujo mostrar
   */
  private determineFlowButton(): void {
    const actividad = this.actividadDetail();
    const allow = localStorage.getItem('allow') || '';

    if (!actividad || !allow) {
      this.currentFlowButton.set('');
      this.showButtons.set(false);
      return;
    }

    const parameters = [allow, actividad.actividadStatusId, actividad.canAdd];
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

      const status = this.actividadDetail()?.actividadStatusId;
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
        this.loadData(this.areaId(), this.procesoId(), this.subprocesoId(), this.actividadId());
      } else {
        this.alertService.error(response?.message || 'Error en el flujo de aprobación');
      }
    } catch (error: any) {
      this.alertService.error(error.message || 'Error en el flujo de aprobación');
    }
  }

  private getTituloFlujo(status: string, isReject: boolean): string {
    if (isReject) return 'Rechazo en Actividad';
    return status === '004' ? 'Envio a Validacion en Actividad' : 'Aprobacion en Actividad';
  }

  private async getPendingValidationUuid(status: string): Promise<string> {
    const key = this.areaId() + this.procesoId() + this.subprocesoId() + this.actividadId();
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
    const actividad = this.actividadDetail();
    if (!actividad?.areaId) return;

    this.router.navigate(['/rkmain/rka', actividad.areaId]);
  }

  /**
   * Navega al proceso
   */
  goToProceso(): void {
    const actividad = this.actividadDetail();
    if (!actividad?.areaId || !actividad?.procesoId) return;

    this.router.navigate(['/rkmain/rkp', actividad.areaId, actividad.procesoId]);
  }

  /**
   * Navega al subproceso
   */
  goToSubproceso(): void {
    const actividad = this.actividadDetail();
    if (!actividad?.areaId || !actividad?.procesoId || !actividad?.subprocesoId) return;

    this.router.navigate(['/rkmain/rks', actividad.areaId, actividad.procesoId, actividad.subprocesoId]);
  }

  /**
   * Navega a la tarea seleccionada (RKT)
   */
  goToTarea(tarea: TareaWithRisk): void {
    if (tarea.canNavigate) {
      this.router.navigate([
        '/rkmain/rkt',
        this.areaId(),
        this.procesoId(),
        this.subprocesoId(),
        this.actividadId(),
        tarea.id
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
   * Genera el reporte de la actividad
   */
  async generateReport(): Promise<void> {
    const actividadKey = this.actividadDetail()?.key;
    if (!actividadKey) return;

    this.approvalFlowService.generarReporte(actividadKey).subscribe({
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
  getStatusTooltip(tarea: TareaWithRisk): string {
    if (tarea.pendingDelete === 'Y') {
      return 'Pendiente Inactivación (Eliminación)';
    }

    switch (tarea.estado) {
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
  getStatusIndicator(tarea: TareaWithRisk): string {
    if (tarea.estado === '008' && tarea.pendingDelete === 'N') {
      return '';
    }

    if (tarea.estado === '000') {
      return '(R)';
    }

    if (tarea.pendingDelete === 'Y') {
      if (tarea.estado === '004') return '(**)';
      if (tarea.estado === '007') return '(***)';
      return '(*)';
    }

    if (tarea.estado === '001' || tarea.estado === '002' ||
      tarea.estado === '003' || tarea.estado === '006') {
      return '(*)';
    }

    if (tarea.estado === '004') return '(**)';
    if (tarea.estado === '007') return '(***)';

    return '';
  }


  onTabChange(index: number): void {


    switch (index) {
      case 1:
        const stdJobComponent = this.stdJobTab();
        if (stdJobComponent) {
          stdJobComponent.initTab();
         }
        break;
      case 2:
        const checklistComponent = this.checklistTab();
        if (checklistComponent) {
          checklistComponent.initTab();
        }
        break;
      case 3:
        const detalleComponent = this.detalleTab();
        if (detalleComponent) {
          detalleComponent.loadData();
        }
        break;
      default:
        break
    }

  }
}
