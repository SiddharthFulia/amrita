// ─── Alchemy Lab: Elements & Recipes ─────────────────────────────────────────
// Each element has: id, name, emoji, category, discovered (runtime)
// Recipes: [ingredientA, ingredientB] → resultId

export const BASE_ELEMENTS = [
  { id: 'fire',    name: 'Fire',    emoji: '🔥', category: 'basic', color: '#ff6b35' },
  { id: 'water',   name: 'Water',   emoji: '💧', category: 'basic', color: '#4fc3f7' },
  { id: 'earth',   name: 'Earth',   emoji: '🌍', category: 'basic', color: '#8d6e63' },
  { id: 'air',     name: 'Air',     emoji: '💨', category: 'basic', color: '#b0bec5' },
];

export const ALL_ELEMENTS = [
  ...BASE_ELEMENTS,
  { id: 'steam',     name: 'Steam',     emoji: '♨️',  category: 'nature',  color: '#cfd8dc' },
  { id: 'mud',       name: 'Mud',       emoji: '🟤',  category: 'nature',  color: '#6d4c41' },
  { id: 'lava',      name: 'Lava',      emoji: '🌋',  category: 'nature',  color: '#ff3d00' },
  { id: 'dust',      name: 'Dust',      emoji: '🌫️',  category: 'nature',  color: '#bcaaa4' },
  { id: 'rain',      name: 'Rain',      emoji: '🌧️',  category: 'weather', color: '#64b5f6' },
  { id: 'cloud',     name: 'Cloud',     emoji: '☁️',  category: 'weather', color: '#eceff1' },
  { id: 'stone',     name: 'Stone',     emoji: '🪨',  category: 'nature',  color: '#78909c' },
  { id: 'sand',      name: 'Sand',      emoji: '🏖️',  category: 'nature',  color: '#ffe082' },
  { id: 'glass',     name: 'Glass',     emoji: '🔮',  category: 'craft',   color: '#e1f5fe' },
  { id: 'plant',     name: 'Plant',     emoji: '🌱',  category: 'life',    color: '#66bb6a' },
  { id: 'tree',      name: 'Tree',      emoji: '🌳',  category: 'life',    color: '#43a047' },
  { id: 'flower',    name: 'Flower',    emoji: '🌸',  category: 'life',    color: '#f48fb1' },
  { id: 'wood',      name: 'Wood',      emoji: '🪵',  category: 'craft',   color: '#a1887f' },
  { id: 'ash',       name: 'Ash',       emoji: '🩶',  category: 'nature',  color: '#9e9e9e' },
  { id: 'metal',     name: 'Metal',     emoji: '⚙️',  category: 'craft',   color: '#90a4ae' },
  { id: 'sword',     name: 'Sword',     emoji: '⚔️',  category: 'craft',   color: '#b0bec5' },
  { id: 'snow',      name: 'Snow',      emoji: '❄️',  category: 'weather', color: '#e3f2fd' },
  { id: 'ice',       name: 'Ice',       emoji: '🧊',  category: 'weather', color: '#bbdefb' },
  { id: 'lake',      name: 'Lake',      emoji: '🏞️',  category: 'nature',  color: '#4dd0e1' },
  { id: 'ocean',     name: 'Ocean',     emoji: '🌊',  category: 'nature',  color: '#0288d1' },
  { id: 'sun',       name: 'Sun',       emoji: '☀️',  category: 'cosmic',  color: '#ffd600' },
  { id: 'moon',      name: 'Moon',      emoji: '🌙',  category: 'cosmic',  color: '#b39ddb' },
  { id: 'star',      name: 'Star',      emoji: '⭐',  category: 'cosmic',  color: '#fff176' },
  { id: 'rainbow',   name: 'Rainbow',   emoji: '🌈',  category: 'weather', color: '#e91e8c' },
  { id: 'life',      name: 'Life',      emoji: '💗',  category: 'life',    color: '#e91e8c' },
  { id: 'love',      name: 'Love',      emoji: '💕',  category: 'special', color: '#e91e8c' },
  { id: 'music',     name: 'Music',     emoji: '🎵',  category: 'special', color: '#ce93d8' },
  { id: 'magic',     name: 'Magic',     emoji: '✨',  category: 'special', color: '#b388ff' },
  { id: 'cat',       name: 'Cat',       emoji: '🐱',  category: 'life',    color: '#ffab91' },
  { id: 'butterfly', name: 'Butterfly', emoji: '🦋',  category: 'life',    color: '#ce93d8' },
  { id: 'diamond',   name: 'Diamond',   emoji: '💎',  category: 'special', color: '#80deea' },
  { id: 'crown',     name: 'Crown',     emoji: '👑',  category: 'special', color: '#ffd600' },
  { id: 'cake',      name: 'Cake',      emoji: '🎂',  category: 'special', color: '#f48fb1' },
  { id: 'potion',    name: 'Potion',    emoji: '🧪',  category: 'craft',   color: '#b388ff' },
  { id: 'gem',       name: 'Gem',       emoji: '💠',  category: 'special', color: '#4dd0e1' },
  { id: 'phoenix',   name: 'Phoenix',   emoji: '🔥',  category: 'myth',    color: '#ff9100' },
  { id: 'dragon',    name: 'Dragon',    emoji: '🐉',  category: 'myth',    color: '#66bb6a' },
  { id: 'unicorn',   name: 'Unicorn',   emoji: '🦄',  category: 'myth',    color: '#f48fb1' },
  { id: 'galaxy',    name: 'Galaxy',    emoji: '🌌',  category: 'cosmic',  color: '#311b92' },
  { id: 'infinity',  name: 'Infinity',  emoji: '♾️',  category: 'cosmic',  color: '#b388ff' },
];

