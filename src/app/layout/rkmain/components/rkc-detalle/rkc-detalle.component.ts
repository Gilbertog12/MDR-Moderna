import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RkcDetalleModel } from '../../../../shared/models/rkc-detail.interface';


/**
 * Componente standalone para mostrar el tab Detalle de RKC (Actividad)
 * Muestra una tabla con evaluación de riesgos en tres dimensiones:
 * - Seguridad y Salud Ocupacional
 * - Medio ambiente
 * - Operacional
 *
 * Cada dimensión muestra valores Puro y Residual
 */
@Component({
  selector: 'app-rkc-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rkc-detalle.component.html',
  styleUrls: ['./rkc-detalle.component.scss']
})
export class RkcDetalleComponent implements OnInit {

  /**
   * Lista de detalles a mostrar en la tabla
   */
  @Input() detalleList: RkcDetalleModel[] = [];

  /**
   * Indica si se está cargando la información
   */
  @Input() loading: boolean = false;

  /**
   * Altura personalizada del contenedor (opcional)
   * Por defecto: 500px
   */
  @Input() containerHeight: string = '500px';

  constructor() {}

  ngOnInit(): void {
    // Inicialización del componente
    this.validateInputs();
  }

  /**
   * Valida que los inputs sean correctos
   */
  private validateInputs(): void {
    if (!Array.isArray(this.detalleList)) {
      console.warn('RkcDetalleComponent: detalleList debe ser un array');
      this.detalleList = [];
    }
  }

  /**
   * Verifica si hay datos para mostrar
   */
  get hasData(): boolean {
    return this.detalleList && this.detalleList.length > 0;
  }

  /**
   * Retorna el número de registros
   */
  get recordCount(): number {
    return this.detalleList ? this.detalleList.length : 0;
  }
}
