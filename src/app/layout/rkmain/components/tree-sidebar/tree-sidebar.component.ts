import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChildren, ElementRef, QueryList, Renderer2, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { CdkTreeModule, FlatTreeControl } from '@angular/cdk/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { Subject, takeUntil, filter } from 'rxjs';
import { TreeDataSource } from './tree-data-source';
import { TreeNode, LEVEL_CONFIG } from './tree-node.interface';
import { TreeNodeMapper } from './tree-node.mapper';
import { AlertService } from '../../../../shared/services/alert.service';
import { HierarchyService } from '../../services/hierarchy.service';
@Component({
  selector: 'app-tree-sidebar',
  imports: [
     CommonModule,
    CdkTreeModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatButtonModule
  ],
  templateUrl: './tree-sidebar.component.html',
  styleUrl: './tree-sidebar.component.scss'
})
export class TreeSidebarComponent {

   // Servicios
  private router = inject(Router);
  private alertService = inject(AlertService);
  private renderer = inject(Renderer2);
  private hierarchyService = inject(HierarchyService);

  // Destrucción
  private destroy$ = new Subject<void>();

  // Tree control y data source
  treeControl!: FlatTreeControl<TreeNode>;
  dataSource!: TreeDataSource;

  // Estado reactivo
  selectedNode = signal<TreeNode | null>(null);
  copiedNode = signal<TreeNode | null>(null);
  isLoading = signal<boolean>(false);
  showApproved = signal<boolean>(false);
  currentRoute = signal<string>('');

  // Referencias para highlight
  @ViewChildren('treeNode', { read: ElementRef }) treeNodes!: QueryList<ElementRef>;
  private hasListener: ElementRef[] = [];
  private oldHighlight?: ElementRef;

  // Computed
  canPaste = computed(() => {
    const copied = this.copiedNode();
    const selected = this.selectedNode();
    if (!copied || !selected) return false;
    return TreeNodeMapper.canPasteInNode(selected, copied);
  });

  ngOnInit(): void {
    this.initializeTree();
    this.loadTree();
    this.subscribeToRouteChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    this.setupNodeListeners();
    this.highlightActiveNode();
  }

  /**
   * Inicializa el tree control y data source
   */
  private initializeTree(): void {
    this.treeControl = new FlatTreeControl<TreeNode>(
      node => node.level,
      node => node.expandable
    );

    this.dataSource = new TreeDataSource(this.treeControl, this.hierarchyService);

    this.dataSource.loading$.subscribe(loading => {
      this.isLoading.set(loading);
    });
  }

