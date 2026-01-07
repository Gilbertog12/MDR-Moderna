import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';

import { environment } from '../../../environments/environment.development';
import { AuthService } from '../../../shared/services/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatTooltipModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit{




  private fb = inject(FormBuilder)
  private AuthService = inject(AuthService)
  private router = inject(Router);
  private route = inject(ActivatedRoute);


   loginForm!: FormGroup;
  hidePassword = true;

  errorMessage = '';
  ambiente = environment.ambiente

 ngOnInit() {
    this.initForm();
    this.loadRememberedUser();
  }

  private initForm() {
    this.loginForm = this.fb.group({
      username: ['rjavila', [Validators.required]],
      password: ['Colla2025!', [Validators.required]],
      rememberMe: [false]
    });
  }

   private loadRememberedUser() {
    const rememberedUser = localStorage.getItem('remembered_user');
    if (rememberedUser) {
      this.loginForm.patchValue({
        username: rememberedUser,
        rememberMe: true
      });
    }
  }

  onSubmit() {
   if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    return;
  }

  // this.isLoading = true;
  this.errorMessage = '';

  const { username, password } = this.loginForm.value;

  // El AuthService ahora maneja todo:
  // 1. Obtiene districts y positions
  // 2. Guarda availablePositions en localStorage
  // 3. Hace login con primer distrito/posición
  // 4. Obtiene y guarda el perfil
  this.AuthService.loginWithCredentials(username, password)
    .subscribe({
      next: (response) => {
        console.log('Login exitoso:', response);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/rkmain';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error) => {
        // this.isLoading = false;
        this.errorMessage = error?.error?.error_description || 'Error al iniciar sesión';

        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      },
      complete: () => {
        // this.isLoading = false;
      }
    });
  }

  showHelp() {
    console.log('Mostrar ayuda');
  }



}
