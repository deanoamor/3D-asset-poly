export interface Swatch {
  name: string;
  hex: string;
}

export const PALETTE: Swatch[] = [
  { name: 'Dark wood', hex: '#6b4423' },
  { name: 'Wood', hex: '#8b5a2b' },
  { name: 'Oak', hex: '#b07d45' },
  { name: 'Light wood', hex: '#d4a76a' },
  { name: 'Charcoal', hex: '#2f3437' },
  { name: 'Slate', hex: '#5b6670' },
  { name: 'Stone', hex: '#9aa3ab' },
  { name: 'Fog', hex: '#c9ced6' },
  { name: 'Bone', hex: '#efe9dc' },
  { name: 'White', hex: '#fafafa' },
  { name: 'Moss', hex: '#4f7a3a' },
  { name: 'Grass', hex: '#7fb04f' },
  { name: 'Mint', hex: '#a8d5ba' },
  { name: 'Teal', hex: '#2f8f8a' },
  { name: 'Sky', hex: '#6ec1e4' },
  { name: 'Ocean', hex: '#2e6fbd' },
  { name: 'Violet', hex: '#7a5bd0' },
  { name: 'Pink', hex: '#e58bb4' },
  { name: 'Red', hex: '#d64545' },
  { name: 'Coral', hex: '#ee8866' },
  { name: 'Orange', hex: '#f08a24' },
  { name: 'Gold', hex: '#e6b422' },
  { name: 'Sand', hex: '#e3cf9a' },
  { name: 'Brick', hex: '#a6482f' },
];

export const WOOD_HEXES = new Set(PALETTE.slice(0, 4).map((s) => s.hex));
