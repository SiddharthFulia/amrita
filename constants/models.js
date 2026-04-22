export const GROQ_MODELS = [
  { id: 'llama-3.1-8b', label: 'Llama 3.1 8B', emoji: '⚡', speed: '<1s', badge: 'Instant', badgeColor: '#4caf50', desc: 'Groq cloud — blazing fast', provider: 'groq' },
  { id: 'llama-3.3-70b', label: 'Llama 3.3 70B', emoji: '🚀', speed: '~1-2s', badge: 'Smart', badgeColor: '#42a5f5', desc: 'Groq cloud — best quality', provider: 'groq' },
  { id: 'gpt-oss-120b', label: 'GPT-OSS 120B', emoji: '👑', speed: '~2-3s', badge: 'Powerful', badgeColor: '#ffd54f', desc: 'Groq cloud — most capable', provider: 'groq' },
];

export const OLLAMA_MODELS = [
  { id: 'gemma2:2b', label: 'Gemma 2 2B', emoji: '💎', speed: '~2-3s', badge: 'Fastest', badgeColor: '#ff9800', desc: 'Local — fast & balanced', provider: 'ollama' },
  { id: 'llama3.2:1b', label: 'Llama 3.2 1B', emoji: '🦙', speed: '~2-3s', badge: 'Light', badgeColor: '#78909c', desc: 'Local — quick replies', provider: 'ollama' },
  { id: 'phi3:mini', label: 'Phi-3 Mini', emoji: '💻', speed: '~3-4s', badge: 'Code', badgeColor: '#26c6da', desc: 'Local — great for code', provider: 'ollama' },
  { id: 'qwen2.5:3b', label: 'Qwen 2.5 3B', emoji: '🧠', speed: '~4-5s', badge: 'Reasoning', badgeColor: '#b388ff', desc: 'Local — strong reasoning', provider: 'ollama' },
  { id: 'llama3.2:3b', label: 'Llama 3.2 3B', emoji: '🦙', speed: '~5-6s', badge: 'Best Local', badgeColor: '#e91e8c', desc: 'Local — highest quality', provider: 'ollama' },
];

export const AI_MODELS = [...GROQ_MODELS, ...OLLAMA_MODELS];

export function getModelInfo(modelId) {
  return AI_MODELS.find(model => model.id === modelId) || AI_MODELS[0];
}

export function isGroqModel(modelId) {
  return GROQ_MODELS.some(model => model.id === modelId);
}
