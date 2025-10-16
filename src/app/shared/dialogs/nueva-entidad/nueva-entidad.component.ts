import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { TextFieldModule } from '@angular/cdk/text-field';
import { forkJoin, of, timer } from 'rxjs';
import { catchError, timeout, retry, tap } from 'rxjs/operators';
import { HierarchyService } from '../../../layout/rkmain/services/hierarchy.service';
import { AlertService } from '../../services/alert.service';

// ==================== INTERFACES ====================
interface EntityType {
  code: string;
  label: string;
  icon: string;
  fields: EntityField[];
}

interface EntityField {
  name: string;
  label: string;
  type: 'text' | 'number';
  validators: any[];
  maxLength?: number;
  placeholder?: string;
}

interface EntityRequest {
  description: string;
  extendedText?: string;
  mensaje?: string;
  status?: 'pending' | 'processing' | 'success' | 'error';
  timestamp?: number;
}

interface DialogData {
  titulo: string;
  tabla: string;
}

interface BackendResponse {
  success: boolean;
  data?: any[];
  message?: string;
  error?: string;
}

// ==================== CONFIGURACIÓN DE TIPOS ====================
const ENTITY_TYPES: Record<string, EntityType> = {
  '+RKC': {
    code: '+RKC',
    label: 'Actividad',
    icon: 'assignment',
    fields: [
      {
        name: 'description',
        label: 'Descripción',
        type: 'text',
        validators: [Validators.required, Validators.maxLength(50)],
        placeholder: 'Ej: Transporte de materiales'
      },
      {
        name: 'extendedText',
        label: 'Texto Extendido',
        type: 'text',
        validators: [Validators.maxLength(500)],
        placeholder: 'Información adicional (opcional)'
      }
    ]
  },
  '+RKT': {
    code: '+RKT',
    label: 'Tarea',
    icon: 'task',
    fields: [
      {
        name: 'description',
        label: 'Descripción',
        type: 'text',
        validators: [Validators.required, Validators.maxLength(50)],
        placeholder: 'Ej: Carga de camión'
      },
      {
        name: 'extendedText',
        label: 'Texto Extendido',
        type: 'text',
        validators: [Validators.maxLength(500)],
        placeholder: 'Información adicional (opcional)'
      }
    ]
  },
  '+RKY': {
    code: '+RKY',
    label: 'Consecuencia',
    icon: 'warning',
    fields: [
      {
        name: 'description',
        label: 'Descripción',
        type: 'text',
        validators: [Validators.required, Validators.maxLength(50)],
        placeholder: 'Ej: Lesión personal'
      },
      {
        name: 'extendedText',
        label: 'Texto Extendido',
        type: 'text',
        validators: [Validators.maxLength(500)],
        placeholder: 'Información adicional (opcional)'
      }
    ]
  },
  '+RKR': {
    code: '+RKR',
    label: 'Riesgo',
    icon: 'report',
    fields: [
      {
        name: 'description',
        label: 'Descripción',
        type: 'text',
        validators: [Validators.required, Validators.maxLength(50)],
        placeholder: 'Ej: Caída de altura'
      },
      {
        name: 'extendedText',
        label: 'Texto Extendido',
        type: 'text',
        validators: [Validators.maxLength(500)],
        placeholder: 'Información adicional (opcional)'
      }
    ]
  },
  '+RKB': {
    code: '+RKB',
    label: 'Barrera',
    icon: 'shield',
    fields: [
      {
        name: 'description',
        label: 'Descripción',
        type: 'text',
        validators: [Validators.required, Validators.maxLength(50)],
        placeholder: 'Ej: Arnés de seguridad'
      },
      {
        name: 'extendedText',
        label: 'Texto Extendido',
        type: 'text',
        validators: [Validators.maxLength(500)],
        placeholder: 'Información adicional (opcional)'
      }
    ]
  },
  '+RKF': {
    code: '+RKF',
    label: 'Fase',
    icon: 'timeline',
    fields: [
      {
        name: 'description',
        label: 'Descripción',
        type: 'text',
        validators: [Validators.required, Validators.maxLength(50)],
        placeholder: 'Ej: Fase de operación'
      },
      {
        name: 'extendedText',
        label: 'Texto Extendido',
        type: 'text',
        validators: [Validators.maxLength(500)],
        placeholder: 'Información adicional (opcional)'
      }
    ]
  }
};

