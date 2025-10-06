import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import Swal2 from 'sweetalert2';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ApprovalFlowService {

  private apiUrl = '/MatrizRsk/api/values/generic';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'bearer ' + localStorage.getItem('tk')
    });
  }

  /**
   * Método generic limpio del legacy
   */
  generic(atts: any[]): Observable<any> {
    const body = { atts };
    return this.http.post<any>(this.apiUrl, body, { headers: this.getHeaders() });
  }

  /**
   * Determina qué botón mostrar según permisos y estado
   */
  botonesFlujoAprobacion(parametros: string[]): string {
     const [allow, statusId, canAdd] = parametros;

  console.log('🔍 botonesFlujoAprobacion - Input:', { allow, statusId, canAdd });

  // Estados donde NO se muestran botones (flujo terminado/archivado)
  if (statusId === '008' || statusId === '009' || statusId === '010') {
    console.log('❌ Estado de flujo terminado, no mostrar botones');
    return '';
  }

  if (!allow || allow.trim() === '') {
    console.log('❌ Allow está vacío');
    return '';
  }

  // Administrador puede todo
  if (allow.includes('administrador')) {
    if (statusId === '004') return 'validar';
    if (statusId === '007') return 'aprobar';
    if (statusId === '001' || statusId === '002' || statusId === '006') return 'enviar-validar';
  }

  // Creador
  if (allow.includes('creacion') && canAdd === 'Y') {
    if (statusId === '001' || statusId === '002' || statusId === '006') return 'enviar-validar';
  }

  // Validador
  if (allow.includes('validacion')) {
    if (statusId === '004') return 'validar';
  }

  // Aprobador
  if (allow.includes('aprobacion') || allow.includes('aprobador')) {
    if (statusId === '007') return 'aprobar';
  }

  console.log('❌ No hay coincidencias para mostrar botones');
  return '';
  }

  /**
   * Mensaje de flujo limpio del legacy
   */
  mensajeFlujoAprobacion(titulo: string): void {
    Swal2.fire({
      title: titulo,
      text: 'Verifique en el icono de notificaciones, que la solicitud ha sido ejecutada exitosamente',
      imageUrl: 'assets/images/notificacion.png',
      imageWidth: 150,
      imageHeight: 150,
      imageAlt: 'Notificacion',
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    });

    this.router.navigate(['/rkmain']);
  }

  /**
   * Generar reporte limpio del legacy
   */
  generarReporte(key: string): Observable<any> {
    const atts = [
      { name: 'scriptName', value: 'coemdr' },
      { name: 'action', value: 'SEND_REPORT_MDR' },
      { name: 'key', value: key }
    ];

    return this.generic(atts);
  }
}