  /**
   * ✅ NUEVA: Escucha cambios de ruta para sincronizar el árbol
   */
  private subscribeToRouteChanges(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      const url = event.urlAfterRedirects;
      this.currentRoute.set(url);

      // Extraer la ruta sin /rkmain
      const route = url.replace('/rkmain/', '');

      // Buscar y expandir el nodo activo
      setTimeout(() => {
        this.expandAndSelectNodeByRoute(route);
      }, 300);
    });
  }

  /**
   * ✅ NUEVA: Expande y selecciona el nodo según la ruta actual
   */
  private expandAndSelectNodeByRoute(route: string): void {
    if (!route || route === '/rkmain') return;

    // Buscar el nodo en el dataSource
    const node = this.dataSource.data.find(n => n.route === route);

    if (node) {
      this.selectedNode.set(node);
      this.expandParents(node);

      // Actualizar localStorage
      localStorage.setItem('keySelected', node.key);
      localStorage.setItem('versionSelected', node.version);
      localStorage.setItem('statusSelected', node.status);
    } else {
      // Si no está cargado, intentar expandir padres para cargarlo
      this.loadNodeByRoute(route);
    }
  }

  /**
   * ✅ NUEVA: Carga un nodo que no está visible expandiendo sus padres
   */
  private async loadNodeByRoute(route: string): Promise<void> {
    // Extraer el nivel y construir la key desde la ruta
    const parts = route.split('/');
    const levelPrefix = parts[0]; // rka, rkp, rks, etc.

    // Encontrar el nivel
    const level = Object.entries(LEVEL_CONFIG).find(
      ([_, config]) => config.route === levelPrefix
    )?.[0];

    if (!level) return;

    const levelNum = parseInt(level);

    // Si es nivel 1, ya debería estar visible
    if (levelNum === 1) return;

    // Construir la key del padre
    const parentKey = this.buildParentKey(parts.slice(1), levelNum);
    const parentNode = this.dataSource.findNodeByKey(parentKey);

    if (parentNode && !this.treeControl.isExpanded(parentNode)) {
      this.treeControl.expand(parentNode);

      // Esperar a que se carguen los hijos
      setTimeout(() => {
        this.expandAndSelectNodeByRoute(route);
      }, 500);
    }
  }

  /**
   * ✅ NUEVA: Construye la key del padre desde los segmentos de ruta
   */
  private buildParentKey(segments: string[], level: number): string {
    let key = '';

    for (let i = 0; i < level - 1; i++) {
      key += segments[i] || '';
    }

    return key;
  }

  /**
   * ✅ NUEVA: Expande todos los padres de un nodo
   */
  private expandParents(node: TreeNode): void {
    const parent = this.dataSource.getParent(node);
    if (parent) {
      if (!this.treeControl.isExpanded(parent)) {
        this.treeControl.expand(parent);
      }
      this.expandParents(parent);
    }
  }

  /**
   * ✅ MEJORADA: Resalta el nodo activo según la ruta
   */
  private highlightActiveNode(): void {
    const selected = this.selectedNode();
    if (!selected) return;

    const nodeElement = this.treeNodes.find(
      el => el.nativeElement.getAttribute('id') === selected.key
    );

    if (nodeElement && nodeElement !== this.oldHighlight) {
      this.updateHighlight(nodeElement);
    }
  }

  /**
   * Carga el árbol inicial
   */
  loadTree(): void {
    this.dataSource.loadRootLevel(this.showApproved());

    // Después de cargar, sincronizar con la ruta actual
    setTimeout(() => {
      const currentUrl = this.router.url.replace('/rkmain/', '');
      if (currentUrl && currentUrl !== '/rkmain') {
        this.expandAndSelectNodeByRoute(currentUrl);
      }
    }, 500);
  }

  /**
   * Alterna mostrar aprobados
   */
  toggleShowApproved(): void {
    this.showApproved.set(!this.showApproved());
    this.loadTree();
  }

  /**
   * Refresca el árbol completo
   */
  refreshTree(): void {
    const currentSelected = this.selectedNode();
    this.copiedNode.set(null);
    this.loadTree();

    // Mantener selección si existe
    if (currentSelected) {
      setTimeout(() => {
        this.expandAndSelectNodeByRoute(currentSelected.route);
      }, 500);
    }
  }

  /**
   * Refresca solo el nodo padre del seleccionado
   */
  refreshParent(): void {
    const selected = this.selectedNode();
    if (!selected) {
      this.refreshTree();
      return;
    }

    const parent = this.dataSource.getParent(selected);
    if (parent) {
      this.dataSource.refreshNode(parent);
    } else {
      this.refreshTree();
    }
  }

  /**
   * ✅ MEJORADA: Selecciona un nodo y navega a su detalle
   */
  selectNode(node: TreeNode): void {
    console.log('🔹 Seleccionando nodo:', node.item, '- Ruta:', node.route);

    this.selectedNode.set(node);

    // Guardar en localStorage
    localStorage.setItem('keySelected', node.key);
    localStorage.setItem('versionSelected', node.version);
    localStorage.setItem('statusSelected', node.status);

    // Navegar con array de segmentos
    const routeParts = node.route.split('/');
    this.router.navigate(['/rkmain', ...routeParts]);
  }

  /**
   * Expande/colapsa un nodo
   */
  toggleNode(node: TreeNode): void {
    if (this.treeControl.isExpanded(node)) {
      this.treeControl.collapse(node);
    } else {
      this.treeControl.expand(node);
    }
  }

  /**
   * Agrega un hijo al nodo seleccionado
   */
  async addChild(node: TreeNode): Promise<void> {
    if (!TreeNodeMapper.canAddChildren(node)) {
      await this.alertService.error(
        'No se pueden agregar elementos en este estado',
        'El nodo debe estar en estado de Creación o Aprobado'
      );
      return;
    }

    this.selectedNode.set(node);

    const levelConfig = LEVEL_CONFIG[node.level as keyof typeof LEVEL_CONFIG];
    console.log(`Agregar hijo a ${levelConfig?.name}: ${node.key}`);

    await this.alertService.info(
      `Agregar ${LEVEL_CONFIG[(node.level + 1) as keyof typeof LEVEL_CONFIG]?.name}`,
      `Funcionalidad pendiente de implementar`
    );
  }

  /**
   * Elimina un nodo
   */
  async deleteNode(node: TreeNode): Promise<void> {
    if (node.displayDeleteIcon === 'N') {
      return;
    }

    const levelConfig = LEVEL_CONFIG[node.level as keyof typeof LEVEL_CONFIG];

    const result = await this.alertService.confirmDelete(
      `¿Desea eliminar este ${levelConfig?.name}? Esta acción eliminará todos sus hijos.`
    );

    if (result.isConfirmed) {
      console.log('Eliminar nodo:', node.key);
      // TODO: Implementar eliminación
      await this.alertService.success('Nodo eliminado', 'El elemento ha sido eliminado correctamente');
      this.refreshParent();
    }
  }

  /**
   * Copia un nodo
   */
  copyNode(node: TreeNode): void {
    if (!TreeNodeMapper.canCopyNode(node)) {
      return;
    }

    this.copiedNode.set(node);
    this.alertService.toast('success', 'Jerarquía copiada');
  }

  /**
   * Pega un nodo copiado
   */
  async pasteNode(targetNode: TreeNode): Promise<void> {
    const copied = this.copiedNode();
    if (!copied || !TreeNodeMapper.canPasteInNode(targetNode, copied)) {
      await this.alertService.error(
        'Acción no válida',
        'Asegúrese de pegar el item en su nivel correspondiente'
      );
      return;
    }

    const result = await this.alertService.confirm({
      title: 'Copiar/Pegar',
      text: '¿Seguro que desea copiar este item?',
      icon: 'question'
    });

    if (result.isConfirmed) {
      console.log('Pegar nodo:', copied.key, 'en:', targetNode.key);
      // TODO: Implementar copiar/pegar
      this.copiedNode.set(null);
      this.dataSource.refreshNode(targetNode);
    }
  }

  /**
   * Limpia el nodo copiado
   */
  clearCopied(): void {
    this.copiedNode.set(null);
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
    return node.level < 8 && node.permiso.startsWith('Y');
  }

  canShowDeleteButton(node: TreeNode): boolean {
    return node.displayDeleteIcon === 'Y' && node.permiso.startsWith('Y');
  }

  canShowCopyButton(node: TreeNode): boolean {
    return TreeNodeMapper.canCopyNode(node) && node.level > 1;
  }

  getNodePadding(node: TreeNode): string {
    return `${node.level * 20}px`;
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

  getPaddingIndent(node: TreeNode): number {
   switch (node.level) {
    case 1: return 0;   // Sin padding en raíz
    case 2: return 8;   // +8px
    case 3: return 16;  // +8px
    case 4: return 24;  // +8px
    case 5: return 32;  // +8px
    case 6: return 40;  // +8px
    case 7: return 48;  // +8px
    case 8: return 56;  // +8px
    default: return 0;
  }
  }

  getLevelPrefix(node: TreeNode): string {
  const prefixes: Record<number, string> = {
    1: 'AR',  // Área
    2: 'PR',  // Proceso
    3: 'SP',  // Subproceso
    4: 'AC',  // Actividad
    5: 'TA',  // Tarea
    6: 'DM',  // Dimensión
    7: 'RG',  // Riesgo
    8: 'CS'   // Consecuencia
  };
  return prefixes[node.level] || '';
}

/**
 * ✅ NUEVO: Color del prefijo según el nivel
 */
getLevelColor(node: TreeNode): string {
  const colors: Record<number, string> = {
    1: '#4caf50',  // Verde - Área
    2: '#2196f3',  // Azul - Proceso
    3: '#9c27b0',  // Púrpura - Subproceso
    4: '#ff9800',  // Naranja - Actividad
    5: '#00bcd4',  // Cyan - Tarea
    6: '#795548',  // Marrón - Dimensión
    7: '#f44336',  // Rojo - Riesgo
    8: '#607d8b'   // Gris - Consecuencia
  };
  return colors[node.level] || '#9e9e9e';
}

}
