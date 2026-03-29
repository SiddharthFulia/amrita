// ─── Word pools ───────────────────────────────────────────────────────────────
export const POOL = {
  4: [
    'LOVE','HOPE','CUTE','KISS','CALM','COZY','DEAR','GLOW','GLEE','KEEN',
    'LACE','MUSE','NICE','NEAT','ROSY','SOFT','STAR','PURE','WARM','WILD',
    'ZEAL','DAWN','DUSK','GIFT','HEAL','HUSH','IRIS','LILT','MEEK','MILD',
    'MOON','MIST','OPAL','PLUM','SILK','SNOW','TIDE','VEIL','WISH','WISP',
    'LARK','BOON','FAWN','JADE','VALE','TAME','TINT','WRAP','SOUL','SAGE',
    'NEST','GUST','ZEST','LUSH','DEWY','POSH','AIRY','BASK','BEAM','ZING',
    'FIZZ','HAZY','NOOK','PURL','RIME','TUFT','WAFT','BRIM','DOTE','HEED',
    'HALO','JEST','KNIT','FLUX','FOND','BLISS','BOLD','CARE','DOVE','GLAD',
    'ECHO','FAIR','HALE','JIVE','LITHE','MEMO','NIGH','PAVE','RAVE','SWAY',
    'ACHE','ARCH','BLITHE','BOND','BRISK','CRISP','DUSK','FEEL','GALE','HUES',
  ],
  5: [
    'HEART','ROSES','LOVER','SWEET','BLISS','ANGEL','HONEY','MAGIC','PEACE','SMILE',
    'STARS','SUGAR','DANCE','BLOOM','FLAME','DREAM','FAITH','LIGHT','MERCY','SHINE',
    'SPARK','TRUST','GRACE','DAISY','NIGHT','CANDY','CHARM','FAIRY','BLUSH','BLESS',
    'TULIP','HAPPY','SUNNY','LUCKY','PETAL','PLUSH','PIANO','MERRY','CLOUD','BRAVE',
    'OCEAN','MISTY','LILAC','PEACH','AMBER','CORAL','OASIS','HAVEN','MOSSY','BRISK',
    'ZESTY','FLOAT','BROOK','ELATE','GIDDY','MIRTH','PRIDE','VALOR','NOBLE','LOFTY',
    'VERVE','GUSTO','POISE','ADORE','YEARN','SAVOR','REVEL','LYRIC','RHYME','VERSE',
    'KITTY','BUNNY','FUZZY','DOWNY','SILKY','BERRY','MANGO','PANSY','POPPY','VIOLA',
    'BENCH','GROVE','GLADE','SHORE','CLIFF','DUNES','VILLA','EMBER','FROST','GLINT',
    'JEWEL','KARMA','LAPIS','PRISM','QUILL','SABLE','TAFFY','FLOWY','WISPY','YIELD',
    'AZURE','BLAZE','CRISP','DELTA','IRONY','MUTED','OMBRE','DUSKY','GLOWY','PERKY',
    'LEAFY','SWOON','AMOUR','FLAIR','LUCID','SCOUT','SPICE','ELVEN','SLEEK','WHIRL',
    'THYME','PLUCK','GRACE','SEREN','DOVES','CEDAR','BIRCH','LODGE','MEADS','NYMPH',
  ],
  6: [
    'BEAUTY','CUDDLE','DAINTY','GOLDEN','GENTLE','HARBOR','HEAVEN','JOYFUL','LOVELY','MELLOW',
    'MYSTIC','PETALS','SERENE','SILKEN','TENDER','VELVET','WARMTH','BREEZE','CANDLE','CASTLE',
    'COSMOS','CRADLE','DEARLY','DIVINE','DREAMY','EARTHY','ELATED','FAIRLY','FLORAL','FLUFFY',
    'GARDEN','GILDED','HUSHED','JOYOUS','KINDLY','LAVISH','LOVING','COBALT','RADIAL','SAVORY',
    'SOFTEN','SOLACE','STARRY','SUNLIT','SUNSET','THATCH','VELOUR','WANDER','BLITHE','BONNIE',
    'CHERUB','CLOVER','DOTING','FEISTY','FROTHY','GROOVY','HEARTY','HOMELY','LIVELY','MARBLE',
    'MIRROR','NESTLE','NIMBLE','PEACHY','PURPLE','QUAINT','REVERE','RIBBON','RIPPLE','ROOTED',
    'RUSTIC','SACRED','SILVER','SIMPLE','SLEEPY','SPRING','STEAMY','STORMY','SUBTLE','SUPPLE',
    'TANGLE','TROPIC','TUSCAN','UNIQUE','UPBEAT','SPROUT','VIVACE','WALNUT','WILLOW','WONDER',
    'YELLOW','ZENITH','ZEPHYR','BOUNTY','BEACON','BOTANY','BREEZY','CITRUS','DAMASK','ELFISH',
    'FERVID','FLORET','GOBLET','GRACED','GRASSY','HEARTH','HERALD','HOLLOW','HUSTLE','ICONIC',
    'INLAID','JOVIAL','KERNEL','LOCKET','LUSTER','MANTLE','MEADOW','WISTLY','COAXED','VELOUR',
    'AURORA','BONSAI','CHAPEL','DAFFIL','DREAMT','ENRICH','FLOATY','GARNET','HALCYON','ISLAND',
    'JASPER','KINDLE','LAUREL','MORTAL','MYSTIC','NECTAR','ORCHID','PASTEL','QUARTZ','ROSARY',
  ],
};

