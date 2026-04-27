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

export async function sendGroq(message, options = {}) {
  return post(ENDPOINTS.GROQ, {
    message,
    history: options.history || [],
    model: options.model || 'llama-3.1-8b',
    system: options.system || undefined,
    maxTokens: options.maxTokens || 500,
    temperature: options.temperature || 0.7,
  });
}

export async function sendGemini(message, options = {}) {
  return post(ENDPOINTS.GEMINI, {
    message,
    history: options.history || [],
    model: options.model || 'gemini-flash',
    system: options.system || undefined,
    maxTokens: options.maxTokens || 500,
    temperature: options.temperature || 0.7,
  });
}

export async function analyzeImage(imageBase64, prompt = 'Describe this image in detail.', model = 'gemini-flash') {
  return post(ENDPOINTS.ANALYZE_IMAGE, { image: imageBase64, prompt, model }, { timeout: 15000 });
}

export async function generateAIImage(prompt, model) {
  return post(ENDPOINTS.IMAGE_GEN, { prompt, model }, { timeout: 60000 });
}

export async function textToSpeech(text, voice = 'en-US-Standard-D', lang = 'en-US') {
  return post(ENDPOINTS.TTS, { text, voice, lang });
}

export async function summarizeText(text, model) {
  return post(ENDPOINTS.SUMMARIZE, { text, model });
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

export async function detectObjects(imageData, threshold = 0.5) {
  return post(ENDPOINTS.DETECT_OBJECTS, { image: imageData, threshold }, { timeout: 10000 });
}

export async function checkFaceHealth() {
  return get(ENDPOINTS.FACE_HEALTH, {}, { timeout: 3000 });
}
