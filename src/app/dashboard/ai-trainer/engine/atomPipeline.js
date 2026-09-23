/*
 * AI for Trainers — the atom pipeline (Create → Review → Library → Build → Path,
 * plus Content Library, Learners, Plan, Evaluate and the learner Player).
 *
 * Ported from the standalone "atom-pipeline" HTML prototype. The engine keeps
 * its original imperative render-to-innerHTML design so behaviour matches the
 * prototype exactly; React only mounts it (see ../page.tsx). Differences from
 * the prototype:
 *   - model calls go through the backend proxy (opts.complete), no API key in
 *     the browser;
 *   - the workspace is loaded from and autosaved to the backend
 *     (opts.initialState / opts.saveState);
 *   - the signed-in user, Home and Log Out come from the app.
 */

const PARSER_SCRIPTS = [
  { global: 'JSZip', src: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' },
  { global: 'pdfjsLib', src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js' },
  { global: 'mammoth', src: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js' },
  { global: 'XLSX', src: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js' }
];
let parsersPromise = null;

function loadScript(src){
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-atom-src="${src}"]`);
    if(existing && existing.dataset.loaded) return resolve();
    const s = existing || document.createElement('script');
    s.addEventListener('load', () => { s.dataset.loaded = '1'; resolve(); });
    s.addEventListener('error', () => { s.remove(); reject(new Error('Could not load ' + src)); });
    if(!existing){ s.src = src; s.async = true; s.dataset.atomSrc = src; document.head.appendChild(s); }
  });
}

// Document parsers (.pptx/.pdf/.docx/.xlsx) are only needed once someone
// actually uploads a file, so they load on first use rather than with the page.
function ensureParsers(){
  if(!parsersPromise){
    parsersPromise = Promise.all(PARSER_SCRIPTS.filter(p => !window[p.global]).map(p => loadScript(p.src)))
      .catch(() => { parsersPromise = null; throw new Error("Couldn't load the document parsers — check your connection and try again."); });
  }
  return parsersPromise;
}

// Everything worth keeping between visits. Transient flags (generating, modal,
// status, error) and the in-progress Player session are deliberately left out.
const PERSIST_KEYS = [
  'navSection', 'screen', 'files', 'atoms', 'groups', 'topics', 'builtModules', 'paths',
  'participants', 'analytics', 'plans', 'planType', 'planTopic', 'contentLibraryFilter',
  'createMode', 'scratchTopic', 'taxonomy', 'gallery', 'libFilter', 'reviewIndex',
  'buildTopicIds', 'buildLevel', 'buildDelivery', 'courses'
];
const SAVE_DEBOUNCE_MS = 1200;
const SAVE_RETRY_MS = 5000;

export function mountAtomPipeline(mountEl, opts){
  let saveStatusText = opts.saveEnabled ? 'All changes saved' : 'Not saving — reload to retry';
  let saveTimer = null;
  let saving = false;
  let lastSavedJson = null;
  let destroyed = false;

  function currentUser(){
    const u = (opts.getUser && opts.getUser()) || {};
    const name = u.name || 'Trainer';
    const initials = name.split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase() || 'U';
    return { name, email: u.email || '', initials };
  }

  function setSaveStatus(text){
    saveStatusText = text;
    const el = document.getElementById('atom-save-status');
    if(el) el.textContent = text;
  }

  function serializeState(){
    const s = {};
    PERSIST_KEYS.forEach(k => { s[k] = app[k]; });
    if(s.screen === 'classifying') s.screen = 'upload';
    // Uploaded walkthrough videos are blob: URLs that die with the tab.
    s.builtModules = app.builtModules.map(m =>
      m.moduleData && m.moduleData.watchVideo ? Object.assign({}, m, { moduleData: Object.assign({}, m.moduleData, { watchVideo: null }) }) : m
    );
    return s;
  }

  function hasUnsavedChanges(){
    return opts.saveEnabled && JSON.stringify(serializeState()) !== lastSavedJson;
  }

  function scheduleSave(){
    if(!opts.saveEnabled || destroyed) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  }

  async function flushSave(){
    if(!opts.saveEnabled) return;
    clearTimeout(saveTimer);
    if(saving){ saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS); return; }
    const state = serializeState();
    const json = JSON.stringify(state);
    if(json === lastSavedJson) return;
    saving = true;
    setSaveStatus('Saving…');
    try{
      await opts.saveState(state);
      lastSavedJson = json;
      setSaveStatus('All changes saved');
    }catch(err){
      setSaveStatus('Not saved — retrying');
      if(!destroyed) saveTimer = setTimeout(flushSave, SAVE_RETRY_MS);
    }finally{
      saving = false;
    }
  }

  function onBeforeUnload(e){
    if(hasUnsavedChanges()){ flushSave(); e.preventDefault(); e.returnValue = ''; }
  }

  /* ============================================================
     APP STATE
     ============================================================ */
  let app = {
    mode: 'creator',           // 'creator' | 'player'
    navSection: 'create',       // 'create' | 'contentLibrary' | 'participants'
    screen: 'upload',          // 'upload' | 'classifying' | 'review' | 'library' | 'build'
    files: [],                  // [{id, name, kind, status, chunks:[{id,label,text}]}]
    atoms: [],                   // [{id,fileId,fileName,chunkLabel,type,topicLabel,systemsInvolved,body,confidence,headingConsistency,status,groupId,reasons:[]}]
    groups: [],                   // [{id, topicKey, topicLabel, atomIds:[], status:'single_source'|'consistent'|'conflict', note}]
    topics: [],                    // [{id, name, groupIds:[]}] — the clustered, pickable layer
    topicsClustering: false,
    builtModules: [],               // [{id, topicId, topicName, level, moduleData}]
    paths: [],                       // [{id, name, moduleIds:[]}] — named, saved learning paths
    editingPathId: null,
    pendingPathAdd: null,
    playingPathId: null,
    playingPathIndex: null,
    participants: [],                 // [{id, name, english, systems, experience, notes}]
    analytics: [],
    plans: [],                        // trainer/manager planning documents — separate from learner modules
    planType: 'Content Outline',
    planTopic: '',
    planGenerating: false,                     // [{moduleTitle, quizScore, quizTotal, attempts, escalated, timestamp}]
    contentLibraryFilter: 'modules',
    modal: null,
    playingParticipantName: null,
    createMode: null,        // null | 'document' | 'scratch'
    scratchTopic: '',
    taxonomy: { contentType:'Training Modules', audience:'New hire', delivery:'Self-paced digital', theme:'Process & Compliance', industry:'BFSI, general' },
    gallery: [],                    // reserved for future screenshot support
    status: '',
    error: null,
    libFilter: 'all',
    expandedGroup: null,
    expandedTopic: null,
    reviewIndex: 0,
    buildTopicIds: [],
    buildLevel: null,
    buildDelivery: null,
    courses: [],
    editingCourseId: null,
    expandedCourse: null,
    generating: false
  };

  const PIPE_STAGES = [
    {key:'upload', label:'Create', n:'1'},
    {key:'review', label:'Review', n:'2'},
    {key:'library', label:'Library', n:'3'},
    {key:'build', label:'Build', n:'4'},
    {key:'path', label:'Path', n:'5'}
  ];

  function render(){
    const root = mountEl;
    if(app.mode === 'player'){
      root.innerHTML = `<div id="player-root"></div>`;
      renderPlayer();
      return;
    }
    root.innerHTML = `
      <div class="shell">
        <div class="sidebar">
          <div class="side-logo">BC</div>
          <div class="side-item" data-app-home="1">${icon('home')}Home</div>
          <div class="side-item ${app.navSection==='create'?'active':''}" data-nav="create">${icon('plus')}Create</div>
          <div class="side-item ${app.navSection==='contentLibrary'?'active':''}" data-nav="contentLibrary">${icon('library')}Library</div>
          <div class="side-item ${app.navSection==='participants'?'active':''}" data-nav="participants">${icon('people')}Learners</div>
          <div class="side-item ${app.navSection==='plan'?'active':''}" data-nav="plan">${icon('clipboard')}Plan</div>
          <div class="side-item ${app.navSection==='evaluate'?'active':''}" data-nav="evaluate">${icon('chart')}Evaluate</div>
          <div class="side-spacer"></div>
          <div class="side-item" data-app-logout="1">${icon('exit')}Log Out</div>
        </div>
        <div class="main">
          <div class="topbar">
            <div class="brand"><span class="mark"></span> Breakfree Consulting</div>
            <div style="display:flex; align-items:center; gap:18px;">
              <span id="atom-save-status" style="font-size:12px; color:var(--bf-soft);">${escHtml(saveStatusText)}</span>
              <div class="user-chip">
                <div class="avatar">${escHtml(currentUser().initials)}</div>
                <div class="who"><div class="name">${escHtml(currentUser().name)}</div><div class="email">${escHtml(currentUser().email)}</div></div>
              </div>
            </div>
          </div>
          <div class="content">
            ${app.navSection === 'create' ? pipeStepper() : ''}
            ${topLevelBody()}
          </div>
        </div>
      </div>
      ${renderModal()}
    `;
    attachHandlers();
    scheduleSave();
  }

  function topLevelBody(){
    if(app.navSection === 'contentLibrary') return renderContentLibrary();
    if(app.navSection === 'participants') return renderParticipants();
    if(app.navSection === 'evaluate') return renderEvaluate();
    if(app.navSection === 'plan') return renderPlan();
    return screenBody();
  }

  /* ============================================================
     MODAL — replaces window.prompt/confirm, which sandboxed
     preview panels (Claude's own included) silently block.
     ============================================================ */

  function showPrompt(title, defaultValue, onConfirm){
    app.modal = { type:'prompt', title, fields:[{key:'value', label:null, defaultValue: defaultValue||''}], onConfirm: (vals) => onConfirm(vals.value) };
    render();
  }
  function showForm(title, fields, onConfirm){
    app.modal = { type:'prompt', title, fields, onConfirm };
    render();
  }
  function showConfirm(title, message, onConfirm){
    app.modal = { type:'confirm', title, message, onConfirm };
    render();
  }
  function closeModal(){ app.modal = null; render(); }

  function renderModal(){
    if(!app.modal) return '';
    const m = app.modal;
    if(m.type === 'confirm'){
      return `<div class="modal-overlay" id="modal-overlay">
        <div class="modal-card">
          <div class="modal-title">${escAttr(m.title)}</div>
          <p style="font-size:13px; color:var(--bf-soft); margin:8px 0 0; line-height:1.5;">${escAttr(m.message)}</p>
          <div class="modal-actions">
            <button class="btn-secondary" id="modal-cancel">Cancel</button>
            <button class="btn-primary" id="modal-confirm" style="background:var(--bf-red);">Delete</button>
          </div>
        </div>
      </div>`;
    }
    return `<div class="modal-overlay" id="modal-overlay">
      <div class="modal-card">
        <div class="modal-title">${escAttr(m.title)}</div>
        ${m.fields.map((f,i) => `
          ${f.label ? `<label>${escAttr(f.label)}</label>` : ''}
          <input type="text" class="modal-field" data-modal-field="${f.key}" value="${escAttr(f.defaultValue||'')}" ${i===0 && !f.label ? 'style="margin-top:14px;"' : ''}>
        `).join('')}
        <div class="modal-actions">
          <button class="btn-secondary" id="modal-cancel">Cancel</button>
          <button class="btn-primary" id="modal-confirm">Confirm</button>
        </div>
      </div>
    </div>`;
  }

  /* ============================================================
     PLAN — trainer/manager materials: Content Outline, Proposal,
     Feedback Template. Not learner content, so it never touches
     the Player's Read/Watch/Practice/Check stepper — it opens as
     a plain document view instead, same as a Facilitator Kit.
     ============================================================ */

  const PLAN_TYPES = ['Content Outline', 'Proposals', 'Feedback Templates'];

  function renderPlan(){
    const t = app.taxonomy;
    return `
      <div class="create-head">
        <div class="accent-strip" style="background:var(--bf-pink);"></div>
        <h1>Plan</h1>
        <p>Materials for trainers and managers — a content outline, a proposal, or a feedback template. This is planning material, not learner content, so it never goes through the Player.</p>
      </div>
      ${app.error ? `<div class="error-banner">${app.error}</div>` : ''}

      <div class="tiles">
        ${taxTile('pink', 'Document Type', PLAN_TYPES, app.planType, 'planType')}
        ${taxTile('yellow', 'Audience', TAXONOMY_OPTIONS.audience, t.audience, 'audience')}
        ${taxTile('teal', 'Theme', TAXONOMY_OPTIONS.theme, t.theme, 'theme')}
        ${taxTile('red', 'Industry', TAXONOMY_OPTIONS.industry, t.industry, 'industry')}
      </div>

      <div class="item-card">
        <label style="margin-top:0;">What's this for?</label>
        <textarea id="plan-topic" placeholder="e.g. a 3-day onboarding program for new claims handlers, or a proposal to pitch a leadership workshop to a client" style="width:100%; min-height:80px; border:1px solid var(--bf-line); border-radius:8px; padding:10px 12px; font-size:13.5px;">${escHtml(app.planTopic)}</textarea>
      </div>

      <div class="generate-row">
        <button class="generate-btn" id="generate-plan-btn" ${(!app.planTopic.trim() || app.planGenerating) ? 'disabled' : ''}>${app.planGenerating ? 'Generating…' : `Generate ${app.planType} ✦`}</button>
      </div>
      ${app.planGenerating ? `<p class="status-line">${app.status}</p>` : ''}

      ${app.plans.length ? `
        <div class="section-block" style="margin-top:34px;">
          <h2 style="font-size:17px; margin-bottom:14px;">Saved documents</h2>
          ${app.plans.map(p => `
            <div class="file-row">
              <div class="file-info">
                <div class="file-icon">${p.planType.slice(0,4).toUpperCase()}</div>
                <div class="file-meta"><div class="fname">${escAttr(p.topicName)}</div><div class="fstatus">${p.planType}</div></div>
              </div>
              <button class="btn-secondary" data-open-plan="${p.id}">Open</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  async function buildPlanDocument(){
    app.planGenerating = true; app.error = null; app.status = `Drafting ${app.planType}…`; render();
    const type = app.planType;
    const topic = app.planTopic.trim();
    const t = app.taxonomy;
    const eslLine = "Writing style: assume many readers are working in English as a second or third language. Use short sentences, plain everyday words, and a conversational tone — not formal or bureaucratic phrasing.";

    let system, shape;
    if(type === 'Content Outline'){
      system = `You are an instructional designer drafting a CONTENT OUTLINE — a course-planning skeleton for a trainer or instructional designer to build from next, not a finished learner-facing module. ${eslLine}

  Audience: ${t.audience}. Theme: ${t.theme}. Industry context: ${t.industry}.

  Build:
  1. "overview": 2-3 sentences framing what this outline is for.
  2. "sections": 3-8 items, each {"title", "subtopics": 2-5 short bullet points, "estimatedDuration": e.g. "30 min"}.
  Also "title".

  Respond with ONLY valid JSON, no markdown fences:
  {"title":"...","overview":"...","sections":[{"title":"...","subtopics":["...","..."],"estimatedDuration":"..."}]}`;
      shape = 'contentOutline';
    } else if(type === 'Proposals'){
      system = `You are a learning consultant drafting a PROPOSAL — a document to pitch a training or development intervention to a client or internal stakeholder. ${eslLine}

  Audience: ${t.audience}. Theme: ${t.theme}. Industry context: ${t.industry}.

  Build:
  1. "overview": 2-3 sentences framing the proposal.
  2. "objective": what this intervention is meant to achieve.
  3. "approach": how it would be delivered, in plain terms.
  4. "scope": 3-6 bullet points of what's included.
  5. "timeline": 2-5 items, each {"phase", "duration"}.
  6. "deliverables": 3-6 bullet points of what the client/stakeholder walks away with.
  Also "title".

  Respond with ONLY valid JSON, no markdown fences:
  {"title":"...","overview":"...","objective":"...","approach":"...","scope":["...","..."],"timeline":[{"phase":"...","duration":"..."}],"deliverables":["...","..."]}`;
      shape = 'proposal';
    } else {
      system = `You are an instructional designer drafting a FEEDBACK TEMPLATE — a reusable evaluation form, not learner content. ${eslLine}

  Audience: ${t.audience}. Theme: ${t.theme}. Industry context: ${t.industry}.

  Build:
  1. "overview": 2-3 sentences framing what this template evaluates.
  2. "criteria": 3-6 items, each {"name", "description", "ratingScale": e.g. "1 (Needs Work) to 5 (Excellent)"}.
  3. "openQuestions": 2-4 open-ended reflection questions.
  Also "title".

  Respond with ONLY valid JSON, no markdown fences:
  {"title":"...","overview":"...","criteria":[{"name":"...","description":"...","ratingScale":"..."}],"openQuestions":["...","..."]}`;
      shape = 'feedbackTemplate';
    }

    try{
      const raw = await callClaude(system, [{role:'user', content: `Topic/purpose: ${topic}`}], 4000);
      const cleaned = raw.replace(/```json|```/g, '').trim();
      let parsed;
      try{ parsed = JSON.parse(cleaned); }
      catch(e){
        if(!cleaned.endsWith('}')) throw new Error('The document was cut off before it finished generating. Try again.');
        throw new Error('Unexpected response format: ' + e.message);
      }
      const plan = { id:'plan'+app.plans.length+'_'+Date.now(), planType: type, planKind: shape, topicName: parsed.title || topic, planData: parsed, createdAt: new Date().toISOString() };
      app.plans.push(plan);
      app.planGenerating = false;
      openPlanInPlayer(plan);
    }catch(err){
      app.planGenerating = false;
      app.error = "Couldn't generate — " + (err.message || 'check your connection and try again.');
    }
    render();
  }

  function openPlanInPlayer(plan){
    app.mode = 'player';
    P = { isKit: true, kitType: plan.planKind, kit: plan.planData, module: { title: plan.topicName } };
  }

  function renderEvaluate(){
    const recs = app.analytics;
    const attributed = recs.filter(r => r.participantName);
    const unattributed = recs.filter(r => !r.participantName);
    const avgPct = recs.length ? Math.round(100 * recs.reduce((n,r)=>n+r.quizScore/r.quizTotal,0) / recs.length) : 0;
    const escalations = recs.filter(r=>r.escalated).length;

    function latestRecordFor(participantName, moduleTitle){
      const matches = attributed.filter(r => r.participantName === participantName && r.moduleTitle === moduleTitle);
      if(!matches.length) return null;
      return matches.reduce((a,b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b);
    }
    function statusBadge(r){
      if(!r) return `<span class="badge-pill badge-single">not started</span>`;
      if(r.escalated) return `<span class="badge-pill badge-conflict">escalated</span>`;
      if(r.acceptedBelowThreshold) return `<span class="badge-pill badge-review">accepted below mark</span>`;
      return `<span class="badge-pill badge-approved">${Math.round(100*r.quizScore/r.quizTotal)}% \u00b7 pass</span>`;
    }

    return `
      <div class="create-head">
        <div class="accent-strip" style="background:var(--bf-blue);"></div>
        <h1>Evaluate</h1>
        <p>Per-learner completion, pulled from the Player as it happens. This is the "collect and display" half of the Analytics claim \u2014 feeding this back into what gets generated next is not built.</p>
      </div>
      ${recs.length === 0 ? `<p class="status-line">No completions logged yet \u2014 launch a learner from the Learners screen and finish a module to see it here.</p>` : `
        <div class="objective-row" style="margin-bottom:24px;">
          <div class="obj"><div class="k">Completions</div><div class="v" style="font-size:20px; font-weight:700;">${recs.length}</div></div>
          <div class="obj"><div class="k">Average quiz score</div><div class="v" style="font-size:20px; font-weight:700;">${avgPct}%</div></div>
          <div class="obj"><div class="k">Escalations</div><div class="v" style="font-size:20px; font-weight:700;">${escalations}</div></div>
        </div>
      `}

      ${app.participants.length === 0 ? `<p class="status-line">No learners yet \u2014 add one on the Learners screen first.</p>` : app.participants.map(p => {
        const path = app.paths.find(x => x.id === p.assignedPathId);
        const moduleTitles = path ? path.moduleIds.map(id => { const m = app.builtModules.find(x=>x.id===id); return m ? m.topicName : null; }).filter(Boolean) : [];
        const completedCount = moduleTitles.filter(t => { const r = latestRecordFor(p.name, t); return r && !r.escalated; }).length;
        return `
          <div class="review-card" style="border-left-color:var(--bf-blue);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
              <div>
                <div style="font-weight:700; font-size:15px; margin-bottom:4px;">${escAttr(p.name)}</div>
                <div style="font-size:12.5px; color:var(--bf-soft);">${path ? `Assigned: "${escAttr(pathName(path))}"` : 'No path assigned'}</div>
              </div>
              ${path ? `<span class="badge-pill ${completedCount===moduleTitles.length?'badge-approved':'badge-single'}">${completedCount} of ${moduleTitles.length} complete</span>` : ''}
            </div>
            ${moduleTitles.length ? `
              <div style="margin-top:14px;">
                ${moduleTitles.map(t => {
                  const r = latestRecordFor(p.name, t);
                  return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-top:1px solid var(--bf-line);">
                      <span style="font-size:13px;">${escAttr(t)}</span>
                      <span style="display:flex; align-items:center; gap:10px; font-size:12px; color:var(--bf-soft);">
                        ${r ? `${r.quizScore}/${r.quizTotal} \u00b7 attempt ${r.attempts} of 3` : ''}
                        ${statusBadge(r)}
                      </span>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}

      ${unattributed.length ? `
        <div class="section-block" style="margin-top:30px;">
          <h2 style="font-size:15px; margin-bottom:10px; color:var(--bf-soft);">Other activity (not tied to a specific learner)</h2>
          <p class="status-line" style="text-align:left; margin-bottom:10px;">Runs previewed from Build/Content Library rather than launched for a named learner.</p>
          ${unattributed.slice().reverse().map(r => `
            <div class="file-row">
              <div class="file-info">
                <div class="file-icon">${Math.round(100*r.quizScore/r.quizTotal)}%</div>
                <div class="file-meta"><div class="fname">${escAttr(r.moduleTitle)}</div><div class="fstatus">${r.quizScore}/${r.quizTotal} \u00b7 attempt ${r.attempts} of 3${r.escalated?' \u00b7 <span class="badge-pill badge-conflict">escalated</span>':''}${r.acceptedBelowThreshold?' \u00b7 <span class="badge-pill badge-review">accepted below mark</span>':''}</div></div>
              </div>
              <div class="src">${new Date(r.timestamp).toLocaleString()}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  function icon(name){
    const icons = {
      home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/></svg>',
      plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>',
      chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>',
      library:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5V5.5a1 1 0 0 1 1-1h6v16H5a1 1 0 0 1-1-1Z"/><path d="M11 4.5h7a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-7"/></svg>',
      people:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8" r="2.4"/><path d="M15.5 14.3c2.6.4 4.5 2.7 4.5 5.7"/></svg>',
      clipboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3" rx="1"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4"/></svg>',
      exit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 4H6v16h9M10 12h10m0 0-3-3m3 3-3 3"/></svg>'
    };
    return `<div>${icons[name]}</div>`;
  }

  function pipeStepper(){
    const idx = Math.max(0, PIPE_STAGES.findIndex(s => s.key === (app.screen==='classifying'?'upload':app.screen)));
    return `<div class="pipe-stepper">
      ${PIPE_STAGES.map((s,i) => {
        const isActive = (app.screen === s.key) || (app.screen==='classifying' && s.key==='upload');
        const isDone = i < idx;
        const canJump = s.key === 'upload' || app.atoms.length > 0;
        return `<div class="pipe-pill ${isActive?'active':''} ${isDone?'done':''}" ${canJump?`data-jump="${s.key}"`:''}>${s.label}<span class="n">${s.n}</span></div>`;
      }).join('')}
    </div>`;
  }

  function screenBody(){
    if(app.screen === 'upload') return renderUpload();
    if(app.screen === 'classifying') return renderClassifying();
    if(app.screen === 'review') return renderReview();
    if(app.screen === 'library') return renderLibrary();
    if(app.screen === 'build') return renderBuild();
    if(app.screen === 'path') return renderPath();
    return '';
  }

  /* ============================================================
     UPLOAD SCREEN
     ============================================================ */

  const TAXONOMY_OPTIONS = {
    // Learner-facing only — Content Outline, Proposals, and Feedback Templates are
    // trainer/manager materials, not learner content, and live in Plan instead.
    contentType: [
      'Training Modules', 'E-learning Courses', 'Case Studies/Caselets', 'Assessments',
      'Videos/Animations', 'Infographics', 'Worksheets/Job Aids', 'Simulations',
      'Activities', 'Questionnaires (Self-Assessments/Reflections/Research)', 'Other'
    ],
    audience: ['New hire', 'Experienced practitioner', 'Expert or people-manager'],
    delivery: ['Self-paced digital', 'Virtual instructor-led', 'In-person classroom'],
    theme: ['Process & Compliance', 'Product Knowledge', 'Soft Skills', 'Systems & Tools'],
    industry: ['BFSI, general', 'Healthcare BPO', 'Retail', 'IT / Tech']
  };
  function audienceToLevel(a){
    return { 'New hire':'foundational', 'Experienced practitioner':'intermediate', 'Expert or people-manager':'advanced' }[a] || 'foundational';
  }
  function deliveryLabelToKey(d){
    return { 'Self-paced digital':'self-paced', 'Virtual instructor-led':'virtual', 'In-person classroom':'classroom' }[d] || 'self-paced';
  }

  function renderUpload(){
    const t = app.taxonomy;
    return `
      <div class="create-head">
        <div class="accent-strip" style="background:var(--bf-blue);"></div>
        <h1>Let's Create</h1>
        <p>Every module starts here — build fresh from a topic and audience, or ground it in a source document you already have.</p>
      </div>
      ${app.error ? `<div class="error-banner">${app.error}</div>` : ''}

      <div class="tiles">
        ${taxTile('green', 'Type Of Content', TAXONOMY_OPTIONS.contentType, t.contentType, 'contentType')}
        ${taxTile('yellow', 'Type Of Audience', TAXONOMY_OPTIONS.audience, t.audience, 'audience')}
        ${taxTile('pink', 'Delivery Method', TAXONOMY_OPTIONS.delivery, t.delivery, 'delivery')}
        ${taxTile('teal', 'Content Theme', TAXONOMY_OPTIONS.theme, t.theme, 'theme')}
        ${taxTile('red', 'Target Industry', TAXONOMY_OPTIONS.industry, t.industry, 'industry')}
      </div>

      ${t.contentType !== 'Training Modules' ? `<p class="status-line" style="text-align:left; margin-bottom:16px;">Type Of Content is a real, selectable field, but today the engine only builds one output shape — a Training Module (Read → Watch → Practice → Check), or a Facilitator Kit if you pick a live delivery mode below. The other content types are here for completeness and future build-out, not live yet.</p>` : ''}
      <label style="display:block; font-size:11.5px; font-weight:700; color:var(--bf-soft); margin-bottom:10px;">How should this module start?</label>
      <div style="display:flex; gap:16px; margin-bottom:24px;">
        <div class="mode-card ${app.createMode==='scratch'?'selected':''}" data-pick-mode="scratch">
          <div style="font-size:22px; margin-bottom:8px;">✨</div>
          <div style="font-weight:700; font-size:14.5px; margin-bottom:4px;">Build from scratch</div>
          <div style="font-size:12.5px; color:var(--bf-soft);">Describe the topic and audience above — no source document needed.</div>
        </div>
        <div class="mode-card ${app.createMode==='document'?'selected':''}" data-pick-mode="document">
          <div style="font-size:22px; margin-bottom:8px;">📄</div>
          <div style="font-weight:700; font-size:14.5px; margin-bottom:4px;">From a standalone document</div>
          <div style="font-size:12.5px; color:var(--bf-soft);">Upload SOPs, policy notes, or decks — chunked, tagged, and reconciled before anything's built.</div>
        </div>
      </div>

      ${app.createMode === 'scratch' ? renderScratchMode() : ''}
      ${app.createMode === 'document' ? renderDocumentMode() : ''}
    `;
  }

  function taxTile(color, label, options, value, key){
    const opts = options.map(o => `<option ${o===value?'selected':''}>${o}</option>`).join('');
    const colorMap = { green:['#3E9B5C','#E7F5EC'], yellow:['#C79A1E','#FBF1DC'], pink:['#C6408A','#FBE6F1'], teal:['#1E8F86','#E2F3F1'], red:['#C4472E','#FBE9E5'] };
    const [fg, bg] = colorMap[color];
    return `
      <div class="tile">
        <div class="icon" style="background:${bg}; color:${fg};">●</div>
        <div class="label">${label}</div>
        ${key ? `<select data-taxonomy-key="${key}">${opts}</select>` : `<select disabled>${opts}</select>`}
      </div>
    `;
  }

  function renderScratchMode(){
    const level = audienceToLevel(app.taxonomy.audience);
    const delivery = app.taxonomy.delivery;
    return `
      <div class="item-card">
        <label style="margin-top:0;">What's this module about?</label>
        <textarea id="scratch-topic" placeholder="e.g. Handling objections on an outbound renewal call, or KYC verification for new account opening…" style="width:100%; min-height:80px; border:1px solid var(--bf-line); border-radius:8px; padding:10px 12px; font-size:13.5px;">${escHtml(app.scratchTopic)}</textarea>
        <div class="sub" style="margin-top:10px;">Will build as <strong>${level}</strong> level, delivered <strong>${delivery.toLowerCase()}</strong> — from the tiles above.</div>
      </div>
      <div class="generate-row">
        <button class="generate-btn" id="generate-scratch-btn" ${(!app.scratchTopic.trim() || app.generating) ? 'disabled' : ''}>${app.generating ? 'Generating…' : 'Generate from scratch ✦'}</button>
      </div>
      ${app.generating ? `<p class="status-line">${app.status}</p>` : ''}
    `;
  }

  function renderDocumentMode(){
    return `
      <div class="dropzone" id="dropzone">
        <div class="dz-title">Drop source documents here</div>
        <div class="dz-sub">or click to browse — select several files at once (Ctrl/Cmd-click, or drag a whole selection) — .pptx, .pdf, .docx, .xlsx</div>
        <div class="dz-sub">add more any time, even after classifying — already-processed files are left alone</div>
      </div>
      <input type="file" id="file-input" accept=".pptx,.pdf,.docx,.xlsx" multiple style="display:none;">

      ${app.files.map(f => `
        <div class="file-row">
          <div class="file-info">
            <div class="file-icon">${f.kind.toUpperCase()}</div>
            <div class="file-meta">
              <div class="fname">${escAttr(f.name)}</div>
              <div class="fstatus">${f.status}${f.classified ? ' <span class="badge-pill badge-approved">classified</span>' : ''}</div>
            </div>
          </div>
          <button class="remove-file" data-remove-file="${f.id}">Remove</button>
        </div>
      `).join('')}

      ${app.atoms.length > 0 ? `<p class="status-line" style="text-align:left;">${app.atoms.length} atom(s) already in the library from earlier files — those, and any review decisions on them, are untouched by classifying new files.</p>` : ''}

      <div class="generate-row">
        <button class="generate-btn" id="classify-btn" ${(!app.files.some(f=>!f.classified)) ? 'disabled' : ''}>${app.files.length && !app.files.some(f=>!f.classified) ? 'All files classified' : 'Classify new files ✦'}</button>
      </div>
    `;
  }

  function renderClassifying(){
    return `
      <div class="create-head"><h1>Working on it</h1></div>
      <div class="item-card" style="text-align:center;">
        <p class="status-line" style="margin:0;">${app.status || 'Processing…'}</p>
      </div>
    `;
  }

  /* ============================================================
     FILE HANDLING + DETERMINISTIC CHUNKING (Pass 1)
     ============================================================ */

  async function handleFiles(fileList){
    // Snapshot the FileList before the first await: the change handler clears
    // the input's value as soon as this returns, which empties the live list.
    const incoming = Array.from(fileList);
    try{ await ensureParsers(); }
    catch(err){ app.error = err.message; render(); return; }
    const jobs = [];
    for(const file of incoming){
      const ext = (file.name.match(/\.(\w+)$/) || [,''])[1].toLowerCase();
      const kindMap = { pptx:'pptx', pdf:'pdf', docx:'docx', xlsx:'xlsx' };
      const kind = kindMap[ext];
      if(!kind){ app.error = `Skipped ${file.name} — only .pptx, .pdf, .docx, .xlsx are supported.`; continue; }
      const fileEntry = { id:'f'+app.files.length+jobs.length+'_'+Date.now(), name:file.name, kind, status:'Chunking…', chunks:[], classified:false };
      app.files.push(fileEntry);
      jobs.push({ file, fileEntry, kind });
    }
    render();
    // All files chunk in parallel — this is local parsing, not an API call,
    // so there's no reason a batch of 7 files should feel like 7 sequential waits.
    await Promise.all(jobs.map(async ({file, fileEntry, kind}) => {
      try{
        const buffer = await file.arrayBuffer();
        if(kind === 'pptx') fileEntry.chunks = await chunkPptx(buffer);
        else if(kind === 'docx') fileEntry.chunks = await chunkDocx(buffer);
        else if(kind === 'pdf') fileEntry.chunks = await chunkPdf(buffer);
        else if(kind === 'xlsx') fileEntry.chunks = await chunkXlsx(buffer);
        fileEntry.status = `${fileEntry.chunks.length} chunk(s) ready`;
      }catch(err){
        fileEntry.status = 'Could not extract — check the file isn\'t corrupted';
      }
      render();
    }));
  }

  async function chunkPptx(buffer){
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a,b) => parseInt(a.match(/slide(\d+)/)[1],10) - parseInt(b.match(/slide(\d+)/)[1],10));
    const chunks = [];
    for(const f of slideFiles){
      const xml = await zip.files[f].async('text');
      const matches = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => decodeXml(m[1]));
      const n = f.match(/slide(\d+)/)[1];
      const text = matches.join(' ').trim();
      if(text) chunks.push({ id:'c'+chunks.length, label:`Slide ${n}`, text });
    }
    return chunks;
  }

  async function chunkDocx(buffer){
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const div = document.createElement('div');
    div.innerHTML = result.value;
    const chunks = [];
    let currentLabel = 'Introduction';
    let currentText = [];
    function flush(){
      const text = currentText.join(' ').replace(/\s+/g,' ').trim();
      if(text) chunks.push({ id:'c'+chunks.length, label: currentLabel, text });
      currentText = [];
    }
    // A real heading style is the strongest signal, but many facilitator/process
    // guides never apply Word heading styles at all — their section titles are
    // just short, all-caps paragraphs. Detect those too, and separately recognise
    // "TIME ELAPSED / N MINS / TIME ON SLIDE / N MINS" pacing markers common in
    // facilitator guides as a per-slide chunk boundary that is NEVER a heading
    // or body content itself (this pattern is what silently produced 1-3 chunks
    // out of a 600-paragraph guide before this fix).
    function looksLikeHeading(text){
      if(!text || text.length > 70) return false;
      const letters = text.replace(/[^A-Za-z]/g,'');
      if(letters.length < 3) return false;
      const upper = letters.replace(/[^A-Z]/g,'');
      return (upper.length / letters.length) > 0.8;
    }
    Array.from(div.children).forEach(el => {
      if(/^H[1-3]$/.test(el.tagName)){
        flush();
        currentLabel = el.textContent.trim() || currentLabel;
        return;
      }
      const t = el.textContent.trim();
      if(/^TIME ELAPSED\b/i.test(t) || /^TIME ON SLIDE\b/i.test(t)){
        flush();
        return;
      }
      if(/^\d+\s*MINS?$/i.test(t)){
        return; // the pacing value itself (e.g. "5 MINS") — never a heading, never body text
      }
      if(looksLikeHeading(t)){
        flush();
        currentLabel = t;
        return;
      }
      if(t) currentText.push(t);
    });
    flush();
    if(chunks.length === 0){
      const all = div.textContent.replace(/\s+/g,' ').trim();
      if(all) chunks.push({ id:'c0', label:'Document text', text: all });
    }
    return chunks;
  }

  async function chunkPdf(buffer){
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
    const chunks = [];
    for(let i=1; i<=doc.numPages; i++){
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(it => it.str).join(' ').replace(/\s+/g,' ').trim();
      if(text) chunks.push({ id:'c'+chunks.length, label:`Page ${i}`, text });
    }
    return chunks;
  }

  async function chunkXlsx(buffer){
    const wb = XLSX.read(buffer, { type:'array' });
    const chunks = [];
    wb.SheetNames.forEach(name => {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]).trim();
      if(csv) chunks.push({ id:'c'+chunks.length, label:`Sheet: ${name}`, text: csv });
    });
    return chunks;
  }

  function decodeXml(s){
    return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&apos;/g,"'").replace(/&quot;/g,'"');
  }

  /* ============================================================
     PASS 2: PER-CHUNK CLASSIFICATION (one AI call per file)
     ============================================================ */

  async function runClassification(){
    app.screen = 'classifying';
    app.error = null;
    render();

    const classifySystem = `You are tagging excerpts from a contact-center training/knowledge source into a fixed atom schema. Extract, don't rewrite — the "body" field should be the source's own wording, lightly cleaned, not a paraphrase or summary. One excerpt may yield zero, one, or multiple atoms; skip excerpts that are pure logistics/navigation with no teachable content.

  For each atom, output:
  - "chunkLabel": exactly the chunk label you were given, so it can be matched back
  - "type": one of concept | process-step | policy-rule | scenario-situation | quiz-fact | soft-skill
  - "topicLabel": a short, consistent topic name (2-5 words) — use the SAME topicLabel string for atoms that are clearly about the same underlying topic, even across different chunks, so they group together correctly
  - "level": "foundational" (a new hire needs this explained fully), "intermediate" (assumes foundational knowledge), "advanced" (edge cases, exceptions — someone experienced would want this, a beginner would find it noise), or "all" (relevant regardless of experience — e.g. a compliance rule everyone must know)
  - "systemsInvolved": array of system/portal names mentioned, or []
  - "body": the extracted content, source wording preserved
  - "confidence": 0 to 1
  - "headingConsistency": "consistent" if the content actually matches the chunk's own label/heading, "mismatched" if it seems to belong under a different heading, "unclear" if there's no clear heading signal either way — briefly explain in a "headingNote" field if not "consistent"

  Respond with ONLY a JSON array of atom objects — no markdown fences, no preamble. If a file has no atom-worthy content, respond with [].`;

    const filesToClassify = app.files.filter(f => !f.classified && f.chunks.length > 0);

    if(filesToClassify.length === 0){
      app.error = app.files.length === 0
        ? "Add at least one file first."
        : "Every file here has already been classified. Add a new file to classify more, or use Re-cluster on the Build screen if you've edited atoms.";
      app.screen = 'upload';
      render();
      return;
    }

    try{
      app.status = `Classifying ${filesToClassify.length} new file(s)…`;
      render();
      const results = await Promise.all(filesToClassify.map(f => classifyFile(f, classifySystem)));
      let newAtoms = [];
      const fileErrors = [];
      results.forEach((result, i) => {
        const f = filesToClassify[i];
        if(result.error){
          fileErrors.push(`${f.name}: ${result.error}`);
          f.status = 'Classification failed — ' + result.error;
          return;
        }
        f.classified = true;
        if(result.empty){
          f.status = 'No extractable text found in this file';
          return;
        }
        if(result.atoms.length === 0) f.status = 'Classified — no atom-worthy content found';
        else f.status = `Classified — ${result.atoms.length} atom(s)`;
        result.atoms.forEach(a => {
          newAtoms.push(Object.assign({
            id: 'atom'+app.atoms.length+newAtoms.length+'_'+Date.now(),
            fileId: f.id,
            fileName: f.name,
            status: 'pending',
            groupId: null,
            reasons: []
          }, a));
        });
      });

      if(fileErrors.length){
        app.error = "Some files failed to classify:\n" + fileErrors.join('\n');
      }

      if(newAtoms.length === 0 && app.atoms.length === 0){
        // Nothing at all extracted, on a first run — stop here instead of silently
        // landing on an empty Review/Library screen.
        if(!app.error){
          app.error = "No atoms were extracted from any file. This usually means the files had no classifiable content, or every chunk was judged pure logistics/navigation — check the per-file status below.";
        }
        app.screen = 'upload';
        render();
        return;
      }

      // Append, never replace — atoms from previously-classified files, and any
      // human review decisions already made on them, are untouched.
      app.atoms = app.atoms.concat(newAtoms);
      app.status = 'Reconciling atoms across sources…';
      render();
      await runReconciliation();
      routeAllAtoms();
      app.screen = 'review';
    }catch(err){
      app.error = "Couldn't complete classification — " + (err.message || 'check your connection and try again.');
      app.screen = 'upload';
    }
    render();
  }

  async function classifyFile(file, system){
    if(!file.chunks.length) return { atoms:[], error: null, empty:true };
    const input = file.chunks.map(c => `--- Chunk: ${c.label} ---\n${c.text}`).join('\n\n').slice(0, 14000);
    try{
      const raw = await callClaude(system, [{role:'user', content: `Source file: ${file.name}\n\n${input}`}], 4000);
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return { atoms: Array.isArray(parsed) ? parsed : [], error: null };
    }catch(err){
      return { atoms: [], error: (err.message || 'unknown error') };
    }
  }

  /* ============================================================
     PASS 3: RECONCILIATION (group by topic, AI check when 2+ sources)
     ============================================================ */

  function normalizeTopic(t){
    return (t||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }

  async function runReconciliation(){
    const oldGroups = app.groups; // so unchanged topics can skip a redundant AI call
    const byTopic = {};
    app.atoms.forEach(a => {
      const key = normalizeTopic(a.topicLabel);
      if(!byTopic[key]) byTopic[key] = [];
      byTopic[key].push(a);
    });

    const groups = [];
    const reconcileSystem = `You're comparing knowledge atoms about the SAME topic, independently extracted from different source files. Determine whether they agree.

  Respond with ONLY JSON, no markdown fences:
  {"status":"consistent"|"conflict","note":"<one sentence — if consistent, note which sources confirm it; if conflict, describe the disagreement plainly enough for a human to resolve it in one read>"}

  Mark "conflict" if the atoms describe meaningfully different facts, rules, or numbers for what claims to be the same topic — not just different wording of the same fact.`;

    for(const key of Object.keys(byTopic)){
      const atomsInGroup = byTopic[key];
      const stableId = 'g_' + key.replace(/\s+/g,'_').slice(0,60);
      const currentAtomIds = atomsInGroup.map(a=>a.id).sort().join(',');
      const existing = oldGroups.find(g => g.topicKey === key);

      if(existing && existing.atomIds.slice().sort().join(',') === currentAtomIds){
        // Nothing changed for this topic since the last run — keep the prior
        // verdict as-is rather than re-spending an AI call and risking a flip.
        atomsInGroup.forEach(a => { a.groupId = existing.id; });
        groups.push(existing);
        continue;
      }

      const group = { id: stableId, topicKey:key, topicLabel: atomsInGroup[0].topicLabel, atomIds: atomsInGroup.map(a=>a.id), status:'single_source', note:'' };
      const distinctFiles = new Set(atomsInGroup.map(a => a.fileId));
      if(atomsInGroup.length > 1 && distinctFiles.size > 1){
        try{
          const input = atomsInGroup.map(a => `Source: ${a.fileName} (${a.chunkLabel})\n${a.body}`).join('\n\n---\n\n');
          const raw = await callClaude(reconcileSystem, [{role:'user', content: `Topic: ${group.topicLabel}\n\n${input}`}], 400);
          const cleaned = raw.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          group.status = parsed.status === 'conflict' ? 'conflict' : 'consistent';
          group.note = parsed.note || '';
        }catch(err){
          group.status = 'consistent';
          group.note = 'Reconciliation check failed — treated as consistent by default; worth a manual look.';
        }
      } else if(atomsInGroup.length > 1){
        group.status = 'consistent';
        group.note = 'Multiple atoms, same file — no cross-source check needed.';
      }
      atomsInGroup.forEach(a => { a.groupId = group.id; });
      groups.push(group);
    }
    app.groups = groups;
  }

  /* ============================================================
     ROUTING — confidence + stakes → auto-approve or human review
     ============================================================ */

  function routeAllAtoms(){
    app.atoms.forEach(a => {
      const group = app.groups.find(g => g.id === a.groupId);
      const reasons = [];
      if(group && group.status === 'conflict') reasons.push('Source conflict');
      if(a.type === 'policy-rule' || a.type === 'quiz-fact') reasons.push('Compliance-weight type');
      if(a.headingConsistency && a.headingConsistency !== 'consistent') reasons.push('Heading mismatch');
      if((a.confidence||1) < 0.6) reasons.push('Low confidence');
      a.reasons = reasons;

      // A human decision (approved/rejected) is never silently overwritten by
      // re-running classification/reconciliation for OTHER new files — except
      // when a fresh conflict has just appeared on this atom's own topic, since
      // that's new information the human hasn't seen yet and needs to weigh in on.
      const alreadyDecided = a.status === 'approved' || a.status === 'rejected';
      const freshConflict = group && group.status === 'conflict' && reasons.includes('Source conflict');
      if(alreadyDecided && !freshConflict) return;

      a.status = reasons.length ? 'needs_review' : 'approved';
    });
  }

  /* ============================================================
     TOPIC CLUSTERING — the layer between atoms and the pick-and-build UI
     ============================================================ */

  async function clusterTopics(){
    app.topicsClustering = true; app.error = null; render();
    const clusterSystem = `You're organizing a knowledge base for a training-content tool. You'll receive a list of fine-grained topic labels, each with its atom count and types. Cluster them into a SMALL number of broad, human-recognizable Topics (aim for roughly one Topic per 3-8 fine-grained labels, fewer if the content is genuinely one subject) — the kind of list someone would pick from in a dropdown, like "EMI Bounce Handling" or "KYC Verification," not a narrow label like "Waiver Eligibility Grid."

  Every fine-grained label must be assigned to exactly one Topic. Don't invent labels that weren't given to you — only group and rename at the umbrella level.

  Respond with ONLY JSON, no markdown fences:
  {"topics":[{"name":"...","memberLabels":["<exact fine-grained label>", "..."]}]}`;

    const groupSummaries = app.groups.map(g => {
      const members = app.atoms.filter(a => a.groupId === g.id);
      const types = [...new Set(members.map(a=>a.type))].join(', ');
      return `- "${g.topicLabel}" (${members.length} atom(s), types: ${types})`;
    }).join('\n');

    try{
      const raw = await callClaude(clusterSystem, [{role:'user', content: groupSummaries}], 2000);
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const topics = (parsed.topics || []).map((t,i) => {
        const groupIds = t.memberLabels
          .map(label => app.groups.find(g => g.topicLabel === label))
          .filter(Boolean)
          .map(g => g.id);
        return { id:'topic'+i, name: t.name, groupIds };
      });
      // Safety net: any group the model didn't place gets its own single-group topic
      const placed = new Set(topics.flatMap(t => t.groupIds));
      app.groups.forEach(g => {
        if(!placed.has(g.id)) topics.push({ id:'topic'+topics.length, name: g.topicLabel, groupIds:[g.id] });
      });
      app.topics = topics;
    }catch(err){
      app.error = "Couldn't cluster topics — " + (err.message || 'check your connection and try again.') + " You can still browse by fine-grained topic in the Library.";
      app.topics = app.groups.map((g,i) => ({ id:'topic'+i, name: g.topicLabel, groupIds:[g.id] }));
    }
    app.topicsClustering = false;
    render();
  }

  /* ============================================================
     REVIEW SCREEN
     ============================================================ */

  function renderReview(){
    const queue = app.atoms.filter(a => a.status === 'needs_review');
    if(queue.length === 0){
      return `
        <div class="create-head"><div class="accent-strip" style="background:var(--bf-red);"></div><h1>Nothing needs review</h1><p>Every atom either auto-approved or has already been resolved. Head to the Library to see the full set, or Build to assemble a module.</p></div>
        <div class="generate-row" style="gap:12px;"><button class="btn-secondary" data-jump="library">View Library first</button><button class="btn-primary" data-jump="build">Go to Build →</button></div>
        <p class="status-line">${app.atoms.filter(a=>a.status==='approved').length} atom(s) approved and ready to build with.</p>
      `;
    }
    const i = Math.min(app.reviewIndex, queue.length-1);
    const a = queue[i];
    const group = app.groups.find(g => g.id === a.groupId);
    const siblings = group ? app.atoms.filter(x => x.groupId === group.id && x.id !== a.id) : [];
    return `
      <div class="create-head"><div class="accent-strip" style="background:var(--bf-red);"></div><h1>Review queue</h1><p>${queue.length} atom(s) need a human decision before they're usable. ${i+1} of ${queue.length}.</p></div>
      <div class="review-card">
        <div class="review-reasons">${a.reasons.map(r => `<span class="reason-chip">${r}</span>`).join('')}</div>
        <div class="atom-row" style="border-top:none; padding-top:0;">
          <div class="src">${escAttr(a.fileName)} — ${escAttr(a.chunkLabel)} · <span class="badge-pill badge-type">${a.type}</span></div>
        </div>
        <label style="display:block; font-size:11.5px; font-weight:700; color:var(--bf-soft); margin:10px 0 4px;">Topic</label>
        <input type="text" id="rev-topic" value="${escAttr(a.topicLabel)}" style="width:100%; border:1px solid var(--bf-line); border-radius:8px; padding:9px 11px; font-size:13.5px;">
        <label style="display:block; font-size:11.5px; font-weight:700; color:var(--bf-soft); margin:10px 0 4px;">Body</label>
        <textarea id="rev-body" style="width:100%; min-height:110px; border:1px solid var(--bf-line); border-radius:8px; padding:9px 11px; font-size:13.5px;">${escHtml(a.body)}</textarea>
        ${group && group.status === 'conflict' ? `<div class="conflict-note"><strong>Conflict:</strong> ${escAttr(group.note)}</div>` : ''}
        ${siblings.length ? siblings.map(s => `<div class="sibling-box"><div class="src">${escAttr(s.fileName)} — ${escAttr(s.chunkLabel)}</div>${escAttr(s.body)}</div>`).join('') : ''}
        <div class="review-actions">
          <button class="btn-primary" id="rev-approve">Approve</button>
          <button class="btn-secondary" id="rev-reject">Reject</button>
          ${i>0 ? `<button class="btn-secondary" id="rev-prev">Back</button>` : ''}
        </div>
      </div>
    `;
  }

  /* ============================================================
     LIBRARY SCREEN
     ============================================================ */

  function renderLibrary(){
    const types = ['all','concept','process-step','policy-rule','scenario-situation','quiz-fact','soft-skill'];
    const groups = app.groups.filter(g => {
      if(app.libFilter === 'all') return true;
      return app.atoms.some(a => a.groupId === g.id && a.type === app.libFilter);
    });
    const approvedCount = app.atoms.filter(a=>a.status==='approved').length;
    const reviewCount = app.atoms.filter(a=>a.status==='needs_review').length;
    return `
      <div class="create-head"><div class="accent-strip" style="background:var(--bf-pink);"></div><h1>Atom library</h1><p>${app.atoms.length} atom(s) across ${app.groups.length} sub-topic(s), from ${app.files.length} source file(s).</p></div>
      ${app.atoms.length > 0 ? `
        <div class="item-card" style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
          <div style="font-size:13.5px;">
            <strong>${approvedCount} approved</strong>${reviewCount ? `, ${reviewCount} still in review` : ''} — ${approvedCount ? 'ready to build with.' : 'nothing buildable yet.'}
          </div>
          ${reviewCount ? `<button class="btn-secondary" data-jump="review">Clear the review queue</button>` : `<button class="btn-primary" data-jump="build">Go to Build →</button>`}
        </div>
      ` : ''}
      <div class="lib-filters">
        ${types.map(t => `<div class="lib-filter ${app.libFilter===t?'active':''}" data-filter="${t}">${t}</div>`).join('')}
      </div>
      ${groups.map(g => {
        const members = app.atoms.filter(a => a.groupId === g.id);
        const approved = members.filter(a=>a.status==='approved').length;
        const review = members.filter(a=>a.status==='needs_review').length;
        const rejected = members.filter(a=>a.status==='rejected').length;
        return `
          <div class="group-card">
            <div class="group-head" data-toggle-group="${g.id}">
              <div>
                <div class="topic">${escAttr(g.topicLabel)} <span class="badge-pill ${g.status==='conflict'?'badge-conflict':(g.status==='single_source'?'badge-single':'badge-approved')}">${g.status.replace('_',' ')}</span></div>
                <div class="meta">${members.length} atom(s) · ${approved} approved · ${review} in review · ${rejected} rejected</div>
              </div>
            </div>
            ${app.expandedGroup === g.id ? `
              <div class="group-body">
                ${g.status==='conflict' ? `<div class="conflict-note"><strong>Conflict:</strong> ${escAttr(g.note)}</div>` : ''}
                ${members.map(a => `
                  <div class="atom-row">
                    <div class="src">${escAttr(a.fileName)} — ${escAttr(a.chunkLabel)} · <span class="badge-pill badge-type">${a.type}</span> <span class="badge-pill ${a.status==='approved'?'badge-approved':(a.status==='rejected'?'badge-rejected':'badge-review')}">${a.status.replace('_',' ')}</span></div>
                    <div class="body-text">${escAttr(a.body)}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    `;
  }

  /* ============================================================
     BUILD SCREEN
     ============================================================ */

  function topicApprovedCount(topic){
    return app.atoms.filter(a => topic.groupIds.includes(a.groupId) && a.status === 'approved').length;
  }

  function renderBuiltModulesList(){
    if(!app.builtModules.length) return '';
    return `
      <div class="section-block" style="margin-top:34px;">
        <h2 style="font-size:17px; margin-bottom:14px;">Built modules</h2>
        <p class="status-line" style="text-align:left; margin-bottom:14px;">Governance-checked before publish. Only published modules can go into a Path or Course.</p>
        ${app.builtModules.map(m => `
          <div class="file-row" style="align-items:flex-start; flex-direction:column;">
            <div style="display:flex; width:100%; justify-content:space-between; align-items:center;">
              <div class="file-info">
                <div class="file-icon">${m.kitType ? 'KIT' : m.level.slice(0,4).toUpperCase()}</div>
                <div class="file-meta"><div class="fname">${escAttr(m.topicName)}</div><div class="fstatus">${m.kitType ? `Facilitator kit \u00b7 ${m.delivery} \u00b7 ` : `${m.level} \u00b7 ${m.delivery||'\u2014'} \u00b7 `}<span class="badge-pill ${m.published?'badge-approved':'badge-review'}">${m.published?'published':'draft'}</span></div></div>
              </div>
              <div style="display:flex; gap:10px;">
                <button class="btn-secondary" data-open-module="${m.id}">Open</button>
                <button class="btn-secondary" data-add-to-path="${m.id}" ${(!m.published||m.kitType)?'disabled title="Publish first"':''}>Add to path</button>
                <button class="btn-secondary" data-add-to-course="${m.id}" ${(!m.published||m.kitType)?'disabled title="Publish first"':''}>Add to course</button>
              </div>
            </div>
            ${m.kitType ? `<p class="status-line" style="text-align:left; margin:8px 0 0;">Facilitator kits are reference material for a live session \u2014 not sequenced into a learner Path or Course.</p>` : ''}
            ${m.govFlags && m.govFlags.length ? `
              <div class="review-reasons" style="margin-top:10px;">${m.govFlags.map(f=>`<span class="reason-chip">${f}</span>`).join('')}</div>
            ` : ''}
            ${!m.published ? `
              <div style="display:flex; gap:10px; align-items:center; margin-top:10px; width:100%;">
                <input type="text" placeholder="Reviewed by\u2026" data-reviewer-name="${m.id}" value="${escAttr(m.reviewedBy||'')}" style="flex:1; border:1px solid var(--bf-line); border-radius:8px; padding:8px 10px; font-size:12.5px;">
                <button class="btn-primary" data-publish-module="${m.id}" ${!m.reviewedBy ? 'disabled' : ''}>Publish</button>
              </div>
            ` : ''}
          </div>
        `).join('')}
        <div class="generate-row" style="margin-top:16px;"><button class="btn-primary" data-jump="path">Go arrange them in a Path →</button></div>
      </div>
    `;
  }

  function renderBuild(){
    if(app.topics.length === 0 && !app.topicsClustering){
      return `
        <div class="create-head"><div class="accent-strip" style="background:var(--bf-teal);"></div><h1>Build a module</h1><p>First, cluster your atoms into a small set of pickable topics — this turns dozens of fine-grained atoms into the handful of subjects you'd actually choose from.</p></div>
        ${app.error ? `<div class="error-banner">${app.error}</div>` : ''}
        <div class="generate-row"><button class="generate-btn" id="cluster-btn">Cluster into topics ✦</button></div>
        ${renderBuiltModulesList()}
      `;
    }
    if(app.topicsClustering){
      return `<div class="create-head"><h1>Clustering…</h1></div><p class="status-line">Grouping fine-grained atoms into recognizable topics.</p>${renderBuiltModulesList()}`;
    }

    const levels = [
      {key:'foundational', label:'Foundational'},
      {key:'intermediate', label:'Intermediate'},
      {key:'advanced', label:'Advanced'}
    ];
    const deliveries = [
      {key:'self-paced', label:'Self-paced digital'},
      {key:'virtual', label:'Virtual instructor-led'},
      {key:'classroom', label:'In-person classroom'}
    ];
    const anySelected = app.buildTopicIds.length > 0;

    return `
      <div class="create-head"><div class="accent-strip" style="background:var(--bf-teal);"></div><h1>Build a module</h1><p>Pick one or more topics, pick a level, and generate — one module per topic selected. Click a topic's name to see (and reassign) what's actually clustered inside it. Generation only ever uses approved atoms.</p></div>
      ${app.error ? `<div class="error-banner">${app.error}</div>` : ''}
      <div class="generate-row" style="margin-bottom:20px;"><button class="btn-secondary" id="recluster-btn">Re-cluster topics</button></div>

      <label style="display:block; font-size:11.5px; font-weight:700; color:var(--bf-soft); margin-bottom:8px;">Topics (select one or more)</label>
      ${app.topics.map(t => {
        const approvedCount = topicApprovedCount(t);
        const memberGroups = app.groups.filter(g => t.groupIds.includes(g.id));
        const memberAtoms = app.atoms.filter(a => t.groupIds.includes(a.groupId)).length;
        const isExpanded = app.expandedTopic === t.id;
        const otherTopics = app.topics.filter(ot => ot.id !== t.id);
        return `
        <div class="build-pick ${app.buildTopicIds.includes(t.id)?'selected':''}" style="cursor:default;">
          <div style="display:flex; align-items:flex-start; gap:12px;">
            <input type="checkbox" data-select-topic="${t.id}" ${app.buildTopicIds.includes(t.id)?'checked':''} style="margin-top:4px;">
            <div style="flex:1; cursor:pointer;" data-expand-topic="${t.id}">
              <div class="topic">${escAttr(t.name)} <span style="font-weight:400; color:var(--bf-soft); font-size:12px;">${isExpanded ? '▾ hide sub-topics' : '▸ view sub-topics'}</span></div>
              <div class="meta">${approvedCount} of ${memberAtoms} atom(s) approved · ${memberGroups.length} sub-topic(s)</div>
            </div>
          </div>
          ${isExpanded ? `
            <div class="group-body">
              ${memberGroups.map(g => {
                const gAtoms = app.atoms.filter(a => a.groupId === g.id);
                const gApproved = gAtoms.filter(a=>a.status==='approved').length;
                return `
                <div class="atom-row" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                  <div>
                    <div class="body-text" style="font-weight:600;">${escAttr(g.topicLabel)}</div>
                    <div class="src">${gAtoms.length} atom(s) · ${gApproved} approved${g.status==='conflict' ? ' · <span class="badge-pill badge-conflict">conflict</span>' : ''}</div>
                  </div>
                  <select data-move-group="${g.id}" data-from-topic="${t.id}" style="border:1px solid var(--bf-line); border-radius:8px; padding:6px 8px; font-size:12.5px;">
                    <option value="">Move to…</option>
                    ${otherTopics.map(ot => `<option value="${ot.id}">${escAttr(ot.name)}</option>`).join('')}
                    <option value="__new__">+ New topic</option>
                  </select>
                </div>
              `;}).join('')}
            </div>
          ` : ''}
        </div>`;
      }).join('')}

      ${anySelected ? `
        <label style="display:block; font-size:11.5px; font-weight:700; color:var(--bf-soft); margin:20px 0 8px;">Level</label>
        <div class="lib-filters">
          ${levels.map(l => `<div class="lib-filter ${app.buildLevel===l.key?'active':''}" data-pick-level="${l.key}">${l.label}</div>`).join('')}
        </div>
        <label style="display:block; font-size:11.5px; font-weight:700; color:var(--bf-soft); margin:16px 0 8px;">Delivery mode</label>
        <div class="lib-filters">
          ${deliveries.map(d => `<div class="lib-filter ${app.buildDelivery===d.key?'active':''}" data-pick-delivery="${d.key}">${d.label}</div>`).join('')}
        </div>
        ${app.buildLevel && app.buildDelivery ? (() => {
          const rec = recommendIntervention(app.buildLevel, app.buildDelivery);
          return `<div class="item-card" style="margin-top:16px; border-left:3px solid var(--bf-blue);">
            <div style="font-size:11px; font-weight:700; color:var(--bf-blue); text-transform:uppercase; margin-bottom:4px;">Recommended build</div>
            <div style="font-weight:700; font-size:14px; margin-bottom:4px;">${rec.text}</div>
            <div style="font-size:12.5px; color:var(--bf-soft);">${rec.reason}</div>
          </div>`;
        })() : ''}
      ` : ''}

      <div class="generate-row">
        <button class="generate-btn" id="build-btn" ${(!anySelected || !app.buildLevel || !app.buildDelivery || app.generating) ? 'disabled' : ''}>${app.generating ? 'Building…' : (app.buildTopicIds.length > 1 ? `Generate ${app.buildTopicIds.length} modules ✦` : 'Generate module ✦')}</button>
      </div>
      ${app.generating ? `<p class="status-line">${app.status}</p>` : ''}

      ${renderBuiltModulesList()}
    `;
  }

  function recommendIntervention(level, delivery){
    if(delivery === 'self-paced'){
      return { text: 'Interactive module \u2014 reading, screenshot walkthrough, live practice call, and quiz', reason: 'Self-paced digital delivery is exactly what the learner Player is built for.' };
    }
    if(delivery === 'virtual'){
      return { text: 'Facilitator kit \u2014 scenario-based discussion guide, job aid, and breakout prompts', reason: 'A live virtual session runs on guided discussion, not a learner clicking through content alone.' };
    }
    return { text: 'Facilitator kit \u2014 case-study workbook, facilitator guide, and peer-coaching rubric', reason: 'An in-person classroom supports case-based practice and peer feedback that a self-paced module can\u2019t.' };
  }

  function checkContentSafetyPatterns(obj){
    const flags = [];
    const allText = JSON.stringify(obj);
    if(/\b\d{9,}\b/.test(allText)) flags.push('Content safety: a long digit sequence was found (possible account/ID number) \u2014 check before publishing');
    if(/\S+@\S+\.\S+/.test(allText)) flags.push('Content safety: an email address was found in generated content \u2014 check before publishing');
    return flags;
  }

  function runGovernanceChecks(moduleData){
    const flags = [];
    const obj = moduleData.objective || {};
    if(!obj.identify || !obj.learn || !obj.apply || (obj.identify+obj.learn+obj.apply).length < 20){
      flags.push('Missing or thin objective');
    }
    if(!moduleData.scenarios || moduleData.scenarios.length === 0){
      flags.push('No practice opportunity');
    }
    const totalWords = (moduleData.reading||[]).reduce((n,r) => n + (r.body||'').split(/\s+/).length, 0);
    if(totalWords < 60) flags.push('Pacing: reading looks too thin');
    if(totalWords > 900) flags.push('Pacing: reading looks too dense for one sitting');
    flags.push(...checkContentSafetyPatterns(moduleData));
    return flags;
  }

  function runGovernanceChecksForKit(kitData){
    const flags = [];
    if(!kitData.overview || kitData.overview.length < 20) flags.push('Missing or thin overview');
    if(kitData.discussionGuide && kitData.discussionGuide.length === 0) flags.push('No discussion prompts generated');
    if(kitData.caseStudies && kitData.caseStudies.length === 0) flags.push('No case studies generated');
    flags.push(...checkContentSafetyPatterns(kitData));
    return flags;
  }

  async function buildOneModule(topic, level, delivery){
    const approvedAtoms = app.atoms.filter(a => topic.groupIds.includes(a.groupId) && a.status === 'approved');

    const levelInstruction = {
      foundational: 'The learner is new — include atoms tagged "foundational" and "all" in full, with complete explanations. Skip atoms tagged "advanced" unless nothing else covers that ground.',
      intermediate: 'The learner has some experience — include atoms tagged "intermediate" and "all" fully; cover "foundational" atoms briefly as a refresher rather than a full explanation; include "advanced" atoms only where they materially affect correct handling.',
      advanced: 'The learner is experienced — focus on atoms tagged "advanced" and "all". Compress or skip "foundational" atoms entirely; assume that ground is already known.'
    }[level];
    const deliveryInstruction = {
      'self-paced': 'This is consumed alone, self-paced. Write reading sections as complete, standalone explanations — the learner has no facilitator to ask.',
      'virtual': 'This is delivered in a live virtual instructor-led session. Frame reading sections as facilitator talking points a trainer would walk a group through, and make the scenarios suitable to discuss out loud, not just read silently.',
      'classroom': 'This is delivered in an in-person classroom. Frame reading sections so a facilitator could teach from them directly, and make scenarios substantial enough to support a case-study-style group discussion.'
    }[delivery];

    const system = `You are an instructional designer assembling a self-paced learning module from a set of PRE-VETTED knowledge atoms (already fact-checked by a human — treat their content as ground truth, don't second-guess or invent beyond it). You'll receive atoms with a type each: concept, process-step, policy-rule, scenario-situation, quiz-fact, soft-skill — and a level each: foundational, intermediate, advanced, or all.

  Writing style: assume many readers are working in English as a second or third language. Use short sentences, plain everyday words, and a conversational tone — not formal or bureaucratic phrasing. If a technical or industry term is unavoidable, explain it briefly in the same sentence rather than assuming it's already understood.

  Target learner level for this build: ${level}. ${levelInstruction}
  Delivery mode: ${delivery}. ${deliveryInstruction}

  Build:
  1. "hook": a short (2-4 sentence) attention-opener that runs before any content — Gagné's "gain attention" step. Ground it in a specific, realistic incident tied to the actual atoms (a plausible thing that happened to a real customer or on a real call, using the topic's real facts, thresholds, or stakes) — written like the opening line of one of the role-play scenarios below, not an abstract statement about why the topic matters. Never invent facts beyond what the atoms support; if nothing in the atoms suggests a concrete incident, ground it in the most consequence-heavy rule instead (e.g. what happens if this is missed or done wrong).
  2. "reading": 2-5 sections from the concept/policy-rule/soft-skill atoms, plain business language, depth per the level guidance above. Each section also gets a "keyPoint" — the single sentence in that section a learner most needs to remember if they forget everything else (a rule, a number, a consequence — not a restatement of the heading).
  3. "watchSteps": 2-5 steps from process-step atoms (label + 1-3 sentence caption + "sourceRef" naming the source file/chunk). If there are no process-step atoms, return [].
  4. "scenarios": 1-3 role-play personas grounded in scenario-situation atoms (or synthesized strictly from policy-rule atoms' own decision branches if no scenario atoms exist). Each needs name, tag, picker, brief, opening, systemPrompt (hidden facts + behaviour rules), rubric (3-5 items with id+label), correctProcess. For an advanced-level build, make the scenario itself harder — an edge case, not the textbook example.
  5. "quiz": 3-6 multiple choice questions from quiz-fact/policy-rule atoms, each specific and grounded — never generic.
  6. "flashcards": 4-8 term/definition pairs pulled from the key terms, features, or add-ons named in the atoms (concept and policy-rule atoms are the best source). One term, one concise definition each — this is a quick-reference study aid, not a restatement of the reading sections.
  Also "title" and "objective":{"identify","learn","apply"}.

  Respond with ONLY valid JSON, no markdown fences, in exactly this shape:
  {"title":"...","objective":{"identify":"...","learn":"...","apply":"..."},"hook":"...","reading":[{"heading":"...","body":"...","keyPoint":"..."}],"watchSteps":[{"label":"...","caption":"...","sourceRef":"..."}],"scenarios":[{"name":"...","tag":"...","picker":"...","brief":"...","opening":"...","systemPrompt":"...","rubric":[{"id":"...","label":"..."}],"correctProcess":"..."}],"quiz":[{"prompt":"...","options":["...","...","...","..."],"correct":0,"explanation":"..."}],"flashcards":[{"term":"...","definition":"..."}]}`;

    const input = approvedAtoms.map(a => `[${a.type} / ${a.level||'all'}] (${a.fileName})\n${a.body}`).join('\n\n');

    const raw = await callClaude(system, [{role:'user', content: `Topic: ${topic.name}\n\nApproved atoms:\n${input}`}], 8000);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let parsed;
    try{ parsed = JSON.parse(cleaned); }
    catch(e){
      if(!cleaned.endsWith('}')) throw new Error(`"${topic.name}" was cut off before it finished generating.`);
      throw new Error(`"${topic.name}" came back in an unexpected format: ` + e.message);
    }
    parsed.watchSteps.forEach(s => s.imageId = null);
    parsed.watchVideo = null;
    const govFlags = runGovernanceChecks(parsed);
    return {
      id:'mod'+app.builtModules.length+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
      topicId: topic.id, topicName: topic.name, level, delivery, moduleData: parsed,
      govFlags, published: false, reviewedBy: ''
    };
  }

  async function buildFacilitatorKit(topic, level, delivery, approvedAtomsOverride, scratchTopicDesc){
    const isScratch = !!scratchTopicDesc;
    const approvedAtoms = approvedAtomsOverride || (topic && topic.groupIds ? app.atoms.filter(a => topic.groupIds.includes(a.groupId) && a.status === 'approved') : []);
    const levelInstruction = {
      foundational: 'The group is new to this — keep discussion/case material foundational, spell out context a facilitator would otherwise assume.',
      intermediate: 'The group has some experience — go light on fundamentals, focus discussion on applying judgment.',
      advanced: 'The group is experienced — focus entirely on edge cases and judgment calls; skip anything foundational.'
    }[level];
    const groundingLine = isScratch
      ? 'There is no source document — ground everything in well-established, general professional knowledge for this domain rather than inventing specific proprietary facts, figures, or policies that would need a real source to justify.'
      : 'Ground everything in the pre-vetted knowledge atoms provided.';
    const input = isScratch ? '' : approvedAtoms.map(a => `[${a.type} / ${a.level||'all'}] (${a.fileName})\n${a.body}`).join('\n\n');
    const topicLabel = isScratch ? scratchTopicDesc : (topic.name || topic);

    let system, shape;
    if(delivery === 'virtual'){
      system = `You are an instructional designer building a FACILITATOR KIT for a live, virtual instructor-led session — this is NOT a self-paced module; there is no learner-facing reading/quiz/practice-call app here, only materials a facilitator uses to run a live session. ${groundingLine}

  Writing style: assume many participants are working in English as a second or third language. Use short sentences, plain everyday words, and a conversational tone — not formal or bureaucratic phrasing.

  Level: ${level}. ${levelInstruction}

  Build:
  1. "overview": 2-3 sentences framing the session for the facilitator.
  2. "discussionGuide": 3-5 items, each {"prompt": a scenario-based question to pose to the group, "facilitatorNote": what to listen for or steer toward}.
  3. "jobAid": {"heading": short title, "points": 4-8 short, scannable reference lines a participant could keep open during a live call}.
  4. "breakoutPrompts": 2-3 items, each {"title", "instructions", "duration": e.g. "10 min"} — small-group activities using the same source material.
  Also "title".

  Respond with ONLY valid JSON, no markdown fences:
  {"title":"...","overview":"...","discussionGuide":[{"prompt":"...","facilitatorNote":"..."}],"jobAid":{"heading":"...","points":["...","..."]},"breakoutPrompts":[{"title":"...","instructions":"...","duration":"..."}]}`;
      shape = 'virtual';
    } else {
      system = `You are an instructional designer building a FACILITATOR KIT for an in-person classroom session — this is NOT a self-paced module; there is no learner-facing reading/quiz/practice-call app here, only materials a facilitator uses to run a classroom session. ${groundingLine}

  Writing style: assume many participants are working in English as a second or third language. Use short sentences, plain everyday words, and a conversational tone — not formal or bureaucratic phrasing.

  Level: ${level}. ${levelInstruction}

  Build:
  1. "overview": 2-3 sentences framing the session for the facilitator.
  2. "caseStudies": 1-3 items, each {"title", "scenario": a realistic case grounded in the atoms (use scenario-situation atoms, or synthesize from policy-rule decision branches), "questions": 2-4 discussion questions about the case}.
  3. "facilitatorGuide": {"objectives": 2-4 short session objectives, "flow": 3-6 items each {"step","duration":"e.g. 15 min","notes"}}.
  4. "peerCoachingRubric": 3-5 items, each {"criterion","whatGoodLooksLike"} — for participants to score each other's case-study responses.
  Also "title".

  Respond with ONLY valid JSON, no markdown fences:
  {"title":"...","overview":"...","caseStudies":[{"title":"...","scenario":"...","questions":["...","..."]}],"facilitatorGuide":{"objectives":["...","..."],"flow":[{"step":"...","duration":"...","notes":"..."}]},"peerCoachingRubric":[{"criterion":"...","whatGoodLooksLike":"..."}]}`;
      shape = 'classroom';
    }

    const userMsg = isScratch ? `Topic: ${topicLabel}` : `Topic: ${topicLabel}\n\nApproved atoms:\n${input}`;
    const raw = await callClaude(system, [{role:'user', content: userMsg}], 6000);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let parsed;
    try{ parsed = JSON.parse(cleaned); }
    catch(e){
      if(!cleaned.endsWith('}')) throw new Error(`"${topicLabel}" was cut off before it finished generating.`);
      throw new Error(`"${topicLabel}" came back in an unexpected format: ` + e.message);
    }
    const govFlags = runGovernanceChecksForKit(parsed);
    if(isScratch) govFlags.push('Built from scratch — no source atoms behind this content, verify facts before publishing');
    return {
      id:'mod'+app.builtModules.length+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
      topicId: (topic && topic.id) || 'scratch', topicName: parsed.title || topicLabel, level, delivery, kitType: shape,
      moduleData: null, kitData: parsed,
      govFlags, published:false, reviewedBy:''
    };
  }

  async function buildFromScratch(){
    app.generating = true; app.error = null; app.status = 'Drafting from scratch…'; render();
    const topicDesc = app.scratchTopic.trim();
    const level = audienceToLevel(app.taxonomy.audience);
    const delivery = deliveryLabelToKey(app.taxonomy.delivery);
    const t = app.taxonomy;

    const levelInstruction = {
      foundational: 'The learner is new — include full explanations, no assumed prior knowledge.',
      intermediate: 'The learner has some experience — a brief refresher is enough on fundamentals; focus on nuance.',
      advanced: 'The learner is experienced — assume fundamentals are known; focus on edge cases and judgment calls.'
    }[level];
    const deliveryInstruction = {
      'self-paced': 'Consumed alone, self-paced — reading sections should be complete, standalone explanations.',
      'virtual': 'Delivered in a live virtual session — frame reading as facilitator talking points, scenarios suitable for group discussion.',
      'classroom': 'Delivered in person — frame reading so a facilitator could teach from it directly, scenarios substantial enough for a case-study discussion.'
    }[delivery];

    const system = `You are an instructional designer authoring a self-paced learning module FROM SCRATCH — there is no source document, so ground everything in well-established, general professional knowledge for this domain rather than inventing specific proprietary facts, figures, or policies that would need a real source to justify. Where a real number or threshold would normally be needed (a specific policy limit, a specific tool name), describe the general principle instead and note in the body text that the specific figure should be confirmed against the client's own policy.

  Writing style: assume many readers are working in English as a second or third language. Use short sentences, plain everyday words, and a conversational tone — not formal or bureaucratic phrasing. If a technical or industry term is unavoidable, explain it briefly in the same sentence rather than assuming it's already understood.

  Topic: ${topicDesc}
  Audience: ${t.audience} (${level} level). ${levelInstruction}
  Delivery: ${t.delivery}. ${deliveryInstruction}
  Content theme: ${t.theme}
  Industry context: ${t.industry}

  Build:
  1. "hook": a short (2-4 sentence) realistic, specific-feeling scenario that opens the module — Gagné's "gain attention" step.
  2. "reading": 2-5 sections covering the topic, plain business language, depth per the level guidance.
  3. "watchSteps": 2-5 conceptual walkthrough steps (label + 1-3 sentence caption). No screenshots exist for from-scratch content, so describe the action in words only, and leave "sourceRef" as "General knowledge — no source document".
  4. "scenarios": 1-3 role-play personas plausible for this topic and industry. Each needs name, tag, picker, brief, opening, systemPrompt (hidden facts + behaviour rules), rubric (3-5 items with id+label), correctProcess.
  5. "quiz": 3-6 multiple choice questions grounded in the reading content above — specific, never generic filler.
  Also "title" and "objective":{"identify","learn","apply"}.

  Respond with ONLY valid JSON, no markdown fences, in exactly this shape:
  {"title":"...","objective":{"identify":"...","learn":"...","apply":"..."},"hook":"...","reading":[{"heading":"...","body":"..."}],"watchSteps":[{"label":"...","caption":"...","sourceRef":"..."}],"scenarios":[{"name":"...","tag":"...","picker":"...","brief":"...","opening":"...","systemPrompt":"...","rubric":[{"id":"...","label":"..."}],"correctProcess":"..."}],"quiz":[{"prompt":"...","options":["...","...","...","..."],"correct":0,"explanation":"..."}]}`;

    try{
      if(delivery !== 'self-paced'){
        const builtModule = await buildFacilitatorKit(null, level, delivery, [], topicDesc);
        app.builtModules.push(builtModule);
        app.generating = false;
        app.screen = 'build';
        render();
        return;
      }
      const raw = await callClaude(system, [{role:'user', content: `Generate the module for: ${topicDesc}`}], 8000);
      const cleaned = raw.replace(/```json|```/g, '').trim();
      let parsed;
      try{ parsed = JSON.parse(cleaned); }
      catch(e){
        if(!cleaned.endsWith('}')) throw new Error('The module was cut off before it finished generating. Try again.');
        throw new Error('Unexpected response format: ' + e.message);
      }
      parsed.watchSteps.forEach(s => s.imageId = null);
      parsed.watchVideo = null;
      const govFlags = runGovernanceChecks(parsed).concat(['Built from scratch — no source atoms behind this content, verify facts before publishing']);
      const builtModule = {
        id:'mod'+app.builtModules.length+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
        topicId:'scratch', topicName: parsed.title || topicDesc, level, delivery, moduleData: parsed,
        govFlags, published:false, reviewedBy:''
      };
      app.builtModules.push(builtModule);
      app.generating = false;
      app.screen = 'build';
    }catch(err){
      app.generating = false;
      app.error = "Couldn't generate — " + (err.message || 'check your connection and try again.');
    }
    render();
  }

  async function buildModuleFromTopic(){
    app.generating = true; app.error = null; render();
    const level = app.buildLevel;
    const delivery = app.buildDelivery;
    const selectedTopics = app.topics.filter(t => app.buildTopicIds.includes(t.id));
    const built = [];
    const failures = [];

    for(let i=0; i<selectedTopics.length; i++){
      const topic = selectedTopics[i];
      app.status = selectedTopics.length > 1
        ? `Building "${topic.name}" (${i+1} of ${selectedTopics.length})…`
        : `Drafting "${topic.name}" from approved atoms…`;
      render();
      try{
        const builtModule = delivery === 'self-paced'
          ? await buildOneModule(topic, level, delivery)
          : await buildFacilitatorKit(topic, level, delivery);
        app.builtModules.push(builtModule);
        built.push(builtModule);
      }catch(err){
        failures.push(`${topic.name}: ${err.message}`);
      }
    }

    app.generating = false;
    if(failures.length) app.error = "Some modules failed to build:\n" + failures.join('\n');

    // Always land on Build now, even for a single module — governance may need
    // a reviewer name before it can be opened/published.
    app.buildTopicIds = [];
    render();
  }

  function moveGroupToTopic(groupId, fromTopicId, targetTopicId){
    const fromTopic = app.topics.find(t => t.id === fromTopicId);
    if(fromTopic) fromTopic.groupIds = fromTopic.groupIds.filter(id => id !== groupId);

    if(targetTopicId === '__new__'){
      const group = app.groups.find(g => g.id === groupId);
      app.topics.push({ id:'topic_'+groupId, name: group ? group.topicLabel : 'New topic', groupIds:[groupId] });
    } else {
      const targetTopic = app.topics.find(t => t.id === targetTopicId);
      if(targetTopic) targetTopic.groupIds.push(groupId);
    }
    // Drop any topic left with no sub-topics at all, rather than showing an empty card.
    app.topics = app.topics.filter(t => t.groupIds.length > 0);
  }

  function openModuleInPlayer(builtModule){
    app.mode = 'player';
    app.playingPathIndex = null;
    if(builtModule.kitType){
      initKitPlayer(builtModule);
    } else {
      initPlayer(builtModule.moduleData, app.gallery);
    }
  }

  function initKitPlayer(builtModule){
    P = { isKit: true, kitType: builtModule.kitType, kit: builtModule.kitData, module: { title: builtModule.topicName } };
  }

  /* ============================================================
     PATH SCREEN — sequencing built modules into one learner journey
     ============================================================ */

  function pathName(p){
    return p.name || 'Untitled path';
  }

  function renderPath(){
    if(app.builtModules.length === 0){
      return `<div class="create-head"><div class="accent-strip" style="background:var(--bf-yellow);"></div><h1>Learning paths</h1><p>Build at least one module first, then sequence it here.</p></div>`;
    }
    const editing = app.paths.find(p => p.id === app.editingPathId);

    if(!editing){
      // List view — named path cards, like the Built modules list.
      return `
        <div class="create-head"><div class="accent-strip" style="background:var(--bf-yellow);"></div><h1>Learning paths</h1><p>Group built modules into a sequence a learner moves through, start to finish.</p></div>
        ${app.paths.length === 0 ? `<p class="status-line">No paths yet.</p>` : ''}
        ${app.paths.map(p => `
          <div class="build-pick" data-open-path="${p.id}">
            <div class="topic">${escAttr(pathName(p))}</div>
            <div class="meta">${p.moduleIds.length} module(s)${p.moduleIds.length ? ' — ' + p.moduleIds.map(id => { const m=app.builtModules.find(x=>x.id===id); return m ? escAttr(m.topicName) : ''; }).filter(Boolean).join(' → ') : ''}</div>
          </div>
        `).join('')}
        <div class="generate-row"><button class="btn-secondary" id="new-path-btn">+ Create new path</button></div>
      `;
    }

    // Editing/viewing one specific named path.
    return `
      <div class="create-head" style="text-align:left;">
        <div class="accent-strip" style="background:var(--bf-yellow);"></div>
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <h1 style="font-size:26px;">${escAttr(pathName(editing))}</h1>
          <div style="display:flex; gap:8px;">
            <button class="btn-secondary" id="rename-path-btn">Rename</button>
            <button class="btn-secondary" id="delete-path-btn">Delete</button>
            <button class="btn-secondary" data-jump-path-list="1">← All paths</button>
          </div>
        </div>
        <p>Order the modules a learner moves through. The player advances from one straight into the next.</p>
      </div>
      ${editing.moduleIds.length === 0 ? `<p class="status-line">Nothing in this path yet — add modules from the Build screen, or pick one below.</p>` : ''}
      ${editing.moduleIds.map((modId, i) => {
        const m = app.builtModules.find(x => x.id === modId);
        if(!m) return '';
        return `
          <div class="file-row">
            <div class="file-info">
              <div class="file-icon">${i+1}</div>
              <div class="file-meta"><div class="fname">${escAttr(m.topicName)}</div><div class="fstatus">${m.level}</div></div>
            </div>
            <div style="display:flex; gap:8px;">
              ${i>0 ? `<button class="btn-secondary" data-path-up="${i}">Up</button>` : ''}
              ${i<editing.moduleIds.length-1 ? `<button class="btn-secondary" data-path-down="${i}">Down</button>` : ''}
              <button class="btn-secondary" data-path-remove="${i}">Remove</button>
            </div>
          </div>
        `;
      }).join('')}
      <label style="display:block; font-size:11.5px; font-weight:700; color:var(--bf-soft); margin:16px 0 8px;">Add a built module to this path</label>
      <select id="add-existing-module" style="border:1px solid var(--bf-line); border-radius:8px; padding:9px 11px; font-size:13.5px; width:100%; margin-bottom:16px;">
        <option value="">Choose a module…</option>
        ${app.builtModules.filter(m => !editing.moduleIds.includes(m.id)).map(m => `<option value="${m.id}">${escAttr(m.topicName)} (${m.level})</option>`).join('')}
      </select>
      ${editing.moduleIds.length ? `<div class="generate-row"><button class="generate-btn" id="play-path-btn">Play this path ✦</button></div>` : ''}
    `;
  }

  function playPath(pathId){
    const p = app.paths.find(x => x.id === pathId);
    if(!p || p.moduleIds.length === 0) return;
    app.mode = 'player';
    app.playingPathId = pathId;
    app.playingPathIndex = 0;
    const m = app.builtModules.find(x => x.id === p.moduleIds[0]);
    initPlayer(m.moduleData, app.gallery);
  }

  function launchParticipant(participantId){
    const learner = app.participants.find(x => x.id === participantId);
    if(!learner || !learner.assignedPathId) return;
    const p = app.paths.find(x => x.id === learner.assignedPathId);
    if(!p || p.moduleIds.length === 0){
      app.error = "This learner's assigned path has no modules in it yet.";
      return;
    }
    app.playingParticipantName = learner.name;
    playPath(p.id);
  }

  function advancePath(){
    if(app.playingPathIndex === null || !app.playingPathId) return false;
    const p = app.paths.find(x => x.id === app.playingPathId);
    if(!p) return false;
    const next = app.playingPathIndex + 1;
    if(next >= p.moduleIds.length) return false;
    app.playingPathIndex = next;
    const m = app.builtModules.find(x => x.id === p.moduleIds[next]);
    initPlayer(m.moduleData, app.gallery);
    return true;
  }

  function addModuleToPath(moduleId){
    if(app.paths.length === 0){
      showPrompt('Name this learning path', 'New path', (name) => {
        if(!name) return;
        app.paths.push({ id:'path'+app.paths.length+'_'+Date.now(), name, moduleIds:[moduleId] });
        render();
      });
      return;
    }
    // With exactly one path, add straight to it — no ambiguity to ask about.
    // With several, send the user to the Path screen to choose explicitly rather
    // than guessing which one they meant.
    if(app.paths.length === 1){
      app.paths[0].moduleIds.push(moduleId);
      return;
    }
    app.navSection = 'create';
    app.screen = 'path';
    app.pendingPathAdd = moduleId;
  }

  function addModuleToCourse(moduleId){
    if(app.courses.length === 0){
      showPrompt('Name this course', 'New course', (name) => {
        if(!name) return;
        app.courses.push({ id:'course'+app.courses.length+'_'+Date.now(), name, moduleIds:[moduleId] });
        render();
      });
      return;
    }
    if(app.courses.length === 1){
      app.courses[0].moduleIds.push(moduleId);
      return;
    }
    // Several courses exist — hand off to Content Library rather than
    // building a full picker modal for this less-common case.
    app.navSection = 'contentLibrary';
    app.contentLibraryFilter = 'courses';
    app.error = 'Pick which course to add this module to from the list below (multi-course quick-add isn\u2019t built yet).';
  }

  /* ============================================================
     CONTENT LIBRARY — a persistent, non-pipeline home for finished work
     ============================================================ */

  function renderContentLibrary(){
    const view = app.contentLibraryFilter;
    return `
      <div class="create-head">
        <div class="accent-strip" style="background:var(--bf-pink);"></div>
        <h1>Content library</h1>
        <p>Every module, course, and path built so far, in one place — no need to walk back through the pipeline to find something you already made.</p>
      </div>
      <div class="lib-filters">
        <div class="lib-filter ${view==='modules'?'active':''}" data-cl-filter="modules">Modules (${app.builtModules.length})</div>
        <div class="lib-filter ${view==='courses'?'active':''}" data-cl-filter="courses">Courses (${app.courses.length})</div>
        <div class="lib-filter ${view==='paths'?'active':''}" data-cl-filter="paths">Paths (${app.paths.length})</div>
      </div>
      ${view === 'modules' ? (
        app.builtModules.length === 0 ? `<p class="status-line">Nothing built yet — head to Create → Build.</p>` :
        app.builtModules.map(m => `
          <div class="file-row">
            <div class="file-info">
              <div class="file-icon">${m.level.slice(0,4).toUpperCase()}</div>
              <div class="file-meta"><div class="fname">${escAttr(m.topicName)}</div><div class="fstatus">${m.level} \u00b7 <span class="badge-pill ${m.published?'badge-approved':'badge-review'}">${m.published?'published':'draft'}</span></div></div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-secondary" data-open-module="${m.id}">Open</button>
              <button class="btn-secondary" data-add-to-path="${m.id}" ${!m.published?'disabled title="Publish first"':''}>Add to path</button>
            </div>
          </div>
        `).join('')
      ) : view === 'courses' ? renderCourseSection() : (
        app.paths.length === 0 ? `<p class="status-line">No paths yet — head to Create → Path.</p>` :
        app.paths.map(p => `
          <div class="build-pick" data-open-path-cl="${p.id}">
            <div class="topic">${escAttr(pathName(p))}</div>
            <div class="meta">${p.moduleIds.length} module(s)</div>
          </div>
        `).join('')
      )}
    `;
  }

  function renderCourseSection(){
    const editing = app.courses.find(c => c.id === app.editingCourseId);

    if(!editing){
      return `
        ${app.courses.length === 0 ? `<p class="status-line">No courses yet.</p>` : app.courses.map(c => `
          <div class="build-pick" data-open-course="${c.id}">
            <div class="topic">${escAttr(c.name)}</div>
            <div class="meta">${c.moduleIds.length} module(s)${c.moduleIds.length ? ' \u2014 ' + c.moduleIds.map(id=>{const m=app.builtModules.find(x=>x.id===id); return m?escAttr(m.topicName):'';}).filter(Boolean).join(', ') : ''}</div>
          </div>
        `).join('')}
        <div class="generate-row"><button class="btn-secondary" id="new-course-btn">+ Create new course</button></div>
      `;
    }

    return `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <h2 style="font-size:20px;">${escAttr(editing.name)}</h2>
        <div style="display:flex; gap:8px;">
          <button class="btn-secondary" id="rename-course-btn">Rename</button>
          <button class="btn-secondary" id="delete-course-btn">Delete</button>
          <button class="btn-secondary" data-jump-course-list="1">\u2190 All courses</button>
        </div>
      </div>
      ${editing.moduleIds.length === 0 ? `<p class="status-line">Nothing in this course yet — add a published module below.</p>` : editing.moduleIds.map(id => {
        const m = app.builtModules.find(x => x.id === id);
        if(!m) return '';
        return `
          <div class="file-row">
            <div class="file-info">
              <div class="file-icon">${m.kitType ? 'KIT' : m.level.slice(0,4).toUpperCase()}</div>
              <div class="file-meta"><div class="fname">${escAttr(m.topicName)}</div><div class="fstatus">${m.kitType ? `Facilitator kit \u00b7 ${m.delivery}` : m.level}</div></div>
            </div>
            <button class="btn-secondary" data-course-remove-module="${id}">Remove</button>
          </div>
        `;
      }).join('')}
      <label style="display:block; font-size:11.5px; font-weight:700; color:var(--bf-soft); margin:16px 0 8px;">Add a published module to this course</label>
      <select id="add-existing-course-module" style="border:1px solid var(--bf-line); border-radius:8px; padding:9px 11px; font-size:13.5px; width:100%;">
        <option value="">Choose a module\u2026</option>
        ${app.builtModules.filter(m => m.published && !editing.moduleIds.includes(m.id)).map(m => `<option value="${m.id}">${escAttr(m.topicName)}</option>`).join('')}
      </select>
    `;
  }

  /* ============================================================
     PARTICIPANTS — mockup: profile a learner, suggest a path
     ============================================================ */

  function suggestedLevel(p){
    const eng = Number(p.english);
    if(isNaN(eng)) return 'foundational';
    if(eng < 60) return 'foundational';
    if(eng <= 80) return 'intermediate';
    return 'advanced';
  }

  function loadDemoData(){
    const kycModule = {
      title: 'KYC Verification',
      hook: 'A customer once lost access to a dormant account for months — not because anything was wrong, but because a routine KYC re-verification notice sat unopened, and nobody flagged it before the account was frozen. A two-minute check at the start of any call could have caught it.',
      objective: { identify:'why KYC verification matters', learn:'accepted proof-of-identity documents and the re-verification cycle', apply:'handling a customer\'s KYC update call' },
      reading: [
        { heading:'What KYC verification means', body:'KYC confirms who a customer is, where they live, and the nature of their financial activity — a regulatory requirement, not an optional courtesy.' },
        { heading:'Accepted proof of identity and address', body:'Passport, Aadhaar, Voter ID, Driving Licence, or an NREGA job card countersigned by a state official all count as Officially Valid Documents. A utility bill can stand in temporarily for address proof, but never as the primary identity document.' }
      ],
      watchSteps: [
        { label:'Check the KYC verification status', caption:'Before asking a customer to resubmit anything, open their account and check the Verification Status field.', imageId:null, sourceRef:'KYC Verification doc' }
      ],
      scenarios: [{
        name:'Rina Fernandes', tag:'KYC update query', picker:'Received an SMS about updating her KYC and isn\'t sure if it\'s genuine.',
        brief:'Rina Fernandes is calling after receiving an SMS asking her to update her KYC through a link. She wants to know if it\'s legitimate before doing anything.',
        opening:'Hi, I got a text saying I need to update my KYC through some link — is that actually from you?',
        systemPrompt:'You are roleplaying AS Rina Fernandes, a retail customer, calling about a KYC-update SMS she received. Hidden facts (reveal only if asked): she has not clicked the link; her actual KYC is not due for renewal for another year. Behaviour: cautious, doesn\'t want to be scammed, asks direct questions. Stay fully in character, 1-3 sentences per turn.',
        rubric:[{id:'warn_fraud', label:'Warns the customer that unsolicited KYC-update SMS links are a common fraud pattern'},{id:'no_link_request', label:'Never asks the customer to complete anything through an external link'}],
        correctProcess:'Confirm the bank never asks customers to update KYC through an unsolicited SMS link. Direct her to the official app or a branch, and check her actual KYC due date in the system.'
      }],
      quiz: [{ prompt:'Which of these is NOT an Officially Valid Document (OVD) for KYC?', options:['Passport','Aadhaar','A recent utility bill','Driving Licence'], correct:2, explanation:'A utility bill can temporarily support proof of address, but is not itself an OVD.' }]
    };
    const cardModule = {
      title: 'Card Payment Limits and Controls',
      hook: 'A customer once spent twenty minutes convinced his card was compromised, ready to block it and file a fraud report — the real issue was a routine international-usage setting that had simply never been switched on.',
      objective: { identify:'why every card carries transaction limits', learn:'how ATM, POS and online limits vary by account age and card type', apply:'explaining a declined transaction to a customer' },
      reading: [
        { heading:'Why every card has a cap', body:'Every debit card carries separate daily limits for ATM withdrawal, POS purchases, and online spending — containment in case a card is ever compromised.' },
        { heading:'New accounts start more conservative', body:'For the first six months after opening, ATM withdrawal is typically capped lower than the standard limit — a common reason for a decline that has nothing to do with a system error.' }
      ],
      watchSteps: [
        { label:'Check the account opening date', caption:'Before troubleshooting a decline, check how long the account has been open — new accounts carry lower default limits.', imageId:null, sourceRef:'Card Payment Limits doc' }
      ],
      scenarios: [{
        name:'Karan Bhatt', tag:'Declined transaction', picker:'His international online purchase was declined and he doesn\'t understand why.',
        brief:'Karan Bhatt is calling because his card was declined while shopping on an international website.',
        opening:'My card just got declined buying something from a US site, but there\'s plenty of balance — what\'s wrong?',
        systemPrompt:'You are roleplaying AS Karan Bhatt, a retail customer, calling about a declined international online transaction. Hidden facts (reveal only if asked): he has never enabled international or e-commerce usage on his card. Behaviour: a little frustrated, wants a clear answer. Stay fully in character, 1-3 sentences per turn.',
        rubric:[{id:'check_channel', label:'Checks whether international/e-commerce usage is enabled on the card before assuming a system fault'}],
        correctProcess:'Cards are domestic-only by default per RBI guidelines. Guide the customer to enable international/e-commerce use via net banking or the app.'
      }],
      quiz: [{ prompt:'By default, a debit card issued after October 2020 is enabled for:', options:['Domestic and international use','Domestic ATM and POS use only','Online use only','Nothing until a branch visit'], correct:1, explanation:'International and online/contactless use must be explicitly switched on by the customer.' }]
    };

    app.builtModules.push(
      { id:'demo_m1', topicId:'demo', topicName:kycModule.title, level:'foundational', moduleData:kycModule },
      { id:'demo_m2', topicId:'demo', topicName:cardModule.title, level:'foundational', moduleData:cardModule }
    );
    app.paths.push({ id:'demo_path1', name:'New Hire Foundations', moduleIds:['demo_m1','demo_m2'] });
    app.participants.push(
      { id:'demo_p1', name:'Arjun Mehta', english:52, systems:40, experience:0, assignedPathId:'demo_path1' },
      { id:'demo_p2', name:'Priya Sharma', english:72, systems:65, experience:1, assignedPathId:'demo_path1' },
      { id:'demo_p3', name:'Sunil Nair', english:88, systems:85, experience:4, assignedPathId:'demo_path1' }
    );

    const day = 24*60*60*1000;
    const now = Date.now();
    app.analytics.push(
      { participantName:'Arjun Mehta', moduleTitle:'KYC Verification', quizScore:0, quizTotal:1, attempts:3, escalated:true, acceptedBelowThreshold:false, timestamp:new Date(now-4*day).toISOString(), isDemo:true },
      { participantName:'Arjun Mehta', moduleTitle:'Card Payment Limits and Controls', quizScore:0, quizTotal:1, attempts:1, escalated:false, acceptedBelowThreshold:true, timestamp:new Date(now-3*day).toISOString(), isDemo:true },
      { participantName:'Priya Sharma', moduleTitle:'KYC Verification', quizScore:1, quizTotal:1, attempts:1, escalated:false, acceptedBelowThreshold:false, timestamp:new Date(now-3*day).toISOString(), isDemo:true },
      { participantName:'Priya Sharma', moduleTitle:'Card Payment Limits and Controls', quizScore:1, quizTotal:1, attempts:2, escalated:false, acceptedBelowThreshold:false, timestamp:new Date(now-2*day).toISOString(), isDemo:true },
      { participantName:'Sunil Nair', moduleTitle:'KYC Verification', quizScore:1, quizTotal:1, attempts:1, escalated:false, acceptedBelowThreshold:false, timestamp:new Date(now-1*day).toISOString(), isDemo:true },
      { participantName:'Sunil Nair', moduleTitle:'Card Payment Limits and Controls', quizScore:1, quizTotal:1, attempts:1, escalated:false, acceptedBelowThreshold:false, timestamp:new Date(now).toISOString(), isDemo:true }
    );
  }

  function clearDemoData(){
    app.participants = app.participants.filter(p => !p.id.startsWith('demo_'));
    app.paths = app.paths.filter(p => p.id !== 'demo_path1');
    app.builtModules = app.builtModules.filter(m => !m.id.startsWith('demo_'));
    app.analytics = app.analytics.filter(a => !a.isDemo);
  }

  function renderParticipants(){
    return `
      <div class="create-head">
        <div class="accent-strip" style="background:var(--bf-green);"></div>
        <h1>Learners</h1>
        <p>Upload assessment scores, or add someone by hand — see their suggested starting level and assign the path that fits.</p>
      </div>
      ${app.error ? `<div class="error-banner">${app.error}</div>` : ''}
      <div class="item-card">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <span class="small-upload" id="participants-upload-trigger">+ Upload assessment scores (CSV/XLSX)</span>
          <input type="file" id="participants-upload-input" accept=".csv,.xlsx" style="display:none;">
          <div style="display:flex; gap:10px;">
            <button class="btn-secondary" id="add-participant-btn">+ Add one manually</button>
            ${app.participants.some(p=>p.id.startsWith('demo_')) ? `<button class="btn-secondary" id="clear-demo-btn">Clear demo data</button>` : `<button class="btn-secondary" id="load-demo-btn">Load pitch demo</button>`}
          </div>
        </div>
      </div>
      ${app.participants.length === 0 ? `<p class="status-line">No learners yet.</p>` : app.participants.map(p => {
        const suggested = suggestedLevel(p);
        const matchingPaths = app.paths; // mockup: any saved path is offered — a real build would filter by topic relevance too
        return `
        <div class="review-card" style="border-left-color:var(--bf-green);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
            <div>
              <div style="font-weight:700; font-size:15px; margin-bottom:6px;">${escAttr(p.name)}</div>
              <div class="review-reasons">
                <span class="reason-chip">English: ${escAttr(String(p.english ?? '—'))}</span>
                <span class="reason-chip">Systems: ${escAttr(String(p.systems ?? '—'))}</span>
                <span class="reason-chip">Experience: ${escAttr(String(p.experience ?? '—'))} yr</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px; color:var(--bf-soft); text-transform:uppercase; font-weight:700; margin-bottom:4px;">Suggested level</div>
              <span class="badge-pill ${suggested==='advanced'?'badge-approved':(suggested==='foundational'?'badge-review':'badge-single')}">${suggested}</span>
            </div>
          </div>
          <label style="display:block; font-size:11.5px; font-weight:700; color:var(--bf-soft); margin:14px 0 6px;">Assign a path</label>
          <select data-assign-path="${p.id}" style="border:1px solid var(--bf-line); border-radius:8px; padding:8px 10px; font-size:13px; width:100%;">
            <option value="">Choose…</option>
            ${matchingPaths.map(path => `<option value="${path.id}" ${p.assignedPathId===path.id?'selected':''}>${escAttr(pathName(path))}${suggestedLevel(p)&&path.moduleIds.some(id=>{const m=app.builtModules.find(x=>x.id===id);return m&&m.level===suggested;})?' — matches suggested level':''}</option>`).join('')}
          </select>
          ${p.assignedPathId ? `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:8px;">
              <p class="status-line" style="text-align:left; margin:0;">Assigned to "${escAttr(pathName(app.paths.find(x=>x.id===p.assignedPathId)||{}))}".</p>
              <button class="btn-primary" data-launch-participant="${p.id}">Launch as ${escAttr(p.name.split(' ')[0])} →</button>
            </div>
          ` : ''}
        </div>
      `;}).join('')}
    `;
  }

  /* ============================================================
     HANDLERS
     ============================================================ */

  function attachHandlers(){
    if(app.modal){
      const overlay = document.getElementById('modal-overlay');
      const firstField = document.querySelector('[data-modal-field]');
      if(firstField) firstField.focus();
      const cancel = document.getElementById('modal-cancel');
      if(cancel) cancel.addEventListener('click', closeModal);
      if(overlay) overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(); });
      const confirmBtn = document.getElementById('modal-confirm');
      if(confirmBtn) confirmBtn.addEventListener('click', () => {
        const modal = app.modal;
        let result;
        if(modal.type === 'confirm'){
          result = true;
        } else {
          result = {};
          modal.fields.forEach(f => { const el = document.querySelector(`[data-modal-field="${f.key}"]`); result[f.key] = el ? el.value : ''; });
        }
        app.modal = null;
        modal.onConfirm(result);
      });
      document.querySelectorAll('[data-modal-field]').forEach(el => {
        el.addEventListener('keydown', (e) => { if(e.key === 'Enter') document.getElementById('modal-confirm').click(); });
      });
    }

    document.querySelectorAll('[data-jump]').forEach(el => {
      el.addEventListener('click', () => { app.navSection='create'; app.screen = el.dataset.jump; render(); });
    });
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => { app.navSection = el.dataset.nav; render(); });
    });

    const appHome = document.querySelector('[data-app-home]');
    if(appHome) appHome.addEventListener('click', () => opts.onHome());
    const appLogout = document.querySelector('[data-app-logout]');
    if(appLogout) appLogout.addEventListener('click', () => opts.onLogout());

    document.querySelectorAll('[data-taxonomy-key]').forEach(el => {
      el.addEventListener('change', () => {
        if(el.dataset.taxonomyKey === 'planType') app.planType = el.value;
        else app.taxonomy[el.dataset.taxonomyKey] = el.value;
        render();
      });
    });
    document.querySelectorAll('[data-pick-mode]').forEach(el => {
      el.addEventListener('click', () => { app.createMode = el.dataset.pickMode; render(); });
    });
    const scratchTopic = document.getElementById('scratch-topic');
    if(scratchTopic) scratchTopic.addEventListener('input', () => {
      app.scratchTopic = scratchTopic.value;
      const btn = document.getElementById('generate-scratch-btn');
      if(btn) btn.disabled = !(app.scratchTopic.trim() && !app.generating);
    });
    const generateScratchBtn = document.getElementById('generate-scratch-btn');
    if(generateScratchBtn) generateScratchBtn.addEventListener('click', buildFromScratch);

    const planTopic = document.getElementById('plan-topic');
    if(planTopic) planTopic.addEventListener('input', () => {
      app.planTopic = planTopic.value;
      const btn = document.getElementById('generate-plan-btn');
      if(btn) btn.disabled = !(app.planTopic.trim() && !app.planGenerating);
    });
    const generatePlanBtn = document.getElementById('generate-plan-btn');
    if(generatePlanBtn) generatePlanBtn.addEventListener('click', buildPlanDocument);
    document.querySelectorAll('[data-open-plan]').forEach(el => {
      el.addEventListener('click', () => {
        const p = app.plans.find(x=>x.id===el.dataset.openPlan);
        if(p) openPlanInPlayer(p);
        render();
      });
    });

    const dz = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    if(dz) dz.addEventListener('click', () => fileInput.click());
    if(fileInput) fileInput.addEventListener('change', (e) => { if(e.target.files.length) handleFiles(e.target.files); fileInput.value=''; });
    if(dz){
      dz.addEventListener('dragover', (e) => e.preventDefault());
      dz.addEventListener('drop', (e) => { e.preventDefault(); if(e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
    }
    document.querySelectorAll('[data-remove-file]').forEach(el => {
      el.addEventListener('click', () => { app.files = app.files.filter(f => f.id !== el.dataset.removeFile); render(); });
    });
    const classifyBtn = document.getElementById('classify-btn');
    if(classifyBtn) classifyBtn.addEventListener('click', runClassification);

    const revApprove = document.getElementById('rev-approve');
    if(revApprove) revApprove.addEventListener('click', () => {
      const queue = app.atoms.filter(a => a.status === 'needs_review');
      const a = queue[Math.min(app.reviewIndex, queue.length-1)];
      a.topicLabel = document.getElementById('rev-topic').value;
      a.body = document.getElementById('rev-body').value;
      a.status = 'approved';
      render();
    });
    const revReject = document.getElementById('rev-reject');
    if(revReject) revReject.addEventListener('click', () => {
      const queue = app.atoms.filter(a => a.status === 'needs_review');
      const a = queue[Math.min(app.reviewIndex, queue.length-1)];
      a.status = 'rejected';
      render();
    });
    const revPrev = document.getElementById('rev-prev');
    if(revPrev) revPrev.addEventListener('click', () => { app.reviewIndex = Math.max(0, app.reviewIndex-1); render(); });

    document.querySelectorAll('[data-filter]').forEach(el => {
      el.addEventListener('click', () => { app.libFilter = el.dataset.filter; render(); });
    });
    document.querySelectorAll('[data-toggle-group]').forEach(el => {
      el.addEventListener('click', () => { app.expandedGroup = (app.expandedGroup === el.dataset.toggleGroup) ? null : el.dataset.toggleGroup; render(); });
    });

    const clusterBtn = document.getElementById('cluster-btn');
    if(clusterBtn) clusterBtn.addEventListener('click', clusterTopics);
    const reclusterBtn = document.getElementById('recluster-btn');
    if(reclusterBtn) reclusterBtn.addEventListener('click', clusterTopics);

    document.querySelectorAll('[data-select-topic]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.dataset.selectTopic;
        if(app.buildTopicIds.includes(id)) app.buildTopicIds = app.buildTopicIds.filter(x=>x!==id);
        else app.buildTopicIds.push(id);
        render();
      });
    });
    document.querySelectorAll('[data-expand-topic]').forEach(el => {
      el.addEventListener('click', () => { app.expandedTopic = (app.expandedTopic === el.dataset.expandTopic) ? null : el.dataset.expandTopic; render(); });
    });
    document.querySelectorAll('[data-move-group]').forEach(el => {
      el.addEventListener('change', () => {
        if(!el.value) return;
        moveGroupToTopic(el.dataset.moveGroup, el.dataset.fromTopic, el.value);
        render();
      });
    });
    document.querySelectorAll('[data-pick-level]').forEach(el => {
      el.addEventListener('click', () => { app.buildLevel = el.dataset.pickLevel; render(); });
    });
    document.querySelectorAll('[data-pick-delivery]').forEach(el => {
      el.addEventListener('click', () => { app.buildDelivery = el.dataset.pickDelivery; render(); });
    });
    const buildBtn = document.getElementById('build-btn');
    if(buildBtn) buildBtn.addEventListener('click', buildModuleFromTopic);

    document.querySelectorAll('[data-open-module]').forEach(el => {
      el.addEventListener('click', () => { const m = app.builtModules.find(x=>x.id===el.dataset.openModule); if(m) openModuleInPlayer(m); render(); });
    });
    document.querySelectorAll('[data-add-to-path]').forEach(el => {
      el.addEventListener('click', () => { if(el.disabled) return; addModuleToPath(el.dataset.addToPath); render(); });
    });
    document.querySelectorAll('[data-add-to-course]').forEach(el => {
      el.addEventListener('click', () => { if(el.disabled) return; addModuleToCourse(el.dataset.addToCourse); render(); });
    });
    document.querySelectorAll('[data-reviewer-name]').forEach(el => {
      el.addEventListener('input', () => {
        const m = app.builtModules.find(x=>x.id===el.dataset.reviewerName);
        if(m){ m.reviewedBy = el.value; const btn = document.querySelector(`[data-publish-module="${m.id}"]`); if(btn) btn.disabled = !el.value.trim(); }
      });
    });
    document.querySelectorAll('[data-publish-module]').forEach(el => {
      el.addEventListener('click', () => {
        const m = app.builtModules.find(x=>x.id===el.dataset.publishModule);
        if(m && m.reviewedBy && m.reviewedBy.trim()) m.published = true;
        render();
      });
    });

    const newPathBtn = document.getElementById('new-path-btn');
    if(newPathBtn) newPathBtn.addEventListener('click', () => {
      showPrompt('Name this learning path', 'New path', (name) => {
        if(!name) return;
        const p = { id:'path'+app.paths.length+'_'+Date.now(), name, moduleIds:[] };
        app.paths.push(p);
        app.editingPathId = p.id;
        render();
      });
    });
    document.querySelectorAll('[data-open-path]').forEach(el => {
      el.addEventListener('click', () => {
        app.editingPathId = el.dataset.openPath;
        if(app.pendingPathAdd){
          const p = app.paths.find(x=>x.id===app.editingPathId);
          if(p && !p.moduleIds.includes(app.pendingPathAdd)) p.moduleIds.push(app.pendingPathAdd);
          app.pendingPathAdd = null;
        }
        render();
      });
    });
    const jumpPathList = document.querySelector('[data-jump-path-list]');
    if(jumpPathList) jumpPathList.addEventListener('click', () => { app.editingPathId = null; render(); });
    const renamePathBtn = document.getElementById('rename-path-btn');
    if(renamePathBtn) renamePathBtn.addEventListener('click', () => {
      const p = app.paths.find(x=>x.id===app.editingPathId);
      if(!p) return;
      showPrompt('Rename this path', p.name, (name) => { if(name) p.name = name; render(); });
    });
    const deletePathBtn = document.getElementById('delete-path-btn');
    if(deletePathBtn) deletePathBtn.addEventListener('click', () => {
      showConfirm('Delete this path?', 'The modules inside it stay in Build — only the sequence is removed.', () => {
        app.paths = app.paths.filter(x=>x.id!==app.editingPathId);
        app.editingPathId = null;
        render();
      });
    });
    const addExistingModule = document.getElementById('add-existing-module');
    if(addExistingModule) addExistingModule.addEventListener('change', () => {
      if(!addExistingModule.value) return;
      const p = app.paths.find(x=>x.id===app.editingPathId);
      if(p) p.moduleIds.push(addExistingModule.value);
      render();
    });

    document.querySelectorAll('[data-path-up]').forEach(el => {
      el.addEventListener('click', () => {
        const p = app.paths.find(x=>x.id===app.editingPathId);
        const i=parseInt(el.dataset.pathUp,10); [p.moduleIds[i-1],p.moduleIds[i]]=[p.moduleIds[i],p.moduleIds[i-1]]; render();
      });
    });
    document.querySelectorAll('[data-path-down]').forEach(el => {
      el.addEventListener('click', () => {
        const p = app.paths.find(x=>x.id===app.editingPathId);
        const i=parseInt(el.dataset.pathDown,10); [p.moduleIds[i+1],p.moduleIds[i]]=[p.moduleIds[i],p.moduleIds[i+1]]; render();
      });
    });
    document.querySelectorAll('[data-path-remove]').forEach(el => {
      el.addEventListener('click', () => {
        const p = app.paths.find(x=>x.id===app.editingPathId);
        p.moduleIds.splice(parseInt(el.dataset.pathRemove,10),1); render();
      });
    });
    const playPathBtn = document.getElementById('play-path-btn');
    if(playPathBtn) playPathBtn.addEventListener('click', () => { playPath(app.editingPathId); render(); });

    // Content Library
    document.querySelectorAll('[data-cl-filter]').forEach(el => {
      el.addEventListener('click', () => { app.contentLibraryFilter = el.dataset.clFilter; render(); });
    });
    document.querySelectorAll('[data-open-path-cl]').forEach(el => {
      el.addEventListener('click', () => { app.navSection='create'; app.screen='path'; app.editingPathId = el.dataset.openPathCl; render(); });
    });

    document.querySelectorAll('[data-open-course]').forEach(el => {
      el.addEventListener('click', () => { app.editingCourseId = el.dataset.openCourse; render(); });
    });
    const jumpCourseList = document.querySelector('[data-jump-course-list]');
    if(jumpCourseList) jumpCourseList.addEventListener('click', () => { app.editingCourseId = null; render(); });
    const newCourseBtn = document.getElementById('new-course-btn');
    if(newCourseBtn) newCourseBtn.addEventListener('click', () => {
      showPrompt('Name this course', 'New course', (name) => {
        if(!name) return;
        const c = { id:'course'+app.courses.length+'_'+Date.now(), name, moduleIds:[] };
        app.courses.push(c);
        app.editingCourseId = c.id;
        render();
      });
    });
    const renameCourseBtn = document.getElementById('rename-course-btn');
    if(renameCourseBtn) renameCourseBtn.addEventListener('click', () => {
      const c = app.courses.find(x=>x.id===app.editingCourseId);
      if(!c) return;
      showPrompt('Rename this course', c.name, (name) => { if(name) c.name = name; render(); });
    });
    const deleteCourseBtn = document.getElementById('delete-course-btn');
    if(deleteCourseBtn) deleteCourseBtn.addEventListener('click', () => {
      showConfirm('Delete this course?', 'The modules inside it stay in Build — only the grouping is removed.', () => {
        app.courses = app.courses.filter(x=>x.id!==app.editingCourseId);
        app.editingCourseId = null;
        render();
      });
    });
    document.querySelectorAll('[data-course-remove-module]').forEach(el => {
      el.addEventListener('click', () => {
        const c = app.courses.find(x=>x.id===app.editingCourseId);
        if(c) c.moduleIds = c.moduleIds.filter(id => id !== el.dataset.courseRemoveModule);
        render();
      });
    });
    const addExistingCourseModule = document.getElementById('add-existing-course-module');
    if(addExistingCourseModule) addExistingCourseModule.addEventListener('change', () => {
      if(!addExistingCourseModule.value) return;
      const c = app.courses.find(x=>x.id===app.editingCourseId);
      if(c) c.moduleIds.push(addExistingCourseModule.value);
      render();
    });

    // Participants (mockup)
    const partUploadTrigger = document.getElementById('participants-upload-trigger');
    const partUploadInput = document.getElementById('participants-upload-input');
    if(partUploadTrigger) partUploadTrigger.addEventListener('click', () => partUploadInput.click());
    if(partUploadInput) partUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      try{
        await ensureParsers();
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type:'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        rows.forEach(row => {
          const name = row.Name || row.name || row.NAME;
          if(!name) return;
          app.participants.push({
            id: 'p'+app.participants.length+'_'+Date.now(),
            name,
            english: row['English score'] ?? row.English ?? row.english ?? '',
            systems: row['Systems score'] ?? row.Systems ?? row.systems ?? '',
            experience: row['Experience years'] ?? row.Experience ?? row.experience ?? '',
            assignedPathId: null
          });
        });
        app.error = null;
      }catch(err){
        app.error = "Couldn't read that file — expected a CSV or XLSX with a Name column.";
      }
      render();
    });
    const addParticipantBtn = document.getElementById('add-participant-btn');
    if(addParticipantBtn) addParticipantBtn.addEventListener('click', () => {
      showForm('Add a learner', [
        { key:'name', label:'Learner name', defaultValue:'' },
        { key:'english', label:'English proficiency score (0-100)', defaultValue:'70' },
        { key:'systems', label:'Systems proficiency score (0-100)', defaultValue:'70' },
        { key:'experience', label:'Contact-center experience (years)', defaultValue:'0' }
      ], (vals) => {
        if(!vals.name) return;
        app.participants.push({ id:'p'+app.participants.length+'_'+Date.now(), name:vals.name, english:vals.english, systems:vals.systems, experience:vals.experience, assignedPathId:null });
        render();
      });
    });
    const loadDemoBtn = document.getElementById('load-demo-btn');
    if(loadDemoBtn) loadDemoBtn.addEventListener('click', () => { loadDemoData(); render(); });
    const clearDemoBtn = document.getElementById('clear-demo-btn');
    if(clearDemoBtn) clearDemoBtn.addEventListener('click', () => { clearDemoData(); render(); });
    document.querySelectorAll('[data-assign-path]').forEach(el => {
      el.addEventListener('change', () => {
        const p = app.participants.find(x=>x.id===el.dataset.assignPath);
        if(p) p.assignedPathId = el.value || null;
        render();
      });
    });
    document.querySelectorAll('[data-launch-participant]').forEach(el => {
      el.addEventListener('click', () => { launchParticipant(el.dataset.launchParticipant); render(); });
    });
  }

  function escHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

  // Model calls go through the Breakfree backend (/api/ai-trainer/complete), which
  // holds the provider key — the browser never sees one.
  async function callClaude(system, messages, maxTokens){
    return opts.complete(system, messages, maxTokens || 1000);
  }

  /* ============================================================
     LEARNER PLAYER (data-driven version of the module built earlier)
     ============================================================ */

  let P = null; // player state

  function initPlayer(moduleData, gallery){
    const scenarios = {};
    moduleData.scenarios.forEach((s,i) => { scenarios['s'+i] = Object.assign({key:'s'+i}, s); });
    P = {
      module: moduleData,
      scenarios: scenarios,
      gallery: gallery,
      section: 'overview',
      completed: { read:false, watch:false, practice:false, quiz:false },
      read: { mode:'read', isSpeaking:false, flippedCards:{} },
      watch: { index:0, isSpeaking:false },
      practice: { screen:'select', scenario:null, messages:[], transcript:[], isListening:false, isSpeaking:false, isThinking:false, error:null, debrief:null },
      quiz: { index:0, answers:{}, revealed:{}, score:0, attempts:1, mode:'quiz' }
    };
  }

  function imgFor(id){
    const g = P.gallery.find(x => x.id === id);
    return g ? g.dataUrl : '';
  }

  const P_SECTIONS = [
    { key:'read', label:'Read', bloom:'Remember & Understand' },
    { key:'watch', label:'Watch', bloom:'Apply' },
    { key:'practice', label:'Practice', bloom:'Analyze & Evaluate' },
    { key:'quiz', label:'Check', bloom:'Confirms retention' }
  ];

  function renderPlayer(){
    const root = document.getElementById('player-root');
    const topbar = `
      <div class="player-topbar">
        <a href="#" id="exit-to-platform-top">\u2190 Exit to platform</a>
        <span class="player-topbar-title">${app.playingParticipantName ? `Viewing as ${escHtml(app.playingParticipantName)} \u00b7 ` : ''}${escHtml(P.module.title || '')}</span>
      </div>
    `;

    if(P.isKit){
      root.innerHTML = topbar + pFacilitatorKit();
      attachPlayerHandlers();
      scheduleSave();
      return;
    }

    let body = '';
    if(P.section === 'overview') body = pOverview();
    else if(P.section === 'read') body = pRead();
    else if(P.section === 'watch') body = pWatch();
    else if(P.section === 'practice') body = pPractice();
    else if(P.section === 'quiz') body = pQuiz();
    else if(P.section === 'complete') body = pComplete();

    root.innerHTML = topbar + (P.section === 'overview' ? '' : pStepper()) + body;
    attachPlayerHandlers();
    scheduleSave();
    const t = document.getElementById('transcript');
    if(t) t.scrollTop = t.scrollHeight;
  }

  function pStepper(){
    return `<div class="stepper">
      ${P_SECTIONS.map((s,i) => {
        const isDone = P.completed[s.key];
        const isActive = P.section === s.key;
        const isUnlocked = i === 0 || P.completed[P_SECTIONS[i-1].key];
        const cls = [isDone && 'done', isActive && 'active', (isUnlocked && !isActive) && 'unlocked'].filter(Boolean).join(' ');
        return `<div class="step-pill ${cls}" data-p-section="${isUnlocked ? s.key : ''}">${s.label}<span class="step-bloom">${s.bloom}</span></div>`;
      }).join('')}
    </div>`;
  }

  function pFacilitatorKit(){
    const k = P.kit;
    const labels = {
      virtual: 'Facilitator Kit \u2014 Virtual Instructor-Led',
      classroom: 'Facilitator Kit \u2014 In-Person Classroom',
      contentOutline: 'Content Outline',
      proposal: 'Proposal',
      feedbackTemplate: 'Feedback Template'
    };
    const label = labels[P.kitType] || 'Document';
    let sections = '';

    if(P.kitType === 'virtual'){
      sections += `
        <div class="overview-body">
          <h2>Discussion guide</h2>
          ${(k.discussionGuide||[]).map(d => `
            <div class="reference" style="margin-bottom:12px;">
              <strong>${d.prompt}</strong>
              <div class="subtle" style="margin-top:6px;">Facilitator note: ${d.facilitatorNote}</div>
            </div>
          `).join('')}
        </div>
        <div class="overview-body">
          <h2>${k.jobAid ? k.jobAid.heading : 'Job aid'}</h2>
          <ul style="padding-left:20px; margin:0;">
            ${(k.jobAid && k.jobAid.points || []).map(p => `<li style="margin-bottom:8px;">${p}</li>`).join('')}
          </ul>
        </div>
        <div class="overview-body">
          <h2>Breakout prompts</h2>
          ${(k.breakoutPrompts||[]).map(b => `
            <div class="reference" style="margin-bottom:12px;">
              <strong>${b.title}</strong> <span class="badge-pill badge-single">${b.duration}</span>
              <div style="margin-top:6px;">${b.instructions}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if(P.kitType === 'classroom'){
      sections += `
        <div class="overview-body">
          <h2>Case studies</h2>
          ${(k.caseStudies||[]).map(c => `
            <div class="reference" style="margin-bottom:12px;">
              <strong>${c.title}</strong>
              <div style="margin-top:6px;">${c.scenario}</div>
              <ul style="padding-left:20px; margin:8px 0 0;">${(c.questions||[]).map(q=>`<li style="margin-bottom:4px;">${q}</li>`).join('')}</ul>
            </div>
          `).join('')}
        </div>
        <div class="overview-body">
          <h2>Facilitator guide</h2>
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--ink-soft); margin-bottom:6px;">Objectives</div>
          <ul style="padding-left:20px; margin:0 0 16px;">${(k.facilitatorGuide && k.facilitatorGuide.objectives || []).map(o=>`<li style="margin-bottom:4px;">${o}</li>`).join('')}</ul>
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--ink-soft); margin-bottom:6px;">Session flow</div>
          ${(k.facilitatorGuide && k.facilitatorGuide.flow || []).map(f => `
            <div class="reference" style="margin-bottom:8px;"><strong>${f.step}</strong> <span class="badge-pill badge-single">${f.duration}</span><div style="margin-top:4px;">${f.notes}</div></div>
          `).join('')}
        </div>
        <div class="overview-body">
          <h2>Peer-coaching rubric</h2>
          ${(k.peerCoachingRubric||[]).map(r => `
            <div class="reference" style="margin-bottom:10px;"><strong>${r.criterion}</strong><div style="margin-top:4px;">${r.whatGoodLooksLike}</div></div>
          `).join('')}
        </div>
      `;
    } else if(P.kitType === 'contentOutline'){
      sections += `
        <div class="overview-body">
          <h2>Sections</h2>
          ${(k.sections||[]).map((s,i) => `
            <div class="reference" style="margin-bottom:12px;">
              <strong>${i+1}. ${s.title}</strong> <span class="badge-pill badge-single">${s.estimatedDuration}</span>
              <ul style="padding-left:20px; margin:8px 0 0;">${(s.subtopics||[]).map(t=>`<li style="margin-bottom:4px;">${t}</li>`).join('')}</ul>
            </div>
          `).join('')}
        </div>
      `;
    } else if(P.kitType === 'proposal'){
      sections += `
        <div class="overview-body">
          <h2>Objective</h2>
          <p>${k.objective||''}</p>
          <h2>Approach</h2>
          <p>${k.approach||''}</p>
        </div>
        <div class="overview-body">
          <h2>Scope</h2>
          <ul style="padding-left:20px; margin:0 0 16px;">${(k.scope||[]).map(s=>`<li style="margin-bottom:4px;">${s}</li>`).join('')}</ul>
          <h2>Timeline</h2>
          ${(k.timeline||[]).map(t => `<div class="reference" style="margin-bottom:8px;"><strong>${t.phase}</strong> <span class="badge-pill badge-single">${t.duration}</span></div>`).join('')}
        </div>
        <div class="overview-body">
          <h2>Deliverables</h2>
          <ul style="padding-left:20px; margin:0;">${(k.deliverables||[]).map(d=>`<li style="margin-bottom:4px;">${d}</li>`).join('')}</ul>
        </div>
      `;
    } else if(P.kitType === 'feedbackTemplate'){
      sections += `
        <div class="overview-body">
          <h2>Criteria</h2>
          ${(k.criteria||[]).map(c => `
            <div class="reference" style="margin-bottom:12px;">
              <strong>${c.name}</strong> <span class="badge-pill badge-single">${c.ratingScale}</span>
              <div style="margin-top:6px;">${c.description}</div>
            </div>
          `).join('')}
        </div>
        <div class="overview-body">
          <h2>Open questions</h2>
          <ul style="padding-left:20px; margin:0;">${(k.openQuestions||[]).map(q=>`<li style="margin-bottom:8px;">${q}</li>`).join('')}</ul>
        </div>
      `;
    }

    return `
      <div class="hero-band">
        <div class="hero-eyebrow">${label.toUpperCase()}</div>
        <h1 class="hero-title">${k.title}</h1>
        <p class="hero-sub">${k.overview}</p>
        <div class="hero-rule"></div>
      </div>
      <div style="text-align:right; margin-bottom:16px;"><button class="btn secondary" id="kit-print">\ud83d\uddb6 Print / Save as PDF</button></div>
      ${sections}
    `;
  }

  function pOverview(){
    const m = P.module;
    const why = m.hook || "This module covers real decisions you'll face on the floor — not just facts to memorize.";
    const firstName = app.playingParticipantName ? escHtml(app.playingParticipantName.split(' ')[0]) : null;
    return `
      <div class="hero-band">
        <div class="hero-eyebrow">${firstName ? `WELCOME, ${firstName.toUpperCase()}` : 'LEARNING MODULE'}</div>
        <h1 class="hero-title">${m.title}</h1>
        <p class="hero-sub">${firstName ? `This module was assigned to you as part of your learning path. ` : ''}Structured to climb Bloom's Taxonomy \u2014 from understanding, to application, to judgment under real conditions \u2014 not just a document with a quiz bolted on.</p>
        <div class="hero-rule"></div>
      </div>
      <div class="overview-body">
        <h2>Why this matters</h2>
        <p style="margin:0;">${why}</p>
        <h2>What you'll practice</h2>
        <ol>
          <li><strong>Identify</strong> \u2014 ${m.objective.identify}</li>
          <li><strong>Learn</strong> \u2014 ${m.objective.learn}</li>
          <li><strong>Apply</strong> \u2014 ${m.objective.apply}</li>
        </ol>
        <p class="subtle" style="margin:0;">You'll practice this directly in a live call simulation later in the module.</p>
      </div>
      <button class="btn" id="begin-btn">Begin the module</button>
    `;
  }

  function getFlashcards(m){
    if(m.flashcards && m.flashcards.length) return m.flashcards;
    // Older modules built before flashcards existed in the schema — derive simple
    // ones from the reading sections already there, so this works immediately
    // without regenerating anything.
    return (m.reading||[]).map(r => ({ term: r.heading, definition: r.body.split(/(?<=[.!?])\s+/)[0] }));
  }

  function getKeyPoint(r){
    if(r.keyPoint) return r.keyPoint;
    // Older modules built before keyPoint existed — fall back to the section's
    // last sentence, which tends to carry the concluding/consequence line rather
    // than the opening framing (which Skim already surfaces via the first sentence).
    const sentences = r.body.split(/(?<=[.!?])\s+/).filter(Boolean);
    return sentences[sentences.length - 1] || r.body;
  }

  function readSectionHtml(r){
    return `
      <div class="read-section">
        <h2>${r.heading}</h2>
        <p>${r.body}</p>
        <div class="key-callout">
          <span class="key-callout-icon">★</span>
          <span>${getKeyPoint(r)}</span>
        </div>
      </div>
    `;
  }

  function pRead(){
    const m = P.module;
    const mode = P.read.mode;
    const skimBullets = m.reading.map(r => `${r.heading} — ${r.body.split(/(?<=[.!?])\s+/)[0]}`);
    const flashcards = getFlashcards(m);
    return `
      <div class="card">
        <div class="format-switch">
          <button class="fmt-btn ${mode==='read'?'active':''}" data-read-mode="read">Read</button>
          <button class="fmt-btn ${mode==='listen'?'active':''}" data-read-mode="listen">Listen</button>
          <button class="fmt-btn ${mode==='skim'?'active':''}" data-read-mode="skim">Skim</button>
          <button class="fmt-btn ${mode==='flashcards'?'active':''}" data-read-mode="flashcards">Flashcards</button>
        </div>
        ${m.hook ? `
          <div style="background:var(--paper); border-left:3px solid var(--gold); border-radius:0 10px 10px 0; padding:14px 18px; margin-bottom:24px;">
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:var(--gold); margin-bottom:6px;">Before we dive in</div>
            <p style="margin:0; font-style:italic; color:var(--ink-soft);">${m.hook}</p>
          </div>
        ` : ''}

        ${mode === 'read' ? m.reading.map(readSectionHtml).join('') : ''}

        ${mode === 'listen' ? `
          <div style="text-align:center; padding:30px 20px; background:var(--paper); border-radius:10px; margin-bottom:20px;">
            <button class="btn" id="read-listen-btn">${P.read.isSpeaking ? '■ Stop' : '▶ Listen to this module'}</button>
            <p class="subtle" style="margin-top:14px;">${P.read.isSpeaking ? 'Reading aloud…' : 'Reads all sections below in order.'}</p>
          </div>
          ${m.reading.map(readSectionHtml).join('')}
        ` : ''}

        ${mode === 'skim' ? `
          <ul style="padding-left:20px; margin:0 0 10px;">
            ${skimBullets.map(b => `<li style="margin-bottom:12px; line-height:1.6;">${b}</li>`).join('')}
          </ul>
          <p class="subtle">Switch to Read for the full version of any section.</p>
        ` : ''}

        ${mode === 'flashcards' ? `
          <p class="subtle" style="margin-bottom:16px;">Click a card to flip it.</p>
          <div class="flashcard-grid">
            ${flashcards.map((c,i) => {
              const flipped = !!(P.read.flippedCards && P.read.flippedCards[i]);
              return `
                <div class="flashcard ${flipped?'flipped':''}" data-flashcard-idx="${i}">
                  <div class="flashcard-face flashcard-front">${escHtml(c.term)}</div>
                  <div class="flashcard-face flashcard-back">${escHtml(c.definition)}</div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <button class="btn" id="read-done" style="margin-top:20px;">Continue to the walkthrough</button>
      </div>
    `;
  }

  function pWatch(){
    const isParticipant = !!app.playingParticipantName;
    if(P.module.watchVideo){
      return `
        <div class="watch-frame" style="padding:0;">
          <video controls style="width:100%; display:block; background:#000;" src="${P.module.watchVideo.url}"></video>
        </div>
        ${!isParticipant ? `
          <div class="item-card" style="margin-bottom:16px; display:flex; align-items:center; justify-content:space-between;">
            <span style="font-size:12.5px; color:var(--ink-soft);">Using an uploaded walkthrough video: ${escHtml(P.module.watchVideo.name)}</span>
            <button class="btn-secondary" id="watch-remove-video">Remove — use step-by-step instead</button>
          </div>
        ` : ''}
        <div class="watch-controls">
          <div></div>
          <div class="watch-btns"><button class="btn" id="watch-done">Continue to practice</button></div>
        </div>
      `;
    }
    const steps = P.module.watchSteps;
    if(steps.length === 0){
      return `
        <div class="watch-frame">
          <div style="height:180px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:var(--ink-soft); font-size:13.5px; background:var(--paper);">
            <span style="font-size:22px;">💬</span>
            <span>This module has no step-by-step walkthrough — the source content didn't include a process to show.</span>
          </div>
        </div>
        ${!isParticipant ? `
          <div class="item-card" style="margin-bottom:16px; display:flex; align-items:center; justify-content:space-between;">
            <span style="font-size:12.5px; color:var(--ink-soft);">Have a video walkthrough for this module instead?</span>
            <span class="small-upload" id="watch-video-upload-trigger">+ Upload a video</span>
            <input type="file" id="watch-video-upload-input" accept="video/*" style="display:none;">
          </div>
        ` : ''}
        <div class="watch-controls">
          <div></div>
          <div class="watch-btns"><button class="btn" id="watch-done">Continue to practice</button></div>
        </div>
      `;
    }
    const i = P.watch.index;
    const step = steps[i];
    const isLast = i === steps.length - 1;
    const imgSrc = step.imageId ? imgFor(step.imageId) : '';
    return `
      <div class="watch-frame">
        ${imgSrc ? `<img src="${imgSrc}" alt="${step.label}">` : (isParticipant ? '' : `
          <div id="watch-empty-cta" style="height:180px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:var(--gold); font-size:13.5px; font-weight:700; background:var(--paper); cursor:pointer; border-bottom:2px dashed var(--gold);">
            <span style="font-size:22px;">🖼️ +</span>
            <span>No screenshot yet for this step — click to upload one</span>
          </div>
        `)}
        <div class="watch-caption">
          <div class="step-label">${step.label}</div>
          <p>${step.caption}</p>
        </div>
      </div>
      ${!isParticipant ? `
        <div class="item-card" style="margin-bottom:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:${P.gallery.length?'10px':'0'};">
            <span style="font-size:12.5px; font-weight:700; color:var(--ink-soft);">Screenshot gallery for this module</span>
            <span class="small-upload" id="watch-upload-trigger">+ Upload image(s)</span>
            <input type="file" id="watch-upload-input" accept="image/*" multiple style="display:none;">
          </div>
          ${P.gallery.length ? `<div class="gallery-strip">${P.gallery.map(g => `<div class="gallery-thumb ${g.id===step.imageId?'selected':''}" data-assign-watch-image="${g.id}"><img src="${g.dataUrl}"></div>`).join('')}</div>` : ''}
        </div>
        <div class="item-card" style="margin-bottom:16px; display:flex; align-items:center; justify-content:space-between;">
          <span style="font-size:12.5px; color:var(--ink-soft);">Already have a finished walkthrough video or e-learning recording for this module?</span>
          <span class="small-upload" id="watch-video-upload-trigger">+ Upload a video instead</span>
          <input type="file" id="watch-video-upload-input" accept="video/*" style="display:none;">
        </div>
      ` : ''}
      <div class="watch-controls">
        <div class="watch-dots">${steps.map((_,idx) => `<div class="dot ${idx===i?'active':''}"></div>`).join('')}</div>
        <div class="watch-btns">
          <button class="btn secondary" id="watch-narrate">${P.watch.isSpeaking ? 'Stop' : '▶ Narrate'}</button>
          <button class="btn secondary" id="watch-prev" ${i===0?'disabled':''}>Back</button>
          ${isLast ? `<button class="btn" id="watch-done">Continue to practice</button>` : `<button class="btn" id="watch-next">Next step</button>`}
        </div>
      </div>
    `;
  }

  function pPractice(){
    const p = P.practice;
    if(p.screen === 'select') return `
      <div class="intro" style="margin-bottom:20px;">
        <div class="eyebrow">Apply</div>
        <h1 style="font-size:22px;">Practice the call before you take one</h1>
        <p class="subtle">Pick a caller. You're the CSE — speak (or type) as you would on a real call.</p>
      </div>
      ${Object.values(P.scenarios).map(s => `
        <div class="scenario-card" data-p-key="${s.key}">
          <h3>${s.name}</h3>
          <p><strong style="color:var(--ink); font-weight:600;">${s.tag}.</strong> ${s.picker}</p>
        </div>
      `).join('')}
      ${!app.playingParticipantName ? `<div style="text-align:center; margin-top:10px;"><a href="#" id="skip-practice-audit" style="font-size:12.5px; color:var(--ink-soft);">Just auditing this module? Skip to Check →</a></div>` : ''}
    `;
    if(p.screen === 'brief') return `
      <div class="card">
        <div class="eyebrow">Incoming call</div>
        <h2>${p.scenario.name}</h2>
        <p>${p.scenario.brief}</p>
        <button class="btn" id="start-call">Answer the call</button>
        <button class="btn secondary" id="back-select" style="margin-left:8px;">Choose someone else</button>
      </div>
    `;
    if(p.screen === 'call'){
      const s = p.scenario;
      const initials = s.name.split(' ').map(w=>w[0]).join('');
      return `
        <div class="call-header">
          <div class="avatar ${p.isSpeaking ? 'speaking' : ''}">${initials}</div>
          <div><h3 style="font-size:17px;">${s.name}</h3><div class="call-status live">${p.isSpeaking ? 'Speaking…' : (p.isListening ? 'Listening…' : 'On call')}</div></div>
        </div>
        ${p.error ? `<div class="error-banner" style="background:#FBEAE8;border:1px solid var(--red);color:var(--red);padding:10px 14px;border-radius:10px;font-size:13.5px;margin-bottom:14px;">${p.error}</div>` : ''}
        <div class="transcript" id="transcript">
          ${p.transcript.map(line => `<div class="line ${line.speaker}"><span class="speaker">${line.speaker === 'agent' ? 'You (CSE)' : s.name}</span>${line.text}</div>`).join('')}
          ${p.isThinking ? '<div class="loading">Thinking…</div>' : ''}
        </div>
        <div class="controls">
          <div class="mic-row">
            <button class="mic-btn ${p.isListening ? 'listening' : ''}" id="mic-btn" ${p.isSpeaking || p.isThinking ? 'disabled' : ''}>${p.isListening ? '■' : '🎙'}</button>
            <div class="text-fallback">
              <input type="text" id="text-input" placeholder="Or type what you'd say…" ${p.isSpeaking || p.isThinking ? 'disabled' : ''} />
              <button id="text-send" ${p.isSpeaking || p.isThinking ? 'disabled' : ''}>Send</button>
            </div>
          </div>
          <div class="footer-row">
            <span class="hint">Tap the mic and speak, or type your line.</span>
            <button class="btn end" id="end-call">End call &amp; get feedback</button>
          </div>
        </div>
      `;
    }
    if(p.screen === 'scoring') return `<div class="card"><p class="loading">Scoring the call against the source material…</p></div>`;
    if(p.screen === 'debrief'){
      const s = p.scenario, d = p.debrief;
      return `
        <div class="card">
          <div class="eyebrow">Debrief — ${s.name}</div>
          <h2 style="margin-bottom:14px;">How the call went</h2>
          <p class="subtle" style="margin-bottom:4px;">${d && d.overall ? d.overall : ''}</p>
          <div style="margin-top:10px;">
            ${s.rubric.map(r => {
              const res = d && d.results ? d.results.find(x => x.id === r.id) : null;
              const met = res ? !!res.met : false;
              const comment = res ? res.comment : '';
              return `<div class="rubric-item"><div class="mark ${met?'yes':'no'}">${met?'✓':'✕'}</div><div><div class="label">${r.label}</div>${comment?`<div class="comment">${comment}</div>`:''}</div></div>`;
            }).join('')}
          </div>
          <div class="reference"><strong>What the source calls for:</strong> ${s.correctProcess}</div>
          <div class="footer-row" style="margin-top:20px;">
            <button class="btn secondary" id="retry-scenario">Try another caller</button>
            <button class="btn" id="practice-done">Continue to the quiz</button>
          </div>
        </div>
      `;
    }
  }

  function pQuiz(){
    const quiz = P.module.quiz;
    const threshold = 0.7;

    if(P.quiz.mode === 'reinforce'){
      const missed = quiz.map((q,i) => ({q,i})).filter(({q,i}) => P.quiz.answers[i] !== q.correct);
      return `
        <div class="card">
          <div class="eyebrow">Not quite there yet</div>
          <h2 style="margin-bottom:10px;">Let's revisit a few things first</h2>
          <p class="subtle" style="margin-bottom:16px;">You scored ${P.quiz.score} of ${quiz.length} \u2014 below the pass mark. Here's what to re-check before trying again (attempt ${P.quiz.attempts} of 3).</p>
          ${missed.map(({q}) => `
            <div class="reference" style="margin-top:0; margin-bottom:12px;">
              <strong>${q.prompt}</strong>
              <div style="margin-top:6px;">${q.explanation}</div>
            </div>
          `).join('')}
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn" id="quiz-retry">Retry the quiz</button>
            <button class="btn secondary" id="quiz-accept-score">Accept this score</button>
          </div>
        </div>
      `;
    }

    if(P.quiz.mode === 'escalate'){
      return `
        <div class="card">
          <div class="eyebrow">Escalated</div>
          <h2 style="margin-bottom:10px;">Flagged for a coaching conversation</h2>
          <p class="subtle">Three attempts, still below the pass mark on "${P.module.title}". In a live rollout this would notify the learner's manager rather than loop indefinitely or mark the module complete anyway \u2014 in this demo, that's a banner, not a real notification.</p>
          <button class="btn" id="quiz-escalate-continue" style="margin-top:16px;">Continue (demo only \u2014 not marked as passed)</button>
        </div>
      `;
    }

    const q = quiz[P.quiz.index];
    const revealed = P.quiz.revealed[P.quiz.index];
    const chosen = P.quiz.answers[P.quiz.index];
    const isLast = P.quiz.index === quiz.length - 1;
    return `
      <div class="card">
        <div class="quiz-progress">Question ${P.quiz.index + 1} of ${quiz.length}${P.quiz.attempts>1 ? ` \u00b7 attempt ${P.quiz.attempts} of 3` : ''}</div>
        <div class="quiz-q">${q.prompt}</div>
        ${q.options.map((opt, idx) => {
          let cls = 'quiz-opt';
          if(revealed){ if(idx === q.correct) cls += ' correct'; else if(idx === chosen) cls += ' incorrect'; }
          return `<button class="${cls}" data-q-idx="${idx}" ${revealed?'disabled':''}>${opt}</button>`;
        }).join('')}
        ${revealed ? `<div class="quiz-explain">${q.explanation}</div>` : ''}
        ${revealed ? `<button class="btn" id="quiz-next">${isLast ? 'See results' : 'Next question'}</button>` : ''}
      </div>
    `;
  }

  function logCompletion(){
    app.analytics.push({
      participantName: app.playingParticipantName || null,
      moduleTitle: P.module.title,
      quizScore: P.quiz.score,
      quizTotal: P.module.quiz.length,
      attempts: P.quiz.attempts,
      escalated: !!P.quiz.escalated,
      acceptedBelowThreshold: !!P.quiz.acceptedBelowThreshold,
      timestamp: new Date().toISOString()
    });
  }

  function finishQuizAttempt(){
    const quiz = P.module.quiz;
    const pct = P.quiz.score / quiz.length;
    if(pct >= 0.7){
      P.completed.quiz = true;
      P.section = 'complete';
      logCompletion();
    } else if(P.quiz.attempts >= 3){
      P.quiz.mode = 'escalate';
      P.quiz.escalated = true;
    } else {
      P.quiz.mode = 'reinforce';
    }
  }

  function pComplete(){
    const inPath = app.playingPathIndex !== null && app.playingPathId;
    const currentPath = inPath ? app.paths.find(x=>x.id===app.playingPathId) : null;
    const hasNext = currentPath && app.playingPathIndex < currentPath.moduleIds.length - 1;
    return `
      <div class="card">
        <div class="eyebrow">Module complete</div>
        <h2 style="margin-bottom:14px;">Nice work</h2>
        <p class="subtle">You've been through the full module — the concept, the system walkthrough, a live practice call, and a knowledge check.</p>
        <div class="badge-row">
          <div class="badge"><div class="n">${P.quiz.score}/${P.module.quiz.length}</div><div class="l">Quiz score</div></div>
          <div class="badge"><div class="n">✓</div><div class="l">Practice call completed</div></div>
        </div>
        ${P.quiz.escalated ? `<div class="reference" style="border-left:3px solid var(--red); margin-bottom:14px;"><strong>Escalated:</strong> this learner didn't clear the pass mark in 3 attempts \u2014 flagged for a coaching conversation (demo banner, not a real notification).</div>` : ''}
        ${P.quiz.acceptedBelowThreshold ? `<div class="reference" style="border-left:3px solid var(--gold); margin-bottom:14px;"><strong>Accepted below the pass mark</strong> \u2014 a human chose to move on without a retry. Recorded as-is, not shown as a pass.</div>` : ''}
        ${currentPath ? `<div class="subtle" style="margin-bottom:14px;">Module ${app.playingPathIndex+1} of ${currentPath.moduleIds.length} in "${pathName(currentPath)}".</div>` : ''}
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${hasNext ? `<button class="btn" id="path-next-module">Continue to next module</button>` : ''}
          ${currentPath && !hasNext ? `<div class="subtle" style="margin-bottom:0;">That's the end of the path.</div>` : ''}
          <button class="btn secondary" id="restart-module">Restart this module</button>
          <button class="btn secondary" id="exit-to-platform">Back to platform</button>
        </div>
      </div>
    `;
  }

  function exitPlayerToPlatform(){
    window.speechSynthesis.cancel();
    app.mode = 'creator';
    app.playingPathIndex = null;
    app.playingPathId = null;
    if(app.playingParticipantName) app.navSection = 'participants';
    app.playingParticipantName = null;
  }

  function attachPlayerHandlers(){
    const exitTop = document.getElementById('exit-to-platform-top');
    if(exitTop) exitTop.addEventListener('click', (e) => { e.preventDefault(); exitPlayerToPlatform(); render(); });
    const kitPrint = document.getElementById('kit-print');
    if(kitPrint) kitPrint.addEventListener('click', () => window.print());
    if(P.isKit) return; // nothing else in this function applies to the kit view

    document.querySelectorAll('[data-p-section]').forEach(el => {
      const key = el.dataset.pSection;
      if(key) el.addEventListener('click', () => { P.section = key; renderPlayer(); });
    });
    const beginBtn = document.getElementById('begin-btn');
    if(beginBtn) beginBtn.addEventListener('click', () => { P.section = 'read'; renderPlayer(); });
    const readDone = document.getElementById('read-done');
    if(readDone) readDone.addEventListener('click', () => { window.speechSynthesis.cancel(); P.completed.read = true; P.section = 'watch'; renderPlayer(); });

    document.querySelectorAll('[data-read-mode]').forEach(el => {
      el.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        P.read.isSpeaking = false;
        P.read.mode = el.dataset.readMode;
        renderPlayer();
      });
    });
    document.querySelectorAll('[data-flashcard-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = el.dataset.flashcardIdx;
        P.read.flippedCards[idx] = !P.read.flippedCards[idx];
        renderPlayer();
      });
    });
    const readListenBtn = document.getElementById('read-listen-btn');
    if(readListenBtn) readListenBtn.addEventListener('click', () => {
      if(P.read.isSpeaking){ window.speechSynthesis.cancel(); P.read.isSpeaking = false; renderPlayer(); return; }
      const fullText = P.module.reading.map(r => `${r.heading}. ${r.body}`).join(' ... ');
      const u = new SpeechSynthesisUtterance(fullText);
      u.rate = 1.0;
      P.read.isSpeaking = true;
      renderPlayer();
      u.onend = () => { P.read.isSpeaking = false; renderPlayer(); };
      u.onerror = () => { P.read.isSpeaking = false; renderPlayer(); };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });

    const watchNext = document.getElementById('watch-next');
    if(watchNext) watchNext.addEventListener('click', () => { stopNarrationP(); P.watch.index++; renderPlayer(); });
    const watchPrev = document.getElementById('watch-prev');
    if(watchPrev) watchPrev.addEventListener('click', () => { stopNarrationP(); P.watch.index--; renderPlayer(); });
    const watchDone = document.getElementById('watch-done');
    if(watchDone) watchDone.addEventListener('click', () => { stopNarrationP(); P.completed.watch = true; P.section = 'practice'; renderPlayer(); });
    const watchNarrate = document.getElementById('watch-narrate');
    if(watchNarrate) watchNarrate.addEventListener('click', toggleNarrationP);

    const watchUploadTrigger = document.getElementById('watch-upload-trigger');
    const watchUploadInput = document.getElementById('watch-upload-input');
    const watchEmptyCta = document.getElementById('watch-empty-cta');
    if(watchUploadTrigger) watchUploadTrigger.addEventListener('click', () => watchUploadInput.click());
    if(watchEmptyCta) watchEmptyCta.addEventListener('click', () => watchUploadInput.click());
    if(watchUploadInput) watchUploadInput.addEventListener('change', async (e) => {
      const step = P.module.watchSteps[P.watch.index];
      let first = null;
      for(const file of e.target.files){
        const dataUrl = await new Promise((resolve,reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
        const entry = { id:'img_'+P.gallery.length+'_'+Date.now(), dataUrl, name:file.name };
        P.gallery.push(entry);
        if(!first) first = entry.id;
      }
      if(first) step.imageId = first;
      renderPlayer();
    });
    document.querySelectorAll('[data-assign-watch-image]').forEach(el => {
      el.addEventListener('click', () => {
        P.module.watchSteps[P.watch.index].imageId = el.dataset.assignWatchImage;
        renderPlayer();
      });
    });

    const watchVideoTrigger = document.getElementById('watch-video-upload-trigger');
    const watchVideoInput = document.getElementById('watch-video-upload-input');
    if(watchVideoTrigger) watchVideoTrigger.addEventListener('click', () => watchVideoInput.click());
    if(watchVideoInput) watchVideoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if(!file) return;
      // Object URLs handle large video files far better than a base64 data URL —
      // no re-encoding, no bloating the in-memory module object.
      const url = URL.createObjectURL(file);
      P.module.watchVideo = { url, name: file.name };
      renderPlayer();
    });
    const watchRemoveVideo = document.getElementById('watch-remove-video');
    if(watchRemoveVideo) watchRemoveVideo.addEventListener('click', () => {
      if(P.module.watchVideo && P.module.watchVideo.url) URL.revokeObjectURL(P.module.watchVideo.url);
      P.module.watchVideo = null;
      renderPlayer();
    });

    document.querySelectorAll('[data-p-key]').forEach(el => {
      el.addEventListener('click', () => { P.practice.scenario = P.scenarios[el.dataset.pKey]; P.practice.screen = 'brief'; renderPlayer(); });
    });
    const skipPracticeAudit = document.getElementById('skip-practice-audit');
    if(skipPracticeAudit) skipPracticeAudit.addEventListener('click', (e) => {
      e.preventDefault();
      P.completed.practice = true;
      P.section = 'quiz';
      renderPlayer();
    });
    const backSelect = document.getElementById('back-select');
    if(backSelect) backSelect.addEventListener('click', () => { P.practice.screen='select'; P.practice.scenario=null; renderPlayer(); });
    const startCallBtn = document.getElementById('start-call');
    if(startCallBtn) startCallBtn.addEventListener('click', startCallP);
    const micBtn = document.getElementById('mic-btn');
    if(micBtn) micBtn.addEventListener('click', toggleListeningP);
    const textSend = document.getElementById('text-send');
    if(textSend) textSend.addEventListener('click', sendTypedLineP);
    const textInput = document.getElementById('text-input');
    if(textInput) textInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') sendTypedLineP(); });
    const endBtn = document.getElementById('end-call');
    if(endBtn) endBtn.addEventListener('click', endCallP);
    const retryBtn = document.getElementById('retry-scenario');
    if(retryBtn) retryBtn.addEventListener('click', () => {
      P.practice = { screen:'select', scenario:null, messages:[], transcript:[], isListening:false, isSpeaking:false, isThinking:false, error:null, debrief:null };
      renderPlayer();
    });
    const practiceDone = document.getElementById('practice-done');
    if(practiceDone) practiceDone.addEventListener('click', () => { P.completed.practice = true; P.section = 'quiz'; renderPlayer(); });

    document.querySelectorAll('[data-q-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const quiz = P.module.quiz;
        const q = quiz[P.quiz.index];
        const idx = parseInt(el.dataset.qIdx, 10);
        P.quiz.answers[P.quiz.index] = idx;
        P.quiz.revealed[P.quiz.index] = true;
        if(idx === q.correct) P.quiz.score++;
        renderPlayer();
      });
    });
    const quizNext = document.getElementById('quiz-next');
    if(quizNext) quizNext.addEventListener('click', () => {
      if(P.quiz.index < P.module.quiz.length - 1){ P.quiz.index++; renderPlayer(); }
      else { finishQuizAttempt(); renderPlayer(); }
    });
    const quizRetry = document.getElementById('quiz-retry');
    if(quizRetry) quizRetry.addEventListener('click', () => {
      P.quiz.attempts++;
      P.quiz.index = 0;
      P.quiz.answers = {};
      P.quiz.revealed = {};
      P.quiz.score = 0;
      P.quiz.mode = 'quiz';
      renderPlayer();
    });
    const quizAcceptScore = document.getElementById('quiz-accept-score');
    if(quizAcceptScore) quizAcceptScore.addEventListener('click', () => {
      P.quiz.acceptedBelowThreshold = true;
      P.completed.quiz = true;
      P.section = 'complete';
      logCompletion();
      renderPlayer();
    });
    const quizEscalateContinue = document.getElementById('quiz-escalate-continue');
    if(quizEscalateContinue) quizEscalateContinue.addEventListener('click', () => {
      P.completed.quiz = true;
      P.section = 'complete';
      logCompletion();
      renderPlayer();
    });
    const restartModule = document.getElementById('restart-module');
    if(restartModule) restartModule.addEventListener('click', () => { initPlayer(P.module, P.gallery); renderPlayer(); });
    const pathNext = document.getElementById('path-next-module');
    if(pathNext) pathNext.addEventListener('click', () => { advancePath(); renderPlayer(); });
    const exitBtn = document.getElementById('exit-to-platform');
    if(exitBtn) exitBtn.addEventListener('click', () => { exitPlayerToPlatform(); render(); });
  }

  function toggleNarrationP(){
    if(P.watch.isSpeaking){ stopNarrationP(); return; }
    const step = P.module.watchSteps[P.watch.index];
    const u = new SpeechSynthesisUtterance(step.caption);
    u.rate = 1.0;
    P.watch.isSpeaking = true;
    renderPlayer();
    u.onend = () => { P.watch.isSpeaking = false; renderPlayer(); };
    u.onerror = () => { P.watch.isSpeaking = false; renderPlayer(); };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
  function stopNarrationP(){ window.speechSynthesis.cancel(); P.watch.isSpeaking = false; }

  function startCallP(){
    const s = P.practice.scenario;
    P.practice.messages = [{role:'assistant', content: s.opening}];
    P.practice.transcript = [{speaker:'customer', text: s.opening}];
    P.practice.screen = 'call';
    P.practice.error = null;
    renderPlayer();
    speakCustomerP(s.opening);
  }

  let recognitionP = null;
  function getRecognitionP(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return null;
    const r = new SR(); r.lang = 'en-IN'; r.interimResults = false; r.maxAlternatives = 1;
    return r;
  }
  function toggleListeningP(){
    const p = P.practice;
    if(p.isListening){ if(recognitionP) recognitionP.stop(); return; }
    recognitionP = getRecognitionP();
    if(!recognitionP){ p.error = "Voice input isn't available in this browser — use the text field instead."; renderPlayer(); return; }
    p.isListening = true; p.error = null; renderPlayer();
    recognitionP.onresult = (e) => { p.isListening = false; handleAgentLineP(e.results[0][0].transcript); };
    recognitionP.onerror = () => { p.isListening = false; p.error = "Didn't catch that — try again, or type your line below."; renderPlayer(); };
    recognitionP.onend = () => { if(p.isListening){ p.isListening = false; renderPlayer(); } };
    recognitionP.start();
  }
  function sendTypedLineP(){
    const input = document.getElementById('text-input');
    const text = input.value.trim();
    if(!text) return;
    input.value = '';
    handleAgentLineP(text);
  }
  async function handleAgentLineP(text){
    const p = P.practice;
    p.transcript.push({speaker:'agent', text});
    p.messages.push({role:'user', content:text});
    p.isThinking = true; p.error = null; renderPlayer();
    try{
      const reply = await callClaude(p.scenario.systemPrompt, p.messages, 220);
      p.messages.push({role:'assistant', content: reply});
      p.transcript.push({speaker:'customer', text: reply});
      p.isThinking = false; renderPlayer();
      speakCustomerP(reply);
    }catch(err){
      p.isThinking = false;
      p.error = "Couldn't reach the customer simulation — " + (err.message || 'check your connection and try again.');
      renderPlayer();
    }
  }
  function speakCustomerP(text){
    if(!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    P.practice.isSpeaking = true; renderPlayer();
    u.onend = () => { P.practice.isSpeaking = false; renderPlayer(); };
    u.onerror = () => { P.practice.isSpeaking = false; renderPlayer(); };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
  async function endCallP(){
    window.speechSynthesis.cancel();
    const p = P.practice;
    p.screen = 'scoring'; renderPlayer();
    const s = p.scenario;
    const transcriptText = p.transcript.map(l => `${l.speaker === 'agent' ? 'CSE' : s.name}: ${l.text}`).join('\n');
    const scoringSystem = `You are scoring a customer-service training call transcript against a fixed rubric. Be strict and specific — only mark a criterion met if the CSE (the agent, not the customer) actually did it in the transcript.

  Rubric (respond about each by id):
  ${s.rubric.map(r => `- ${r.id}: ${r.label}`).join('\n')}

  Correct process reference: ${s.correctProcess}

  Respond with ONLY valid JSON, no markdown fences, no preamble, in exactly this shape:
  {"results":[{"id":"<rubric id>","met":true|false,"comment":"<one short sentence>"}],"overall":"<one or two sentence overall summary>"}`;
    try{
      const raw = await callClaude(scoringSystem, [{role:'user', content: `Transcript:\n${transcriptText}`}], 700);
      const cleaned = raw.replace(/```json|```/g, '').trim();
      p.debrief = JSON.parse(cleaned);
    }catch(err){
      p.debrief = { results: [], overall: "Couldn't score this call automatically — " + (err.message || 'check your connection and try again.') };
    }
    p.screen = 'debrief';
    renderPlayer();
  }


  if(opts.initialState){
    PERSIST_KEYS.forEach(k => { if(opts.initialState[k] !== undefined) app[k] = opts.initialState[k]; });
    if(app.screen === 'classifying') app.screen = 'upload';
  }
  lastSavedJson = JSON.stringify(serializeState());
  window.addEventListener('beforeunload', onBeforeUnload);
  render();

  return {
    // Re-render the current view, e.g. once the signed-in user's profile loads.
    refresh(){ if(app.mode === 'player') renderPlayer(); else render(); },
    destroy(){
      if(hasUnsavedChanges()) flushSave();
      destroyed = true;
      clearTimeout(saveTimer);
      window.removeEventListener('beforeunload', onBeforeUnload);
      if(window.speechSynthesis) window.speechSynthesis.cancel();
      if(recognitionP) try{ recognitionP.stop(); }catch(e){}
      mountEl.innerHTML = '';
    }
  };
}
