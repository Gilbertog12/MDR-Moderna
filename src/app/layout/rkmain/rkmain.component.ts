import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs/operators';
import { TreeSidebarComponent } from './components/tree-sidebar/tree-sidebar.component';

@Component({
  selector: 'app-rkmain',
  imports: [
        CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
    TreeSidebarComponent
  ],
  templateUrl: './rkmain.component.html',
  styleUrl: './rkmain.component.scss'
})
export class RkmainComponent implements OnInit {

   private router = inject(Router);

  // Estado
  sidenavOpened = signal<boolean>(true);
  currentRoute = signal<string>('');
  breadcrumbs = signal<string[]>([]);
  notificationCount = signal<number>(0);

  // Usuario
  usuario = signal<string>('');
  distrito = signal<string>('');
  posicion = signal<string>('');

  ngOnInit(): void {
    this.loadUserInfo();
    this.setupRouteListener();
    this.loadNotifications();
  }

   /**
   * Carga información del usuario desde localStorage
   */
  private loadUserInfo(): void {
    this.usuario.set(localStorage.getItem('Usuario') || '');
    this.distrito.set(localStorage.getItem('Distrito') || '');
    this.posicion.set(localStorage.getItem('Posicion') || '');
  }

  /**
   * Escucha cambios de ruta para actualizar breadcrumb
   */
  private setupRouteListener(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.urlAfterRedirects);
        this.updateBreadcrumbs(event.urlAfterRedirects);
      });
  }
   /**
   * Actualiza el breadcrumb según la ruta actual
   */
  private updateBreadcrumbs(url: string): void {
    const segments = url.split('/').filter(s => s && s !== 'rkmain');
    const breadcrumbs: string[] = [];

    if (segments.length > 0) {
      const levelMap: Record<string, string> = {
        'rka': 'Área',
        'rkp': 'Proceso',
        'rks': 'Subproceso',
        'rkc': 'Actividad',
        'rkt': 'Tarea',
        'rkd': 'Dimensión',
        'rkr': 'Riesgo',
        'rky': 'Consecuencia'
      };

      const level = segments[0];
      if (levelMap[level]) {
        breadcrumbs.push(levelMap[level]);
      }
    }

    this.breadcrumbs.set(breadcrumbs);
  }

  /**
   * Carga el contador de notificaciones
   */
  private loadNotifications(): void {
    const count = localStorage.getItem('notificaciones');
    this.notificationCount.set(count ? parseInt(count, 10) : 0);
  }

  /**
   * Alterna el sidenav
   */
  toggleSidenav(): void {
    this.sidenavOpened.set(!this.sidenavOpened());
  }

  /**
   * Navega al dashboard
   */
  goToDashboard(): void {
    this.router.navigate(['/rkmain']);
  }

  /**
   * Muestra notificaciones
   */
  showNotifications(): void {
    console.log('Mostrar notificaciones');
    // TODO: Abrir modal de notificaciones
  }

  /**
   * Muestra ayuda
   */
  showHelp(): void {
    console.log('Mostrar ayuda');
    // TODO: Abrir modal de ayuda
  }

  /**
   * Muestra leyenda de estados
   */
  showLegend(): void {
    console.log('Mostrar leyenda');
    // TODO: Abrir modal de leyenda
  }

  /**
   * Cierra sesión
   */
  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

}
