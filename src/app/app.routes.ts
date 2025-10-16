import { Routes } from '@angular/router';
import { RkmainComponent } from './layout/rkmain/rkmain.component';
import { DashboardComponent } from './features/dashboard/dashboard/dashboard.component';

export const routes: Routes = [
{
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'rkmain',
    loadComponent: () => import('./layout/rkmain/rkmain.component').then(m => m.RkmainComponent),
    // canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      // // RKA - Área
      {
        path: 'rka/:id',
        loadComponent: () => import('./features/risk-hierarchy/rka/rka.component').then(m => m.RkaComponent)
      },
      // // RKP - Proceso
      {
        path: 'rkp/:areaId/:procesoId',
        loadComponent: () => import('./features/risk-hierarchy/rkp/rkp.component').then(m => m.RkpComponent)
      },
      // // RKS - Subproceso
      {
        path: 'rks/:areaId/:procesoId/:subprocesoId',
        loadComponent: () => import('./features/risk-hierarchy/rks/rks.component').then(m => m.RksComponent)
      },
      // // RKC - Actividad
      {
        path: 'rkc/:areaId/:procesoId/:subprocesoId/:actividadId',
        loadComponent: () => import('./features/risk-hierarchy/rkc/rkc.component').then(m => m.RkcComponent)
      },
      // // RKT - Tarea
      {
        path: 'rkt/:areaId/:procesoId/:subprocesoId/:actividadId/:tareaId',
        loadComponent: () => import('./features/risk-hierarchy/rkt/rkt.component').then(m => m.RktComponent)
      },
      // // RKD - Dimensión
      {
        path: 'rkd/:areaId/:procesoId/:subprocesoId/:actividadId/:tareaId/:dimensionId',
        loadComponent: () => import('./features/risk-hierarchy/rkd/rkd.component').then(m => m.RkdComponent)
      },
      // // RKR - Riesgo
      {
        path: 'rkr/:areaId/:procesoId/:subprocesoId/:actividadId/:tareaId/:dimensionId/:riesgoId',
        loadComponent: () => import('./features/risk-hierarchy/rkr/rkr.component').then(m => m.RkrComponent)
      },
      // // RKY - Consecuencia
      {
        path: 'rky/:areaId/:procesoId/:subprocesoId/:actividadId/:tareaId/:dimensionId/:riesgoId/:consecuenciaId',
        loadComponent: () => import('./features/risk-hierarchy/rky/rky.component').then(m => m.RkyComponent)
      }
    ]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }

];
