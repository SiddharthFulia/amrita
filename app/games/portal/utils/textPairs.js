// ─── Memory Glitch: Text pairs for spot-the-difference ───────────────────────
// Each pair has an 'original' and 'glitched' version with subtle word changes.
// The player must find the differing words by clicking them.

export const TEXT_PAIRS = [
  {
    id: 1,
    title: 'Morning Coffee',
    difficulty: 'easy',
    diffCount: 3,
    original: [
      "I woke up early today and made myself a cup of warm coffee.",
      "The morning sunlight was streaming through the kitchen window.",
      "I sat in my favorite blue chair and watched the birds outside.",
      "It was the perfect start to a beautiful day.",
    ],
    glitched: [
      "I woke up early today and made myself a cup of cold coffee.",
      "The morning sunlight was streaming through the kitchen window.",
      "I sat in my favorite red chair and watched the birds outside.",
      "It was the perfect start to a wonderful day.",
    ],
  },
  {
    id: 2,
    title: 'The Garden',
    difficulty: 'easy',
    diffCount: 4,
    original: [
      "Last summer we planted roses in the backyard garden.",
      "The red ones grew the tallest, reaching almost five feet.",
      "Every evening I would water them with the green hose.",
      "By August the whole garden was blooming with color.",
      "Mom said it was the prettiest garden on the street.",
    ],
    glitched: [
      "Last summer we planted tulips in the backyard garden.",
      "The red ones grew the tallest, reaching almost five feet.",
      "Every morning I would water them with the green hose.",
      "By August the whole garden was blooming with color.",
      "Mom said it was the prettiest garden on the block.",
    ],
  },
  {
    id: 3,
    title: 'Beach Day',
    difficulty: 'medium',
    diffCount: 5,
    original: [
      "We drove to the beach on a sunny Saturday morning.",
      "The waves were gentle and the water was crystal clear.",
      "Sarah built an enormous sandcastle near the shore.",
      "We ate sandwiches and drank lemonade under the umbrella.",
      "The sunset painted the sky in shades of orange and pink.",
      "It was one of those days you never want to end.",
    ],
    glitched: [
      "We drove to the beach on a sunny Sunday morning.",
      "The waves were gentle and the water was crystal blue.",
      "Sarah built an enormous sandcastle near the shore.",
      "We ate sandwiches and drank iced tea under the umbrella.",
      "The sunset painted the sky in shades of purple and pink.",
      "It was one of those days you never want to forget.",
    ],
  },
  {
    id: 4,
    title: 'The Library',
    difficulty: 'medium',
    diffCount: 6,
    original: [
      "The old library on Maple Street has been there for sixty years.",
      "Inside there are three floors of books on wooden shelves.",
      "Mrs. Chen the librarian always wears a silver necklace.",
      "My favorite spot is the reading nook by the tall window.",
      "Sometimes I spend entire afternoons lost in mystery novels.",
      "The building smells like old paper and fresh lavender.",
      "It feels like stepping into another world every time.",
    ],
    glitched: [
      "The old library on Oak Street has been there for sixty years.",
      "Inside there are three floors of books on wooden shelves.",
      "Mrs. Chen the librarian always wears a gold necklace.",
      "My favorite spot is the reading nook by the small window.",
      "Sometimes I spend entire mornings lost in mystery novels.",
      "The building smells like old paper and fresh lavender.",
      "It feels like stepping into another dimension every time.",
    ],
  },
  {
    id: 5,
    title: 'The Storm',
    difficulty: 'hard',
    diffCount: 7,
    original: [
      "The weather forecast said the storm would arrive at midnight.",
      "Dark clouds gathered quickly over the eastern mountains.",
      "Lightning flashed every few seconds, bright and terrifying.",
      "The old oak tree in our yard swayed violently in the wind.",
      "Our dog Max hid under the dining table, shaking nervously.",
      "Dad checked all the windows twice to make sure they were locked.",
      "The power went out at exactly eleven thirty that night.",
      "We lit seven candles and told stories until morning came.",
    ],
    glitched: [
      "The weather forecast said the storm would arrive at dawn.",
      "Dark clouds gathered quickly over the western mountains.",
      "Lightning flashed every few seconds, bright and terrifying.",
      "The old oak tree in our yard swayed violently in the rain.",
      "Our dog Max hid under the kitchen table, shaking nervously.",
      "Dad checked all the windows twice to make sure they were closed.",
      "The power went out at exactly eleven thirty that night.",
      "We lit seven candles and told stories until daylight came.",
    ],
  },
  {
    id: 6,
    title: 'Secret Recipe',
    difficulty: 'hard',
    diffCount: 8,
    original: [
      "Grandma's chocolate cake recipe has been in our family for generations.",
      "You need exactly three cups of flour and two eggs to start.",
      "The secret ingredient is a tiny pinch of cinnamon in the batter.",
      "She always used her favorite wooden spoon to mix everything together.",
      "The cake must bake at three hundred and fifty degrees for forty minutes.",
      "When it's done the kitchen fills with the most amazing sweet aroma.",
      "She would always frost it with dark chocolate and fresh strawberries.",
      "Every birthday she made this cake and wrote our names in white icing.",
      "I promised her I would never share the recipe with anyone outside the family.",
    ],
    glitched: [
      "Grandma's chocolate cake recipe has been in our family for decades.",
      "You need exactly three cups of flour and three eggs to start.",
      "The secret ingredient is a tiny pinch of vanilla in the batter.",
      "She always used her favorite silver spoon to mix everything together.",
      "The cake must bake at three hundred and fifty degrees for forty minutes.",
      "When it's done the kitchen fills with the most amazing warm aroma.",
      "She would always frost it with milk chocolate and fresh strawberries.",
      "Every birthday she made this cake and wrote our names in pink icing.",
      "I promised her I would never share the recipe with anyone outside the family.",
    ],
  },
];

// Tokenize a line into words, preserving punctuation attached to words
export function tokenize(line) {
  return line.split(/\s+/).filter(Boolean);
}

// Compare two lines and return indices of differing words
export function findDiffs(originalLine, glitchedLine) {
  const origWords = tokenize(originalLine);
  const glitchWords = tokenize(glitchedLine);
  const diffs = [];
  const maxLen = Math.max(origWords.length, glitchWords.length);
  for (let i = 0; i < maxLen; i++) {
    if ((origWords[i] || '') !== (glitchWords[i] || '')) {
      diffs.push(i);
    }
  }
  return diffs;
}
