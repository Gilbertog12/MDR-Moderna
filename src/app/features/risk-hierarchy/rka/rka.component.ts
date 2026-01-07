import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HierarchyService } from '../../../layout/rkmain/services/hierarchy.service';
import { AlertService } from '../../../shared/services/alert.service';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { ApprovalFlowService } from '../../../layout/rkmain/services/approval-flow.service';
import { DashboardComponent } from '../../../shared/components/approvalFlow/dashboard/dashboard.component';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

interface AreaDetail {
  offset: string;
  areaId: string;
  areaDescripcion: string;
  areaIdClasificacion: string;
  areaDescClasificacion: string;
  areaRiesgoPuroDesc: string;
  areaRiesgoResidualDesc: string;
  areaStatus: string;
  areaStatusId: string;
  areaVersion: string;
  areaNivel: string;
  areaAtributos: string;
  key: string;
  areaFechaApprovedDate: string;
  statusParent: string;
  canAdd: string;
  canModify: string;
  creador: string;
}

export interface ProcessWithRisk {
  offset: string;
  id: string;
  description: string;
  pureRisks: {
    operational: string;      // ⭐ Cambiado de number a string
    environmental: string;    // ⭐ Cambiado de number a string
    safety: string;           // ⭐ Cambiado de number a string
  };
  residualRisks: {
    operational: string;      // ⭐ Cambiado de number a string
    environmental: string;    // ⭐ Cambiado de number a string
    safety: string;           // ⭐ Cambiado de number a string
  };
  status: string;
  pendingDelete: string;
  canNavigate: boolean;
}

interface ProcesoChild {
  offset: string;
  id: string;
  descripcion: string;
  riesgoPuroN: string;
  riesgoPuroM: string;
  riesgoPuroS: string;
  riesgoResidualN: string;
  riesgoResidualM: string;
  riesgoResidualS: string;
  estado: string;
  pendingDelete: string;
}


@Component({
  selector: 'app-rka',
  imports: [CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  MatDialogModule  ],
  templateUrl: './rka.component.html',
  styleUrl: './rka.component.scss'
})
export class RkaComponent {

  private areaId = signal<string>(''); // ⭐ Guarda el ID aquí
  areaDetail = signal<any>(null);
  processes = signal<ProcessWithRisk[]>([]);
  isLoadingProcesses = signal(false);

 private destroy$ = new Subject<void>();


  isLoadingArea = signal(false);

  // Estado
  loading = signal<boolean>(true);

  procesosList = signal<ProcesoChild[]>([]);
  selectedTab = signal<number>(0);

   // Permisos y flujo
  userProfile = signal<string>('');
  currentFlowButton = signal<string>('');
  showButtons = signal<boolean>(false)




