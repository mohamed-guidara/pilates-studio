export interface CategoryColor {
  bg: string;
  border: string;
  text: string;
}

// One color per session category (1-5, matching the options used in
// create-session-modal / update-session). Add more entries here if you add categories.
export const CATEGORY_COLORS: Record<number, CategoryColor> = {
  1: { bg: '#DBEAFE', border: '#93C5FD', text: '#1D4ED8' }, // blue
  2: { bg: '#EDE9FE', border: '#C4B5FD', text: '#6D28D9' }, // purple
  3: { bg: '#D1FAE5', border: '#6EE7B7', text: '#047857' }, // emerald
  4: { bg: '#FEF3C7', border: '#FCD34D', text: '#B45309' }, // amber
  5: { bg: '#FFE4E6', border: '#FDA4AF', text: '#BE123C' }, // rose
};

export const DEFAULT_CATEGORY_COLOR: CategoryColor = { bg: '#F3F4F6', border: '#D1D5DB', text: '#374151' };

export function categoryColor(category: number): CategoryColor {
  return CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;
}