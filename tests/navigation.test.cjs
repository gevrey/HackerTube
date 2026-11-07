const test = require('node:test');
const assert = require('node:assert/strict');
const { nearest } = require('../app/src/main/assets/navigation.js');
const box = (x, y, width = 100, height = 80) => ({ left:x, top:y, right:x+width, bottom:y+height });

test('D-pad follows rows and columns rather than a closer diagonal', () => {
  assert.equal(nearest(box(0, 0), [box(120, 0), box(50, 90)], 'right'), 0);
  assert.equal(nearest(box(120, 0), [box(0, 0), box(120, 100)], 'down'), 1);
  assert.equal(nearest(box(120, 100), [box(120, 0), box(0, 100)], 'left'), 1);
  assert.equal(nearest(box(120, 100), [box(120, 0), box(0, 100)], 'up'), 0);
});
test('screen edges do not wrap to the opposite direction', () => {
  assert.equal(nearest(box(0, 0), [box(120, 0), box(0, 100)], 'left'), -1);
  assert.equal(nearest(box(0, 0), [], 'down'), -1);
});
test('a diagonal is reachable when no aligned control exists', () => {
  assert.equal(nearest(box(0, 0), [box(120, 100), box(-120, 100)], 'right'), 0);
});


test('pagination includes every item and clamps shortened or empty lists', () => {
  const { pageWindow } = require('../app/src/main/assets/navigation.js');
  const visited = [];
  for (let p = 0; p < 7; p++) {
    const { start, end } = pageWindow(37, p, 6);
    for (let i = start; i < end; i++) visited.push(i);
  }
  assert.deepEqual(visited, Array.from({ length:37 }, (_, i) => i));
  assert.deepEqual(pageWindow(0, 9, 6), { count:1, page:0, start:0, end:0 });
  assert.deepEqual(pageWindow(7, 9, 6), { count:2, page:1, start:6, end:7 });
});
