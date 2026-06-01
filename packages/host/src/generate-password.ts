import { randomInt } from "node:crypto";

/** Short common words for memorable random passwords (e.g. tiger-bridge-lemon-ocean). */
const WORDS = [
  "apple", "arrow", "beach", "berry", "blade", "blaze", "bloom", "board", "brick", "brook",
  "camel", "candy", "cedar", "charm", "cherry", "cloud", "coral", "crown", "daisy", "delta",
  "eagle", "ember", "fable", "falcon", "field", "flame", "flint", "frost", "ghost", "giant",
  "glass", "globe", "grace", "grape", "green", "harbor", "hazel", "heart", "honey", "horse",
  "ivory", "jade", "jewel", "knight", "label", "lemon", "light", "linen", "lotus", "magic",
  "maple", "marble", "melon", "metal", "mint", "moon", "moss", "music", "night", "noble",
  "ocean", "olive", "onion", "orange", "orbit", "otter", "panda", "paper", "pearl", "pebble",
  "piano", "pilot", "pixel", "planet", "plum", "prairie", "quartz", "quest", "quiet", "rabbit",
  "raven", "river", "robin", "rocket", "rose", "ruby", "sage", "sail", "salmon", "sand",
  "sapphire", "shadow", "shield", "silver", "sky", "smoke", "snake", "snow", "spark", "spice",
  "spring", "stone", "storm", "stream", "sun", "swift", "table", "tiger", "toast", "tower",
  "trail", "tulip", "turbo", "turtle", "valley", "violet", "voice", "wave", "whale", "wheat",
  "willow", "wind", "winter", "wolf", "wood", "yellow", "zenith",
];

export function generateWordPassword(wordCount = 4): string {
  const parts: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    parts.push(WORDS[randomInt(WORDS.length)]!);
  }
  return parts.join("-");
}
