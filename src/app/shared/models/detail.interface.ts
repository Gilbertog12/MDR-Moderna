export interface DetailItem {
  offset: string;
  tareaId: string;
  tareaDesc: string;
  riesgoId: string;
  riesgoDesc: string;
  consecuenciaId: string;
  consecuenciaDesc: string;

  // Medio Ambiente
  probabilidadM: string;
  severidadM: string;
  criticidadM: string;

  // Operacional
  probabilidadN: string;
  severidadN: string;
  criticidadN: string;

  // Seguridad
  probabilidadS: string;
  severidadS: string;
  criticidadS: string;
}



export interface DetailConfig {
  nivel: 'RKC' | 'RKT';
  areaId: string;
  procesoId: string;
  subprocesoId: string;
  actividadId: string;
  tareaId?: string; // Solo para RKT
}

export type RiskLevel = 'INTOLERABLE' | 'TOLERABLE' | 'INSIGNIFICANTE' | '';
