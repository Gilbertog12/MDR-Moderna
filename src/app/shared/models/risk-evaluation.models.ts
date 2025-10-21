// models/risk-evaluation.models.ts

export type HierarchyLevel = 'RKA' | 'RKP' | 'RKS' | 'RKD' | 'RKR' | 'RKC' | 'RKT' | 'RKY';
export type ViewMode = 'TABLE' | 'FORM' | 'SUMMARY';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMPTY';

export interface RiskEvaluationConfig {
  nivel: HierarchyLevel;
  viewMode: ViewMode;
  itemKey: string;
  apiAction: string;
  columns?: ColumnConfig[];
  dimensions: DimensionConfig[];
  dataTransformer: (rawData: any[]) => any;
  readonly: boolean;
  canModify: boolean;
}

export interface ColumnConfig {
  id: string;
  label: string;
  type: 'text' | 'risk' | 'status';
  width?: string;
  sticky?: boolean;
}

export interface DimensionConfig {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  icon?: string;
}

export interface RiskTableData {
  id: string;
  description: string;
  ssoPuro: string;
  ssoResidual: string;
  maPuro: string;
  maResidual: string;
  opPuro: string;
  opResidual: string;
  status: string;
  pendingDelete: string;
}

export interface RiskFormData {
  pure: RiskMetrics;
  residual: RiskMetrics;
}

export interface RiskMetrics {
  probability: {
    id: string;
    desc: string;
  };
  severity: {
    id: string;
    desc: string;
  };
  mr: string;
  criticality: string;
  criticalityColor: string;
}

export interface RiskSummaryData {
  dimension: string;
  totalItems: number;
  pureRisk: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  residualRisk: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface Permissions {
  canAdd: boolean;
  canModify: boolean;
  canDelete: boolean;
  isCreator: boolean;
}
