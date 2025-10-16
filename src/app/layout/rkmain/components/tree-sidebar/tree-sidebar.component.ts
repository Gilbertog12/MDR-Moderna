import { Component, OnInit, signal, inject, ViewChildren, ElementRef, QueryList, Renderer2, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CdkTreeModule, FlatTreeControl } from '@angular/cdk/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TreeDataSource } from './tree-data-source';
import { TreeNode, LEVEL_CONFIG, HierarchyLevel } from './tree-node.interface';
import { TreeNodeMapper } from './tree-node.mapper';
import { HierarchyService } from '../../services/hierarchy.service';
import { AlertService } from '../../../../shared/services/alert.service';
import { AddHierarchyItemComponent } from '../../../../shared/dialogs/add-hierarchy-item/add-hierarchy-item/add-hierarchy-item.component';
import { AddRkyComponent } from '../../../../shared/dialogs/add-hierarchy-item/add-rky/add-rky.component';


@Component({
  selector: 'app-tree-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    CdkTreeModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './tree-sidebar.component.html',
  styleUrls: ['./tree-sidebar.component.scss']
})
export class TreeSidebarComponent implements OnInit, AfterViewChecked {
  // Servicios
  private router = inject(Router);
  private hierarchyService = inject(HierarchyService);
  private alertService = inject(AlertService);
  private renderer = inject(Renderer2);
  private dialog = inject(MatDialog);

  // Tree control y data source
  treeControl!: FlatTreeControl<TreeNode>;
  dataSource!: TreeDataSource;

  // Estado reactivo
  selectedNode = signal<TreeNode | null>(null);
  copiedNode = signal<TreeNode | null>(null);
  isLoading = signal<boolean>(false);
  showApproved = signal<boolean>(false);

  // Referencias para highlight
  @ViewChildren('treeNode', { read: ElementRef }) treeNodes!: QueryList<ElementRef>;
  private hasListener: ElementRef[] = [];
  private oldHighlight?: ElementRef;

  ngOnInit() {
    this.initializeTree();
    this.loadInitialData();
  }

  ngAfterViewChecked() {
    this.setupNodeListeners();
  }

  /**
   * Inicializa el tree control y data source
   */
  private initializeTree(): void {
    this.treeControl = new FlatTreeControl<TreeNode>(
      node => node.level,
      node => node.expandable
    );

    this.dataSource = new TreeDataSource(
      this.treeControl,
      this.hierarchyService
    );
  }

  /**
   * Carga los datos iniciales del árbol
   */
  private loadInitialData(): void {
    this.isLoading.set(true);
    this.dataSource.loadRootLevel(this.showApproved());

    // Suscribirse al observable de loading del dataSource
    this.dataSource.loading$.subscribe(loading => {
      this.isLoading.set(loading);
    });
  }

  /**
   * Navega al detalle del nodo
   */
  navigateToNode(node: TreeNode): void {
    this.selectedNode.set(node);

    // Construir la ruta usando el mapper
    const route = TreeNodeMapper.buildRoute(node.key, node.level as HierarchyLevel);
    // console.log(route);
    // Guardar contexto en localStorage
    localStorage.setItem('currentNode', JSON.stringify({
      key: node.key,
      level: node.level,
      descripcion: node.descripcion
    }));

    // Navegar
    console.log(this.router.navigate([ route]));
  }

  /**
   * Refresca el árbol completo
   */
  async refreshTree(): Promise<void> {
    const result = await this.alertService.confirm({
      title: 'Refrescar Árbol',
      text: '¿Desea recargar el árbol completo?',
      icon: 'question'
    });

    if (result.isConfirmed) {
      this.isLoading.set(true);
      this.dataSource.loadRootLevel(this.showApproved());
      this.alertService.toast('success', 'Árbol actualizado');
    }
  }

  /**
   * Refresca un nodo específico
   */
  refreshNode(node: TreeNode): void {
    this.dataSource.refreshNode(node);
  }

  /**
   * Agrega un hijo al nodo seleccionado
   */
  async addChild(node: TreeNode): Promise<void> {
    // Validar permisos y estado del nodo
    if (!TreeNodeMapper.canAddChildren(node)) {
      await this.alertService.warning(
        'No permitido',
        'El nodo debe estar en estado de Creación o Aprobado para agregar elementos'
      );
      return;
    }

    this.selectedNode.set(node);

    // Determinar el siguiente nivel
    const nextLevel = (node.level + 1) as HierarchyLevel;
    const nextLevelConfig = LEVEL_CONFIG[nextLevel];

    if (!nextLevelConfig) {
      await this.alertService.error('Error', 'Nivel no válido');
      return;
    }

    // Si es RKY (Consecuencias), usar el modal especial
    if (nextLevel === 8) {
      this.openAddRkyDialog(node, nextLevelConfig.name);
    } else {
      // Para RKA-RKR, usar el modal genérico
      this.openAddGenericDialog(node, nextLevel, nextLevelConfig.name);
    }
  }

