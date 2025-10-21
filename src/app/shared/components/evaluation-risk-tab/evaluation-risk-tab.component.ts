import { Component, input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { HierarchyService } from '../../../layout/rkmain/services/hierarchy.service';
import { AlertService } from '../../services/alert.service';
import { RiskEvaluationConfig } from '../../services/risk-evaluation-config.factory.service';

interface EvaluacionItem {
  id: string;
  descripcion: string;
  seguridadPuro: string;
  seguridadResidual: string;
  medioAmbientePuro: string;
  medioAmbienteResidual: string;
  operacionalPuro: string;
  operacionalResidual: string;
  canNavigate: boolean;
  estado: string;           // ← AGREGAR
  pendingDelete: string;
}

@Component({
  selector: 'app-risk-evaluation-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './evaluation-risk-tab.component.html',
  styleUrl: './evaluation-risk-tab.component.scss'
})
export class RiskEvaluationTabComponent implements OnInit {
config = input.required<RiskEvaluationConfig>();

  items = signal<EvaluacionItem[]>([]);
  isLoading = signal(false);

  constructor(
    private hierarchyService: HierarchyService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadEvaluacion();
  }

  private async loadEvaluacion(): Promise<void> {
    const cfg = this.config();
  if (!cfg.itemKey || cfg.itemKey.trim() === '') {
    return;
  }

  this.isLoading.set(true);

  try {
    const response = await firstValueFrom(
      this.hierarchyService.getNodeChildren(cfg.itemKey)
    );

    if (response?.success && response.data) {
      const itemsList: EvaluacionItem[] = [];

      response.data.forEach((element: any) => {
        const atts = element.atts;

        // Filtrar offset='0' y estado='010'
        if (atts[0]?.value !== '0' && atts[9]?.value !== '010') {
          itemsList.push({
            id: atts[1]?.value?.trim() || '',
            descripcion: atts[2]?.value || '',
            seguridadPuro: atts[5]?.value || '',
            seguridadResidual: atts[8]?.value || '',
            medioAmbientePuro: atts[4]?.value || '',
            medioAmbienteResidual: atts[7]?.value || '',
            operacionalPuro: atts[3]?.value || '',
            operacionalResidual: atts[6]?.value || '',
            canNavigate: true,
            estado: atts[9]?.value || '',              // ← AGREGAR
            pendingDelete: atts[11]?.value || 'N'      // ← AGREGAR
          });
        }
      });

      this.items.set(itemsList);
      console.log(`✅ ${cfg.nivel} Evaluación cargada:`, itemsList.length, 'items');
    }
  } catch (error) {
    console.error('❌ Error loading evaluación:', error);
    this.alertService.error('Error al cargar evaluación de riesgos');
  } finally {
    this.isLoading.set(false);
  }
  }

  /**
   * Devuelve la clase CSS para colorear según el riesgo
   */
  getRiskClass(value: string | undefined): string {
    if (!value || value.trim() === '') return '';

    const risk = value.toUpperCase().trim();

    if (risk.includes('INTOLERABLE')) return 'risk-intolerable';
    if (risk.includes('TOLERABLE')) return 'risk-tolerable';
    if (risk.includes('INSIGNIFICANTE')) return 'risk-insignificant';

    return '';
  }

  /**
   * Devuelve el texto formateado del riesgo
   */
  getRiskText(value: string | undefined): string {
    if (!value || value.trim() === '') return '-';
    return value.toUpperCase();
  }

  onRowClick(item: EvaluacionItem): void {
   if (item.canNavigate) {
  const callback = this.config().onItemClick;
  if (callback) {
    callback(item.id);  // ✅ Sin error
  }
}
  }

  /**
 * Obtiene el indicador visual del estado
 */
getStatusIndicator(item: EvaluacionItem): string {
  if (item.estado === '008' && item.pendingDelete === 'N') {
    return '';
  }

  if (item.estado === '000') {
    return '(R)';
  }

  if (item.pendingDelete === 'Y') {
    if (item.estado === '004') return '(**)';
    if (item.estado === '007') return '(***)';
    return '(*)';
  }

  if (item.estado === '001' || item.estado === '002' ||
      item.estado === '003' || item.estado === '006') {
    return '(*)';
  }

  if (item.estado === '004') return '(**)';
  if (item.estado === '007') return '(***)';

  return '';
}

/**
 * Obtiene el tooltip del estado
 */
getStatusTooltip(item: EvaluacionItem): string {
  if (item.pendingDelete === 'Y') {
    return 'Pendiente Inactivación (Eliminación)';
  }

  switch (item.estado) {
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
 * Obtiene la clase CSS del indicador
 */
getStatusClass(item: EvaluacionItem): string {
  if (item.pendingDelete === 'Y') {
    return 'status-delete';
  }

  switch (item.estado) {
    case '004':
      return 'status-validate';
    case '007':
      return 'status-approve';
    case '001':
    case '002':
    case '003':
    case '006':
      return 'status-pending';
    case '000':
      return 'status-register';
    default:
      return '';
  }
}
}
