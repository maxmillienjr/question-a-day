/* The printable sheet: for one person on the list, up to four relatives to ask about and three
   questions for each, chosen by relationship from the bank below. Same person, same sheet. */
(function (root) {
  'use strict';

  // {first} is the relative's first name; {him} and {his} follow the relative's recorded sex.
  // Questions are about one person and answerable from memory: a room, a habit, a phrase.
  var BANK = {
    'parent': [
      'What did {first} make or fix with {his} hands, for work or for pleasure?',
      'What was {first} like on an ordinary morning when you were small?',
      'What did {first} never talk about, and how did you know not to ask?',
      'What did {first} cook or bring home that you can still taste?',
      'What did {first} say when you did something wrong? Try to give the exact words.',
      'Where did {first} go for a bit of quiet?'
    ],
    'grandparent': [
      'What did {first}\'s house smell like when you walked in?',
      'Where did {first} sit, and what was always within reach?',
      'What did {first} call you?',
      'What did {first} keep that nobody else was allowed to touch?',
      'What did {first} tell you about where the family came from?',
      'What did {first} do with {his} hands while talking?'
    ],
    'great-grandparent': [
      'What is the first thing you remember about {first}: a room, a voice, a smell?',
      'What did the grown-ups call {first}, and how did they talk about {him}?',
      'Was there anything of {first}\'s in your house growing up: a chair, a dish, a photograph?'
    ],
    'aunt or uncle': [
      'What was a holiday at {first}\'s like: who came, and where did the children sit?',
      'What work did {first} do, and did you ever see {him} at it?',
      'What did {first} and your parent laugh or argue about?',
      'What did {first} give you that you still have?'
    ],
    'sibling': [
      'What did you and {first} fight about as children?',
      'What did {first} get away with that you never could?',
      'What did {first} want to be when you were young, and what happened to that?',
      'What did {first} do that made the whole table laugh?'
    ],
    'spouse': [
      'Where did you meet {first}, and what do you remember {him} wearing?',
      'What did {first} do every single day without fail?',
      'What did {first} never talk about?',
      'What did {first} sing, hum or whistle around the house?'
    ],
    'parent-in-law': [
      'What was the first meal you ate at {first}\'s table?',
      'What did {first} make of you at first, and when did that change?',
      'What did {first} teach you about the family you married into?'
    ],
    'first cousin': [
      'Where did you and {first} spend time together as grown-ups?',
      'What did {first} do that the rest of the family talked about?',
      'What did {first} know about the family that nobody else did?'
    ]
  };
  var PRON = { M: { him: 'him', his: 'his' }, F: { him: 'her', his: 'her' }, U: { him: 'them', his: 'their' } };
  var MAX_RELATIVES = 4, PER_RELATIVE = 3;

  function firstName(name) { return (name || '').split(' ')[0] || 'them'; }

  function fill(q, s, sex) {
    var p = PRON[sex] || PRON.U;
    return q.replace(/\{first\}/g, firstName(s.name)).replace(/\{him\}/g, p.him).replace(/\{his\}/g, p.his);
  }

  // row: one entry of Tree.analyze(...).list; idx: the reader's index (for each relative's sex).
  function sheetFor(row, idx) {
    var used = {};
    var picks = row.speak.slice(0, MAX_RELATIVES).map(function (s) {
      var bank = BANK[s.kind] || BANK['grandparent'];
      var start = (used[s.kind] || 0) * PER_RELATIVE;
      used[s.kind] = (used[s.kind] || 0) + 1;
      var qs = [];
      for (var i = 0; i < PER_RELATIVE; i++) qs.push(fill(bank[(start + i) % bank.length], s, idx[s.id] ? idx[s.id].sex : 'U'));
      return { id: s.id, name: s.name, words: s.words, kind: s.kind, noStory: s.noStory, others: s.others, questions: qs };
    });
    return { id: row.id, name: row.name, relatives: picks, more: Math.max(0, row.speak.length - MAX_RELATIVES) };
  }

  var api = { sheetFor: sheetFor, BANK: BANK, MAX_RELATIVES: MAX_RELATIVES, PER_RELATIVE: PER_RELATIVE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Sheet = api;
})(this);
