import { Injectable } from '@angular/core';
import Swal, { SweetAlertResult, SweetAlertIcon } from 'sweetalert2';

interface ConfirmOptions {
  title: string;
  text?: string;
  html?: string;
  icon?: SweetAlertIcon;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
}

interface AlertOptions {
  title: string;
  text?: string;
  html?: string;
  icon?: SweetAlertIcon;
  confirmButtonText?: string;
}

interface ReasonRejectResult {
  isConfirmed: boolean;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {

    // Colores consistentes para toda la app
  private readonly colors = {
    primary: '#1976d2',
    success: '#4caf50',
    danger: '#f44336',
    warning: '#ff9800',
    cancel: '#9e9e9e'
  };

  /**
   * Muestra un diálogo de confirmación
   * @example
   * const result = await this.alertService.confirm({
   *   title: 'Validar Área',
   *   text: '¿Desea enviar a validar?'
   * });
   * if (result.isConfirmed) { ... }
   */
  async confirm(options: ConfirmOptions): Promise<SweetAlertResult> {
    return await Swal.fire({
      title: options.title,
      text: options.text,
      html: options.html,
      icon: options.icon || 'question',
      showCancelButton: options.showCancelButton ?? true,
      confirmButtonColor: this.colors.primary,
      cancelButtonColor: this.colors.cancel,
      confirmButtonText: options.confirmButtonText || 'Aceptar',
      cancelButtonText: options.cancelButtonText || 'Cancelar',
      reverseButtons: true,
      focusCancel: true
    });
  }

  /**
   * Muestra mensaje de éxito
   * @example
   * this.alertService.success('Validación exitosa', 'El proceso ha sido validado correctamente');
   */
  async success(title: string, text?: string, html?: string): Promise<SweetAlertResult> {
    return await Swal.fire({
      title,
      text,
      html,
      icon: 'success',
      confirmButtonColor: this.colors.success,
      confirmButtonText: 'Entendido',
      timer: 3000,
      timerProgressBar: true
    });
  }

  /**
   * Muestra mensaje de error
   * @example
   * this.alertService.error('Error', 'No se pudo validar el área');
   */
  async error(title: string, text?: string, html?: string): Promise<SweetAlertResult> {
    return await Swal.fire({
      title,
      text,
      html,
      icon: 'error',
      confirmButtonColor: this.colors.danger,
      confirmButtonText: 'Cerrar'
    });
  }

  /**
   * Muestra mensaje informativo
   * @example
   * this.alertService.info('Información', 'Número de items excedido: 150');
   */
  async info(title: string, text?: string, html?: string): Promise<SweetAlertResult> {
    return await Swal.fire({
      title,
      text,
      html,
      icon: 'info',
      confirmButtonColor: this.colors.primary,
      confirmButtonText: 'Entendido'
    });
  }

  /**
   * Muestra mensaje de advertencia
   * @example
   * this.alertService.warning('Advertencia', 'Esta acción no se puede deshacer');
   */
  async warning(title: string, text?: string, html?: string): Promise<SweetAlertResult> {
    return await Swal.fire({
      title,
      text,
      html,
      icon: 'warning',
      confirmButtonColor: this.colors.warning,
      confirmButtonText: 'Entendido'
    });
  }

  /**
   * Muestra modal para ingresar razón de rechazo
   * @example
   * const result = await this.alertService.reasonReject('Razón de Rechazo');
   * if (result.isConfirmed) {
   *   console.log(result.reason);
   * }
   */


  /**
   * Muestra loading indicator
   * @example
   * this.alertService.showLoading('Procesando...');
   * // ... operación async
   * this.alertService.closeLoading();
   */
  showLoading(title: string = 'Procesando...', text?: string): void {
    Swal.fire({
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  /**
   * Cierra el loading indicator
   */
  closeLoading(): void {
    Swal.close();
  }

  /**
   * Toast notification (esquina superior derecha)
   * @example
   * this.alertService.toast('success', 'Guardado correctamente');
   */
  toast(icon: SweetAlertIcon, title: string, timer: number = 3000): void {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    Toast.fire({
      icon,
      title
    });
  }

  /**
   * Confirmación de eliminación (configuración especial)
   * @example
   * const result = await this.alertService.confirmDelete('¿Eliminar este proceso?');
   */
  async confirmDelete(text: string = '¿Desea eliminar este elemento?'): Promise<SweetAlertResult> {
    return await Swal.fire({
      title: 'Confirmar Eliminación',
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: this.colors.danger,
      cancelButtonColor: this.colors.cancel,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: true
    });
  }


  async reasonReject(title: string): Promise<string | null> {
  const { value: reason } = await Swal.fire({
    title,
    input: 'textarea',
    inputPlaceholder: 'Ingrese la razón del rechazo...',
    showCancelButton: true,
    confirmButtonText: 'Rechazar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#d33',
    inputValidator: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Debe ingresar una razón';
      }
      return null;
    }
  });

  return reason || null;
}
}
