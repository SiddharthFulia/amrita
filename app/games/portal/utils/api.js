// ─── Backend Service Layer ─────────────────────────────────────────────────
// Swap localStorage calls for Firebase/Node.js endpoints when ready.
// All functions are async so the interface stays the same after migration.

const STORAGE_PREFIX = 'amrita_portal_';

// ── Progress / State persistence ──
export async function saveProgress(gameId, data) {
  try {
    const key = `${STORAGE_PREFIX}${gameId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    const merged = { ...existing, ...data, updatedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(merged));
    return merged;
  } catch { return data; }
}

export async function loadProgress(gameId) {
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${gameId}`) || '{}');
  } catch { return {}; }
}

// ── Daily Streak ──
export async function getStreak() {
  try {
    const raw = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}streak`) || '{}');
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (raw.lastDay === today) return { count: raw.count || 1, today: true };
    if (raw.lastDay === yesterday) return { count: raw.count || 0, today: false };
    return { count: 0, today: false }; // streak broken
  } catch { return { count: 0, today: false }; }
}

export async function bumpStreak() {
  try {
    const current = await getStreak();
    const today = new Date().toDateString();
    if (current.today) return current; // already bumped today
    const newCount = current.count + 1;
    localStorage.setItem(`${STORAGE_PREFIX}streak`, JSON.stringify({ count: newCount, lastDay: today }));
    return { count: newCount, today: true };
  } catch { return { count: 1, today: true }; }
}

// ── AI Chat ──
// Tries the backend at localhost:4001 first (Ollama), falls back to local responses.
const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'https://api.cognivex.cloud';

const FALLBACK_RESPONSES = [
  "That's an interesting lead... have you checked the notes app?",
  "Hmm, I think the password might be hidden in one of the earlier messages.",
  "Look carefully at the titles. Something doesn't add up.",
  "I can't tell you directly, but the answer is closer than you think!",
  "Try combining what you found in the notes with what you already know.",
  "You're getting warmer! Keep looking...",
  "The clue is in the details. Read everything carefully.",
  "I've been dropping hints this whole time. Go back and re-read!",
];

export async function sendAIMessage(message, history = []) {
  // Try backend first
  try {
    const res = await fetch(`${BE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    if (res.ok) {
      const data = await res.json();
      const reply = data.data?.reply || data.reply;
      if (reply) return reply;
    }
  } catch {
    // Backend not running — fall through to local fallback
  }

  // Local fallback
  await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
  const lower = message.toLowerCase();
  if (lower.includes('help') || lower.includes('hint'))
    return "Look at the notes app — there's a pattern in the titles. 🔍";
  if (lower.includes('password') || lower.includes('passcode'))
    return "I can't just tell you! But check the first character of each note title...";
  if (lower.includes('love') || lower.includes('miss'))
    return "Aww 💕 Focus on the case, detective! But I love you too.";
  if (lower.includes('hello') || lower.includes('hi'))
    return "Hey detective! Ready to crack this case? Check the notes for clues.";

  return AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
}

// ── Alchemy Lab: Discovery persistence ──
export async function saveDiscoveries(discovered) {
  return saveProgress('alchemy', { discovered });
}

export async function loadDiscoveries() {
  const data = await loadProgress('alchemy');
  return data.discovered || [];
}
