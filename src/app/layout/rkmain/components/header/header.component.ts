import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class AppHeaderComponent {
  // Inputs
  breadcrumbs = input<string[]>([]);
  usuario = input<string>('');
  distrito = input<string>('');
  posicion = input<string>('');
  notificationCount = input<number>(0);

  // Outputs
  toggleMenu = output<void>();
  navigateHome = output<void>();
  notificationsClick = output<void>();
  legendClick = output<void>();
  helpClick = output<void>();
  logoutClick = output<void>();

  /**
   * Emite evento de toggle del menú
   */
  onToggleMenu(): void {
    this.toggleMenu.emit();
  }

  /**
   * Emite evento de navegación al home
   */
  onNavigateHome(): void {
    this.navigateHome.emit();
  }

  /**
   * Emite evento de notificaciones
   */
  onNotifications(): void {
    this.notificationsClick.emit();
  }

  /**
   * Emite evento de leyenda
   */
  onLegend(): void {
    this.legendClick.emit();
  }

  /**
   * Emite evento de ayuda
   */
  onHelp(): void {
    this.helpClick.emit();
  }

  /**
   * Emite evento de logout
   */
  onLogout(): void {
    this.logoutClick.emit();
  }
}
