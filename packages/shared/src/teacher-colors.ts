// Paleta cerrada de colores asignables a un profesor.
// Se guarda en BD como el identificador semántico (`blue`, `red`, ...) — no el hex —
// para que un cambio futuro de tono no obligue a migrar datos.
//
// Regla de negocio: un color no puede repetirse dentro del mismo Center.

export const TEACHER_COLOR_IDS = [
  'blue',
  'red',
  'green',
  'orange',
  'yellow',
  'purple',
  'pink',
  'teal',
] as const;

export type TeacherColorId = (typeof TEACHER_COLOR_IDS)[number];

export interface TeacherColorPalette {
  id: TeacherColorId;
  label: string;
  bg: string;
  border: string;
  text: string;
  swatch: string;
}

// Tonos pensados para bloques de calendario: fondo claro legible + borde y texto
// con suficiente contraste. Si en el futuro hay tema oscuro, override aquí o en
// el consumidor (las variables CSS de shadcn no entran porque el color es por
// profesor, no por marca).
export const TEACHER_COLOR_PALETTE: Record<TeacherColorId, TeacherColorPalette> = {
  blue:   { id: 'blue',   label: 'Azul',     swatch: '#2563eb', bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
  red:    { id: 'red',    label: 'Rojo',     swatch: '#dc2626', bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d' },
  green:  { id: 'green',  label: 'Verde',    swatch: '#16a34a', bg: '#dcfce7', border: '#22c55e', text: '#14532d' },
  orange: { id: 'orange', label: 'Naranja',  swatch: '#ea580c', bg: '#ffedd5', border: '#f97316', text: '#7c2d12' },
  yellow: { id: 'yellow', label: 'Amarillo', swatch: '#ca8a04', bg: '#fef9c3', border: '#eab308', text: '#713f12' },
  purple: { id: 'purple', label: 'Lila',     swatch: '#9333ea', bg: '#f3e8ff', border: '#a855f7', text: '#581c87' },
  pink:   { id: 'pink',   label: 'Rosa',     swatch: '#db2777', bg: '#fce7f3', border: '#ec4899', text: '#831843' },
  teal:   { id: 'teal',   label: 'Turquesa', swatch: '#0d9488', bg: '#ccfbf1', border: '#14b8a6', text: '#134e4a' },
};

export function getTeacherColor(id: TeacherColorId | null | undefined): TeacherColorPalette | null {
  if (!id) return null;
  return TEACHER_COLOR_PALETTE[id] ?? null;
}
