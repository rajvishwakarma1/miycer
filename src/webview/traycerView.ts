// Webview script (TypeScript) that gets bundled to out/webview/traycerView.js
(function(){
  // acquireVsCodeApi is injected in webview context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getVsCodeApi = (): any => {
    const w: any = window as unknown as any;
    return typeof w.acquireVsCodeApi === 'function' ? w.acquireVsCodeApi() : { postMessage: () => {} };
  };
  const vscode: any = getVsCodeApi();
  let initialized = false;
  let thumbs: HTMLDivElement | null = null;
  function escapeHtml(s: string): string {
    return String(s || '').replace(/[&<>"']/g, (c) => {
      switch (c) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case '\'': return '&#39;';
        default: return c;
      }
    });
  }
  function init(): void {
    if (initialized) return; initialized = true;
    const container = document.getElementById('planContent');
    if (container) container.innerHTML = '<div class="muted small">Ready.</div>';
    try { vscode.postMessage({ command: 'ready' }); } catch {}
    const send = () => {
      const txtEl = document.getElementById('taskText') as HTMLTextAreaElement | null;
      const btn = document.getElementById('sendBtn') as HTMLButtonElement | null;
      const container = document.getElementById('planContent');
      const txt = txtEl && txtEl.value ? txtEl.value : '';
      if (btn) btn.setAttribute('disabled', 'true');
      if (container) container.innerHTML = '<div class="muted small">Generating…</div>';
      try { vscode.postMessage({ command: 'createPlan', text: txt, attachments: attachments }); } catch (e) {
        if (container) container.innerHTML = '<div class="muted small">Unable to post message to extension.</div>';
      }
    };
    const btn = document.getElementById('sendBtn');
    if (btn) btn.addEventListener('click', send);
    const ta = document.getElementById('taskText');
    if (ta) ta.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); });
  const editRow = document.getElementById('editQueryRow');
  const editBtn = document.getElementById('editQueryBtn');
  const saveBtn = document.getElementById('saveEditBtn') as HTMLButtonElement | null;
  const cancelBtn = document.getElementById('cancelEditBtn') as HTMLButtonElement | null;
  const inlineActions = document.getElementById('inlineEditActions');
  const exportBtn = document.getElementById('exportCopilotBtn') as HTMLButtonElement | null;
  const deleteAllBtn = document.getElementById('deleteAllPlansBtn') as HTMLButtonElement | null;
  const attachBtn = document.getElementById('attachBtn') as HTMLButtonElement | null;
  const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
  thumbs = document.getElementById('thumbs') as HTMLDivElement | null;
    if (exportBtn) exportBtn.addEventListener('click', () => {
      try {
        const plan = currentPlan;
        if (!plan) return;
        const phases = readPhases();
        const prompt = buildCopilotPrompt(plan, phases);
  vscode.postMessage({ command: 'runInCopilot', text: prompt });
      } catch {}
    });
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', () => {
      try { vscode.postMessage({ command: 'deleteAllPlans' }); } catch {}
    });
    if (attachBtn && fileInput) attachBtn.addEventListener('click', () => { fileInput.click(); });
    if (fileInput) fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const base64 = dataUrl.split(',')[1] || '';
        const att = {
          id: String(Date.now()),
          name: f.name,
          mime: f.type || 'image/png',
          dataBase64: base64,
          size: f.size
        };
        attachments.push(att);
        renderThumbs();
        try { if (fileInput) fileInput.value = ''; } catch {}
      };
      reader.readAsDataURL(f);
    });
    if (editBtn) editBtn.addEventListener('click', () => {
      const txtEl = document.getElementById('taskText') as HTMLTextAreaElement | null;
      if (!txtEl) return;
      (txtEl as any).dataset.prev = txtEl.value;
      txtEl.removeAttribute('readonly');
      txtEl.removeAttribute('aria-readonly');
      if (inlineActions) inlineActions.style.display = 'flex';
      txtEl.focus();
    });
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const txtEl = document.getElementById('taskText') as HTMLTextAreaElement | null;
      if (!txtEl) return;
      txtEl.setAttribute('readonly', 'true');
      txtEl.setAttribute('aria-readonly', 'true');
      if (inlineActions) inlineActions.style.display = 'none';
    });
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      const txtEl = document.getElementById('taskText') as HTMLTextAreaElement | null;
      if (!txtEl) return;
      const prev = (txtEl as any).dataset.prev || '';
      txtEl.value = prev;
      txtEl.setAttribute('readonly', 'true');
      txtEl.setAttribute('aria-readonly', 'true');
      if (inlineActions) inlineActions.style.display = 'none';
    });

    // Restore phases from state
    const state = (vscode && typeof vscode.getState === 'function') ? vscode.getState() : undefined;
    const phases: Array<{ id: string; title: string; content: string }> = state?.phases || [];
    renderPhases(phases);

    const addBtn = document.getElementById('addPhaseBtn');
    if (addBtn) addBtn.addEventListener('click', () => {
      const phases = readPhases();
      const id = String(Date.now());
      phases.push({ id, title: `Phase ${phases.length + 1}`, content: '' });
      renderPhases(phases);
      persistPhases(phases);
    });
  }
  try { init(); } catch {}
  window.addEventListener('load', () => { try { init(); } catch {} });
  window.addEventListener('message', (event) => {
    const msg = (event as MessageEvent).data as any;
    const btn = document.getElementById('sendBtn');
    if (btn) btn.removeAttribute('disabled');
    if (msg && msg.command === 'readyAck') {
  // Request for saved plans will follow in a separate message.
    } else if (msg && msg.command === 'planAck') {
      const container = document.getElementById('planContent');
      if (container) container.innerHTML = '<div class="muted small">Generating…</div>';
  } else if (msg && msg.command === 'planCreated' && msg.plan) {
      const plan = msg.plan as { title: string; description: string; steps: Array<{ id: string; description: string; type: string }>; };
  currentPlan = plan;
      const container = document.getElementById('planContent');
      const stepLines = (plan.steps || []).map((s, i) => {
        return '<div class="item"><strong>Step ' + (i+1) + ' (' + s.type + ')</strong>: ' + escapeHtml(s.description) + '</div>';
      }).join('');
      if (container) container.innerHTML = '<div><strong>' + escapeHtml(plan.title) + '</strong></div>'
        + '<div class="muted small">' + escapeHtml(plan.description || '') + '</div>'
        + '<div class="stepsList">' + (stepLines || '<div class="muted small">No steps found.</div>') + '</div>';
  // Do not auto-add phases; user can add if needed.
  // lock query field and show small Edit link
  const txtEl = document.getElementById('taskText') as HTMLTextAreaElement | null;
  if (txtEl) { txtEl.setAttribute('readonly', 'true'); txtEl.setAttribute('aria-readonly', 'true'); }
  const row = document.getElementById('editQueryRow');
  if (row) row.style.display = 'block';
  const inlineActions2 = document.getElementById('inlineEditActions');
  if (inlineActions2) inlineActions2.style.display = 'none';
  const exportBtn = document.getElementById('exportCopilotBtn') as HTMLButtonElement | null;
  if (exportBtn) exportBtn.removeAttribute('disabled');
  // When a plan is loaded/shown, move Saved Plans section below and keep it.
  renderSavedPlans(lastSavedPlans || []);
    } else if (msg && msg.command === 'planError') {
      const container = document.getElementById('planContent');
      const m = String(msg.message || 'Failed to generate plan.');
      const lower = m.toLowerCase();
      let extra = '';
      if (lower.includes('api key') || lower.includes('invalid') || lower.includes('missing')) {
        extra = '<div style="margin-top:6px;"><button id="fixKeyBtn">Set Gemini API Key…</button></div>';
      } else if (lower.includes('429') || lower.includes('rate') || lower.includes('quota')) {
        extra = '<div class="muted small" style="margin-top:6px;">You hit the rate limit. Please wait a moment and try again.</div>';
      }
      if (container) container.innerHTML = '<div class="muted small">' + escapeHtml(m) + '</div>' + extra;
      const fix = document.getElementById('fixKeyBtn');
      if (fix) fix.addEventListener('click', () => { try { vscode.postMessage({ command: 'openSetApiKey' }); } catch {} });
    } else if (msg && msg.command === 'queryUpdated' && typeof msg.text === 'string') {
      // update textarea value but keep it readonly
      const txtEl = document.getElementById('taskText') as HTMLTextAreaElement | null;
      if (txtEl) txtEl.value = msg.text;
    } else if (msg && msg.command === 'savedPlans' && Array.isArray(msg.plans)) {
      lastSavedPlans = msg.plans as Array<{ id: string; title: string; description?: string; stepCount?: number }>;
      renderSavedPlans(lastSavedPlans);
    }
  });

  // Keep a simple in-memory copy of the last plan shown
  let currentPlan: { title: string; description: string; steps: Array<{ id: string; description: string; type: string }>; } | undefined;
  const attachments: Array<{ id: string; name: string; mime: string; dataBase64: string; size: number }> = [];
  let lastSavedPlans: Array<{ id: string; title: string; description?: string; stepCount?: number }> | undefined;

  function buildCopilotPrompt(plan: { title: string; description: string; steps: Array<{ id: string; description: string; type: string }>; }, phases: Array<{ id: string; title: string; content: string }>): string {
    const steps = (plan.steps || []).map((s, i) => `Step ${i + 1} [${s.type}]: ${s.description}`).join('\n');
    const phaseText = phases && phases.length
      ? '\n\nPhases:' + phases.map((p, i) => `\n- ${p.title}: ${p.content || ''}`).join('')
      : '';
    return `You are GitHub Copilot. Follow this plan precisely.\n\nTitle: ${plan.title}\n\nDescription:\n${plan.description}\n\nPlan Steps:\n${steps}${phaseText}\n\nTask: Implement the plan step-by-step. Acknowledge each step and ask before deviating.`;
  }

  function readPhases(): Array<{ id: string; title: string; content: string }> {
    const state = (vscode && typeof vscode.getState === 'function') ? vscode.getState() : undefined;
    return (state?.phases as Array<{ id: string; title: string; content: string }>) || [];
  }

  function persistPhases(phases: Array<{ id: string; title: string; content: string }>): void {
    if (vscode && typeof vscode.setState === 'function') {
      vscode.setState({ phases });
    }
  }

  function renderPhases(phases: Array<{ id: string; title: string; content: string }>): void {
    const container = document.getElementById('phases');
    if (!container) return;
    if (!phases || phases.length === 0) { container.innerHTML = ''; return; }
    container.innerHTML = phases.map((p, idx) => {
      return '<div class="step">'
        + '<div class="title">' + (idx + 3) + '. ' + escapeHtml(p.title) + ' <span class="badge">Phase</span></div>'
        + '<div class="muted small">Add details below</div>'
        + '<div style="margin-top:6px; display:flex; gap:6px;">'
        + '<input data-phase-title="' + p.id + '" value="' + escapeHtml(p.title) + '" style="flex:1; padding:6px; border:1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius:6px;" />'
        + '<button data-phase-del="' + p.id + '">Delete</button>'
        + '</div>'
        + '<textarea data-phase-content="' + p.id + '" style="margin-top:6px; min-height:64px; resize:vertical; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 6px; padding: 8px; width:100%;">' + escapeHtml(p.content || '') + '</textarea>'
        + '</div>';
    }).join('');

    // Wire edits and delete
    phases.forEach((p) => {
      const titleEl = document.querySelector('input[data-phase-title="' + p.id + '"]') as HTMLInputElement | null;
      const contentEl = document.querySelector('textarea[data-phase-content="' + p.id + '"]') as HTMLTextAreaElement | null;
      const delBtn = document.querySelector('button[data-phase-del="' + p.id + '"]') as HTMLButtonElement | null;
      if (titleEl) titleEl.addEventListener('input', () => { p.title = titleEl.value; persistPhases(phases); renderPhases(phases); });
      if (contentEl) contentEl.addEventListener('input', () => { p.content = contentEl.value; persistPhases(phases); });
      if (delBtn) delBtn.addEventListener('click', () => { const next = phases.filter(x => x.id !== p.id); persistPhases(next); renderPhases(next); });
    });
  }

  function renderSavedPlans(plans: Array<{ id: string; title: string; description?: string; stepCount?: number }>): void {
    const section = document.getElementById('savedPlans');
    const list = document.getElementById('savedPlansList');
    if (!section || !list) return;
    if (!plans || plans.length === 0) {
      section.style.display = 'none';
      list.innerHTML = '';
      return;
    }
    section.style.display = 'block';
    list.innerHTML = plans.map(p => {
      const subtitle = (typeof p.stepCount === 'number') ? ` (${p.stepCount} steps)` : '';
      return '<div class="stepsList item" data-plan-id="' + p.id + '"><strong>' + escapeHtml(p.title) + '</strong>' + escapeHtml(subtitle) + '</div>';
    }).join('');
    // Wire clicks
    plans.forEach(p => {
      const el = document.querySelector('[data-plan-id="' + p.id + '"]') as HTMLDivElement | null;
      if (el) el.addEventListener('click', () => {
        try { vscode.postMessage({ command: 'loadSavedPlan', id: p.id }); } catch {}
      });
    });
  }

  function renderThumbs(): void {
    if (!thumbs) return;
    thumbs.innerHTML = (attachments || []).map(att => {
      return '<div class="thumb" data-att-id="' + att.id + '">'
        + '<img src="data:' + att.mime + ';base64,' + att.dataBase64 + '" />'
        + '<button class="x" title="Remove">×</button>'
        + '</div>';
    }).join('');
    (attachments || []).forEach(att => {
      const el = document.querySelector('.thumb[data-att-id="' + att.id + '"] .x') as HTMLButtonElement | null;
      if (el) el.addEventListener('click', () => {
        const idx = attachments.findIndex(a => a.id === att.id);
        if (idx >= 0) attachments.splice(idx, 1);
        renderThumbs();
      });
    });
  }
})();
