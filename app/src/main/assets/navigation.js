/* Geometry is kept independent of the DOM so the few important D-pad cases can be tested. */
(function (root) {
  'use strict';
  function nearest(current, candidates, direction) {
    const horizontal = direction === 'left' || direction === 'right';
    const sign = direction === 'left' || direction === 'up' ? -1 : 1;
    const center = r => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 });
    const from = center(current);
    let best = -1, bestScore = Infinity;
    candidates.forEach((rect, index) => {
      const to = center(rect);
      const forward = (horizontal ? to.x - from.x : to.y - from.y) * sign;
      if (forward <= 1) return;
      const cross = Math.abs(horizontal ? to.y - from.y : to.x - from.x);
      const overlaps = horizontal
        ? rect.bottom > current.top && rect.top < current.bottom
        : rect.right > current.left && rect.left < current.right;
      // Prefer the same row/column; allow a diagonal only when no aligned target exists.
      const score = forward + cross * 2 + (overlaps ? 0 : 10000);
      if (score < bestScore) { bestScore = score; best = index; }
    });
    return best;
  }
  // Clamp pages after filters or asynchronous data changes, including an empty collection.
  function pageWindow(total, requested, size) {
    const count = Math.max(1, Math.ceil(total / size));
    const page = Math.max(0, Math.min(requested, count - 1));
    return { count, page, start:page * size, end:Math.min(total, (page + 1) * size) };
  }
  root.HackerTubeNavigation = { nearest, pageWindow };
  if (typeof module !== 'undefined') module.exports = { nearest, pageWindow };
})(typeof window === 'undefined' ? globalThis : window);
