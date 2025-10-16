/**
 * Interface para un item disponible en el modal de jerarquía
 */
export interface AvailableItem {
  id: string;
  descripcion: string;
  selected: boolean;
}

/**
 * Interface para un atributo del backend
 */
export interface BackendAttribute {
  name: string;
  value: string;
}

/**
 * Interface para un item del backend
 */
export interface BackendItem {
  atts: BackendAttribute[];
}

/**
 * Interface para la respuesta completa del backend
 */
export interface BackendResponse {
  redirect: any;
  success: boolean;
  message: string;
  data: BackendItem[];
}

/**
 * Mapper que convierte un item del backend a AvailableItem
 * Replica la lógica del código legacy:
 * - atts[0] = ID (procesoId, areaId, etc.)
 * - atts[2] = Descripción (procesoDescripcionSola, etc.)
 *
 * @param raw - Item del backend con estructura de atributos
 * @returns AvailableItem con id, descripcion y selected
 */
export function mapToAvailableItem(raw: BackendItem): AvailableItem {
  // Validación: El backend debe tener al menos 3 atributos
  if (!raw.atts || raw.atts.length < 3) {
    console.warn('⚠️ Item con estructura inválida (se esperan al menos 3 atributos):', raw);
    return {
      id: '',
      descripcion: '',
      selected: false
    };
  }

  // Mapper exacto al código legacy
  // element.atts[0].value.trim() -> ID
  // element.atts[2].value.trim() -> Descripción
  return {
    id: raw.atts[0]?.value?.trim() || '',
    descripcion: raw.atts[2]?.value?.trim() || '',
    selected: false
  };
}

/**
 * Mapper alternativo que busca por nombre de atributo con fallback a índices
 * Útil si diferentes endpoints usan diferentes nombres de atributos
 *
 * @param raw - Item del backend
 * @param idVariations - Nombres posibles para el ID
 * @param descVariations - Nombres posibles para la descripción
 * @returns AvailableItem mapeado
 */
export function mapToAvailableItemFlexible(
  raw: BackendItem,
  idVariations: string[] = ['procesoId', 'areaId', 'id', 'Id', 'codigo'],
  descVariations: string[] = ['procesoDescripcionSola', 'descripcion', 'Descripcion', 'nombre']
): AvailableItem {

  const getAttributeValue = (
    atts: BackendAttribute[],
    nameVariations: string[],
    fallbackIndex: number
  ): string => {
    // Intenta buscar por nombre (case-insensitive)
    for (const name of nameVariations) {
      const attr = atts.find(a => a.name.toLowerCase() === name.toLowerCase());
      if (attr?.value) {
        return attr.value.trim();
      }
    }

    // Fallback: Usa el índice como el código legacy
    if (atts[fallbackIndex]?.value) {
      return atts[fallbackIndex].value.trim();
    }

    return '';
  };

  if (!raw.atts || raw.atts.length === 0) {
    console.warn('⚠️ Item sin atributos:', raw);
    return { id: '', descripcion: '', selected: false };
  }

  return {
    id: getAttributeValue(raw.atts, idVariations, 0),
    descripcion: getAttributeValue(raw.atts, descVariations, 2),
    selected: false
  };
}
