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
      try { vscode.postMessage({ command: 'createPlan', text: txt }); } catch (e) {
        if (container) container.innerHTML = '<div class="muted small">Unable to post message to extension.</div>';
      }
    };
    const btn = document.getElementById('sendBtn');
    if (btn) btn.addEventListener('click', send);
    const ta = document.getElementById('taskText');
    if (ta) ta.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); });
  }
  try { init(); } catch {}
  window.addEventListener('load', () => { try { init(); } catch {} });
  window.addEventListener('message', (event) => {
    const msg = (event as MessageEvent).data as any;
    const btn = document.getElementById('sendBtn');
    if (btn) btn.removeAttribute('disabled');
    if (msg && msg.command === 'readyAck') {
      // no-op
    } else if (msg && msg.command === 'planAck') {
      const container = document.getElementById('planContent');
      if (container) container.innerHTML = '<div class="muted small">Generating…</div>';
    } else if (msg && msg.command === 'planCreated' && msg.plan) {
      const plan = msg.plan as { title: string; description: string; steps: Array<{ id: string; description: string; type: string }>; };
      const container = document.getElementById('planContent');
      const stepLines = (plan.steps || []).map((s, i) => {
        return '<div class="item"><strong>Step ' + (i+1) + ' (' + s.type + ')</strong>: ' + escapeHtml(s.description) + '</div>';
      }).join('');
      if (container) container.innerHTML = '<div><strong>' + escapeHtml(plan.title) + '</strong></div>'
        + '<div class="muted small">' + escapeHtml(plan.description || '') + '</div>'
        + '<div class="stepsList">' + (stepLines || '<div class="muted small">No steps found.</div>') + '</div>';
    } else if (msg && msg.command === 'planError') {
      const container = document.getElementById('planContent');
      if (container) container.innerHTML = '<div class="muted small">' + escapeHtml(msg.message || 'Failed to generate plan.') + '</div>';
    }
  });
})();
