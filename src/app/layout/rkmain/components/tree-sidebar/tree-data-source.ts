import { CollectionViewer, SelectionChange, DataSource } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import { BehaviorSubject, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TreeNode } from './tree-node.interface';
import { HierarchyService } from '../../services/hierarchy.service';
/**
 * DataSource para el árbol con lazy loading
 * Nota: Usamos FlatTreeControl aunque esté deprecado porque es el único
 * que soporta lazy loading actualmente. Migraremos cuando Angular provea
 * una alternativa estable.
 */
export class TreeDataSource implements DataSource<TreeNode> {
 private dataChange = new BehaviorSubject<TreeNode[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();

  get data(): TreeNode[] {
    return this.dataChange.value;
  }

  set data(value: TreeNode[]) {
    this._treeControl.dataNodes = value;
    this.dataChange.next(value);
  }

  constructor(
    private _treeControl: FlatTreeControl<TreeNode>,
    private hierarchyService: HierarchyService
  ) {}

  connect(collectionViewer: CollectionViewer): Observable<TreeNode[]> {
    this._treeControl.expansionModel.changed.subscribe(change => {
      if ((change as SelectionChange<TreeNode>).added ||
          (change as SelectionChange<TreeNode>).removed) {
        this.handleTreeControl(change as SelectionChange<TreeNode>);
      }
    });

    return merge(collectionViewer.viewChange, this.dataChange).pipe(
      map(() => this.data)
    );
  }

  disconnect(): void {
    this.dataChange.complete();
    this.loadingSubject.complete();
  }

  private handleTreeControl(change: SelectionChange<TreeNode>): void {
    if (change.added) {
      change.added.forEach(node => this.toggleNode(node, true));
    }
    if (change.removed) {
      change.removed.slice().reverse().forEach(node => this.toggleNode(node, false));
    }
  }

  private toggleNode(node: TreeNode, expand: boolean): void {
    const index = this.data.indexOf(node);

    if (!expand) {
      let count = 0;
      for (let i = index + 1; i < this.data.length && this.data[i].level > node.level; i++, count++) {}
      this.data.splice(index + 1, count);
      this.dataChange.next(this.data);
    } else {
      if (node.hijo === 'Y') {
        this.loadChildren(node, index);
      }
    }
  }

  private loadChildren(node: TreeNode, index: number): void {
    node.isLoading = true;
    this.dataChange.next(this.data);

    this.hierarchyService.searchNodes((node.level + 1) as any, node.key)
      .subscribe({
        next: (children) => {
          this.data.splice(index + 1, 0, ...children);
          node.isLoading = false;
          this.dataChange.next(this.data);
        },
        error: (error) => {
          node.isLoading = false;
          this.dataChange.next(this.data);
          console.error('Error al cargar nodos:', error);
        }
      });
  }

  loadRootLevel(mostrarTodo: boolean = false): void {
    this.loadingSubject.next(true);

    this.hierarchyService.searchNodes(1, '', mostrarTodo)
      .subscribe({
        next: (nodes) => {
          this.data = nodes;
          this.loadingSubject.next(false);
        },
        error: (error) => {
          console.error('Error al cargar árbol:', error);
          this.loadingSubject.next(false);
        }
      });
  }

  refreshNode(node: TreeNode): void {
    const index = this.data.indexOf(node);
    if (index === -1) return;

    this._treeControl.collapse(node);

    let count = 0;
    for (let i = index + 1; i < this.data.length && this.data[i].level > node.level; i++, count++) {}
    this.data.splice(index + 1, count);

    this._treeControl.expand(node);
  }

  findNodeByKey(key: string): TreeNode | undefined {
    return this.data.find(node => node.key === key);
  }

  getParent(node: TreeNode): TreeNode | null {
    const currentLevel = node.level;
    if (currentLevel < 1) return null;

    const startIndex = this.data.indexOf(node) - 1;
    for (let i = startIndex; i >= 0; i--) {
      if (this.data[i].level < currentLevel) {
        return this.data[i];
      }
    }
    return null;
  }
}