// ─── Level config ─────────────────────────────────────────────────────────────
export const LEVELS = [
  { id: 'easy',   label: 'Easy',   letters: 4, attempts: 5, color: '#4caf50', desc: '4 letters · 5 tries' },
  { id: 'medium', label: 'Medium', letters: 5, attempts: 6, color: '#ff9800', desc: '5 letters · 6 tries' },
  { id: 'hard',   label: 'Hard',   letters: 6, attempts: 6, color: '#e91e8c', desc: '6 letters · 6 tries + hard rules' },
];

// ─── Daily word seed ──────────────────────────────────────────────────────────
export function dailySeed(offset = 0) {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + offset;
}

export function getTarget(levelId) {
  const lvl = LEVELS.find(l => l.id === levelId);
  const pool = POOL[lvl.letters];
  const offset = levelId === 'easy' ? 0 : levelId === 'medium' ? 7777 : 13131;
  return pool[Math.abs(dailySeed(offset)) % pool.length];
}

// ─── Core algorithm: 2-pass frequency map (canonical Wordle logic) ────────────
export function checkGuess(secret, guess) {
  const n = secret.length;
  const result = Array(n).fill('absent');

  // Build frequency map of the secret word
  const freq = {};
  for (const c of secret) freq[c] = (freq[c] || 0) + 1;

  // Pass 1: mark greens, decrement frequency
  for (let i = 0; i < n; i++) {
    if (guess[i] === secret[i]) {
      result[i] = 'correct';
      freq[guess[i]]--;
    }
  }

  // Pass 2: mark yellows from remaining frequency
  for (let i = 0; i < n; i++) {
    if (result[i] === 'correct') continue;
    if ((freq[guess[i]] || 0) > 0) {
      result[i] = 'present';
      freq[guess[i]]--;
    }
  }

  return result;
}

// ─── Keyboard state (green > yellow > gray priority) ─────────────────────────
const PRIORITY = { correct: 3, present: 2, absent: 1 };

export function mergeKeyStates(prev, letters, states) {
  const next = { ...prev };
  letters.forEach((l, i) => {
    if (!l) return;
    const cur = next[l];
    if (!cur || (PRIORITY[states[i]] || 0) > (PRIORITY[cur] || 0)) {
      next[l] = states[i];
    }
  });
  return next;
}

// ─── Hard mode: confirmed letters must be reused ──────────────────────────────
export function hardModeViolation(word, lockedGuesses) {
  const required = {};
  const requiredAt = {};

  for (const g of lockedGuesses) {
    const counts = {};
    g.letters.forEach((l, i) => {
      if (g.states[i] === 'correct' || g.states[i] === 'present') {
        counts[l] = (counts[l] || 0) + 1;
      }
      if (g.states[i] === 'correct') requiredAt[i] = l;
    });
    for (const [l, n] of Object.entries(counts)) {
      required[l] = Math.max(required[l] || 0, n);
    }
  }

  for (const [l, n] of Object.entries(required)) {
    if (word.split('').filter(c => c === l).length < n) return `Must use "${l}"`;
  }
  for (const [pos, l] of Object.entries(requiredAt)) {
    if (word[parseInt(pos)] !== l) return `Pos ${parseInt(pos) + 1} must be "${l}"`;
  }
  return null;
}

// ─── Share result ─────────────────────────────────────────────────────────────
export function getShareText(levelId, guesses, won) {
  const lvl = LEVELS.find(l => l.id === levelId);
  const MAP = { correct: '💚', present: '💛', absent: '⬜' };
  const locked = guesses.filter(g => g.locked);
  const tries = won ? locked.length : 'X';
  const grid = locked.map(g => g.states.map(s => MAP[s] || '⬜').join('')).join('\n');
  return `Amrita's Wordle 💕 ${lvl?.label}\n${tries}/${lvl?.attempts}\n\n${grid}`;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const SAVE_KEY = 'amrita_wordle_v2';
const STREAK_KEY = 'amrita_wordle_streak';

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      ...state,
      date: new Date().toDateString(),
    }));
  } catch {}
}

export function loadGame() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s || s.date !== new Date().toDateString()) return null;
    return s;
  } catch { return null; }
}

export function loadStreak() {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"streak":0,"best":0,"lastWin":""}'); }
  catch { return { streak: 0, best: 0, lastWin: '' }; }
}

export function saveStreak(streak, best) {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify({ streak, best, lastWin: new Date().toDateString() })); }
  catch {}
}
