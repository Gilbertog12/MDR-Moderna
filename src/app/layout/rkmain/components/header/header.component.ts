// header.component.ts - VERSIÓN FINAL CORRECTA

import { Component, input, output, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UserInfoService } from '../../../../shared/services/user-info.service';
import { NotificationStateService } from '../../../../shared/services/notification-state.service';

import { CambioPosicionComponent } from '../../../../shared/dialogs/cambio-posicion/cambio-posicion.component';
import { NotificacionesComponent } from '../notificaciones/notificaciones.component';
import { HierarchyService } from '../../services/hierarchy.service';
import { EntidadesPendientesComponent } from '../entidades-pendientes/entidades-pendientes.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
    MatChipsModule,
    MatDialogModule,
    EntidadesPendientesComponent
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class AppHeaderComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly userInfoService = inject(UserInfoService);
  private readonly notificationState = inject(NotificationStateService);
  private readonly hierarchyService = inject(HierarchyService);


  // Inputs
  breadcrumbs = input<string[]>([]);


  // Outputs
  toggleMenu = output<void>();
  navigateHome = output<void>();
  notificationsClick = output<void>();
  legendClick = output<void>();
  helpClick = output<void>();
  logoutClick = output<void>();
  entidadesPendientesClick = output<void>();

  // Signals del servicio de usuario
  readonly userInfo = this.userInfoService.userInfo;
  readonly permissions = this.userInfoService.permissions;
  readonly permissionsLabels = this.userInfoService.permissionsLabels;
  readonly appVersion = this.userInfoService.appVersion;
  readonly displayName = this.userInfoService.displayName;


  // ✅ Signals del servicio de notificaciones
  readonly solicitudesPendientes = signal(0);

  readonly notificationCount = this.notificationState.count;
  readonly notificationTooltip = this.notificationState.tooltip;
  readonly hasNotifications = this.notificationState.hasNotifications;

  // Computed para UI
  readonly ambienteColor = computed(() => {
    const ambiente = this.appVersion()?.ambiente;
    switch (ambiente) {
      case 'DESARROLLO':
        return 'accent';
      case 'TEST':
        return 'warn';
      case 'PRODUCTIVO':
        return 'primary';
      default:
        return 'primary';
    }
  });

  readonly ambienteLabel = computed(() => {
    const version = this.appVersion();
    if (!version) return '';
    return `${version.ambiente} - v${version.frontendVersion} / ${version.backendVersion}`;
  });

  readonly versionTooltip = computed(() => {
    const version = this.appVersion();
    if (!version) return '';
    return `Frontend: v${version.frontendVersion}\nBackend: ${version.backendVersion}\nÚltima compilación: ${version.fecha}`;
  });

  constructor(){
     this.userInfoService.initializeFromStorage();
    }

    ngOnInit(): void {

      // this.userInfoService.initializeFromStorage();

    this.userInfoService.fetchAppVersion().subscribe({
      next: (version) => {
        console.log('Versión del servidor:', version);
      },
      error: (error) => {
        console.log('Usando versión local (servidor no disponible)');
      }
    });

    this.userInfoService.notificaciones$.subscribe((refresh) => {
      if (refresh) {
        this.userInfoService.refreshUserData();
      }
    });

    this.loadSolicitudesPendientes();
  }

  onToggleMenu(): void {
    this.toggleMenu.emit();
  }

  onNavigateHome(): void {
    this.navigateHome.emit();
  }

  onNotifications(): void {
    const dialogRef = this.dialog.open(NotificacionesComponent, {
      width: '95vw',
      maxWidth: '1200px',
      maxHeight: '90vh',
      panelClass: 'notificaciones-dialog-container',
      disableClose: false,
      autoFocus: false,
      data: {
        button_confirm: 'Eliminar Seleccionadas'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result !== false) {
        this.eliminarNotificaciones(result);
      } else {
        this.notificationState.refresh();
      }
    });

    // También emitir el evento para el padre si es necesario
    this.notificationsClick.emit();
  }

  private eliminarNotificaciones(keys: string): void {

    const deletedCount = keys.split(',').length;

    this.hierarchyService.deleteNotificaciones(keys).subscribe({
      next: (response) => {


        if (response.success) {

          this.notificationState.notifyDeleted(deletedCount);
        } else {

        }
      },
      error: (error) => {

        console.error('Error:', error);
      }
    });
  }

  refreshNotifications(): void {
    this.notificationState.refresh();
  }

  onLegend(): void {
    this.legendClick.emit();
  }

  onHelp(): void {
    this.helpClick.emit();
  }

  onChangePosition(): void {
    const dialogRef = this.dialog.open(CambioPosicionComponent, {
      width: '700px',
      maxWidth: '90vw',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Posición cambiada exitosamente');
      }
    });
  }

  onLogout(): void {
    this.logoutClick.emit();
  }

  getPermissionIcon(label: string): string {
    switch (label) {
      case 'Aprobador':
        return 'verified';
      case 'Creador':
        return 'create';
      case 'Validador':
        return 'check_circle';
      case 'Consultor':
        return 'visibility';
      case 'Admin':
        return 'admin_panel_settings';
      default:
        return 'badge';
    }
  }

  getPermissionColor(label: string): string {
    switch (label) {
      case 'Aprobador':
        return 'primary';
      case 'Creador':
        return 'accent';
      case 'Validador':
        return 'warn';
      case 'Consultor':
        return '';
      case 'Admin':
        return 'primary';
      default:
        return '';
    }
  }

  // AGREGAR este método
/**
 * Carga el contador de solicitudes pendientes
 */
private loadSolicitudesPendientes(): void {
  const atts = [
    { name: 'scriptName', value: 'coemdr' },
    { name: 'action', value: 'LIST_DEFINITION' }
  ];

  this.hierarchyService.executeGenericAction({ atts }).subscribe({
    next: (response) => {
      if (response.success && response.data) {
        this.solicitudesPendientes.set(response.data.length);
      }
    },
    error: (error) => {
      console.error('Error al cargar solicitudes pendientes:', error);
    }
  });
}

// AGREGAR este método
/**
 * Abre el modal de entidades pendientes
 */
onEntidadesPendientes(): void {
  const dialogRef = this.dialog.open(EntidadesPendientesComponent, {
    width: '95vw',
    maxWidth: '1200px',
    maxHeight: '90vh',
    panelClass: 'entidades-dialog-container',
    disableClose: false,
    autoFocus: false
  });

  dialogRef.afterClosed().subscribe(result => {
    // Recargar el contador después de cerrar
    this.loadSolicitudesPendientes();

    if (result && result.success) {
      console.log('Acción realizada:', result.action);
      // Mostrar toast de confirmación
      if (result.action === 'enviar') {
        console.log('Solicitudes enviadas a aprobar');
      } else if (result.action === 'eliminar') {
        console.log('Solicitudes eliminadas');
      }
    }
  });

  // Emitir evento para el padre si es necesario
  this.entidadesPendientesClick.emit();
}

// AGREGAR computed para el tooltip (opcional)
readonly solicitudestooltip = computed(() => {
  const count = this.solicitudesPendientes();
  if (count === 0) return 'No hay solicitudes pendientes';
  if (count === 1) return '1 solicitud pendiente';
  return `${count} solicitudes pendientes`;
});
}
