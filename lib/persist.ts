const STORAGE_KEY = 'widget-positions';

export interface SavedPosition {
  id: string;
  x: number;
  y: number;
}

export function getWidgetPositions(): SavedPosition[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load widget positions:', e);
  }
  
  return [];
}

export function saveWidgetPosition(id: string, x: number, y: number) {
  if (typeof window === 'undefined') return;
  
  try {
    const positions = getWidgetPositions();
    const existing = positions.findIndex((p) => p.id === id);
    
    if (existing >= 0) {
      positions[existing] = { id, x, y };
    } else {
      positions.push({ id, x, y });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch (e) {
    console.error('Failed to save widget position:', e);
  }
}