  /**
   * Abre modal genérico para RKA-RKR
   */
  private openAddGenericDialog(
    parentNode: TreeNode,
    level: number,
    levelName: string
  ): void {
    const dialogRef = this.dialog.open(AddHierarchyItemComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      panelClass: 'modern-dialog-container',
      data: {
        title: `Agregar ${levelName}`,
        level: this.getLevelCode(level),
        parentKeys: this.extractParentKeys(parentNode),
        showNewEntityButton: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refrescar el nodo padre para mostrar los nuevos hijos
        this.refreshNode(parentNode);
        this.alertService.toast('success', `${levelName} agregado correctamente`);
      }
    });
  }

  /**
   * Abre modal especial para RKY (Consecuencias)
   */
  private openAddRkyDialog(parentNode: TreeNode, levelName: string): void {
    const parentKeys = this.extractParentKeys(parentNode);

  console.log('🎯 Abriendo AddRkyComponent');
  console.log('📊 Parent Keys:', parentKeys);

  const dialogRef = this.dialog.open(AddRkyComponent, {
    width: '90vw',           // ⭐ 90% del ancho de viewport
    maxWidth: '1400px',      // ⭐ Máximo 1400px
    height: '85vh',          // ⭐ CRÍTICO: 85% de altura
    maxHeight: '900px',      // ⭐ Máximo 900px
    minHeight: '600px',      // ⭐ Mínimo 600px
    panelClass: 'rky-dialog', // ⭐ Clase CSS personalizada
    disableClose: false,     // Permitir cerrar con ESC
    autoFocus: false,        // No hacer autofocus automático
    data: {
      title: `Agregar ${levelName}`,
      // ✅ Pasar los IDs directamente en data (spread operator)
      ...parentKeys,
      showNewEntityButton: true
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      console.log('✅ Consecuencias agregadas exitosamente');
      this.refreshNode(parentNode);
      this.alertService.toast('success', `${levelName} agregado correctamente`);
    } else {
      console.log('❌ Modal cancelado');
    }
  });
  }

  /**
   * Convierte número de nivel a código (RKA, RKP, etc.)
   */
  private getLevelCode(level: number): string {
    const codes: Record<number, string> = {
      1: 'RKA',
      2: 'RKP',
      3: 'RKS',
      4: 'RKC',
      5: 'RKT',
      6: 'RKD',
      7: 'RKR',
      8: 'RKY'
    };
    return codes[level] || 'RKA';
  }

  /**
   * Extrae las keys del padre para enviar al modal
   */
  private extractParentKeys(node: TreeNode): any {
     // Usar el método del servicio para extraer IDs
  const ids = this.hierarchyService.extractIdsFromKey(node.key, node.level as HierarchyLevel);

  console.log('🔍 extractParentKeys para node:', node.key);
  console.log('📊 IDs extraídos:', ids);
  console.log('📊 Nivel del nodo:', node.level);

  const keys: any = {};

  // OPCIÓN 1: Si extractIdsFromKey() retorna IDs ya individuales
  // (lo más probable según el patrón del backend legacy)
  if (ids.length >= 1) keys.areaId = ids[0];           // Solo el ID del área
  if (ids.length >= 2) keys.procesoId = ids[1];        // Solo el ID del proceso
  if (ids.length >= 3) keys.subprocesoId = ids[2];     // Solo el ID del subproceso
  if (ids.length >= 4) keys.actividadId = ids[3];      // Solo el ID de la actividad
  if (ids.length >= 5) keys.tareaId = ids[4];          // Solo el ID de la tarea
  if (ids.length >= 6) keys.dimensionId = ids[5];      // Solo el ID de la dimensión
  if (ids.length >= 7) keys.riesgoId = ids[6];         // Solo el ID del riesgo

  console.log('✅ Keys extraídas:', keys);

  return keys;
  }

  /**
   * Copia un nodo
   */
  copyNode(node: TreeNode): void {
    if (!TreeNodeMapper.canCopyNode(node)) {
      this.alertService.warning(
        'No se puede copiar',
        'Este nodo no puede ser copiado'
      );
      return;
    }

    this.copiedNode.set(node);
    this.alertService.toast('success', 'Nodo copiado al portapapeles');
  }

  /**
   * Pega un nodo copiado
   */
  async pasteNode(targetNode: TreeNode): Promise<void> {
    const copied = this.copiedNode();

    if (!copied) {
      await this.alertService.warning(
        'Sin nodos copiados',
        'No hay ningún nodo en el portapapeles'
      );
      return;
    }

    const result = await this.alertService.confirm({
      title: 'Pegar Nodo',
      text: `¿Desea pegar "${copied.descripcion}" en "${targetNode.descripcion}"?`,
      icon: 'question'
    });

    if (result.isConfirmed) {
      this.isLoading.set(true);

      // Llamar al servicio para copiar
      this.hierarchyService.copyNode(targetNode.key, copied.key).subscribe({
        next: async () => {
          this.isLoading.set(false);
          this.copiedNode.set(null);
          this.refreshNode(targetNode);
          await this.alertService.success('Éxito', 'Nodo pegado correctamente');
        },
        error: async (error) => {
          this.isLoading.set(false);
          await this.alertService.error('Error', 'No se pudo pegar el nodo');
        }
      });
    }
  }

  /**
   * Elimina un nodo
   */
  async deleteNode(node: TreeNode): Promise<void> {
    if (!this.canShowDeleteButton(node)) {
      await this.alertService.warning(
        'No permitido',
        'Este nodo no puede ser eliminado'
      );
      return;
    }

    const result = await this.alertService.confirm({
      title: 'Eliminar Nodo',
      text: `¿Está seguro de eliminar "${node.descripcion}"? Esta acción no se puede deshacer.`,
      icon: 'warning'
    });

    if (result.isConfirmed) {
      this.isLoading.set(true);

      // Extraer IDs para la petición
      const ids = this.hierarchyService.extractIdsFromKey(node.key, node.level as HierarchyLevel);

      // Llamar al servicio para eliminar
      this.hierarchyService.deleteNode(node.level as HierarchyLevel, ids, node.version, node.status).subscribe({
        next: async () => {
          this.isLoading.set(false);
          await this.alertService.success(
            'Eliminado',
            'El nodo se eliminó correctamente'
          );
          // Refrescar el árbol
          this.loadInitialData();
        },
        error: async (error) => {
          this.isLoading.set(false);
          await this.alertService.error(
            'Error',
            error.message || 'No se pudo eliminar el nodo'
          );
        }
      });
    }
  }

  /**
   * Limpia el nodo copiado
   */
  clearCopied(): void {
    this.copiedNode.set(null);
    this.alertService.toast('info', 'Portapapeles limpio');
  }

  /**
   * Toggle mostrar aprobados
   */
  toggleShowApproved(): void {
    this.showApproved.update(v => !v);
    this.loadInitialData();
  }

  // ============================================
  // FUNCIONES DE AYUDA PARA LA PLANTILLA
  // ============================================

  hasChild = (_: number, node: TreeNode) => node.expandable;

  getLevel = (node: TreeNode) => node.level;

  isExpandable = (node: TreeNode) => node.expandable;

  getExpandIcon(node: TreeNode): string {
    if (node.level === 8) return 'remove';
    if (node.hijo === 'N') return 'remove';
    return this.treeControl.isExpanded(node) ? 'expand_more' : 'chevron_right';
  }

  getStatusClass(node: TreeNode): string {
    return TreeNodeMapper.getStatusClass(node.status);
  }

  getStatusIndicator(node: TreeNode): string {
    return TreeNodeMapper.getStatusIndicator(node);
  }

  getStatusTooltip(node: TreeNode): string {
    return TreeNodeMapper.getStatusTooltip(node);
  }

  canShowAddButton(node: TreeNode): boolean {
    return node.level < 8 &&
           node.permiso.startsWith('Y') &&
           TreeNodeMapper.canAddChildren(node);
  }

  canShowDeleteButton(node: TreeNode): boolean {
    return node.displayDeleteIcon === 'Y' && node.permiso.startsWith('Y');
  }

  canShowCopyButton(node: TreeNode): boolean {
    return TreeNodeMapper.canCopyNode(node) && node.level > 1;
  }

  canShowPasteButton(): boolean {
    return this.copiedNode() !== null;
  }

  canPaste(): boolean {
    return this.copiedNode() !== null;
  }

  getLevelPrefix(node: TreeNode): string {
    const config = LEVEL_CONFIG[node.level as keyof typeof LEVEL_CONFIG];
    return config?.prefix || '';
  }

  getLevelColor(node: TreeNode): string {
    const colors: Record<number, string> = {
      1: '#1976d2', // Azul - Área
      2: '#388e3c', // Verde - Proceso
      3: '#f57c00', // Naranja - Subproceso
      4: '#7b1fa2', // Púrpura - Actividad
      5: '#c2185b', // Rosa - Tarea
      6: '#0097a7', // Cyan - Dimensión
      7: '#d32f2f', // Rojo - Riesgo
      8: '#5d4037'  // Marrón - Consecuencia
    };
    return colors[node.level] || '#757575';
  }

  selectNode(node: TreeNode): void {
    this.navigateToNode(node);
  }

  getNodePadding(node: TreeNode): string {
    return `${node.level * 12}px`;
  }

  // ============================================
  // HIGHLIGHT DE NODO SELECCIONADO
  // ============================================

  private setupNodeListeners(): void {
    this.treeNodes.forEach((reference) => {
      if (!this.hasListener.includes(reference)) {
        this.renderer.listen(reference.nativeElement, 'click', () => {
          this.updateHighlight(reference);
        });
        this.hasListener.push(reference);
      }
    });

    this.hasListener = this.hasListener.filter(el =>
      document.contains(el.nativeElement)
    );
  }

  private updateHighlight(newHighlight: ElementRef): void {
    if (this.oldHighlight) {
      this.renderer.removeClass(
        this.oldHighlight.nativeElement,
        'node-selected'
      );
    }

    this.renderer.addClass(newHighlight.nativeElement, 'node-selected');
    this.oldHighlight = newHighlight;
  }
}
