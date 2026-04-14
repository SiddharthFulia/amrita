import { get, post } from './request';
import { ENDPOINTS } from '../constants/endpoints';

export async function checkHealth() {
  return get(ENDPOINTS.HEALTH, {}, { timeout: 3000 });
}

export async function sendWhisper(message, history = [], model = 'llama3.2:3b', context = 'general') {
  return post(ENDPOINTS.WHISPER, { message, history, model, context });
}

export async function sendAI(message, options = {}) {
  return post(ENDPOINTS.AI, {
    message,
    history: options.history || [],
    model: options.model || 'llama3.2:3b',
    system: options.system || undefined,
    maxTokens: options.maxTokens || 200,
    temperature: options.temperature || 0.7,
  });
}

export async function fetchStats() {
  return get(ENDPOINTS.STATS, {}, { timeout: 5000 });
}

export async function generateMemoryGlitch(difficulty = 'easy') {
  return post(ENDPOINTS.MEMORY_GLITCH, { difficulty }, { timeout: 30000 });
}

export async function analyzeFace(imageData) {
  return post(ENDPOINTS.FACE_ANALYZE, { image: imageData }, { timeout: 10000 });
}

export async function checkFaceHealth() {
  return get(ENDPOINTS.FACE_HEALTH, {}, { timeout: 3000 });
}
