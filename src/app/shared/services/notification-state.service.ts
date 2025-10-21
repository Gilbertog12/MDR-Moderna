import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HierarchyService } from '../../layout/rkmain/services/hierarchy.service';


/**
 * Servicio centralizado para gestionar el estado de notificaciones
 * Usa Signals para reactividad moderna sin subscriptions
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationStateService {
  private readonly hierarchyService = inject(HierarchyService);

  // Signal principal del contador
  private readonly _count = signal(0);

  // Signal para forzar refresh
  private readonly _refreshTrigger = signal(0);

  // Signal de loading
  private readonly _loading = signal(false);

  // Señal de última actualización
  private readonly _lastUpdate = signal<Date | null>(null);

  // Señales públicas (readonly)
  readonly count = this._count.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly lastUpdate = this._lastUpdate.asReadonly();

  // Computed para saber si hay notificaciones
  readonly hasNotifications = computed(() => this._count() > 0);

  // Computed para el tooltip
  readonly tooltip = computed(() => {
    const count = this._count();
    if (count === 0) return 'No hay notificaciones';
    if (count === 1) return '1 notificación pendiente';
    return `${count} notificaciones pendientes`;
  });

  constructor() {
    // Cargar el contador inicial
    this.loadCount();

    // Effect para recargar cuando cambie el trigger
    effect(() => {
      const trigger = this._refreshTrigger();
      if (trigger > 0) {
        this.loadCount();
      }
    });
  }

  /**
   * Carga el contador de notificaciones desde el servidor
   * Obtiene la lista completa y cuenta el array
   */
  private loadCount(): void {
    this._loading.set(true);

    this.hierarchyService.getNotificaciones().subscribe({
      next: (response) => {
        console.log('📬 Respuesta de getNotificaciones:', response);

        if (response.success && response.data) {
          // Contar el número de notificaciones en el array
          const count = response.data.length;
          console.log('📊 Contador de notificaciones:', count);
          this._count.set(count);
          this._lastUpdate.set(new Date());
        } else {
          console.warn('⚠️ No hay datos de notificaciones en la respuesta');
          this._count.set(0);
        }
        this._loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error al cargar contador de notificaciones:', error);
        this._count.set(0);
        this._loading.set(false);
      }
    });
  }

  /**
   * Incrementa el contador localmente (optimistic update)
   * Se usa cuando se envía algo que genera una notificación
   */
  increment(amount: number = 1): void {
    this._count.update(current => current + amount);
    this._lastUpdate.set(new Date());
  }

  /**
   * Decrementa el contador localmente
   * Se usa cuando se eliminan notificaciones
   */
  decrement(amount: number = 1): void {
    this._count.update(current => Math.max(0, current - amount));
    this._lastUpdate.set(new Date());
  }

  /**
   * Establece el contador a un valor específico
   */
  setCount(count: number): void {
    this._count.set(Math.max(0, count));
    this._lastUpdate.set(new Date());
  }

  /**
   * Resetea el contador a cero
   */
  reset(): void {
    this._count.set(0);
    this._lastUpdate.set(new Date());
  }

  /**
   * Fuerza una recarga del contador desde el servidor
   */
  refresh(): void {
    this._refreshTrigger.update(v => v + 1);
  }

  /**
   * Notifica que se ha enviado algo que generará una notificación
   * Incrementa optimísticamente y luego refresca del servidor
   */
  notifyProcessStarted(): void {
    // Incremento optimista
    this.increment();

    // Refrescar del servidor después de un delay
    // para dar tiempo a que el backend genere la notificación
    setTimeout(() => this.refresh(), 2000);
  }

  /**
   * Notifica que se han eliminado notificaciones
   * @param deletedCount - Cantidad de notificaciones eliminadas
   */
  notifyDeleted(deletedCount: number): void {
    // Decremento optimista
    this.decrement(deletedCount);

    // Refrescar del servidor para confirmar
    setTimeout(() => this.refresh(), 1000);
  }
}