  // Columnas de la tabla
  displayedColumns: string[] = [
    'id',
    'description',  // ⭐ Debe coincidir con matColumnDef en el HTML
    'pureOperational',
    'pureEnvironmental',
    'pureSafety',
    'residualOperational',
    'residualEnvironmental',
    'residualSafety',
    'actions'
  ];


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hierarchyService: HierarchyService,
    private alertService: AlertService,
    private approvalFlowService: ApprovalFlowService,
     private dialog: MatDialog
  ) {}

   ngOnInit() {
     this.loadUserPermissions();

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const areaId = params['id'];
        if (areaId) {
          this.areaId.set(areaId)
          this.loadData(areaId);
        }
      });
  }

   ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

   private loadUserPermissions(): void {
    let allow = localStorage.getItem('allow') || '';
  console.log('🔍 [loadUserPermissions] allow:', allow);

  if (!allow || allow.trim() === '') {
    allow = 'administrador';
    localStorage.setItem('allow', allow);
    console.log('✅ [loadUserPermissions] seteado a:', allow);
  }

  this.userProfile.set(allow);

  }

   private async loadData(areaId: string): Promise<void> {
     this.areaDetail.set(null);
    this.processes.set([]);

    await this.loadAreaDetail(areaId);
    await this.loadProcessesWithRisks(areaId);

    this.determineFlowButton();
  }

  /**
   * Determina qué botón del flujo mostrar según permisos y estado del área
   */
  private determineFlowButton(): void {
      const area = this.areaDetail();
  const allow = localStorage.getItem('allow') || '';

  console.group('🔍 [determineFlowButton]');
  console.log('area:', area);
  console.log('allow:', allow);
  console.log('statusId:', area?.statusId);
  console.log('canAdd:', area?.canAdd);

  if (!area || !allow) {
    console.log('❌ PROBLEMA: No hay area o allow');
    console.groupEnd();
    this.currentFlowButton.set('');
    this.showButtons.set(false);
    return;
  }

  const parameters = [allow, area.statusId, area.canAdd];
  console.log('parameters:', parameters);

  const buttonType = this.approvalFlowService.botonesFlujoAprobacion(parameters);
  console.log('buttonType:', buttonType);

  this.currentFlowButton.set(buttonType || '');
  this.showButtons.set(!!buttonType);

  console.log('✅ showButtons:', this.showButtons());
  console.groupEnd();


  }

   shouldShowApprovalButtons(): boolean {

    return this.showButtons();
  }

  getFlowButton(): string {

    return this.currentFlowButton();
  }

  shouldShowDashboard(): boolean {
  const area = this.areaDetail();
  if (!area) return false;

  const status = area.statusId;
  return status === '001' || status === '002';
}

  /**
   * Lógica del legacy: botonesFlujoAprobacion()
   */
  private calculateFlowButton(parameters: string[]): string {
    const [allow, statusId, canAdd] = parameters;

    // Administrador puede todo
    if (allow.includes('administrador')) {
      if (statusId === '004') return 'validar';
      if (statusId === '007') return 'aprobar';
      return 'enviar-validar';
    }

    // Creador
    if (allow.includes('creacion') && canAdd === 'Y') {
      if (statusId === '001') return 'enviar-validar';
    }

    // Validador
    if (allow.includes('validacion')) {
      if (statusId === '004') return 'validar';
    }

    // Aprobador
    if (allow.includes('aprobacion')) {
      if (statusId === '007') return 'aprobar';
    }

    return '';
  }





  // Métodos del flujo de aprobación
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

      const status = this.areaDetail()?.statusId;
      await this.executeApprovalFlow(status, true, reason);
    } catch (error) {
      console.error('Error en rechazar:', error);
    }
  }

  /**
   * Ejecuta el flujo de aprobación
   */
 private async executeApprovalFlow(
    status: string,
    isReject: boolean = false,
    comments?: string
  ): Promise<void> {
    const areaId = this.route.snapshot.paramMap.get('id');

    try {
      // Paso 1: Obtener UUID
      const uuid = await this.getPendingValidationUuid(status);

      // Paso 2: Ejecutar validación
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
        this.loadData(areaId!);
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

  /**
   * Obtiene el UUID para validación pendiente
   */
   private async getPendingValidationUuid(status: string): Promise<string> {
    const areaId = this.route.snapshot.paramMap.get('id');
    const tipo = status === '004' ? 'IV' : 'IA';

    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'PENDIENTE_VALIDAR_LIST' },
      { name: 'status', value: tipo },
      { name: 'key', value: areaId },
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

    // Verificar timeout
    if (response.data?.[0]?.atts?.[0]?.name === 'TIMEOUT') {
      const count = response.data[0].atts[0].value?.trim();
      throw new Error(`Número de items en Validación/Construcción excedido: ${count}, bajar de nivel en la jerarquía`);
    }

    // Extraer UUID
    const uuidElement = response.data?.find((element: any) =>
      element.atts?.[0]?.name === 'uuid'
    );

    if (!uuidElement) {
      throw new Error('No se pudo obtener UUID de validación');
    }
    console.log('UUID : '+uuidElement.atts[0].value);
    return uuidElement.atts[0].value;
  }

  /**
   * Carga el detalle del área
   */

 async loadAreaDetail(areaId: string): Promise<void> {
     this.isLoadingArea.set(true);

  try {
    const response = await firstValueFrom(
      this.hierarchyService.getNodeDetail(1, [areaId])
    );

    if (response?.success && response.data?.[0]) {
      const atts = response.data[0].atts;

      this.areaDetail.set({
        offset: atts[0]?.value || '',
        areaId: atts[1]?.value || '',
        description: atts[2]?.value || '',
        extendedDescription: atts[3]?.value || '',
        position: atts[4]?.value || '',
        positionDesc: atts[5]?.value || '',
        classificationId: atts[6]?.value || '',
        classificationDesc: atts[7]?.value || '',
        pureRiskDesc: atts[8]?.value || '',
        residualRiskDesc: atts[9]?.value || '',
        status: atts[10]?.value || '',
        version: atts[11]?.value || '',
        statusId: atts[14]?.value || '',
        key: atts[15]?.value || '',
        statusParent: atts[16]?.value || '',
       canAdd: atts[17]?.value === 'true' ? 'Y' : 'N',
canModify: atts[18]?.value === 'true' ? 'Y' : 'N'
      });

      // ✅ AGREGAR ESTE LOG AQUÍ
      console.log('✅ [loadAreaDetail] statusId:', atts[14]?.value);
    }
  } catch (error) {
    console.error('Error loading area:', error);
    this.alertService.error('Error al cargar el área');
  } finally {
    this.isLoadingArea.set(false);
  }
  }

  async loadProcessesWithRisks(areaId: string): Promise<void> {


    this.isLoadingProcesses.set(true);


  try {
      const response = await firstValueFrom(
        this.hierarchyService.getNodeChildren(areaId)
      );

      if (response?.success && response.data) {
        const processList: ProcessWithRisk[] = [];

        response.data.forEach((element: any) => {
          const atts = element.atts;

          if (atts[0]?.value !== '0' && atts[9]?.value !== '010') {
            processList.push({
              offset: atts[0]?.value || '',
              id: atts[1]?.value?.trim() || '',
              description: atts[2]?.value || '',
              pureRisks: {
                operational: atts[3]?.value || '',
                environmental: atts[4]?.value || '',
                safety: atts[5]?.value || ''
              },
              residualRisks: {
                operational: atts[6]?.value || '',
                environmental: atts[7]?.value || '',
                safety: atts[8]?.value || ''
              },
              status: atts[9]?.value || '',
              pendingDelete: atts[11]?.value || 'N',
              canNavigate: true
            });
          }
        });

        this.processes.set(processList);
      }
    } catch (error) {
      console.error('Error loading processes:', error);
      this.alertService.error('Error al cargar procesos');
    } finally {
      this.isLoadingProcesses.set(false);
    }
  }

  private getRiskClass(atts: any[]): string {
    const risks = [
      Number(atts[3]?.value) || 0,
      Number(atts[4]?.value) || 0,
      Number(atts[5]?.value) || 0,
      Number(atts[6]?.value) || 0,
      Number(atts[7]?.value) || 0,
      Number(atts[8]?.value) || 0
    ];

    const maxRisk = Math.max(...risks);

    if (maxRisk >= 16) return 'risk-intolerable';
    if (maxRisk >= 8) return 'risk-tolerable';
    if (maxRisk >= 4) return 'risk-moderate';
    return 'risk-insignificant';
  }

  /**
   * Navega al detalle del proceso
   */
  // goToProcess(process: ProcessWithRisk): void {
  //   if (process.canNavigate) {
  //     this.router.navigate(['/rkmain/rkp', process.id]);
  //   }
  // }

  /**
   * Carga los procesos hijos
   */
  private loadChildren(key: string): void {
     this.hierarchyService.getNodeChildren(key)
    .subscribe({
      next: (response) => {


        if (response.success && response.data) {
          const procesos: ProcesoChild[] = [];

          response.data.forEach((item: any) => {


            if (item.atts[9]?.value !== '010') {
              procesos.push({
               offset: item.atts[0].value,
                  id: item.atts[1].value.trim(),
                  descripcion: item.atts[2].value,
                  riesgoPuroN: item.atts[3].value,
                  riesgoPuroM: item.atts[4].value,
                  riesgoPuroS: item.atts[5].value,
                  riesgoResidualN: item.atts[6].value,
                  riesgoResidualM: item.atts[7].value,
                  riesgoResidualS: item.atts[8].value,
                  estado: item.atts[9].value,
                  pendingDelete: item.atts[11].value
              });
            }
          });


          this.procesosList.set(procesos);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar procesos:', error);
        this.loading.set(false);
      }
    });
  }

  /**
   * Navega al detalle de un proceso
   */
  // viewProceso(proceso: ProcesoChild): void {
  //   const area = this.areaDetail();
  //   if (!area) return;

  //   const route = `/rkmain/rkp/${area.areaId}/${proceso.id}`;
  //   this.router.navigate([route]);
  // }



  /**
   * Obtiene el texto del nivel de riesgo
   */
  getRiskText(value: string): string {
    if (!value || value === '()') return '';

    const numValue = parseInt(value.replace(/[()]/g, ''), 10);

    if (numValue >= 15) return 'INTOLERABLE';
    if (numValue >= 8) return 'TOLERABLE';
    return 'INSIGNIFICANTE';
  }

  /**
   * Obtiene el icono según el estado
   */
  getStatusIcon(estado: string): string {
    switch (estado) {
      case '008': return 'check_circle';
      case '004': return 'pending';
      case '007': return 'schedule';
      case '000': return 'cancel';
      default: return 'radio_button_unchecked';
    }
  }

  /**
   * Genera reporte del área
   */
  async generateReport(): Promise<void> {
     const areaKey = this.areaDetail()?.key;
    if (!areaKey) return;

    this.approvalFlowService.generarReporte(areaKey).subscribe({
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

 getRiskBadgeClass(riskDesc: string | undefined): string {
  if (!riskDesc) return '';

  const desc = riskDesc.toUpperCase();

  if (desc.includes('INTOLERABLE')) return 'risk-intolerable';
  if (desc.includes('TOLERABLE')) return 'risk-tolerable';
  if (desc.includes('INSIGNIFICANTE')) return 'risk-insignificant';

  return '';
}

getRiskCellClass(value: string): string {
  if (!value) return '';

  const riskText = value.toUpperCase().trim();

  // Mapeo exacto a los textos del backend
  if (riskText === 'INTOLERABLE') return 'risk-intolerable';
  if (riskText === 'TOLERABLE') return 'risk-tolerable';
  if (riskText === 'INSIGNIFICANTE') return 'risk-insignificant';

  // Fallback si el texto viene diferente
  if (riskText.includes('INTOLERABLE')) return 'risk-intolerable';
  if (riskText.includes('TOLERABLE')) return 'risk-tolerable';
  if (riskText.includes('INSIGNIFICANTE')) return 'risk-insignificant';

  return '';
}

goToProcess(process: ProcessWithRisk): void {
  if (process.canNavigate) {

    // this.router.navigate(['/rkmain/rkp', process.id]);
     this.router.navigate([
        '/rkmain/rkp',
        this.areaId(),
        process.id
      ]);
  }
}



async openDashboard(): Promise<void> {
   const area = this.areaDetail();

  if (!area) {
    await this.alertService.warning(
      'Sin Datos',
      'Debe cargar un área primero'
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
      key: area.key,
      status: area.statusId || '',
      nivel: 'Área',
      descripcion: area.description || ''
    }
  });

  // Manejar cierre del modal
  dialogRef.afterClosed().subscribe(result => {
    if (result?.refresh) {
      console.log('♻️ Recargando datos del área');
      this.loadData(this.areaId());
    }
  });
}

}
