// ─── Digital Detective: Phone content ────────────────────────────────────────

export const PASSCODE = '4829'; // Hidden in the notes (first digits of each note)

export const MESSAGES_INITIAL = [
  { from: 'them', text: "Hey detective! I need your help with something 🔍", time: '9:02 AM' },
  { from: 'them', text: "There's a secret hidden somewhere in this phone...", time: '9:03 AM' },
  { from: 'them', text: "Check the Notes app for clues. The passcode is hidden there!", time: '9:05 AM' },
  { from: 'them', text: "When you find it, unlock the secret reward 💕", time: '9:06 AM' },
];

export const NOTES = [
  {
    id: 1,
    title: '4 things I love',
    content: "1. Your smile\n2. Your laugh\n3. How you always know what to say\n4. Everything else about you",
    pinned: true,
  },
  {
    id: 2,
    title: '8 reasons today is special',
    content: "Because you're reading this right now.\nBecause we're together.\nBecause love is real.\nBecause you make everything better.\nBecause the stars aligned.\nBecause this moment exists.\nBecause I chose you.\nBecause you chose me.",
    pinned: false,
  },
  {
    id: 3,
    title: '2 promises',
    content: "I promise to always be there for you.\nI promise to love you more every single day.\n\n— S ❤️",
    pinned: false,
  },
  {
    id: 4,
    title: '9 words',
    content: "You are the best thing that ever happened to me.\n\n(Count them — exactly nine.)",
    pinned: false,
  },
  {
    id: 5,
    title: 'HINT 🔑',
    content: "The passcode is hiding in plain sight.\nLook at the FIRST CHARACTER of each note title.\nPut them together in order (1, 2, 3, 4).\n\n4 → 8 → 2 → 9",
    pinned: true,
  },
];

export const SECRET_REWARD = {
  title: "You Found It! 💕",
  message: "Congratulations, detective! You cracked the code.\n\nHere's your secret reward:\n\nI love you more than all the stars in the sky, more than all the words in all the books, and more than any game could ever express.\n\nYou're not just my girlfriend — you're my best friend, my favorite person, and my whole world.\n\nForever yours,\nSiddharth ❤️",
};

export const CONTACTS = [
  { name: 'Mysterious Stranger', emoji: '🕵️', isAI: true },
  { name: 'Siddharth ❤️', emoji: '💕', isAI: false },
];

export const APPS = [
  { id: 'messages', name: 'Messages', emoji: '💬', badge: 4 },
  { id: 'notes',    name: 'Notes',    emoji: '📝', badge: 0 },
  { id: 'lock',     name: 'Secret',   emoji: '🔒', badge: 1 },
  { id: 'photos',   name: 'Photos',   emoji: '🖼️', badge: 0 },
];
