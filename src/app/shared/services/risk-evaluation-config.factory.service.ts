import { Injectable } from '@angular/core';

export interface Permissions {
  canAdd: boolean;
  canModify: boolean;
  canDelete: boolean;
  isCreator: boolean;
}

export interface RiskEvaluationConfig {
  nivel: 'RKC' | 'RKT' | 'RKY';
  itemKey: string;
  permissions: Permissions;
  onItemClick?: (itemId: string) => void;
}

@Injectable({
  providedIn: 'root'
})
export class RiskEvaluationConfigFactory {

  createConfig(
    nivel: 'RKC' | 'RKT' | 'RKY',
    itemKey: string,
    permissions: Permissions,
    onItemClick?: (itemId: string) => void
  ): RiskEvaluationConfig {
    return {
      nivel,
      itemKey,
      permissions,
      onItemClick
    };
  }
}
