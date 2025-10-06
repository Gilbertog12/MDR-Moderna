import { TreeNode, TreeNodeApiResponse, LEVEL_CONFIG, HierarchyLevel } from './tree-node.interface';

/**
 * Mapper para convertir respuestas del backend en TreeNodes
 */
export class TreeNodeMapper {

  /**
   * Convierte la respuesta de SEARCH_NODE en array de TreeNodes
   */
  static fromApiResponse(apiData: TreeNodeApiResponse): TreeNode[] {
  if (!apiData.success || !apiData.data) {
    return [];
  }

  return apiData.data.map(element => {  // ✅ Cambié 'item' por 'element'
    const atts = element.atts;

    // Extraer valores básicos
    const offset = this.getAttValue(atts, 0);
    const id = this.getAttValue(atts, 1);
    const descripcion = this.getAttValue(atts, 2);
    const status = this.getAttValue(atts, 3);
    const version = this.getAttValue(atts, 4);
    const levelStr = this.getAttValue(atts, 5);
    const level = parseInt(levelStr, 10) as HierarchyLevel;
    const atributos = this.getAttValue(atts, 6);
    const key = this.getAttValue(atts, 7);
    const itemsPending = this.getAttValue(atts, 8);
    const hijo = this.getAttValue(atts, 9) as 'Y' | 'N';

    // Permisos
    const canAdd = this.getAttValue(atts, 12) as 'Y' | 'N';
    const isAdmin = this.getAttValue(atts, 15) as 'Y' | 'N';
    const isAprobador = this.getAttValue(atts, 16) as 'Y' | 'N';
    const isConsulta = this.getAttValue(atts, 17) as 'Y' | 'N';
    const isCreador = this.getAttValue(atts, 18) as 'Y' | 'N';
    const isValidador = this.getAttValue(atts, 19) as 'Y' | 'N';
    const perfiles = isAdmin + isAprobador + isConsulta + isCreador + isValidador;

    // Estado eliminación
    const pendingDelete = this.getAttValue(atts, 20) as 'Y' | 'N';
    const canDelete = this.getAttValue(atts, 21) as 'Y' | 'N';
    const statusParent = this.getAttValue(atts, 22);
    const displayDeleteIcon = this.getAttValue(atts, 23) as 'Y' | 'N';
    const tareaInconclusa = this.getAttValue(atts, 24);

    // Calcular propiedades derivadas
    const route = this.buildRoute(key, level);
    const expandable = hijo === 'Y' && level < 8;
    const statusPadre = parseInt(status, 10) < parseInt(statusParent, 10);
    const lectura = isConsulta === 'Y' ? 'Y' : 'N';
    const permiso = canAdd + lectura;

    // Nombre para display
    const item = `${id} - ${descripcion}`;  // ✅ Ahora no hay conflicto

    return {
      offset,
      id,
      descripcion,
      status,
      version,
      level,
      atributos,
      key,
      route,
      itemsPending,
      hijo,
      canAdd,
      isAdmin,
      isAprobador,
      isConsulta,
      isCreador,
      isValidador,
      perfiles,
      pendingDelete,
      canDelete,
      statusParent,
      displayDeleteIcon,
      tareaInconclusa,
      expandable,
      isLoading: false,
      permiso,
      statusPadre,
      item,
    } as TreeNode;
  });
  }



