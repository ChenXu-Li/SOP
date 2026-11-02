/* =========================================================
   对公业务 SOP 知识库 · 应用逻辑（无依赖，hash 路由）
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- 工具 ---------------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const modOf = id => MODULES.find(m => m.id === id) || { name: '未分类', icon: '📁', stage: 'open' };
  const stageOf = id => STAGES.find(s => s.id === id) || { name: '', desc: '' };
  const byId = id => SOPS.find(s => s.id === id);

  const LS = {
    get(k, d) { try { const v = localStorage.getItem('kb_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('kb_' + k, JSON.stringify(v)); } catch (e) {} }
  };

  let doneSteps = LS.get('steps', {});   // { sopId: [0,2,...] }
  let doneMats  = LS.get('mats', {});    // { sopId: [0,1,...] }
  let doneTasks = LS.get('tasks', {});   // { “0-1”: true }

  const saveSteps = () => LS.set('steps', doneSteps);
  const saveMats  = () => LS.set('mats', doneMats);
  const saveTasks = () => LS.set('tasks', doneTasks);

  const isDone = (arr, i) => (arr || []).indexOf(i) > -1;
  const toggle = (arr, i) => arr.indexOf(i) > -1 ? arr.filter(x => x !== i) : arr.concat(i);

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
  }

  /* ---------------- 图标 ---------------- */
  const IC = {
    check: '<svg viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>'
  };

  // 业务模块矢量图标（避免不同系统的 emoji 渲染差异）
  const MI = {
    users:  '<path d="M16 20v-1.6a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="3.4"/><path d="M17 4.2a3.4 3.4 0 0 1 0 6.4M22 20v-1.6a3.6 3.6 0 0 0-2.6-3.4"/>',
    bank:   '<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20.5h18"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.4-4.4"/>',
    file:   '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h5"/>',
    coins:  '<ellipse cx="12" cy="6.5" rx="7.5" ry="3"/><path d="M4.5 6.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5"/><path d="M4.5 11.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5"/>',
    chart:  '<path d="M4 20h16"/><path d="M7 20v-6M12 20V8M17 20v-9"/>',
    receipt:'<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    shield: '<path d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    globe:  '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5z"/>',
    card:   '<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="M3 10h18"/><path d="M6.5 15h3"/>',
    map:    '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
    book:   '<path d="M5 4.5h9a2 2 0 0 1 2 2V20H7a2 2 0 0 0-2 2z"/><path d="M5 4.5V19"/><path d="M16 6.5h3V20h-3"/>',
    list:   '<rect x="4" y="4" width="16" height="16" rx="2.4"/><path d="M8 10l1.8 1.8L13 8.5"/><path d="M8 16h8"/>',
    bolt:   '<path d="M13 3 5.5 13.5H11L10 21l7.5-10.5H12z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'
  };
  const mIco = name => `<svg class="mico" viewBox="0 0 24 24">${MI[name] || MI.file}</svg>`;

  /* ---------------- 主题 ---------------- */
  function initTheme() {
    const t = LS.get('theme', null) ||
      (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', t);
    $('#topbar').style.background = '';
  }
  $('#btnTheme').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    LS.set('theme', next);
  });
  initTheme();

  /* ---------------- 侧边栏 ---------------- */
  function renderSideNav() {
    const cur = location.hash || '#/home';
    const count = st => SOPS.filter(s => s.stage === st.id).length;
    let h = '';
    h += `<div class="side-group"><span>总览</span>
      <a class="side-link" href="#/home"><span>首页</span></a>
      <a class="side-link" href="#/map"><span>业务地图</span></a>
      <a class="side-link" href="#/lib"><span>SOP 总库</span><span class="n">${SOPS.length}</span></a>
    </div>`;
    h += `<div class="side-group"><span>按流程阶段</span>`;
    STAGES.forEach(st => {
      h += `<a class="side-link" href="#/stage/${st.id}"><span>${esc(st.name)}</span><span class="n">${count(st)}</span></a>`;
    });
    h += `</div><div class="side-group"><span>工具与资料</span>
      <a class="side-link" href="#/checklist"><span>材料清单</span></a>
      <a class="side-link" href="#/cards"><span>速查卡</span></a>
      <a class="side-link" href="#/onboard"><span>新人 30 天</span></a>
      <a class="side-link" href="#/glossary"><span>术语表</span></a>
      <a class="side-link" href="#/me"><span>我的进度</span></a>
    </div>`;
    const nav = $('#sideNav');
    nav.innerHTML = h;
    $$('a.side-link', nav).forEach(a => {
      const href = a.getAttribute('href');
      if (href === cur || (cur.startsWith('#/sop/') && href === '#/lib')) a.classList.add('active');
    });
    const active = $('.side-link.active', nav);
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  /* ---------------- 进度统计 ---------------- */
  function stats() {
    const total = SOPS.reduce((n, s) => n + s.steps.length, 0);
    const done = SOPS.reduce((n, s) => n + (doneSteps[s.id] || []).length, 0);
    return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
  }
  function renderProgress() {
    const s = stats();
    $('#pbVal').textContent = s.pct + '%';
    $('#pbBar').style.width = s.pct + '%';
    $('#pbSub').textContent = `已掌握 ${s.done} / ${s.total} 个步骤`;
  }

  /* ---------------- 搜索 ---------------- */
  // 把每条 SOP 打平为可检索单元
  const INDEX = [];
  SOPS.forEach(s => {
    const mod = modOf(s.module);
    const base = { id: s.id, title: s.title, code: s.code, mod: mod.name, kind: 'SOP', text: [s.title, s.code, mod.name, s.scene, (s.tags || []).join(' ')].join(' ') };
    INDEX.push(base);
    s.keys.forEach((k, i) => INDEX.push({ id: s.id, title: s.title, code: s.code, mod: mod.name, kind: '要点', frag: 'keys-' + i, text: k }));
    s.steps.forEach((st, i) => INDEX.push({ id: s.id, title: s.title, code: s.code, mod: mod.name, kind: '步骤 ' + (i + 1), frag: 'step-' + i, text: [st.name, st.action, st.tip, st.trap, st.owner, st.sys].join(' ') }));
    s.materials.forEach((m, i) => INDEX.push({ id: s.id, title: s.title, code: s.code, mod: mod.name, kind: '材料', frag: 'materials', text: m.name + ' ' + (m.note || '') }));
    s.risks.forEach(r => INDEX.push({ id: s.id, title: s.title, code: s.code, mod: mod.name, kind: '风险', frag: 'risks', text: r.text }));
    s.faq.forEach(f => INDEX.push({ id: s.id, title: s.title, code: s.code, mod: mod.name, kind: 'FAQ', frag: 'faq', text: f.q + ' ' + f.a }));
  });
  GLOSSARY.forEach(g => INDEX.push({ id: '__glossary', title: g.t, code: '术语', mod: '术语表', kind: '术语', text: g.t + ' ' + g.d }));

  function highlight(text, q) {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function runSearch(q) {
    const panel = $('#searchPanel');
    q = q.trim();
    if (q.length < 1) { panel.hidden = true; panel.innerHTML = ''; return; }
    const low = q.toLowerCase();
    const hits = INDEX
      .filter(x => x.text.toLowerCase().indexOf(low) > -1)
      .map(x => {
        let score = 0;
        if (x.title.toLowerCase().indexOf(low) > -1) score += 60;
        if (x.kind === 'SOP') score += 30;
        if (x.text.toLowerCase().startsWith(low)) score += 20;
        score += Math.max(0, 20 - x.text.length / 20);
        return { x, score, i: x.text.toLowerCase().indexOf(low) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 18);

    if (!hits.length) {
      panel.innerHTML = `<div class="sp-empty">没有找到“${esc(q)}”<br><span style="font-size:12px;opacity:.7">试试：开户、受托支付、抵押率、五级分类</span></div>`;
      panel.hidden = false;
      return;
    }
    let h = '';
    hits.forEach(({ x, i }) => {
      // 摘要：从命中位置前 16 字开始，向后取 42 字，保证命中词在可视范围内
      let start = Math.max(0, i - 16);
      let end = Math.min(x.text.length, i + q.length + 42);
      let snippet = x.text.slice(start, end).replace(/\s+/g, ' ').trim();
      snippet = (start > 0 ? '…' : '') + snippet + (end < x.text.length ? '…' : '');
      const href = x.id === '__glossary' ? '#/glossary' : `#/sop/${x.id}${x.frag ? '/' + x.frag : ''}`;
      const plain = x.kind === 'SOP' ? x.text.slice(0, 44) : highlight(snippet, q);
      h += `<a class="sp-item" href="${href}">
        <b>${highlight(x.title, q)}</b>
        <span><em style="font-style:normal;color:var(--navy-2)">${esc(x.code)} · ${esc(x.kind)}</em>${x.kind === 'SOP' ? '' : ' — ' + plain}</span>
      </a>`;
    });
    panel.innerHTML = h;
    panel.hidden = false;
  }

  const searchInput = $('#searchInput');
  const searchWrap = $('.search-wrap');
  searchInput.addEventListener('input', e => runSearch(e.target.value));
  searchInput.addEventListener('focus', e => { if (e.target.value.trim()) runSearch(e.target.value); });
  document.addEventListener('click', e => {
    if (!searchWrap.contains(e.target)) $('#searchPanel').hidden = true;
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== searchInput) { e.preventDefault(); searchInput.focus(); }
    if (e.key === 'Escape') { $('#searchPanel').hidden = true; searchInput.blur(); }
  });
  $('#btnSearchMobile').addEventListener('click', () => {
    searchWrap.classList.add('active');
    searchInput.focus();
  });
  $('#searchClose').addEventListener('click', () => {
    searchWrap.classList.remove('active');
    searchInput.value = '';
    $('#searchPanel').hidden = true;
  });
  // 点击搜索结果后关闭手机搜索层
  $('#searchPanel').addEventListener('click', e => {
    if (e.target.closest('a')) {
      searchWrap.classList.remove('active');
      $('#searchPanel').hidden = true;
    }
  });

  /* ---------------- 抽屉 ---------------- */
  const sidebar = $('#sidebar'), scrim = $('#scrim');
  function openDrawer() { sidebar.classList.add('open'); scrim.classList.add('show'); }
  function closeDrawer() { sidebar.classList.remove('open'); scrim.classList.remove('show'); }
  $('#btnMenu').addEventListener('click', openDrawer);
  scrim.addEventListener('click', closeDrawer);
  $('#btnDrawerClose').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  $$('#sideNav a, .side-link').forEach(a => a.addEventListener('click', closeDrawer));

  /* ---------------- 首页 ---------------- */
  function viewHome() {
    const s = stats();
    const hot = SOPS.filter(x => x.hot);
    return `
    <div class="hero">
      <div class="kicker">CORPORATE BANKING · KNOWLEDGE BASE</div>
      <h1>把业务流程沉淀成标准动作</h1>
      <p>从获客走访到贷后管理，把每个环节的材料、系统、时点与易错点写清楚。新人照着做就能上手，老人照着查就能复述。</p>
      <div class="hero-stats">
        <div><b>${SOPS.length}</b><span>条标准流程</span></div>
        <div><b>${SOPS.reduce((n, x) => n + x.steps.length, 0)}</b><span>个关键步骤</span></div>
        <div><b>${SOPS.reduce((n, x) => n + x.materials.length, 0)}</b><span>项材料要求</span></div>
        <div><b>${s.pct}%</b><span>我的掌握度</span></div>
      </div>
    </div>

    <div class="quick">
      <a href="#/map"><span class="qi">${mIco('map')}</span><b>业务地图</b><span>六个阶段全流程串联</span></a>
      <a href="#/lib"><span class="qi">${mIco('book')}</span><b>SOP 总库</b><span>按板块查找标准流程</span></a>
      <a href="#/checklist"><span class="qi">${mIco('list')}</span><b>材料清单</b><span>跑客户前逐项核对</span></a>
      <a href="#/cards"><span class="qi">${mIco('bolt')}</span><b>速查卡</b><span>时限、口径、红线</span></a>
    </div>

    <div class="section-h"><h2>全流程一览</h2><div class="line"></div><a class="more" href="#/map">查看地图 →</a></div>
    <div class="chain">
      ${STAGES.map((st, i) => `
        <a class="chain-step" href="#/stage/${st.id}">
          <div class="cs-n">0${i + 1}</div>
          <b>${esc(st.name)}</b>
          <span>${esc(st.desc)}</span>
          <div class="cs-c">${SOPS.filter(x => x.stage === st.id).length} 条 SOP</div>
        </a>`).join('')}
    </div>

    <div class="section-h"><h2>高频必看</h2><div class="line"></div></div>
    <div class="grid">
      ${hot.map(sopCard).join('')}
    </div>

    <div class="section-h"><h2>新人从这里开始</h2><div class="line"></div><a class="more" href="#/onboard">30 天路径 →</a></div>
    <a class="card pad" href="#/onboard" style="display:block">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--accent-soft);color:var(--warn);flex:none">${mIco('target')}</div>
        <div style="flex:1;min-width:180px">
          <b style="font-size:15px">四周从旁观到独立办理</b>
          <p style="margin:4px 0 0;font-size:13px;color:var(--text-2);line-height:1.65">第 1 周看懂全貌，第 2 周跟访识客，第 3 周尽调报表，第 4 周方案流程。每周有目标、有任务、可打勾。</p>
        </div>
        <span style="color:var(--navy-2);font-size:13px">开始 →</span>
      </div>
    </a>

    <div class="section-h"><h2>合规红线（一票否决）</h2><div class="line"></div></div>
    <div class="card pad">
      ${CARDS.find(c => c.cat === '红线').items.map(it => `
        <div class="risk-item"><span class="lv lv-hi">禁止</span><div><b>${esc(it[0])}</b>：${esc(it[1])}</div></div>`).join('')}
    </div>`;
  }

  function sopCard(s) {
    const m = modOf(s.module);
    const lv = s.risk === '高' ? 'hi' : s.risk === '中' ? 'mid' : 'low';
    const d = (doneSteps[s.id] || []).length;
    return `<a class="sop-card" href="#/sop/${s.id}">
      <div class="sc-top">
        <span class="badge ${lv}">风险${esc(s.risk)}</span>
        <span class="badge">${mIco(m.icon)}${esc(m.name)}</span>
        <span class="code">${esc(s.code)}</span>
      </div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.scene)}</p>
      <div class="sc-meta">
        <span><i>耗时</i> <b>${esc(s.dur)}</b></span>
        <span><i>步骤</i> <b>${s.steps.length}</b></span>
        <span><i>材料</i> <b>${s.materials.length}</b></span>
        ${d ? `<span style="color:var(--ok)">✓ 已完成 ${d}/${s.steps.length}</span>` : ''}
      </div>
    </a>`;
  }

  /* ---------------- 业务地图 ---------------- */
  function viewMap() {
    return `
    <div class="crumb"><a href="#/home">首页</a>${IC.arrow}<span>业务地图</span></div>
    <h1 class="page-title">对公业务全景地图</h1>
    <p class="page-sub">一笔对公业务从接触到退出，依次经过六个阶段。每条 SOP 都可以点开查看步骤、材料和风险点。</p>
    ${STAGES.map((st, i) => {
      const list = SOPS.filter(s => s.stage === st.id);
      return `<div class="map-stage">
        <div class="ms-left">
          <div class="num">${i + 1}</div>
          <b>${esc(st.name)}</b>
          <span>${esc(st.desc)}</span>
        </div>
        <div class="ms-right">
          <div class="ms-sops">
            ${list.length ? list.map(s => `
              <a class="ms-sop" href="#/sop/${s.id}">
                <span class="badge ${s.risk === '高' ? 'hi' : s.risk === '中' ? 'mid' : 'low'}">${esc(s.risk)}</span>
                <span class="t">${esc(s.title)}</span>
                <span class="s">${esc(modOf(s.module).name)}</span>
              </a>`).join('') : '<div style="padding:10px;color:var(--text-3);font-size:13px">暂无</div>'}
          </div>
        </div>
      </div>`;
    }).join('')}`;
  }

  /* ---------------- SOP 库 / 阶段页 ---------------- */
  let libFilter = 'all';
  function viewLib(stageId) {
    const inStage = stageId ? SOPS.filter(s => s.stage === stageId) : SOPS;
    const mods = MODULES.filter(m => !stageId || m.stage === stageId);
    const list = libFilter === 'all' ? inStage : inStage.filter(s => s.module === libFilter);
    const stTitle = stageId ? stageOf(stageId).name : 'SOP 总库';
    return `
    <div class="crumb"><a href="#/home">首页</a>${IC.arrow}<a href="#/map">业务地图</a>${IC.arrow}<span>${esc(stTitle)}</span></div>
    <h1 class="page-title">${esc(stTitle)}</h1>
    <p class="page-sub">共 ${list.length} 条流程 · 按业务板块筛选，点击卡片进入详细步骤</p>
    <div class="filters">
      <button class="chip ${libFilter === 'all' ? 'on' : ''}" data-f="all">全部 ${inStage.length}</button>
      ${mods.map(m => {
        const n = inStage.filter(s => s.module === m.id).length;
        return n ? `<button class="chip ${libFilter === m.id ? 'on' : ''}" data-f="${m.id}">${mIco(m.icon)}${esc(m.name)} ${n}</button>` : '';
      }).join('')}
    </div>
    <div class="grid">${list.map(sopCard).join('')}</div>`;
  }

  /* ---------------- SOP 详情 ---------------- */
  function viewSop(id, frag) {
    const s = byId(id);
    if (!s) return `<div class="card pad">未找到该流程。<a href="#/lib">返回 SOP 总库</a></div>`;
    const m = modOf(s.module);
    const lv = s.risk === '高' ? 'hi' : s.risk === '中' ? 'mid' : 'low';
    const ds = doneSteps[s.id] || [];
    const dm = doneMats[s.id] || [];
    const idx = SOPS.findIndex(x => x.id === id);
    const prev = SOPS[idx - 1], next = SOPS[idx + 1];
    const pct = Math.round(ds.length / s.steps.length * 100);

    const anchors = [
      ['#scene', '适用场景'], ['#pre', '前置条件'], ['#steps', '办理步骤'],
      ['#materials', '材料清单'], ['#keys', '关键要点'], ['#risks', '风险提示'],
      ['#faq', '常见问题'], ['#terms', '术语']
    ];

    return `
    <div class="crumb">
      <a href="#/home">首页</a>${IC.arrow}
      <a href="#/lib">SOP</a>${IC.arrow}
      <a href="#/stage/${s.stage}">${esc(stageOf(s.stage).name)}</a>${IC.arrow}
      <span>${esc(s.code)}</span>
    </div>

    <div class="sop-hero">
      <div class="meta-row">
        <span class="badge ${lv}">风险等级 ${esc(s.risk)}</span>
        <span class="badge gold">${mIco(m.icon)}${esc(m.name)}</span>
        <span class="badge">${esc(s.code)}</span>
        ${(s.tags || []).slice(0, 3).map(t => `<span class="badge">#${esc(t)}</span>`).join('')}
      </div>
      <h1>${esc(s.title)}</h1>
      <div class="sop-facts">
        <div><span>预计耗时</span><b>${esc(s.dur)}</b></div>
        <div><span>主办岗位</span><b>${esc(s.role)}</b></div>
        <div><span>流程步骤</span><b>${s.steps.length} 步 / ${s.materials.length} 项材料</b></div>
        <div><span>最后更新</span><b>${esc(s.updated)}</b></div>
      </div>
    </div>

    <div class="anchor-tabs" id="anchorTabs">
      ${anchors.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('')}
    </div>

    <div class="block" id="scene">
      <h2><span class="ix">1</span>适用场景</h2>
      <p class="prose">${esc(s.scene)}</p>
    </div>

    <div class="block" id="pre">
      <h2><span class="ix">2</span>前置条件</h2>
      <ul class="pre-list">${s.pre.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
    </div>

    <div class="block" id="steps">
      <h2><span class="ix">3</span>办理步骤</h2>
      <div class="steps-head">
        <div class="step-progress">
          <div class="bar"><i id="stepBar" style="width:${pct}%"></i></div>
          <span id="stepLabel">已完成 ${ds.length} / ${s.steps.length}</span>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn-ghost" id="resetSteps">重置进度</button>
          <button class="btn-ghost" id="allSteps">全部完成</button>
        </div>
      </div>
      ${s.steps.map((st, i) => {
        const on = isDone(ds, i);
        return `<div class="step ${on ? 'done' : ''}" id="step-${i}" data-i="${i}">
          <button class="st-check" data-step="${i}" aria-label="标记步骤${i + 1}完成">${on ? IC.check : (i + 1)}</button>
          <div>
            <div class="st-name">${esc(st.name)}</div>
            <div class="st-tags">
              <span class="badge"><i>岗</i>${esc(st.owner)}</span>
              <span class="badge"><i>系统</i>${esc(st.sys)}</span>
              <span class="badge"><i>时点</i>${esc(st.time)}</span>
            </div>
            <p class="st-action">${esc(st.action)}</p>
            <div class="st-note note-tip"><b>要点</b><span>${esc(st.tip)}</span></div>
            <div class="st-note note-trap"><b>易错</b><span>${esc(st.trap)}</span></div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="block" id="materials">
      <h2><span class="ix">4</span>材料清单</h2>
      <div class="mat-bar">
        <span style="font-size:12.5px;color:var(--text-3)">已备齐 <b id="matCount" style="color:var(--navy-2)">${dm.length}</b> / ${s.materials.length}</span>
        <button class="btn-ghost" id="copyMats">复制清单</button>
        <button class="btn-ghost" id="resetMats">清空勾选</button>
      </div>
      ${s.materials.map((mt, i) => {
        const on = isDone(dm, i);
        return `<div class="mat ${on ? 'on' : ''}" data-mat="${i}">
          <span class="box">${IC.check}</span>
          <span class="txt"><b>${esc(mt.name)}</b>${mt.note ? `<span>${esc(mt.note)}</span>` : ''}</span>
        </div>`;
      }).join('')}
    </div>

    <div class="block" id="keys">
      <h2><span class="ix">5</span>关键要点</h2>
      <ul class="keylist" id="keys-list">
        ${s.keys.map((k, i) => `<li id="keys-${i}">${esc(k)}</li>`).join('')}
      </ul>
    </div>

    <div class="block" id="risks">
      <h2><span class="ix">6</span>风险与合规提示</h2>
      ${s.risks.map(r => `<div class="risk-item">
        <span class="lv ${r.level === '高' ? 'lv-hi' : r.level === '中' ? 'lv-mid' : 'lv-low'}">${esc(r.level)}</span>
        <div>${esc(r.text)}</div>
      </div>`).join('')}
    </div>

    <div class="block" id="faq">
      <h2><span class="ix">7</span>常见问题</h2>
      <div class="card pad" style="padding-top:4px;padding-bottom:4px">
        ${s.faq.map((f, i) => `<div class="faq-item" data-faq="${i}">
          <button class="faq-q">Q${i + 1}. ${esc(f.q)}${IC.chev}</button>
          <div class="faq-a">${esc(f.a)}</div>
        </div>`).join('')}
      </div>
    </div>

    <div class="block" id="terms">
      <h2><span class="ix">8</span>涉及术语</h2>
      <div class="card pad" style="padding-top:8px;padding-bottom:8px">
        ${(s.terms || []).map(t => `<div class="term-line"><b>${esc(t.t)}</b><span>${esc(t.d)}</span></div>`).join('')}
      </div>
    </div>

    <div class="pager">
      ${prev ? `<a href="#/sop/${prev.id}"><small>← 上一条</small><b>${esc(prev.title)}</b></a>` : '<div style="flex:1"></div>'}
      ${next ? `<a class="next" href="#/sop/${next.id}"><small>下一条 →</small><b>${esc(next.title)}</b></a>` : '<div style="flex:1"></div>'}
    </div>`;
  }

  /* ---------------- 清单页 ---------------- */
  function viewChecklist() {
    return `
    <div class="crumb"><a href="#/home">首页</a>${IC.arrow}<span>材料清单</span></div>
    <h1 class="page-title">材料清单速查</h1>
    <p class="page-sub">按业务环节归集的材料要求，勾选状态与 SOP 详情页同步保存。出发见客户前先过一遍。</p>
    ${SOPS.map(s => {
      const dm = doneMats[s.id] || [];
      return `<div class="cl-group" data-cl="${s.id}">
        <div class="cl-h">
          <span class="badge ${s.risk === '高' ? 'hi' : s.risk === '中' ? 'mid' : 'low'}">${esc(s.risk)}</span>
          <b>${esc(s.title)}</b>
          <span class="cnt">${dm.length}/${s.materials.length}</span>
          ${IC.chev.replace('svg', 'svg class="chev"')}
        </div>
        <div class="cl-body">
          ${s.materials.map((mt, i) => {
            const on = isDone(dm, i);
            return `<div class="mat ${on ? 'on' : ''}" data-mat="${i}" data-sop="${s.id}">
              <span class="box">${IC.check}</span>
              <span class="txt"><b>${esc(mt.name)}</b>${mt.note ? `<span>${esc(mt.note)}</span>` : ''}</span>
            </div>`;
          }).join('')}
          <div style="margin-top:10px"><button class="btn-ghost" data-copy="${s.id}">复制本组清单</button></div>
        </div>
      </div>`;
    }).join('')}`;
  }

  /* ---------------- 速查卡 ---------------- */
  function viewCards() {
    return `
    <div class="crumb"><a href="#/home">首页</a>${IC.arrow}<span>速查卡</span></div>
    <h1 class="page-title">速查卡</h1>
    <p class="page-sub">时限、测算口径、系统路径、红线、话术、自查清单。手机上打开，10 秒找到答案。</p>
    <div class="cardgrid">
      ${CARDS.map(c => `<div class="qcard">
        <div class="qcard-h"><span class="cat">${esc(c.cat)}</span><b>${esc(c.title)}</b></div>
        <div class="qcard-body">
          ${c.items.map(it => `<div class="qrow"><span>${esc(it[0])}</span><b>${esc(it[1])}</b></div>`).join('')}
        </div>
      </div>`).join('')}
    </div>`;
  }

  /* ---------------- 新人 30 天 ---------------- */
  function viewOnboard() {
    const total = ONBOARD.reduce((n, w) => n + w.items.length, 0);
    const done = Object.keys(doneTasks).length;
    const pct = Math.round(done / total * 100);
    return `
    <div class="crumb"><a href="#/home">首页</a>${IC.arrow}<span>新人 30 天</span></div>
    <h1 class="page-title">新人 30 天上手路径</h1>
    <p class="page-sub">四周从"看不懂"到"能独立办理"，每周有目标、有任务。完成一项点一下即可记录。</p>
    <div class="card pad" style="margin-bottom:20px">
      <div class="pb-head"><span>我的完成度</span><b>${pct}%（${done}/${total}）</b></div>
      <div class="pb-track"><i style="width:${pct}%"></i></div>
    </div>
    <div class="timeline">
      ${ONBOARD.map((w, wi) => `
        <div class="tl-item ${wi === 0 ? 'now' : ''}">
          <div class="tl-card">
            <div class="wk"><b>${esc(w.week)}</b></div>
            <h3>${esc(w.theme)}</h3>
            <div class="goal">本周目标：${esc(w.goal)}</div>
            <ul class="tl-tasks">
              ${w.items.map((it, ii) => {
                const k = wi + '-' + ii;
                const on = !!doneTasks[k];
                return `<li class="${on ? 'done' : ''}" data-task="${k}">
                  <span class="box">${IC.check}</span><span>${esc(it)}</span>
                </li>`;
              }).join('')}
            </ul>
          </div>
        </div>`).join('')}
    </div>`;
  }

  /* ---------------- 术语表 ---------------- */
  function viewGlossary() {
    return `
    <div class="crumb"><a href="#/home">首页</a>${IC.arrow}<span>术语表</span></div>
    <h1 class="page-title">对公业务术语表</h1>
    <p class="page-sub">和客户、和审批人沟通时最容易卡壳的 ${GLOSSARY.length} 个词。</p>
    <div class="card pad">
      ${GLOSSARY.map(g => `<div class="term-line"><b>${esc(g.t)}</b><span>${esc(g.d)}</span></div>`).join('')}
    </div>`;
  }

  /* ---------------- 我的 ---------------- */
  function viewMe() {
    const s = stats();
    const started = SOPS.filter(x => (doneSteps[x.id] || []).length);
    const matsTotal = SOPS.reduce((n, x) => n + x.materials.length, 0);
    const matsDone = SOPS.reduce((n, x) => n + (doneMats[x.id] || []).length, 0);
    return `
    <div class="crumb"><a href="#/home">首页</a>${IC.arrow}<span>我的进度</span></div>
    <h1 class="page-title">我的进度</h1>
    <p class="page-sub">所有勾选记录保存在本机浏览器，换设备不同步。</p>
    <div class="statgrid">
      <div class="stat"><b>${s.pct}%</b><span>步骤完成度</span></div>
      <div class="stat"><b>${started.length}</b><span>进行中的 SOP</span></div>
      <div class="stat"><b>${matsDone}/${matsTotal}</b><span>已备材料</span></div>
    </div>

    <div class="section-h"><h2>流程进度</h2><div class="line"></div></div>
    <div class="card pad">
      ${SOPS.map(x => {
        const d = (doneSteps[x.id] || []).length;
        const p = Math.round(d / x.steps.length * 100);
        const C = 2 * Math.PI * 11;
        return `<a class="prog-row" href="#/sop/${x.id}">
          <svg class="ring" viewBox="0 0 28 28">
            <circle class="bgc" cx="14" cy="14" r="11"/>
            <circle class="fgc" cx="14" cy="14" r="11" stroke-dasharray="${C}" stroke-dashoffset="${C - C * p / 100}" transform="rotate(-90 14 14)"/>
          </svg>
          <span class="nm">${esc(x.title)}</span>
          <span style="font-size:11.5px;color:var(--text-3);flex:none">${d}/${x.steps.length}</span>
        </a>`;
      }).join('')}
    </div>

    <div class="section-h"><h2>数据管理</h2><div class="line"></div></div>
    <div class="card pad">
      <p style="margin:0 0 12px;font-size:13px;color:var(--text-2)">清除本机上记录的所有步骤、材料与学习任务进度。</p>
      <button class="btn-ghost" id="clearAll" style="border:1px solid var(--line);padding:8px 14px;border-radius:8px;color:var(--danger)">清除全部进度</button>
    </div>`;
  }

  /* ---------------- 路由 ---------------- */
  function render() {
    const hash = location.hash || '#/home';
    const parts = hash.replace(/^#\//, '').split('/');
    const view = $('#view');
    let html = '';

    switch (parts[0]) {
      case '' :
      case 'home': html = viewHome(); break;
      case 'map': html = viewMap(); break;
      case 'lib': libFilter = 'all'; html = viewLib(null); break;
      case 'stage': html = viewLib(parts[1]); break;
      case 'sop': html = viewSop(parts[1], parts[2]); break;
      case 'checklist': html = viewChecklist(); break;
      case 'cards': html = viewCards(); break;
      case 'onboard': html = viewOnboard(); break;
      case 'glossary': html = viewGlossary(); break;
      case 'me': html = viewMe(); break;
      default: html = viewHome();
    }

    view.innerHTML = html;
    renderSideNav();
    renderProgress();
    syncTabs(parts[0]);

    // 详情页定位到锚点
    if (parts[0] === 'sop' && parts[2]) {
      setTimeout(() => {
        const el = document.getElementById(parts[2]);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo(0, 0);
    }
    bindView(parts);
  }

  function syncTabs(k) {
    const map = { home: 'home', map: 'map', lib: 'lib', stage: 'lib', sop: 'lib', checklist: 'checklist', cards: 'lib', me: 'me', onboard: 'home', glossary: 'home' };
    $$('#tabbar a').forEach(a => {
      a.classList.toggle('on', a.dataset.tab === (map[k] || 'home'));
    });
  }

  /* ---------------- 视图内事件 ---------------- */
  function bindView(parts) {
    // 筛选
    $$('.chip[data-f]').forEach(b => b.addEventListener('click', () => {
      libFilter = b.dataset.f;
      const stage = parts[0] === 'stage' ? parts[1] : null;
      $('#view').innerHTML = viewLib(stage);
      bindView(parts);
    }));

    // 步骤勾选
    $$('.st-check[data-step]').forEach(btn => btn.addEventListener('click', () => {
      const sid = parts[1], i = +btn.dataset.step;
      const s = byId(sid);
      doneSteps[sid] = toggle(doneSteps[sid] || [], i);
      saveSteps();
      const on = isDone(doneSteps[sid], i);
      const wrap = btn.closest('.step');
      wrap.classList.toggle('done', on);
      btn.innerHTML = on ? IC.check : (i + 1);
      const d = doneSteps[sid].length;
      $('#stepBar').style.width = Math.round(d / s.steps.length * 100) + '%';
      $('#stepLabel').textContent = `已完成 ${d} / ${s.steps.length}`;
      renderProgress();
      if (on) toast(`第 ${i + 1} 步完成`);
    }));

    const resetBtn = $('#resetSteps');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      doneSteps[parts[1]] = []; saveSteps(); render();
      toast('已重置本流程进度');
    });
    const allBtn = $('#allSteps');
    if (allBtn) allBtn.addEventListener('click', () => {
      const s = byId(parts[1]);
      doneSteps[s.id] = s.steps.map((_, i) => i); saveSteps(); render();
      toast('已标记全部完成');
    });

    // 材料勾选（详情页 + 清单页）
    $$('.mat[data-mat]').forEach(el => el.addEventListener('click', () => {
      const sid = el.dataset.sop || parts[1];
      const i = +el.dataset.mat;
      doneMats[sid] = toggle(doneMats[sid] || [], i);
      saveMats();
      el.classList.toggle('on', isDone(doneMats[sid], i));
      const s = byId(sid);
      const cnt = $('#matCount');
      if (cnt && sid === parts[1]) cnt.textContent = doneMats[sid].length;
      const hc = document.querySelector(`.cl-group[data-cl="${sid}"] .cnt`);
      if (hc) hc.textContent = `${doneMats[sid].length}/${s.materials.length}`;
    }));

    const copyBtn = $('#copyMats');
    if (copyBtn) copyBtn.addEventListener('click', () => copyList(parts[1]));
    const resetMats = $('#resetMats');
    if (resetMats) resetMats.addEventListener('click', () => {
      doneMats[parts[1]] = []; saveMats(); render(); toast('已清空勾选');
    });
    $$('[data-copy]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      copyList(b.dataset.copy);
    }));

    // 清单折叠
    $$('.cl-h').forEach(h => h.addEventListener('click', () => {
      h.parentElement.classList.toggle('open');
    }));

    // FAQ
    $$('.faq-item').forEach(it => {
      $('.faq-q', it).addEventListener('click', () => it.classList.toggle('open'));
    });

    // 学习任务
    $$('li[data-task]').forEach(li => li.addEventListener('click', () => {
      const k = li.dataset.task;
      if (doneTasks[k]) delete doneTasks[k]; else doneTasks[k] = true;
      saveTasks();
      li.classList.toggle('done', !!doneTasks[k]);
    }));

    // 清除
    const clearAll = $('#clearAll');
    if (clearAll) clearAll.addEventListener('click', () => {
      if (!confirm('确定清除本机所有进度记录？此操作不可恢复。')) return;
      doneSteps = {}; doneMats = {}; doneTasks = {};
      saveSteps(); saveMats(); saveTasks(); render();
      toast('已清除全部进度');
    });

    // 锚点高亮
    initAnchors();
  }

  function copyList(sid) {
    const s = byId(sid);
    if (!s) return;
    const text = `【${s.title}】材料清单（${s.code}）\n` + s.materials.map((m, i) => `${i + 1}. ${m.name}${m.note ? '（' + m.note + '）' : ''}`).join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('清单已复制到剪贴板')).catch(() => fallbackCopy(text));
    } else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('清单已复制'); } catch (e) { toast('复制失败，请手动选择'); }
    document.body.removeChild(ta);
  }

  /* ---------------- 锚点滚动高亮 ---------------- */
  let anchorObs = null;
  function initAnchors() {
    if (anchorObs) { anchorObs.disconnect(); anchorObs = null; }
    const tabs = $('#anchorTabs');
    if (!tabs) return;
    const links = $$('a', tabs);
    const blocks = $$('.block', $('#view'));
    const setOn = id => links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id));

    anchorObs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) setOn(en.target.id);
      });
    }, { rootMargin: '-120px 0px -62% 0px', threshold: 0 });

    blocks.forEach(b => anchorObs.observe(b));

    links.forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      const el = document.getElementById(a.getAttribute('href').slice(1));
      if (!el) return;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 108, behavior: 'smooth' });
      setOn(el.id);
    }));

    // 横向滚动让当前 tab 可见
    const scrollTabIntoView = () => {
      const on = $('a.on', tabs);
      if (on && tabs.scrollWidth > tabs.clientWidth) {
        tabs.scrollTo({ left: on.offsetLeft - 60, behavior: 'smooth' });
      }
    };
    const mo = new MutationObserver(scrollTabIntoView);
    links.forEach(a => mo.observe(a, { attributes: true, attributeFilter: ['class'] }));
  }

  /* ---------------- 启动 ---------------- */
  window.addEventListener('hashchange', render);
  render();
})();
