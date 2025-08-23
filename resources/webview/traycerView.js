(function(){
  const vscode = acquireVsCodeApi();
  let initialized = false;
  function init(){
    if (initialized) return; initialized = true;
    const container = document.getElementById('planContent');
    if (container) container.innerHTML = '<div class="muted small">Ready.</div>';
    try { vscode.postMessage({ command: 'ready' }); } catch {}
    const send = () => {
      const txtEl = document.getElementById('taskText');
      const btn = document.getElementById('sendBtn');
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
    if (ta) ta.addEventListener('keydown', function(e){ if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send(); });
  }
  try { init(); } catch {}
  window.addEventListener('load', function(){ try { init(); } catch {} });
  window.addEventListener('message', function(event){
    const msg = event.data;
    const btn = document.getElementById('sendBtn');
    if (btn) btn.removeAttribute('disabled');
    if (msg && msg.command === 'readyAck') {
      // no-op
    } else if (msg && msg.command === 'planAck') {
      const container = document.getElementById('planContent');
      if (container) container.innerHTML = '<div class="muted small">Generating…</div>';
    } else if (msg && msg.command === 'planCreated' && msg.plan) {
      const plan = msg.plan;
      const container = document.getElementById('planContent');
      const stepLines = (plan.steps || []).map(function(s, i) {
        return '<div class="item"><strong>Step ' + (i+1) + ' (' + s.type + ')</strong>: ' + escapeHtml(s.description) + '</div>';
      }).join('');
      container.innerHTML = '<div><strong>' + escapeHtml(plan.title) + '</strong></div>'
        + '<div class="muted small">' + escapeHtml(plan.description || '') + '</div>'
        + '<div class="stepsList">' + (stepLines || '<div class="muted small">No steps found.</div>') + '</div>';
    } else if (msg && msg.command === 'planError') {
      const container = document.getElementById('planContent');
      if (container) container.innerHTML = '<div class="muted small">' + escapeHtml(msg.message || 'Failed to generate plan.') + '</div>';
    }
  });
  function escapeHtml(s){
    return String(s || '').replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]); });
  }
})();
