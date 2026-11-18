'use strict';
// Words the page never uses about a person. A tree records what someone typed in, not the truth,
// so the page says "no death date recorded" and nothing about time running short.
const BANNED_WORDS = ['living', 'alive', 'still with us', "before it's too late", 'before it is too late',
  'last chance', 'running out', 'time is short', 'probably'];

function wordingProblems(text, where) {
  const low = text.toLowerCase().replace(/’/g, "'");
  return BANNED_WORDS.filter((w) => low.includes(w)).map((w) => `${where} says "${w}"`);
}

module.exports = { BANNED_WORDS, wordingProblems };