  /**
   * Construye la ruta de navegación según el nivel y key
   */
  static buildRoute(key: string, level: HierarchyLevel): string {
    const config = LEVEL_CONFIG[level];
    if (!config) return '';

    const parts: string[] = [];

    switch (level) {
      case 1: // rka/01
        parts.push(key);
        break;
      case 2: // rkp/01/0001
        parts.push(key.substring(0, 2), key.substring(2, 6));
        break;
      case 3: // rks/01/0001/0001
        parts.push(key.substring(0, 2), key.substring(2, 6), key.substring(6, 10));
        break;
      case 4: // rkc/01/0001/0001/0001
        parts.push(
          key.substring(0, 2),
          key.substring(2, 6),
          key.substring(6, 10),
          key.substring(10, 14)
        );
        break;
      case 5: // rkt/01/0001/0001/0001/0001
        parts.push(
          key.substring(0, 2),
          key.substring(2, 6),
          key.substring(6, 10),
          key.substring(10, 14),
          key.substring(14, 18)
        );
        break;
      case 6: // rkd/01/0001/0001/0001/0001/1
        parts.push(
          key.substring(0, 2),
          key.substring(2, 6),
          key.substring(6, 10),
          key.substring(10, 14),
          key.substring(14, 18),
          key.substring(18, 19)
        );
        break;
      case 7: // rkr/01/0001/0001/0001/0001/1/0001
        parts.push(
          key.substring(0, 2),
          key.substring(2, 6),
          key.substring(6, 10),
          key.substring(10, 14),
          key.substring(14, 18),
          key.substring(18, 19),
          key.substring(19, 23)
        );
        break;
      case 8: // rky/01/0001/0001/0001/0001/1/0001/0001
        parts.push(
          key.substring(0, 2),
          key.substring(2, 6),
          key.substring(6, 10),
          key.substring(10, 14),
          key.substring(14, 18),
          key.substring(18, 19),
          key.substring(19, 23),
          key.substring(23, 27)
        );
        break;
    }

    return `${config.route}/${parts.join('/')}`;
  }

  /**
   * Obtiene el valor de un atributo por índice
   */
  private static getAttValue(atts: Array<{ name: string; value: string }>, index: number): string {
    return atts[index]?.value || '';
  }

  /**
   * Determina si un nodo puede ser copiado según su estado
   */
  static canCopyNode(node: TreeNode): boolean {
    return node.level >= 2 && node.level <= 8;
  }

  /**
   * Determina si se puede pegar en este nodo
   */
  static canPasteInNode(targetNode: TreeNode, copiedNode: TreeNode): boolean {
    // Solo se puede pegar en el nivel inmediatamente superior
    return targetNode.level === copiedNode.level - 1;
  }

  /**
   * Verifica si el estado del nodo permite agregar hijos
   */
  static canAddChildren(node: TreeNode): boolean {
    const allowedStatuses = ['001', '002', '008'];
    return allowedStatuses.includes(node.status) && node.level < 8;
  }

  /**
   * Obtiene la clase CSS según el estado del nodo
   */
  static getStatusClass(status: string): string {
    switch (status) {
      case '008':
        return 'status-aprobado';
      case '004':
        return 'status-validacion';
      case '007':
        return 'status-aprobacion';
      case '006':
        return 'status-inactivacion';
      case '000':
        return 'status-rechazado';
      default:
        return 'status-creacion';
    }
  }

  /**
   * Obtiene el asterisco visual según el estado
   */
  static getStatusIndicator(node: TreeNode): string {
    if (node.status === '008') return '';
    if (node.status === '006') return '(*)';
    if (node.status === '004') return '(**)';
    if (node.status === '007') return '(***)';
    if (node.status === '001' || node.status === '002') return '(*)';
    return '';
  }

  /**
   * Obtiene el tooltip descriptivo del estado
   */
  static getStatusTooltip(node: TreeNode): string {
    if (node.status === '008') {
      return 'Aprobado';
    }

    if (node.pendingDelete === 'Y') {
      return 'Pendiente Inactivación (Eliminación)';
    }

    switch (node.status) {
      case '004':
        return 'Ítem pendiente de validar';
      case '007':
        return 'Ítem pendiente por Aprobar';
      case '006':
        return 'Pendiente Inactivación (Eliminación)';
      case '001':
      case '002':
        return 'Ítem pendiente por enviar a validar';
      default:
        return '';
    }
  }
}
