(function () {
  'use strict';
  if (window.HackerTubeTV || location.origin !== 'https://hackertube.org') return;
  const source = document.querySelector('main');
  const pageSize = 6;
  const scrollSettingKey = 'cri.hackertube.scrollEnabled';
  const textSizeKey = 'cri.hackertube.textSize';
  const textSizes = ['small', 'medium', 'large'];
  // Default to the existing paged layout. Storage failures must not prevent app startup.
  let scrollEnabled = false;
  try { scrollEnabled = localStorage.getItem(scrollSettingKey) === 'true'; } catch (_) {}
  // Small is two CSS pixels below the previous card and reader sizes. Ignore invalid saved values.
  let textSize = 'small';
  try {
    const saved = localStorage.getItem(textSizeKey);
    if (textSizes.includes(saved)) textSize = saved;
  } catch (_) {}
  const savedPages = new Map();
  let path = location.pathname + location.search, page = 0, panels = [];
  let scheduled = false, editing = false, searchOpen = false, pendingFilters = false;
  let batchLoader = null, loadingNext = false, pendingContentFocus = true;
  const directions = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' };

  // Keep the site's router, storage, and event handlers alive as a data source. Its DOM is
  // parked below the viewport, not clipped into the visible UI or made a scroll destination.
  // In particular, its old infinite-scroll sentinel must stay outside the viewport.
  const style = document.createElement('style');
  style.textContent = `
    html,body { width:100%; height:100%; margin:0!important; overflow:hidden!important; overscroll-behavior:none; }
    body > :not(#tv-shell):not(script):not(style) { position:fixed!important; top:100000px!important;
      left:0!important; width:960px!important; visibility:hidden!important; pointer-events:none!important; }
    #tv-shell { position:fixed; inset:18px 26px; display:grid; grid-template-rows:minmax(0,1fr) 18px;
      gap:12px; color:#f4f6fb; background:#10141c; font:18px/1.3 sans-serif;
      --tv-card-title-size:14px; --tv-card-subtitle-size:11px; --tv-text-size:17px; }
    #tv-shell[data-text-size=medium] { --tv-card-title-size:16px; --tv-card-subtitle-size:13px; --tv-text-size:19px; }
    #tv-shell[data-text-size=large] { --tv-card-title-size:18px; --tv-card-subtitle-size:15px; --tv-text-size:21px; }
    body { background:#10141c!important; }
    #tv-shell * { box-sizing:border-box; min-width:0; min-height:0; }
    #tv-shell button,#tv-shell input { font:inherit; color:inherit; }
    #tv-shell button { border:2px solid transparent; background:#263346; border-radius:8px;
      padding:7px 13px; cursor:pointer; overflow:hidden; }
    #tv-shell button:disabled,#tv-shell button[aria-disabled=true] { opacity:.35; }
    #tv-shell button[aria-disabled=true].tv-focus { opacity:1; color:#9aaec5; }
    #tv-shell .tv-focus { border-color:#ffad6c!important; outline:none!important; background-color:#34465e; }
    #tv-main { display:grid; grid-template-columns:150px minmax(0,1fr); gap:22px; overflow:hidden; }
    #tv-sidebar { display:grid; grid-template-rows:40px minmax(0,1fr); gap:8px; }
    #tv-shell #tv-brand { padding:0 3px; font-size:24px; line-height:1.2; font-weight:700; text-align:left; background:transparent; }
    #tv-brand span { color:#ff8d42; }
    #tv-nav { display:grid; grid-template-rows:repeat(11,minmax(0,1fr)); gap:5px; padding:3px; }
    #tv-nav button { text-align:left; padding:4px 10px; font-size:16px; }
    #tv-nav button[aria-current=page] { color:#ffad6c; }
    #tv-content { display:flex; flex-direction:column; gap:10px; padding:3px; overflow:hidden; }
    #tv-search { display:none; flex:none; gap:10px; height:44px; }
    #tv-shell.tv-search-open #tv-search { display:flex; }
    #tv-query { flex:1; border:2px solid #526176; border-radius:8px; padding:6px 14px; background:#18202c; }
    #tv-title { flex:none; margin:0; height:30px; font-size:22px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #tv-tools { flex:none; height:36px; gap:10px; }
    #tv-tools button { font-size:16px; padding:4px 12px; }
    #tv-body { flex:1; min-height:0; overflow:hidden; }
    #tv-pager { flex:none; height:38px; }
    .tv-cards { height:100%; display:grid; grid-template-columns:repeat(3,minmax(0,1fr));
      grid-template-rows:repeat(2,minmax(0,1fr)); gap:14px; padding:3px; }
    #tv-shell .tv-card { display:grid; grid-template-rows:minmax(0,1fr) auto auto; gap:4px; padding:7px; text-align:left; }
    .tv-card img { width:100%; height:100%; object-fit:cover; border-radius:4px; }
    .tv-card strong { font-size:var(--tv-card-title-size); font-weight:600;
      line-height:calc(var(--tv-card-title-size) + 4px); display:-webkit-box;
      -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:anywhere; }
    .tv-card small { font-size:var(--tv-card-subtitle-size); color:#b8c5d5; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #tv-shell .tv-card.tv-text { display:flex; flex-direction:column; justify-content:center; gap:8px; }
    .tv-card.tv-text strong { font-size:var(--tv-text-size); line-height:calc(var(--tv-text-size) + 5px); -webkit-line-clamp:3; }
    .tv-card.tv-text small { white-space:normal; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
    #tv-pager { display:flex; align-items:center; justify-content:center; gap:14px; }
    #tv-pager button { height:36px; font-size:16px; }
    #tv-page-label { font-size:16px; color:#b8c5d5; min-width:100px; text-align:center; }
    #tv-footer { color:#9aaec5; font-size:13px; text-align:center; }
    #tv-reading { height:100%; padding:12px 16px; border:2px solid transparent; border-radius:8px; background:#18202c;
      overflow:hidden; white-space:pre-wrap; overflow-wrap:anywhere; font-size:var(--tv-text-size); line-height:1.5; }
    #tv-shell.tv-scroll #tv-body { overflow-y:auto; overscroll-behavior:contain; scrollbar-color:#526176 #18202c; }
    #tv-shell.tv-scroll .tv-cards { height:auto; grid-template-rows:none; grid-auto-rows:200px; }
    #tv-shell.tv-scroll #tv-reading { height:auto; min-height:100%; overflow:visible; }
    #tv-empty { display:flex; height:100%; align-items:center; justify-content:center; text-align:center; padding:20px; }
    @media(max-height:440px) { #tv-shell { inset:10px 18px; gap:8px; grid-template-rows:minmax(0,1fr) 16px; }
      #tv-content { gap:6px; } #tv-title { height:24px; } #tv-tools { height:30px; }
      #tv-search { height:38px; } #tv-pager { height:32px; }
      #tv-sidebar { grid-template-rows:28px minmax(0,1fr); gap:4px; }
      #tv-shell #tv-brand { font-size:20px; }
      #tv-nav { gap:2px; } #tv-nav button { font-size:12px; line-height:1.1; padding:0 8px; }
      #tv-reading { font-size:calc(var(--tv-text-size) - 3px); line-height:1.35; } .tv-cards { gap:9px; }
      .tv-card strong { font-size:calc(var(--tv-card-title-size) - 2px); line-height:calc(var(--tv-card-title-size) + 1px); }
      .tv-card small { font-size:calc(var(--tv-card-subtitle-size) - 2px); }
      #tv-pager button { height:30px; } }
  `;
  document.head.appendChild(style);
  const shell = document.createElement('div');
  shell.id = 'tv-shell';
  shell.dataset.textSize = textSize;
  // Keep the wordmark inside the sidebar so it does not take height away from the video grid.
  shell.innerHTML = `<div id="tv-main"><aside id="tv-sidebar">
      <button type="button" id="tv-brand" data-key="brand" aria-label="HackerTube home">Hacker<span>Tube</span></button>
      <nav id="tv-nav" aria-label="Sections"></nav></aside><section id="tv-content">
      <form id="tv-search"><input id="tv-query" type="search" aria-label="Search videos" placeholder="Search videos" autocomplete="off" data-key="query">
        <button data-key="search-submit">Go</button></form>
      <h1 id="tv-title"></h1><div id="tv-tools"></div><div id="tv-body"></div>
      <div id="tv-pager"><button id="tv-prev" data-key="previous">Previous</button><span id="tv-page-label" aria-live="polite"></span>
      <button id="tv-next" data-key="next">Next</button></div></section></div>
    <footer id="tv-footer">Arrows move · OK selects · Previous / Next changes page · Back returns</footer>`;
  document.body.appendChild(shell);
  const q = selector => shell.querySelector(selector);
  const text = node => node?.textContent.trim().replace(/\s+/g, ' ') || '';
  const button = (label, key, action) => {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = label;
    node.dataset.key = key; node.onclick = action; return node;
  };
  function setSearchOpen(open) {
    searchOpen = open; shell.classList.toggle('tv-search-open', open);
    q('[data-key="search-toggle"]').setAttribute('aria-expanded', String(open));
    if (!open) { editing = false; q('#tv-query').blur(); }
  }
  function go(url) {
    pendingFilters = false; setSearchOpen(false); savedPages.set(path, page); navigate(url);
  }
  q('#tv-brand').onclick = () => go('/');
  function openSearch() {
    // The field only takes vertical space when Search is selected from the menu.
    setSearchOpen(true); focus(q('#tv-query'));
    q('#tv-query').click();
  }
  function openFilters() {
    setSearchOpen(false);
    if (source.querySelector('.filters')) { filters(); return; }
    // Filters live on Home. Wait for its route to render before opening the panel.
    go('/'); pendingFilters = true; schedule();
  }
  q('#tv-search').onsubmit = event => {
    event.preventDefault();
    const query = q('#tv-query').value.trim();
    go(query ? '/search/' + encodeURIComponent(query) : '/');
  };
  const links = [...document.querySelectorAll('.side a')];
  links.filter(link => link.getAttribute('href') !== '/settings').forEach((link, index) => {
    const node = button(text(link), 'nav-' + index, () => go(link.getAttribute('href')));
    node.dataset.path = link.getAttribute('href'); q('#tv-nav').appendChild(node);
  });
  const search = button('Search', 'search-toggle', openSearch);
  search.setAttribute('aria-expanded', 'false'); q('#tv-nav').appendChild(search);
  q('#tv-nav').appendChild(button('Filters', 'filters', openFilters));
  const settings = links.find(link => link.getAttribute('href') === '/settings');
  if (settings) {
    const node = button('Settings', 'nav-settings', () => go('/settings'));
    node.dataset.path = '/settings'; q('#tv-nav').appendChild(node);
  }
  // About is the final menu item, after Settings, in both browsing modes.
  const about = button('About', 'about', () => go('/about'));
  about.dataset.path = '/about'; q('#tv-nav').appendChild(about);

  // Replace implicit infinite scrolling with an explicit next-batch loader. It uses the
  // site's own API callback and card renderer, preserving preferences and filter semantics.
  if (typeof pager !== 'undefined' && pager) pager.disconnect();
  infinite = function (container, load) {
    const state = { container, offset:0, busy:false, done:false, error:false };
    state.more = async function () {
      if (state.busy || state.done || !container.isConnected) return;
      state.busy = true; state.error = false; schedule();
      try {
        const items = await load(state.offset);
        if (!container.isConnected) return;
        state.offset += items.length; state.done = items.length === 0;
        container.insertAdjacentHTML('beforeend', items.map(card).join(''));
      } catch (_) { state.error = true; }
      finally { state.busy = false; schedule(); }
    };
    batchLoader = state;
    state.more();
  };
  function activeLoader() { return batchLoader?.container.isConnected ? batchLoader : null; }
  function visibleTargets() {
    return [...shell.querySelectorAll('button,input,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
  }
  function focus(node, reveal = true) {
    if (!node || node.disabled) return;
    shell.querySelectorAll('.tv-focus').forEach(el => el.classList.remove('tv-focus'));
    node.classList.add('tv-focus'); node.focus({ preventScroll:true });
    // Scroll only the content pane, leaving search, navigation, and actions fixed on screen.
    // Paged mode never changes any scroll offset.
    if (reveal && scrollEnabled && q('#tv-body').contains(node) && node.id !== 'tv-reading') {
      const pane = q('#tv-body'), bounds = pane.getBoundingClientRect(), item = node.getBoundingClientRect();
      if (item.top < bounds.top) pane.scrollTop += item.top - bounds.top - 4;
      else if (item.bottom > bounds.bottom) pane.scrollTop += item.bottom - bounds.bottom + 4;
    }
  }
  function toggleScrolling() {
    scrollEnabled = !scrollEnabled;
    try { localStorage.setItem(scrollSettingKey, String(scrollEnabled)); } catch (_) {}
    // A mode change starts at the beginning instead of reusing incompatible page/scroll positions.
    page = 0; savedPages.clear(); panels = []; q('#tv-body').scrollTop = 0;
    render();
    focus(shell.querySelector('[data-key="item-scrolling"]'));
  }
  function cycleTextSize() {
    textSize = textSizes[(textSizes.indexOf(textSize) + 1) % textSizes.length];
    try { localStorage.setItem(textSizeKey, textSize); } catch (_) {}
    // CSS variables update every card and text page together. Re-render the Settings label.
    shell.dataset.textSize = textSize;
    render();
    focus(shell.querySelector('[data-key="item-text-size"]'));
  }
  function sourceAction(node) {
    if (!node?.isConnected) return;
    if (node.matches('a')) {
      const href = node.getAttribute('href');
      if (href?.startsWith('/')) go(href);
      else { node.removeAttribute('target'); node.click(); }
    } else node.click();
    schedule();
  }
  function media(command) {
    if (command !== 'play' && command !== 'toggle') return;
    const vid = location.pathname.split('/')[2];
    if (/^[A-Za-z0-9_-]{11}$/.test(vid || '')) location.href = '/__tv_play?v=' + encodeURIComponent(vid);
  }
  function linkItem(node, prefix = '') {
    return { title:prefix + (text(node.querySelector('.vt')) || text(node) || node.getAttribute('aria-label') || 'Open'),
      subtitle:text(node.querySelector('.sub')), image:node.querySelector('img')?.src,
      key:node.getAttribute('href') || node.id, action:() => sourceAction(node) };
  }
  function showPanel(panel) { panels.push({ ...panel, page:0 }); render(true); }
  function read(title, content) { showPanel({ title, text:content || 'No additional information.' }); }
  function readSource() {
    // Keep all long content reachable through text pages rather than truncating it to fit.
    const nodes = source.querySelectorAll('h1,h2,h3,h4,p,li,tr,.cmt,.setting');
    const parts = [...nodes].filter(n => !n.parentElement.closest('li,.cmt,.setting'))
      .map(text).filter(Boolean);
    read(document.title.replace(/ - HackerTube$/, ''), parts.join('\n\n') || text(source));
  }
  function filters() {
    const items = [...source.querySelectorAll('.filters a')].map(node => linkItem(node, text(node.parentElement.querySelector('h4')) + ': '));
    showPanel({ title:'Filters', items });
  }
  function model() {
    const watch = source.querySelector('.watch');
    if (watch) {
      const title = text(watch.querySelector('h1'));
      const items = [
        { title:'Play fullscreen', subtitle:title, image:watch.querySelector('#poster img')?.src,
          key:'play', action:() => media('play') },
        { title:'Read details and comments', subtitle:'Full title, description, and discussion', key:'details', action:readSource }
      ];
      for (const id of ['like','dislike','save-later']) {
        const node = source.querySelector('#' + id);
        if (node) items.push({ title:(node.getAttribute('aria-label') || text(node)) + (node.classList.contains('on') ? ' (selected)' : ''),
          key:id, action:() => sourceAction(node) });
      }
      const youtube = watch.querySelector('a[href^="https://www.youtube.com/watch"]');
      if (youtube) items.push({ ...linkItem(youtube), title:'Open in YouTube' });
      return { title, items, tools:[['Related', () => showPanel({ title:'Related videos', items:[...source.querySelectorAll('.next')].map(n => linkItem(n)) })],
        ['Links', () => showPanel({ title:'Discussion and topic links', items:[...source.querySelectorAll('.desc a,.comments a')].map(n => linkItem(n)) })]] };
    }
    const cards = [...source.querySelectorAll('.vcard,.srow,.plcard')];
    const tools = [];
    const actions = [...source.querySelectorAll('.playall,#clear-history')];
    if (actions.length) tools.push(['Actions', () => showPanel({ title:'List actions', items:actions.map(node => ({
      title:text(node), key:node.id || node.getAttribute('href'), action:() => sourceAction(node)
    })) })]);
    if (source.querySelector('.catwrap a')) tools.push(['Topics', () => showPanel({ title:'Topics', items:[...source.querySelectorAll('.catwrap a')].map(n => linkItem(n)) })]);
    if (source.querySelector('.plinfo')) tools.push(['Introduction', readSource]);
    if (cards.length || activeLoader()) return { title:document.title.replace(/ - HackerTube$/, ''), items:cards.map(n => linkItem(n)), tools };
    if (source.querySelector('.areas')) return { title:'Categories', items:[...source.querySelectorAll('.quick a,.areaname,.cats a')].map(n => linkItem(n)), tools:[] };
    if (source.querySelector('.settings')) {
      const checkbox = source.querySelector('input[type=checkbox]');
      return { title:'Settings', items:[{
        title:'Scrolling: ' + (scrollEnabled ? 'On' : 'Off'),
        subtitle:scrollEnabled ? 'Continuous lists and text. Select for pages.' : 'Six cards per page. Select to enable scrolling.',
        key:'scrolling', checked:scrollEnabled, action:toggleScrolling
      }, { title:'Video text size: ' + textSize[0].toUpperCase() + textSize.slice(1),
        subtitle:'Select to cycle Small, Medium, Large', key:'text-size', action:cycleTextSize
      }, { title:'Video frames: ' + (checkbox?.checked ? 'On' : 'Off'),
        subtitle:'Select to change thumbnail style', key:'frames', action:() => { checkbox?.click(); render(); } },
        { title:'Read setting description', key:'setting-info', action:readSource }], tools:[] };
    }
    if (source.querySelector('.about')) return { title:document.title.replace(/ - HackerTube$/, ''), items:[
      { title:'Read this page', subtitle:'All text, in pages that fit the screen', key:'read', action:readSource },
      ...[...source.querySelectorAll('a[href]')].map(n => linkItem(n))], tools:[] };
    return { title:document.title.replace(/ - HackerTube$/, ''), items:[], tools:[], empty:text(source) || 'Loading…' };
  }
  function pageState() { return panels.at(-1) || { page }; }
  function setPage(value) { if (panels.length) panels.at(-1).page = value; else page = value; }
  function textPages(content) {
    // Measure rendered text in the actual TV viewport. Binary search fills each page without
    // cutting words or relying on a fixed character limit; even long URLs wrap within the box.
    const probe = document.createElement('div'); probe.id = 'tv-reading'; q('#tv-body').replaceChildren(probe);
    const words = content.match(/\S+\s*/g) || [''];
    const pages = []; let start = 0;
    while (start < words.length) {
      let low = start + 1, high = words.length, end = low;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2); probe.textContent = words.slice(start, mid).join('');
        if (probe.scrollHeight <= probe.clientHeight + 1) { end = mid; low = mid + 1; } else high = mid - 1;
      }
      pages.push(words.slice(start, end).join('')); start = end;
    }
    return pages;
  }
  function render(resetFocus = false) {
    scheduled = false;
    const newPath = location.pathname + location.search;
    if (newPath !== path) {
      savedPages.set(path, page); path = newPath; page = savedPages.get(path) || 0;
      panels = []; editing = false; resetFocus = true; pendingContentFocus = true;
    }
    const previousScroll = resetFocus ? 0 : q('#tv-body').scrollTop;
    shell.classList.toggle('tv-scroll', scrollEnabled);
    q('#tv-footer').textContent = scrollEnabled
      ? 'Arrows move and scroll · OK selects · Back returns'
      : 'Arrows move · OK selects · Previous / Next changes page · Back returns';
    const active = document.activeElement;
    const key = active?.dataset.key;
    const persistentFocus = active && !q('#tv-content').contains(active) && shell.contains(active);
    // A requested Filters panel opens after Home finishes rendering its source DOM.
    if (pendingFilters && path === '/' && document.title === 'HackerTube' && source.querySelector('.filters')) {
      pendingFilters = false; filters(); return;
    }
    const panel = panels.at(-1), data = panel || model();
    q('#tv-title').textContent = data.title;
    q('#tv-title').style.display = !panel && data.title === 'HackerTube' ? 'none' : '';
    q('#tv-nav').querySelectorAll('button').forEach(el => {
      if (el.dataset.path === path) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current');
    });
    q('#tv-tools').replaceChildren();
    if (panel) q('#tv-tools').appendChild(button('Back', 'panel-back', back));
    for (const [label, action] of data.tools || []) q('#tv-tools').appendChild(button(label, 'tool-' + label, action));
    q('#tv-tools').style.display = q('#tv-tools').children.length ? 'flex' : 'none';
    const loader = !panel ? activeLoader() : null;
    let count, index;
    if (panel?.text !== undefined) {
      if (scrollEnabled) {
        const reader = document.createElement('div'); reader.id = 'tv-reading';
        reader.tabIndex = 0; reader.dataset.key = 'reader'; reader.setAttribute('role', 'document');
        reader.setAttribute('aria-label', 'Details. Use Up and Down to scroll.');
        reader.textContent = panel.text; q('#tv-body').replaceChildren(reader);
        count = 1; index = 0;
      } else {
        const pages = textPages(panel.text);
        count = pages.length; index = Math.min(panel.page, count - 1); setPage(index);
        q('#tv-reading').textContent = pages[index];
      }
    } else {
      const items = data.items || [];
      const window = scrollEnabled
        ? { count:1, page:0, start:0, end:items.length }
        : HackerTubeNavigation.pageWindow(items.length, pageState().page, pageSize);
      count = window.count; index = window.page; setPage(index);
      const grid = document.createElement('div'); grid.className = 'tv-cards';
      items.slice(window.start, window.end).forEach((item, offset) => {
        const node = button('', 'item-' + (item.key || window.start + offset), item.action);
        node.className = 'tv-card' + (item.image ? '' : ' tv-text');
        if (typeof item.checked === 'boolean') {
          node.setAttribute('role', 'switch'); node.setAttribute('aria-checked', String(item.checked));
        }
        if (item.image) { const img = new Image(); img.src = item.image; img.alt = ''; node.appendChild(img); }
        const title = document.createElement('strong'); title.textContent = item.title; node.appendChild(title);
        const subtitle = document.createElement('small'); subtitle.textContent = item.subtitle || ''; node.appendChild(subtitle);
        node.setAttribute('aria-label', [item.title,item.subtitle].filter(Boolean).join('. '));
        grid.appendChild(node);
      });
      q('#tv-body').replaceChildren(grid);
      if (!items.length) {
        const empty = document.createElement('div'); empty.id = 'tv-empty';
        empty.textContent = loader?.error ? 'Could not load videos. Select Next to retry.' : loader?.busy ? 'Loading…' : data.empty || 'Nothing here yet.';
        q('#tv-body').replaceChildren(empty);
      }
    }
    q('#tv-body').scrollTop = scrollEnabled ? previousScroll : 0;
    q('#tv-prev').style.display = '';
    q('#tv-next').style.display = '';
    q('#tv-prev').textContent = scrollEnabled ? 'Top' : 'Previous';
    // ARIA keeps the pager focusable at boundaries and during loading. Native disabled
    // buttons lose focus, so click/key handlers below enforce the unavailable state instead.
    q('#tv-prev').setAttribute('aria-disabled', String(loadingNext || (!scrollEnabled && index === 0)));
    q('#tv-next').setAttribute('aria-disabled', String(loadingNext || !!loader?.busy || (index + 1 >= count && (!loader || loader.done))));
    q('#tv-page-label').textContent = 'Page ' + (index + 1) + ' / ' + count + (loader && !loader.done ? '+' : '');
    q('#tv-next').textContent = loadingNext || loader?.busy ? 'Loading…' : loader?.error ? 'Retry' : 'Next';
    if (scrollEnabled) {
      q('#tv-page-label').textContent = panel?.text !== undefined ? 'Use Up / Down to read' : (data.items || []).length + ' items';
      q('#tv-next').style.display = loader && !loader.done ? '' : 'none';
      q('#tv-next').textContent = loader?.busy ? 'Loading…' : loader?.error ? 'Retry' : 'Load more';
    }
    if (pendingContentFocus && q('.tv-card')) { pendingContentFocus = false; resetFocus = true; }
    if (!resetFocus && persistentFocus) return;
    const matching = !resetFocus && visibleTargets().find(el => el.dataset.key === key);
    // Background batch updates must preserve the viewport, even if the last focused card is offscreen.
    // Explicit remote navigation still reveals its destination through focus's default behavior.
    focus(matching || (scrollEnabled && q('#tv-reading')) || q('.tv-card') || (q('#tv-next').getAttribute('aria-disabled') !== 'true' ? q('#tv-next') : q('#tv-tools button')), !matching);
  }
  async function changePage(delta) {
    const trigger = q(delta > 0 ? '#tv-next' : '#tv-prev');
    if (trigger.getAttribute('aria-disabled') === 'true') return;
    // Keep repeated remote OK presses on the same pager for cards and text alike.
    // This also preserves focus while the next batch is being fetched.
    pendingContentFocus = false;
    focus(trigger);
    const panel = panels.at(-1), data = panel || model();
    const next = pageState().page + delta;
    const loader = !panel ? activeLoader() : null;
    if (delta > 0 && loader && next * pageSize >= (data.items || []).length && !loader.done) {
      const originalPath = path;
      loadingNext = true; render();
      await loader.more();
      loadingNext = false;
      if (path !== originalPath) return;
      if (loader.error) { render(); focus(q('#tv-next')); return; }
    }
    setPage(Math.max(0,next)); render();
    focus(trigger);
  }
  q('#tv-prev').onclick = () => {
    if (q('#tv-prev').getAttribute('aria-disabled') === 'true') return;
    if (!scrollEnabled) return changePage(-1);
    q('#tv-body').scrollTop = 0; focus(q('.tv-card') || q('#tv-reading'));
  };
  q('#tv-next').onclick = () => {
    if (q('#tv-next').getAttribute('aria-disabled') === 'true') return;
    if (!scrollEnabled) return changePage(1);
    activeLoader()?.more();
  };
  q('#tv-body').addEventListener('scroll', () => {
    const pane = q('#tv-body'), loader = activeLoader();
    // Load another batch only when the user approaches the end of a scrolling list.
    if (scrollEnabled && !panels.length && loader && !loader.busy && !loader.done && !loader.error &&
        pane.scrollTop > 0 && pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 100) loader.more();
  }, { passive:true });
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(() => render()); } }
  new MutationObserver(schedule).observe(source, { childList:true, subtree:true });
  const originalPush = history.pushState;
  history.pushState = function (...args) { const result = originalPush.apply(this,args); schedule(); return result; };
  window.addEventListener('popstate',schedule);
  window.addEventListener('resize',schedule);
  shell.addEventListener('focusin', event => {
    if (event.target.matches('button,input,[tabindex="0"]')) {
      shell.querySelectorAll('.tv-focus').forEach(el => el.classList.remove('tv-focus'));
      event.target.classList.add('tv-focus');
    }
  });
  // Capture keys before the website's handlers. Only our own content pane can scroll,
  // and only while the user has enabled scrolling in Settings.
  document.addEventListener('keydown', event => {
    if (!shell.contains(document.activeElement)) focus(q('.tv-card') || q('#tv-nav button'));
    const active = document.activeElement, key = event.key;
    pendingContentFocus = false;
    if (active === q('#tv-query') && editing && key !== 'ArrowDown' && key !== 'Escape') {
      event.stopImmediatePropagation(); return;
    }
    if (active === q('#tv-query') && (key === 'Enter' || key === ' ')) {
      editing = true; event.stopImmediatePropagation(); return;
    }
    if (!directions[key] && !['Enter',' ','Escape','PageDown','PageUp'].includes(key)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (key === 'Escape') { back(); return; }
    editing = false;
    if (scrollEnabled && (active.id === 'tv-reading' || key === 'PageDown' || key === 'PageUp')) {
      if (['ArrowUp','ArrowDown','PageDown','PageUp'].includes(key)) {
        const pane = q('#tv-body'), delta = key === 'ArrowUp' || key === 'PageUp' ? -1 : 1;
        const before = pane.scrollTop;
        pane.scrollTop += delta * Math.round(pane.clientHeight * .75);
        if (pane.scrollTop !== before) return;
        // At the ends of the text, ordinary navigation reaches Back and Top.
      }
    }
    if (!scrollEnabled && (key === 'PageDown' || key === 'PageUp')) { changePage(key === 'PageDown' ? 1 : -1); return; }
    if (key === 'Enter' || key === ' ') { active.click(); return; }
    const others = visibleTargets().filter(el => el !== active);
    const index = HackerTubeNavigation.nearest(active.getBoundingClientRect(), others.map(el => el.getBoundingClientRect()),directions[key]);
    if (index >= 0) focus(others[index]);
  },true);
  function back() {
    if (searchOpen) { setSearchOpen(false); focus(q('[data-key="search-toggle"]')); return true; }
    if (panels.length) { panels.pop(); render(true); return true; }
    if (editing) { editing = false; q('#tv-query').blur(); focus(q('.tv-card') || q('#tv-nav button')); return true; }
    return false;
  }
  window.HackerTubeTV = { media, back, refresh:render,
    get state() { return { path, scrollEnabled, page:pageState().page, panel:panels.at(-1)?.title || null,
      count:(panels.at(-1)?.items || model().items || []).length, canLoadMore:!!activeLoader() && !activeLoader().done }; } };
  render(true);
  // Re-render the current route once so its first batch uses our explicit loader.
  route();
})();