// [a, b] → result (order doesn't matter)
export const RECIPES = [
  ['fire', 'water', 'steam'],
  ['earth', 'water', 'mud'],
  ['fire', 'earth', 'lava'],
  ['earth', 'air', 'dust'],
  ['water', 'air', 'rain'],
  ['air', 'steam', 'cloud'],
  ['lava', 'air', 'stone'],
  ['stone', 'air', 'sand'],
  ['fire', 'sand', 'glass'],
  ['earth', 'rain', 'plant'],
  ['plant', 'earth', 'tree'],
  ['plant', 'water', 'flower'],
  ['tree', 'fire', 'ash'],
  ['tree', 'sword', 'wood'],
  ['fire', 'stone', 'metal'],
  ['metal', 'fire', 'sword'],
  ['water', 'air', 'cloud'],
  ['cloud', 'water', 'rain'],
  ['rain', 'air', 'snow'],
  ['water', 'snow', 'ice'],
  ['water', 'water', 'lake'],
  ['lake', 'water', 'ocean'],
  ['fire', 'air', 'sun'],
  ['stone', 'air', 'moon'],
  ['sun', 'moon', 'star'],
  ['rain', 'sun', 'rainbow'],
  ['flower', 'rain', 'life'],
  ['life', 'flower', 'love'],
  ['air', 'flower', 'butterfly'],
  ['life', 'air', 'music'],
  ['star', 'love', 'magic'],
  ['mud', 'life', 'cat'],
  ['stone', 'magic', 'diamond'],
  ['diamond', 'metal', 'crown'],
  ['flower', 'fire', 'cake'],
  ['water', 'magic', 'potion'],
  ['glass', 'magic', 'gem'],
  ['fire', 'magic', 'phoenix'],
  ['lava', 'life', 'dragon'],
  ['love', 'magic', 'unicorn'],
  ['star', 'star', 'galaxy'],
  ['galaxy', 'magic', 'infinity'],
];

export function findRecipe(a, b) {
  return RECIPES.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export function getElement(id) {
  return ALL_ELEMENTS.find(e => e.id === id);
}

export const CATEGORIES = {
  basic: { label: 'Basic', color: '#78909c' },
  nature: { label: 'Nature', color: '#8d6e63' },
  weather: { label: 'Weather', color: '#64b5f6' },
  life: { label: 'Life', color: '#66bb6a' },
  craft: { label: 'Craft', color: '#90a4ae' },
  cosmic: { label: 'Cosmic', color: '#b388ff' },
  special: { label: 'Special', color: '#e91e8c' },
  myth: { label: 'Mythical', color: '#ff9100' },
};
