import { get, post } from './request';
import { ENDPOINTS } from '../constants/endpoints';

export async function checkHealth() {
  return get(ENDPOINTS.HEALTH, {}, { timeout: 3000 });
}

export async function sendChat(message, history = [], model = 'llama3.2:3b', context = 'general') {
  return post(ENDPOINTS.CHAT, { message, history, model, context });
}

export async function fetchStats() {
  return get(ENDPOINTS.STATS, {}, { timeout: 5000 });
}