@Component({
  selector: 'app-nueva-entidad',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatBadgeModule,
    TextFieldModule
  ],
  templateUrl: './nueva-entidad.component.html',
  styleUrls: ['./nueva-entidad.component.scss']
})
export class NuevaEntidadComponent implements OnInit {
  // ==================== INYECCIONES ====================
  private readonly fb = inject(FormBuilder);
  private readonly hierarchyService = inject(HierarchyService);
  private readonly dialogRef = inject(MatDialogRef<NuevaEntidadComponent>);
  private readonly alertService = inject(AlertService);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  // ==================== SIGNALS ====================
  entityForm!: FormGroup;
  readonly entities = signal<EntityRequest[]>([]);
  readonly isProcessing = signal(false);
  readonly currentEntityType = signal<EntityType | null>(null);
  readonly processedCount = signal(0);
  readonly formValid = signal(false);
  readonly lastAddedIndex = signal<number | null>(null);

  // ==================== COMPUTED ====================
  readonly canAddEntity = computed(() =>
    this.formValid() && !this.isProcessing()
  );

  readonly canSave = computed(() =>
    this.entities().length > 0 && !this.isProcessing()
  );

  readonly pendingCount = computed(() =>
    this.entities().filter(e => e.status === 'pending').length
  );

  readonly successCount = computed(() =>
    this.entities().filter(e => e.status === 'success').length
  );

  readonly errorCount = computed(() =>
    this.entities().filter(e => e.status === 'error').length
  );

  readonly totalCount = computed(() => this.entities().length);

  readonly progressPercentage = computed(() => {
    const total = this.totalCount();
    if (total === 0) return 0;
    return Math.round((this.processedCount() / total) * 100);
  });

  // ==================== CONSTANTES ====================
  private readonly REQUEST_TIMEOUT = 30000;
  private readonly MAX_RETRIES = 2;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 500;

  // ==================== LIFECYCLE ====================
  constructor() {
    const entityType = ENTITY_TYPES[this.data.tabla];

    if (!entityType) {
      console.error('❌ Tipo de entidad no configurado:', this.data.tabla);
      this.alertService.error('Error', 'Tipo de entidad no válido');
      this.dialogRef.close();
      return;
    }

    this.currentEntityType.set(entityType);
    this.entityForm = this.createForm(entityType);
  }

