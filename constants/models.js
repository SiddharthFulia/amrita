export const AI_MODELS = [
  { id: 'llama3.2:1b', label: 'Llama 3.2 1B', emoji: '⚡', speed: '~2-3s', badge: 'Fast', badgeColor: '#4caf50', desc: 'Quick replies, basic tasks' },
  { id: 'phi3:mini', label: 'Phi-3 Mini', emoji: '💻', speed: '~3-4s', badge: 'Code', badgeColor: '#42a5f5', desc: 'Great for code & logic' },
  { id: 'gemma2:2b', label: 'Gemma 2 2B', emoji: '💎', speed: '~2-3s', badge: 'Balanced', badgeColor: '#ff9800', desc: 'Good all-round, fast' },
  { id: 'qwen2.5:3b', label: 'Qwen 2.5 3B', emoji: '🧠', speed: '~4-5s', badge: 'Reasoning', badgeColor: '#b388ff', desc: 'Strong reasoning & analysis' },
  { id: 'llama3.2:3b', label: 'Llama 3.2 3B', emoji: '🦙', speed: '~5-6s', badge: 'Best', badgeColor: '#e91e8c', desc: 'Highest quality, slower' },
];

export function getModelInfo(modelId) {
  return AI_MODELS.find(model => model.id === modelId) || AI_MODELS[0];
}
