import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { HierarchyService } from '../../../../../layout/rkmain/services/hierarchy.service';

// ============================================
// TYPES - Type Safety First
// ============================================

export enum CriticalityLevel {
  INSIGNIFICANT = 'INSIGNIFICANTE',
  MODERATE = 'MODERADO',
  IMPORTANT = 'IMPORTANTE',
  UNACCEPTABLE = 'INACEPTABLE'
}

export interface CriticalityColor {
  hex: string;
  name: string;
  gradient: string;
}

export interface RiskEvaluation {
  probabilityId: string;
  probabilityDesc: string;
  severityId: string;
  severityDesc: string;
  criticalityId: string;
  criticalityDesc: string;
  criticalityLevel: CriticalityLevel | null;
  color: CriticalityColor;
}

export interface ListItem {
  id: string;
  description: string;
}

// ============================================
// SERVICE - Single Responsibility
// ============================================

@Injectable({
  providedIn: 'root'
})
export class RiskEvaluationService {
  private readonly hierarchyService = inject(HierarchyService);

  // Color mapping - Centralized and maintainable
  private readonly CRITICALITY_COLORS: ReadonlyMap<string, CriticalityColor> = new Map([
    // Level 1: Green (Low Risk)
    ['insignificante', { hex: '#4caf50', name: 'green', gradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)' }],
    ['bajo', { hex: '#4caf50', name: 'green', gradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)' }],
    ['tolerable', { hex: '#4caf50', name: 'green', gradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)' }],
    ['menor', { hex: '#4caf50', name: 'green', gradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)' }],
    ['verde', { hex: '#4caf50', name: 'green', gradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)' }],

    // Level 2: Yellow (Moderate Risk)
    ['moderado', { hex: '#fbc02d', name: 'yellow', gradient: 'linear-gradient(135deg, #fbc02d 0%, #f9a825 100%)' }],
    ['medio', { hex: '#fbc02d', name: 'yellow', gradient: 'linear-gradient(135deg, #fbc02d 0%, #f9a825 100%)' }],
    ['mediano', { hex: '#fbc02d', name: 'yellow', gradient: 'linear-gradient(135deg, #fbc02d 0%, #f9a825 100%)' }],
    ['amarillo', { hex: '#fbc02d', name: 'yellow', gradient: 'linear-gradient(135deg, #fbc02d 0%, #f9a825 100%)' }],

    // Level 3: Orange (High Risk)
    ['importante', { hex: '#ff9800', name: 'orange', gradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)' }],
    ['alto', { hex: '#ff9800', name: 'orange', gradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)' }],
    ['mayor', { hex: '#ff9800', name: 'orange', gradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)' }],
    ['naranja', { hex: '#ff9800', name: 'orange', gradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)' }],

    // Level 4: Red (Critical Risk)
    ['inaceptable', { hex: '#f44336', name: 'red', gradient: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)' }],
    ['crítico', { hex: '#f44336', name: 'red', gradient: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)' }],
    ['critico', { hex: '#f44336', name: 'red', gradient: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)' }],
    ['muy alto', { hex: '#f44336', name: 'red', gradient: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)' }],
    ['extremo', { hex: '#f44336', name: 'red', gradient: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)' }],
    ['rojo', { hex: '#f44336', name: 'red', gradient: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)' }]
  ]);

 private readonly HEX_TO_COLOR: ReadonlyMap<string, CriticalityColor> = new Map([
  // VERDES (Insignificante/Tolerable/Bajo)
  ['#00B600', { hex: '#4caf50', name: 'green', gradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)' }],
  ['#4CAF50', { hex: '#4caf50', name: 'green', gradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)' }],
  ['#00FF00', { hex: '#4caf50', name: 'green', gradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)' }],

  // AMARILLOS (Moderado/Tolerable)
  ['#FFFF00', { hex: '#fbc02d', name: 'yellow', gradient: 'linear-gradient(135deg, #fbc02d 0%, #f9a825 100%)' }],
  ['#FFFF01', { hex: '#fbc02d', name: 'yellow', gradient: 'linear-gradient(135deg, #fbc02d 0%, #f9a825 100%)' }],
  ['#FBC02D', { hex: '#fbc02d', name: 'yellow', gradient: 'linear-gradient(135deg, #fbc02d 0%, #f9a825 100%)' }],
  ['#FFEB3B', { hex: '#fbc02d', name: 'yellow', gradient: 'linear-gradient(135deg, #fbc02d 0%, #f9a825 100%)' }],

  // NARANJAS (Importante/Alto)
  ['#FF9800', { hex: '#ff9800', name: 'orange', gradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)' }],
  ['#FF8C00', { hex: '#ff9800', name: 'orange', gradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)' }],
  ['#FFA500', { hex: '#ff9800', name: 'orange', gradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)' }],

  // ROJOS (Inaceptable/Crítico)
  ['#FF0000', { hex: '#f44336', name: 'red', gradient: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)' }],
  ['#F44336', { hex: '#f44336', name: 'red', gradient: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)' }],
  ['#FF1744', { hex: '#f44336', name: 'red', gradient: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)' }],

  // GRISES (Default/Sin definir)
  ['#808080', { hex: '#9e9e9e', name: 'gray', gradient: 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)' }],
  ['#9E9E9E', { hex: '#9e9e9e', name: 'gray', gradient: 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)' }]
]);

  private readonly DEFAULT_COLOR: CriticalityColor = {
    hex: '#9e9e9e',
    name: 'gray',
    gradient: 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)'
  };

  /**
   * Get criticality color based on description
   * Pure function - testable and predictable
   */
 getCriticalityColor(description: string): CriticalityColor {
  if (!description) {
    console.warn('⚠️ Empty criticality description');
    return this.DEFAULT_COLOR;
  }

  const normalized = description.toLowerCase().trim();

  // 1. Check if it's a HEX code
  if (normalized.startsWith('#')) {
    const hexColor = this.HEX_TO_COLOR.get(normalized.toUpperCase());
    if (hexColor) {
      console.log('✅ HEX match found:', normalized, '→', hexColor.name);
      return hexColor;
    }
  }

  // 2. Exact match by description (O(1) lookup)
  const exactMatch = this.CRITICALITY_COLORS.get(normalized);
  if (exactMatch) {
    console.log('✅ Exact match found:', normalized, '→', exactMatch.name);
    return exactMatch;
  }

  // 3. Partial match (fallback)
  for (const [key, color] of this.CRITICALITY_COLORS.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      console.log('✅ Partial match found:', key, '→', color.name);
      return color;
    }
  }

  console.warn('⚠️ No color mapping found for:', description);
  return this.DEFAULT_COLOR;
}

  /**
   * Load probability list
   * Handles errors gracefully
   */
  loadProbabilityList(): Observable<ListItem[]> {
    return this.hierarchyService.executeGenericAction({
      atts: [
        { name: 'scriptName', value: 'coemdr' },
        { name: 'action', value: 'RKM_LIST' }
      ]
    }).pipe(
      map(response => {
        if (!response?.success || !response.data) {
          throw new Error('Invalid response from RKM_LIST');
        }

        return response.data
          .filter((el: any) => el.atts?.length >= 2)
          .map((el: any) => ({
            id: el.atts[0].value.trim(),
            description: el.atts[1].value.trim()
          }));
      }),
      catchError(error => {
        console.error('❌ Error loading probability list:', error);
        return of([]);
      })
    );
  }

  /**
   * Load severity list
   * Handles errors gracefully
   */
  loadSeverityList(): Observable<ListItem[]> {
    return this.hierarchyService.executeGenericAction({
      atts: [
        { name: 'scriptName', value: 'coemdr' },
        { name: 'action', value: 'RKN_LIST' }
      ]
    }).pipe(
      map(response => {
        if (!response?.success || !response.data) {
          throw new Error('Invalid response from RKN_LIST');
        }

        return response.data
          .filter((el: any) => el.atts?.length >= 2)
          .map((el: any) => ({
            id: el.atts[0].value.trim(),
            description: el.atts[1].value.trim()
          }));
      }),
      catchError(error => {
        console.error('❌ Error loading severity list:', error);
        return of([]);
      })
    );
  }

  /**
   * Calculate criticality based on probability and severity
   * Returns complete evaluation object
   */
  calculateCriticality(
    dimensionId: string,
    probabilityId: string,
    severityId: string,
    probabilityList: ListItem[],
    severityList: ListItem[]
  ): Observable<RiskEvaluation> {
    return this.hierarchyService.executeGenericAction({
      atts: [
        { name: 'scriptName', value: 'coemdr' },
        { name: 'action', value: 'READ_CRITICIDAD' },
        { name: 'dimensionId', value: dimensionId },
        { name: 'probabilidadId', value: probabilityId },
        { name: 'severidadId', value: severityId }
      ]
    }).pipe(
      map(response => {
        if (!response?.success || !response.data?.[0]?.atts || response.data[0].atts.length < 2) {
          throw new Error('Invalid criticality response');
        }

        const item = response.data[0];
        const criticalityId = item.atts[0].value.trim();
        const criticalityDesc = item.atts[1].value.trim();
        const color = this.getCriticalityColor(criticalityDesc);

        const probabilityDesc = probabilityList.find(p => p.id === probabilityId)?.description || '';
        const severityDesc = severityList.find(s => s.id === severityId)?.description || '';

        const evaluation: RiskEvaluation = {
          probabilityId,
          probabilityDesc,
          severityId,
          severityDesc,
          criticalityId,
          criticalityDesc,
          criticalityLevel: this.mapToCriticalityLevel(criticalityDesc),
          color
        };

        console.log('✅ Criticality calculated:', evaluation);
        return evaluation;
      }),
      catchError(error => {
        console.error('❌ Error calculating criticality:', error);
        throw error;
      })
    );
  }

  /**
   * Map description to enum level
   * Makes code more type-safe
   */
  private mapToCriticalityLevel(description: string): CriticalityLevel | null {
    const normalized = description.toLowerCase().trim();

    if (normalized.includes('insignificante') || normalized.includes('bajo') || normalized.includes('tolerable')) {
      return CriticalityLevel.INSIGNIFICANT;
    }
    if (normalized.includes('moderado') || normalized.includes('medio')) {
      return CriticalityLevel.MODERATE;
    }
    if (normalized.includes('importante') || normalized.includes('alto')) {
      return CriticalityLevel.IMPORTANT;
    }
    if (normalized.includes('inaceptable') || normalized.includes('crítico') || normalized.includes('critico')) {
      return CriticalityLevel.UNACCEPTABLE;
    }

    return null;
  }

  /**
   * Validate if risk evaluation is complete
   */
  isValidRiskEvaluation(evaluation: Partial<RiskEvaluation>): evaluation is RiskEvaluation {
    return !!(
      evaluation.probabilityId &&
      evaluation.severityId &&
      evaluation.criticalityId &&
      evaluation.color
    );
  }
}
