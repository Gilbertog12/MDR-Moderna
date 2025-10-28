import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {MatDividerModule} from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { Position } from '../../models/user-info-model';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth/auth.service';
import { UserInfoService } from '../../services/user-info.service';

@Component({
  selector: 'app-cambio-posicion',
  imports: [
       CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    ReactiveFormsModule  // Solo ReactiveFormsModule, NO FormsModule
  ],
  templateUrl: './cambio-posicion.component.html',
  styleUrl: './cambio-posicion.component.scss'
})
export class CambioPosicionComponent {
  private readonly dialogRef = inject(MatDialogRef<CambioPosicionComponent>);
  private readonly userInfoService = inject(UserInfoService);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Signals
  readonly isSaving = signal(false);
  readonly hidePassword = signal(true);
  readonly selectedDistrict = signal<string | null>(null);
  readonly selectedPosition = signal<Position | null>(null);

  readonly currentUserInfo = this.userInfoService.userInfo;
  readonly positions = this.userInfoService.availablePositions;

  // Formulario reactivo completo
  changePositionForm = this.fb.group({
    district: [''],
    position: [null as Position | null],
    password: ['', [Validators.required, Validators.minLength(1)]]
  });

  constructor() {
    // Observar cambios en distrito para limpiar posición
    this.changePositionForm.get('district')?.valueChanges.subscribe(() => {
      this.changePositionForm.patchValue({ position: null });
    });
  }

  readonly uniqueDistricts = computed(() => {
    const districts = new Set(
      this.positions().map(p => p.districtDesc)
    );
    return Array.from(districts).sort();
  });

  readonly filteredPositions = computed(() => {
    const district = this.changePositionForm.get('district')?.value;
    if (!district) return [];
    return this.positions().filter(p => p.districtDesc === district);
  });

  readonly canSave = computed(() => {
    const form = this.changePositionForm;
    const hasPosition = !!form.get('position')?.value;
    const hasPassword = (form.get('password')?.value || '').trim().length > 0;
    return hasPosition && hasPassword && !this.isSaving();
  });

  onDistrictChange(): void {
    // Ya se maneja automáticamente en el constructor
  }

  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  // async onSave(): Promise<void> {
  //   const position = this.changePositionForm.get('position')?.value;
  //   const password = this.changePositionForm.get('password')?.value;

  //   console.log(position)

  //   if (!position || !password || this.changePositionForm.invalid) {
  //     this.changePositionForm.markAllAsTouched();
  //     return;
  //   }

  //   const username = this.currentUserInfo()?.usuario;
  //   if (!username) {
  //     await this.alertService.error('Error', 'No se pudo obtener el usuario');
  //     return;
  //   }

  //   // const password = this.passwordForm.value.password!;

  //   this.isSaving.set(true);

  //   try {
  //     // Re-autenticar con la nueva posición
  //     const loginResult = await this.authService.loginWithCredentialsAndPosition(
  //       username,
  //       password,
  //       position.districtDesc,
  //       position.positionDesc
  //     ).toPromise();

  //     if (loginResult) {
  //       await this.alertService.success(
  //         'Posición Actualizada',
  //         `Sesión iniciada con: ${position.positionDesc}`
  //       );

  //       // Notificar al servicio
  //       this.userInfoService.refreshUserData();

  //       // Cerrar modal
  //       this.dialogRef.close(true);

  //       // Recargar la página para refrescar todo el estado
  //       window.location.reload();
  //     } else {
  //       await this.alertService.error(
  //         'Error',
  //         'Credenciales inválidas o no se pudo cambiar la posición'
  //       );
  //     }
  //   } catch (error: any) {
  //     console.error('Error cambiando posición:', error);
  //     await this.alertService.error(
  //       'Error',
  //       error?.error?.error_description || 'Ocurrió un error al cambiar la posición'
  //     );
  //   } finally {
  //     this.isSaving.set(false);
  //   }
  // }
}
