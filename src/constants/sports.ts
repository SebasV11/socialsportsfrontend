export const SPORTS = [
  { id: 1, name: 'Padel', color: '#4CAF50', bgColor: '#E8F5E9', emoji: '🎾' },
  { id: 2, name: 'Tennis', color: '#2196F3', bgColor: '#E3F2FD', emoji: '🎾' },
  { id: 3, name: 'Voetbal', color: '#FF5722', bgColor: '#FBE9E7', emoji: '⚽' },
  { id: 4, name: 'Basketbal', color: '#FF9800', bgColor: '#FFF3E0', emoji: '🏀' },
  { id: 5, name: 'Golf', color: '#8BC34A', bgColor: '#F1F8E9', emoji: '⛳' },
] as const;

export type SportName = (typeof SPORTS)[number]['name'];