  ngOnInit(): void {
    console.log('📋 NuevaEntidadComponent inicializado');
    console.log('📊 Tipo de entidad:', this.data.tabla);
    console.log('🏷️ Label:', this.currentEntityType()?.label);
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private createForm(entityType: EntityType): FormGroup {
    const formConfig: any = {};

    entityType.fields.forEach(field => {
      formConfig[field.name] = ['', field.validators];
    });

    const form = this.fb.group(formConfig);

    form.statusChanges.subscribe(status => {
      this.formValid.set(status === 'VALID');
    });

    this.formValid.set(form.valid);

    return form;
  }

  private buildRequestBody(entity: EntityRequest): any {
    const body = {
      atts: [
        { name: 'scriptName', value: 'coemdr' },
        { name: 'action', value: 'CREATE_DEFINITION' },
        { name: 'type', value: this.currentEntityType()?.code },
        { name: 'description', value: entity.description },
        { name: 'extendedText', value: entity.extendedText || '' }
      ]
    };

    console.log('📤 REQUEST BODY:', JSON.stringify(body, null, 2));
    return body;
  }

  private createEntityRequest(entity: EntityRequest) {
    const body = this.buildRequestBody(entity);

    if (typeof this.hierarchyService.executeGenericAction !== 'function') {
      console.error('❌ El método executeGenericAction no existe en HierarchyService');
      return of({
        success: false,
        error: 'Método executeGenericAction no disponible'
      } as BackendResponse);
    }

    return this.hierarchyService.executeGenericAction(body).pipe(
      timeout(this.REQUEST_TIMEOUT),
      retry(this.MAX_RETRIES),
      tap((response) => {
        console.log('📥 RESPONSE COMPLETA:', JSON.stringify(response, null, 2));
        console.log('✅ Entidad procesada exitosamente: "' + entity.description + '"');
      }),
      catchError(error => {
        console.error('❌ Error procesando entidad "' + entity.description + '":', error);
        console.error('❌ Error completo:', JSON.stringify(error, null, 2));

        let errorMessage = 'Error desconocido';

        if (error.name === 'TimeoutError') {
          errorMessage = 'Tiempo de espera excedido';
        } else if (error.status === 0) {
          errorMessage = 'Error de conexión al servidor';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        return of({
          success: false,
          error: errorMessage
        } as BackendResponse);
      })
    );
  }

  private updateEntityStatus(
    entity: EntityRequest,
    status: EntityRequest['status'],
    mensaje?: string
  ): void {
    this.entities.update(current =>
      current.map(e =>
        e.timestamp === entity.timestamp
          ? { ...e, status, mensaje }
          : e
      )
    );
  }

  private extractMessage(response: BackendResponse): string {
    console.log('🔍 Extrayendo mensaje de response:', JSON.stringify(response, null, 2));

    try {
      if (!response.success) {
        console.log('❌ Response.success es false, error:', response.error);
        return response.error || 'Error en la creación';
      }

      const atts = response.data?.[0]?.atts;
      console.log('📋 Atributos encontrados:', atts);

      if (atts && Array.isArray(atts)) {
        const messageAtt = atts.find((att: any) =>
          ['message', 'resultado', 'msg', 'response'].includes(att.name)
        );

        if (messageAtt?.value) {
          console.log('✅ Mensaje encontrado en atributo:', messageAtt.value);
          return messageAtt.value;
        }

        if (atts.length > 1 && atts[1]?.value) {
          console.log('✅ Mensaje encontrado en atts[1]:', atts[1].value);
          return atts[1].value;
        }
      }

      if (response.message) {
        console.log('✅ Mensaje encontrado en response.message:', response.message);
        return response.message;
      }

      console.log('ℹ️ No se encontró mensaje específico, usando mensaje por defecto');
      return 'Creado exitosamente';
    } catch (error) {
      console.error('⚠️ Error extrayendo mensaje de respuesta:', error);
      return 'Proceso completado';
    }
  }

  private async showFinalSummary(): Promise<void> {
    const total = this.totalCount();
    const success = this.successCount();
    const errors = this.errorCount();
    const entityLabel = this.currentEntityType()?.label || 'entidad';

    if (errors === 0) {
      await this.alertService.success(
        '¡Proceso Completado!',
        `${success} de ${total} ${entityLabel}(s) creadas exitosamente`
      );

      this.alertService.toast('success', `${success} elementos creados`, 2000);
    } else if (success > 0) {
      await this.alertService.warning(
        'Proceso Completado con Advertencias',
        undefined,
        `
          <div style="text-align: left; line-height: 1.8;">
            <p><strong>✅ Exitosas:</strong> ${success}</p>
            <p><strong>❌ Con errores:</strong> ${errors}</p>
            <p><strong>📊 Total:</strong> ${total}</p>
          </div>
        `
      );
    } else {
      await this.alertService.error(
        'Error en el Proceso',
        `No se pudo crear ninguna ${entityLabel}. Revisa los errores e intenta nuevamente.`
      );
    }
  }

  private focusDescriptionField(): void {
    setTimeout(() => {
      const descriptionInput = document.querySelector(
        'input[formControlName="description"]'
      ) as HTMLInputElement;
      descriptionInput?.focus();
    }, 100);
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  addEntity(): void {
    if (!this.canAddEntity()) {
      console.warn('⚠️ No se puede agregar - Form válido:', this.formValid(), 'Procesando:', this.isProcessing());
      return;
    }

    const formValue = this.entityForm.value;
    const description = formValue.description.trim();

    const isDuplicate = this.entities().some(e =>
      e.description.toLowerCase() === description.toLowerCase()
    );

    if (isDuplicate) {
      this.alertService.warning(
        'Descripción duplicada',
        'Ya existe un elemento con esta descripción. Por favor, usa una descripción diferente.'
      );
      return;
    }

    const newEntity: EntityRequest = {
      description,
      extendedText: formValue.extendedText?.trim() || '',
      status: 'pending',
      timestamp: Date.now()
    };

    const currentLength = this.entities().length;
    this.entities.update(current => [...current, newEntity]);

    this.lastAddedIndex.set(currentLength);
    setTimeout(() => this.lastAddedIndex.set(null), 2000);

    this.entityForm.reset();
    this.alertService.toast('success', `${this.currentEntityType()?.label} agregada`, 1500);

    console.log('✅ Entidad agregada:', newEntity);
    console.log('📊 Total de entidades:', this.entities().length);

    this.focusDescriptionField();
  }

  async removeEntity(index: number): Promise<void> {
    const entity = this.entities()[index];

    if (entity.status === 'success') {
      const result = await this.alertService.confirm({
        title: 'Eliminar elemento procesado',
        text: '¿Estás seguro? Este elemento ya fue creado exitosamente.',
        icon: 'warning',
        confirmButtonText: 'Sí, eliminar'
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    this.entities.update(current => current.filter((_, i) => i !== index));
    this.alertService.toast('info', 'Elemento eliminado', 1500);

    console.log('🗑️ Entidad eliminada, restantes:', this.entities().length);
  }

  async saveAll(): Promise<void> {
    if (!this.canSave()) {
      return;
    }

    const entitiesToSave = this.entities().filter(e => e.status === 'pending');

    if (entitiesToSave.length === 0) {
      await this.alertService.info(
        'Sin elementos pendientes',
        'Todos los elementos ya han sido procesados'
      );
      return;
    }

    const entityLabel = this.currentEntityType()?.label || 'entidad';
    const result = await this.alertService.confirm({
      title: `Guardar ${entitiesToSave.length} ${entityLabel}(s)`,
      text: '¿Desea proceder con la creación?',
      icon: 'question',
      confirmButtonText: 'Sí, guardar'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.isProcessing.set(true);
    this.processedCount.set(0);

    this.alertService.showLoading(
      'Procesando...',
      `0 de ${entitiesToSave.length} completados`
    );

    try {
      console.log('🚀 Iniciando guardado de', entitiesToSave.length, 'entidades');

      const totalBatches = Math.ceil(entitiesToSave.length / this.BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * this.BATCH_SIZE;
        const endIndex = Math.min(startIndex + this.BATCH_SIZE, entitiesToSave.length);
        const batch = entitiesToSave.slice(startIndex, endIndex);

        console.log(`📦 Procesando lote ${batchIndex + 1}/${totalBatches} (${batch.length} items)`);

        batch.forEach(entity => {
          this.updateEntityStatus(entity, 'processing');
        });

        const batchRequests = batch.map(entity =>
          this.createEntityRequest(entity)
        );

        const batchResults = await forkJoin(batchRequests).toPromise();

        batch.forEach((entity, localIndex) => {
          if (batchResults) {
            const response = batchResults[localIndex];
            const success = response?.success !== false;
            const mensaje = this.extractMessage(response);

            console.log(`📊 Procesando resultado para "${entity.description}":`);
            console.log(`   - Response.success: ${response?.success}`);
            console.log(`   - Evaluado como: ${success ? 'ÉXITO' : 'ERROR'}`);
            console.log(`   - Mensaje: ${mensaje}`);

            this.updateEntityStatus(
              entity,
              success ? 'success' : 'error',
              mensaje
            );

            this.processedCount.update(c => c + 1);

            this.alertService.showLoading(
              'Procesando...',
              `${this.processedCount()} de ${entitiesToSave.length} completados`
            );
          }
        });

        if (batchIndex < totalBatches - 1) {
          await timer(this.BATCH_DELAY).toPromise();
        }
      }

      console.log('✅ Proceso completado');
      console.log('📊 Exitosas:', this.successCount());
      console.log('❌ Con errores:', this.errorCount());

      this.alertService.closeLoading();
      await this.showFinalSummary();

    } catch (error) {
      console.error('❌ Error crítico en el proceso:', error);
      this.alertService.closeLoading();
      await this.alertService.error(
        'Error Crítico',
        'Ocurrió un error inesperado. Por favor, intenta nuevamente.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  async close(): Promise<void> {
    if (this.isProcessing()) {
      await this.alertService.warning(
        'Proceso en ejecución',
        'Hay un proceso en ejecución. Por favor espera a que termine.'
      );
      return;
    }

    if (this.pendingCount() > 0) {
      const result = await this.alertService.confirm({
        title: 'Cerrar sin guardar',
        text: `Tienes ${this.pendingCount()} elemento(s) sin guardar. ¿Deseas cerrar de todos modos?`,
        icon: 'warning',
        confirmButtonText: 'Sí, cerrar'
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    const successfulEntities = this.entities().filter(e => e.status === 'success');
    this.dialogRef.close(
      successfulEntities.length > 0
        ? { success: true, count: successfulEntities.length }
        : null
    );
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.entityForm.get(fieldName);
    return !!(field?.errors && field?.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.entityForm.get(fieldName);
    if (!field?.errors) return '';

    if (field.errors['required']) return 'Campo obligatorio';
    if (field.errors['maxlength']) {
      return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }

    return 'Campo inválido';
  }

  async clearAll(): Promise<void> {
    if (this.entities().length === 0) return;

    const result = await this.alertService.confirm({
      title: 'Limpiar todo',
      text: '¿Deseas eliminar todos los elementos de la lista?',
      icon: 'warning',
      confirmButtonText: 'Sí, limpiar'
    });

    if (result.isConfirmed) {
      this.entities.set([]);
      this.lastAddedIndex.set(null);
      this.alertService.toast('info', 'Lista limpiada', 1500);
      console.log('🧹 Lista de entidades limpiada');
    }
  }

  isNewlyAdded(index: number): boolean {
    return this.lastAddedIndex() === index;
  }

  getDescriptionLength(): number {
    return this.entityForm.get('description')?.value?.length || 0;
  }

  isDescriptionNearLimit(): boolean {
    return this.getDescriptionLength() > 40;
  }
}
