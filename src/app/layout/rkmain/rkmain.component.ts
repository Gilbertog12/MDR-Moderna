import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { filter } from 'rxjs/operators';
import { TreeSidebarComponent } from './components/tree-sidebar/tree-sidebar.component';
// import { AppHeaderComponent } from './components/app-header/app-header.component';
import { AppHeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-rkmain',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    TreeSidebarComponent,
    AppHeaderComponent
  ],
  templateUrl: './rkmain.component.html',
  styleUrl: './rkmain.component.scss'
})
export class RkmainComponent implements OnInit {

  private router = inject(Router);

  // Estado
  sidenavOpened = signal<boolean>(true);
  sidenavMode = signal<'side' | 'over'>('side');
  isMobile = signal<boolean>(false);
  currentRoute = signal<string>('');
  breadcrumbs = signal<string[]>([]);
  notificationCount = signal<number>(0);

  // Usuario
  usuario = signal<string>('');
  distrito = signal<string>('');
  posicion = signal<string>('');

  // Breakpoints
  private readonly MOBILE_BREAKPOINT = 768;
  private readonly DESKTOP_LARGE_BREAKPOINT = 1920;

  ngOnInit(): void {
    this.loadUserInfo();
    this.setupRouteListener();
    this.loadNotifications();
    this.checkScreenSize();
  }

  /**
   * Detecta cambios en el tamaño de la ventana
   */
  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  /**
   * Verifica el tamaño de pantalla y ajusta el sidenav
   */
  private checkScreenSize(): void {
    const width = window.innerWidth;
    const wasMobile = this.isMobile();

    this.isMobile.set(width < this.MOBILE_BREAKPOINT);

    if (width < this.MOBILE_BREAKPOINT) {
      // Mobile: modo overlay, cerrado por defecto
      this.sidenavMode.set('over');
      if (!wasMobile) {
        this.sidenavOpened.set(false);
      }
    } else {
      // Desktop/Tablet: modo side, abierto por defecto
      this.sidenavMode.set('side');
      if (wasMobile) {
        this.sidenavOpened.set(true);
      }
    }
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

        // Cerrar sidenav en móvil al navegar
        if (this.isMobile()) {
          this.sidenavOpened.set(false);
        }
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
