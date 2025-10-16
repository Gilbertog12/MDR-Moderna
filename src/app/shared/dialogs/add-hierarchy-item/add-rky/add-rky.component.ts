import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, transition, style, animate } from '@angular/animations';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';

import { RiskEvaluationService, RiskEvaluation, ListItem } from './services/risk-evaluation.service';
import { SelectProbabilidadComponent } from '../select-probabilidad/select-probabilidad.component';
import { SelectSeveridadComponent } from '../select-severidad/select-severidad.component';
import { HierarchyService } from '../../../../layout/rkmain/services/hierarchy.service';
import { AlertService } from '../../../services/alert.service';

// ============================================
// TYPES
// ============================================

interface ConsequenceItem {
  id: string;
  description: string;
  selected: boolean;
}

interface AddRkyDialogData {
  title: string;
  areaId: string;
  procesoId: string;
  subprocesoId: string;
  actividadId: string;
  tareaId: string;
  dimensionId: string;
  riesgoId: string;
  showNewEntityButton?: boolean;
}

// ============================================
// COMPONENT
// ============================================

@Component({
  selector: 'app-add-rky',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSelectModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './add-rky.component.html',
  styleUrls: ['./add-rky.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AddRkyComponent implements OnInit, OnDestroy {
  // ============================================
  // DEPENDENCY INJECTION
  // ============================================
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddRkyComponent>);
  private readonly hierarchyService = inject(HierarchyService);
  private readonly riskService = inject(RiskEvaluationService);
  private readonly alertService = inject(AlertService);
  private readonly dialog = inject(MatDialog);
  public readonly data: AddRkyDialogData = inject(MAT_DIALOG_DATA);

  // Subject para cleanup de subscriptions
  private readonly destroy$ = new Subject<void>();

  // ============================================
  // REACTIVE FORMS
  // ============================================
  readonly searchControl = new FormControl('', { nonNullable: true });
  riskForm!: FormGroup;

  // ============================================
  // STATE SIGNALS
  // ============================================
  readonly consequences = signal<ConsequenceItem[]>([]);
  readonly selectedConsequences = signal<ConsequenceItem[]>([]);
  readonly isLoading = signal(false);
  readonly searchTerm = signal('');
  readonly currentPage = signal(1);
  readonly hasMorePages = signal(true);

  readonly probabilityList = signal<ListItem[]>([]);
  readonly severityList = signal<ListItem[]>([]);

  readonly riesgoPuro = signal<RiskEvaluation | null>(null);
  readonly riesgoResidual = signal<RiskEvaluation | null>(null);

  // ============================================
  // COMPUTED SIGNALS - BEST PRACTICE
  // ============================================
  readonly displayedConsequences = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const items = this.consequences();

    if (!term) return items;

    return items.filter(item =>
      item.id.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    );
  });

  readonly selectedCount = computed(() => this.selectedConsequences().length);

  readonly canSave = computed(() => {
    const hasSelection = this.selectedCount() > 0;
    const puro = this.riesgoPuro();
    const hasRiskEvaluation = puro && this.riskService.isValidRiskEvaluation(puro);
    const notLoading = !this.isLoading();

    return hasSelection && hasRiskEvaluation && notLoading;
  });

  readonly pureRiskGradient = computed(() =>
    this.riesgoPuro()?.color.gradient || 'transparent'
  );

  readonly residualRiskGradient = computed(() =>
    this.riesgoResidual()?.color.gradient || 'transparent'
  );



  // Helper para obtener el nombre del color (opcional, para debugging)
  readonly pureRiskColorName = computed(() =>
    this.riesgoPuro()?.color.name || 'Sin definir'
  );

  readonly residualRiskColorName = computed(() =>
    this.riesgoResidual()?.color.name || 'Sin definir'
  );

  // ============================================
  // LIFECYCLE
  // ============================================
  constructor() {
    this.initializeForm();
    this.setupSearchListener();
  }

  ngOnInit(): void {
    this.validateData();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  private validateData(): void {
    if (!this.data.riesgoId || !this.data.dimensionId) {
      console.error('❌ Missing required IDs:', this.data);
      this.alertService.error(
        'Error de Configuración',
        'Faltan datos necesarios para cargar las consecuencias'
      );
      this.dialogRef.close(false);
    }
  }

  private initializeForm(): void {
    this.riskForm = this.fb.group({
      probabilidadPuro: ['', Validators.required],
      severidadPuro: ['', Validators.required]
    });

    // Watch para Probabilidad
    this.riskForm.get('probabilidadPuro')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.tryCalculateCriticality();
      });

    // Watch para Severidad
    this.riskForm.get('severidadPuro')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.tryCalculateCriticality();
      });
  }

  private tryCalculateCriticality(): void {
    const probId = this.riskForm.get('probabilidadPuro')?.value;
    const sevId = this.riskForm.get('severidadPuro')?.value;

    if (probId && sevId) {
      setTimeout(() => {
        this.calculateCriticality(probId, sevId);
      }, 50);
    }
  }

  private setupSearchListener(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((term: string) => {
        const trimmed = term.trim();

        if (trimmed.length === 0 || trimmed.length >= 2) {
          this.searchTerm.set(trimmed);
          this.loadConsequences();
        }
      });
  }

  // ============================================
  // DATA LOADING
  // ============================================
  private loadInitialData(): void {
    this.loadConsequences();
    this.loadRiskLists();
  }

  private loadRiskLists(): void {
    this.riskService.loadProbabilityList().subscribe({
      next: (items) => {
        this.probabilityList.set(items);
        console.log('✅ Probability list loaded:', items.length);
      },
      error: (error) => {
        console.error('❌ Failed to load probability list:', error);
      }
    });

    this.riskService.loadSeverityList().subscribe({
      next: (items) => {
        this.severityList.set(items);
        console.log('✅ Severity list loaded:', items.length);
      },
      error: (error) => {
        console.error('❌ Failed to load severity list:', error);
      }
    });
  }

  private async loadConsequences(append = false): Promise<void> {
    if (!append) {
      this.consequences.set([]);
      this.currentPage.set(1);
    }

    this.isLoading.set(true);

    try {
      const response = await this.hierarchyService.executeGenericAction({
        atts: this.buildConsequenceQueryParams()
      }).toPromise();

      if (!response?.success || !response.data) {
        throw new Error('Invalid response from CONSECUENCIA_LIST');
      }

      const items = this.parseConsequenceItems(response.data);

      if (append) {
        this.consequences.update(prev => [...prev, ...items]);
      } else {
        this.consequences.set(items);
      }

      this.hasMorePages.set(items.length > 0);

      if (items.length === 0 && !append) {
        await this.alertService.info('Sin Resultados', 'No se encontraron consecuencias');
      }
    } catch (error) {
      console.error('❌ Error loading consequences:', error);
      await this.alertService.error('Error', 'No se pudieron cargar las consecuencias');
    } finally {
      this.isLoading.set(false);
    }
  }

  private buildConsequenceQueryParams(): any[] {
    const params = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'CONSECUENCIA_LIST' },
      { name: 'areaId', value: this.data.areaId },
      { name: 'procesoId', value: this.data.procesoId },
      { name: 'subprocesoId', value: this.data.subprocesoId },
      { name: 'actividadId', value: this.data.actividadId },
      { name: 'tareaId', value: this.data.tareaId },
      { name: 'dimensionId', value: this.data.dimensionId },
      { name: 'riesgoId', value: this.data.riesgoId }
    ];

    if (this.searchTerm()) {
      params.push({ name: 'lookupName', value: '%' + this.searchTerm() });
    }

    if (this.currentPage() > 1) {
      params.push({ name: 'index', value: this.currentPage().toString() });
    }

    return params;
  }

  private parseConsequenceItems(data: any[]): ConsequenceItem[] {
    return data
      .filter(el => el.atts?.length >= 2)
      .map(el => ({
        id: el.atts[0]?.value?.toString().trim() || '',
        description: el.atts[2]?.value?.toString().trim() || el.atts[1]?.value?.toString().trim() || '',
        selected: false
      }))
      .filter(item => item.id && item.description);
  }

  // ============================================
  // RISK CALCULATION
  // ============================================
  private calculateCriticality(probabilityId: string, severityId: string): void {
    console.log('🧮 Starting criticality calculation:', {
      probabilityId,
      severityId,
      dimensionId: this.data.dimensionId
    });

    this.riskService.calculateCriticality(
      this.data.dimensionId,
      probabilityId,
      severityId,
      this.probabilityList(),
      this.severityList()
    ).subscribe({
      next: (evaluation) => {
        console.log('✅ Risk evaluation complete:', evaluation);

        this.riesgoPuro.set(evaluation);
        this.riesgoResidual.set({ ...evaluation });

        console.log('📊 Signals updated - Can Save:', this.canSave());
      },
      error: (error) => {
        console.error('❌ Error calculating criticality:', error);
        this.alertService.error('Error', 'No se pudo calcular la criticidad');
      }
    });
  }

  // ============================================
  // USER ACTIONS
  // ============================================
  clearSearch(): void {
    this.searchControl.setValue('');
    this.searchTerm.set('');
    this.loadConsequences();
  }

  toggleSelection(item: ConsequenceItem): void {
    const original = this.consequences().find(i => i.id === item.id);
    if (!original) return;

    original.selected = !original.selected;

    if (original.selected) {
      const exists = this.selectedConsequences().some(i => i.id === original.id);
      if (!exists) {
        this.selectedConsequences.update(prev => [...prev, original]);
      }
    } else {
      this.selectedConsequences.update(prev => prev.filter(i => i.id !== original.id));
    }

    this.consequences.set([...this.consequences()]);
  }

  selectAllVisible(): void {
    const visible = this.displayedConsequences();
    let addedCount = 0;

    visible.forEach(item => {
      const original = this.consequences().find(i => i.id === item.id);
      if (original && !original.selected) {
        original.selected = true;
        const exists = this.selectedConsequences().some(i => i.id === original.id);
        if (!exists) {
          addedCount++;
        }
      }
    });

    this.selectedConsequences.set(
      this.consequences().filter(item => item.selected)
    );

    this.alertService.toast('success', `${addedCount} items seleccionados`);
  }

  clearAllSelections(): void {
    this.consequences().forEach(item => item.selected = false);
    this.selectedConsequences.set([]);
    this.consequences.set([...this.consequences()]);
    this.alertService.toast('info', 'Selección limpiada');
  }

  removeChip(item: ConsequenceItem): void {
    const original = this.consequences().find(i => i.id === item.id);
    if (original) {
      original.selected = false;
    }

    this.selectedConsequences.update(prev => prev.filter(c => c.id !== item.id));
    this.consequences.set([...this.consequences()]);
  }

  loadMoreConsequences(): void {
    if (this.hasMorePages() && !this.isLoading()) {
      this.currentPage.update(p => p + 1);
      this.loadConsequences(true);
    }
  }

  async openProbabilidadSelector(): Promise<void> {
    const dialogRef = this.dialog.open(SelectProbabilidadComponent, {
      width: '95vw',
      maxWidth: '1200px',
      maxHeight: '85vh',
      data: {
        title: 'Probabilidad Riesgo Puro',
        button_confirm: 'Seleccionar',
        button_close: 'Cancelar',
        type: 'RP',
        currentSelection: this.riesgoPuro()?.probabilityId
      }
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result) {
      this.riskForm.patchValue({ probabilidadPuro: result.id });
    }
  }

  async openSeveridadSelector(): Promise<void> {
    const dialogRef = this.dialog.open(SelectSeveridadComponent, {
      width: '98vw',
      maxWidth: '1650px',
      maxHeight: '90vh',
      data: {
        title: 'Severidad Riesgo Puro',
        button_confirm: 'Seleccionar',
        button_close: 'Cancelar',
        type: 'RP',
        currentSelection: this.riesgoPuro()?.severityId
      }
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result) {
      this.riskForm.patchValue({ severidadPuro: result.id });
    }
  }

  async save(): Promise<void> {
    if (!this.canSave()) {
      await this.alertService.warning('Validación', 'Complete todos los campos requeridos');
      return;
    }

    const confirmed = await this.alertService.confirm({
      title: 'Confirmar',
      text: `¿Desea agregar ${this.selectedCount()} consecuencia(s) con evaluación de riesgo?`,
      icon: 'question'
    });

    if (!confirmed.isConfirmed) return;

    this.isLoading.set(true);

    try {
      const puro = this.riesgoPuro()!;
      const residual = this.riesgoResidual()!;

      const response = await this.hierarchyService.executeGenericAction({
        atts: [
          { name: 'scriptName', value: 'coemdr' },
          { name: 'action', value: 'CONSECUENCIA_CREATE' },
          { name: 'areaId', value: this.data.areaId },
          { name: 'procesoId', value: this.data.procesoId },
          { name: 'subprocesoId', value: this.data.subprocesoId },
          { name: 'actividadId', value: this.data.actividadId },
          { name: 'tareaId', value: this.data.tareaId },
          { name: 'dimensionId', value: this.data.dimensionId },
          { name: 'riesgoId', value: this.data.riesgoId },
          { name: 'consecuenciaId', value: this.selectedConsequences().map(c => c.id).join(',') },
          { name: 'riesgoPuroP', value: puro.probabilityId },
          { name: 'riesgoPuroS', value: puro.severityId },
          { name: 'riesgoPuroC', value: puro.criticalityId },
          { name: 'riesgoResidualP', value: residual.probabilityId },
          { name: 'riesgoResidualS', value: residual.severityId },
          { name: 'riesgoResidualC', value: residual.criticalityId }
        ]
      }).toPromise();

      if (response?.success) {
        await this.alertService.success('Éxito', 'Consecuencias agregadas correctamente');
        this.dialogRef.close(true);
      } else {
        throw new Error(response?.message || 'Error al guardar');
      }
    } catch (error: any) {
      console.error('❌ Save error:', error);
      await this.alertService.error('Error', error.message || 'No se pudo guardar');
    } finally {
      this.isLoading.set(false);
    }
  }

  openNewEntityDialog(): void {
    this.alertService.info('Próximamente', 'Funcionalidad en desarrollo');
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
