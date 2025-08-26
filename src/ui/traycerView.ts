import * as vscode from 'vscode';
import { UIController } from './uiController';
import { logger } from '../utils/logger';

export class TraycerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'traycerPanel';
  private view?: vscode.WebviewView;
  private context: vscode.ExtensionContext;
  private ui: UIController;

  constructor(context: vscode.ExtensionContext, ui: UIController) {
    this.context = context;
    this.ui = ui;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this.context.extensionUri,
        vscode.Uri.joinPath(this.context.extensionUri, 'out')
      ]
    };
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg?.command === 'createPlan' && typeof msg.text === 'string' && msg.text.trim()) {
        try {
          logger.info('TraycerView: received createPlan from webview', msg.text.slice(0, 120));
        } catch {}
        // immediate ack so UI can react
        this.view?.webview.postMessage({ command: 'planAck' });
        const plan = await this.ui.createPlanFromRequirement(msg.text.trim(), Array.isArray(msg.attachments) ? msg.attachments : []);
        if (plan) {
          this.view?.webview.postMessage({ command: 'planCreated', plan: {
            id: plan.id,
            title: plan.title,
            description: plan.description,
            steps: plan.steps?.map(s => ({ id: s.id, description: s.description, type: s.type })) || []
          }});
          try {
            const plans = this.ui.listSavedPlans().map(p => ({ id: p.id, title: p.title, description: p.description, stepCount: (p.steps || []).length }));
            this.view?.webview.postMessage({ command: 'savedPlans', plans });
          } catch {}
        } else {
          this.view?.webview.postMessage({ command: 'planError', message: 'Failed to generate plan. Check logs from Mini-Traycer.' });
        }
      } else if (msg?.command === 'ready') {
        try { logger.info('TraycerView: webview ready'); } catch {}
        this.view?.webview.postMessage({ command: 'readyAck' });
        // Also send any saved plans so the webview can render them
        try {
          const plans = this.ui.listSavedPlans().map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            stepCount: (p.steps || []).length
          }));
          this.view?.webview.postMessage({ command: 'savedPlans', plans });
        } catch (e) {
          logger.warn('Failed to send saved plans to webview', e as any);
        }
      } else if (msg?.command === 'openSetApiKey') {
        try {
          await vscode.commands.executeCommand('miniTraycer.setApiKey');
        } catch (e) {
          logger.error('Failed to open Set API Key command', e);
        }
      } else if (msg?.command === 'requestEditQuery') {
        try {
          const edited = await vscode.window.showInputBox({
            title: 'Edit query',
            prompt: 'Refine your query',
            value: typeof msg.text === 'string' ? msg.text : '',
            ignoreFocusOut: true
          });
          if (typeof edited === 'string') {
            this.view?.webview.postMessage({ command: 'queryUpdated', text: edited });
          }
        } catch (e) {
          logger.error('Failed to edit query', e);
        }
      } else if (msg?.command === 'copyToClipboard' && typeof msg.text === 'string') {
        try {
          await vscode.env.clipboard.writeText(msg.text);
          if (msg.toast) {
            vscode.window.showInformationMessage(String(msg.toast));
          }
        } catch (e) {
          logger.error('Failed to copy to clipboard', e);
        }
  } else if (msg?.command === 'runInCopilot' && typeof msg.text === 'string') {
        const prompt = String(msg.text);
        try {
          // Copy prompt and open the Chat UI for user continuity.
          await vscode.env.clipboard.writeText(prompt);
          try { await vscode.commands.executeCommand('vscode.editorChat.start'); } catch {}

          // Experimental attempt: send via Language Model API (does not show in Copilot Chat UI).
          const vsAny: any = vscode as any;
          if (vsAny?.lm?.selectChatModels && vsAny?.LanguageModelChatMessage) {
            try {
              // Try with a specific family first, then fallback to any Copilot chat model.
              let models = await vsAny.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
              if (!models || models.length === 0) {
                models = await vsAny.lm.selectChatModels({ vendor: 'copilot' });
              }
              if (models && models.length) {
                const model = models[0];
                const cts = new vscode.CancellationTokenSource();
                const msgs = [vscode.LanguageModelChatMessage.User(prompt)];
                model.sendRequest(msgs, {}, cts.token).catch((err: any) => {
                  logger.error('Copilot LM sendRequest failed', err);
                });
                vscode.window.showInformationMessage('Prompt copied and sent to Copilot model. Paste in Chat to continue the conversation.');
                return;
              }
            } catch (e) {
              logger.warn('Copilot LM API not available or failed', e as any);
            }
          }
          // Fallback UX
          vscode.window.showInformationMessage('Prompt copied. Paste into Copilot Chat and press Enter.');
        } catch (e) {
          logger.error('Failed to run prompt in Copilot', e);
          try { await vscode.env.clipboard.writeText(prompt); } catch {}
          vscode.window.showErrorMessage('Prompt copied to clipboard. Open Copilot Chat and paste to run.');
        }
      } else if (msg?.command === 'deleteAllPlans') {
        try {
          await vscode.commands.executeCommand('miniTraycer.clearAllPlans');
          // Refresh saved plans in webview
          try {
            const plans = this.ui.listSavedPlans().map(p => ({ id: p.id, title: p.title, description: p.description, stepCount: (p.steps || []).length }));
            this.view?.webview.postMessage({ command: 'savedPlans', plans });
          } catch {}
        } catch (e) {
          logger.error('Failed to delete all plans', e);
        }
    } else if (msg?.command === 'loadSavedPlan' && typeof msg.id === 'string') {
        try {
      const plan = this.ui.getPlanById(msg.id);
          if (plan) {
            this.view?.webview.postMessage({ command: 'planCreated', plan: {
              id: plan.id,
              title: plan.title,
              description: plan.description,
              steps: plan.steps?.map(s => ({ id: s.id, description: s.description, type: s.type })) || []
            }});
          }
        } catch (e) {
          logger.error('Failed to load saved plan into webview', e);
        }
      }
    });
    const scriptUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', 'traycerView.js')
    );
    webviewView.webview.html = this.getHtml(webviewView.webview, scriptUri);
  }

  private getHtml(webview: vscode.Webview, scriptUri: vscode.Uri): string {
    const nonce = String(Date.now());
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src ${webview.cspSource} 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
  :root{
    --card-bg: var(--vscode-editorWidget-background);
    --card-border: var(--vscode-editorWidget-border);
    --muted: var(--vscode-descriptionForeground);
    --accent: var(--vscode-button-background);
    --accent-fore: var(--vscode-button-foreground);
    --accent-hover: var(--vscode-button-hoverBackground);
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 8px; margin: 0; }
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  .content { flex: 1 1 auto; padding-bottom: 12px; }
  .footer { margin-top: auto; position: sticky; bottom: 0; width: 100%; background: var(--vscode-sideBar-background, transparent); padding: 8px 0 10px; border-top: 1px solid var(--card-border); z-index: 1; }
  .footer-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; align-items: center; }
  .step { border: 1px solid var(--card-border); background: var(--card-bg); border-radius: 8px; padding: 12px; margin: 8px 0; }
  .step .title { display: flex; align-items: center; gap: 8px; font-weight: 600; }
  .badge { font-size: 11px; padding: 2px 6px; border-radius: 999px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
  .muted { color: var(--muted); font-size: 12px; }
  .input { display: flex; gap: 6px; align-items: stretch; margin-top: 10px; }
  textarea { flex: 1; min-height: 72px; resize: vertical; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 6px; padding: 8px; }
  button { padding: 6px 10px; border: none; border-radius: 6px; background: var(--accent); color: var(--accent-fore); cursor: pointer; }
  button.secondary { background: transparent; border: 1px solid var(--card-border); color: var(--vscode-foreground); }
  button:hover { background: var(--accent-hover); }
  .icon { background: transparent; border: 1px solid var(--card-border); color: var(--vscode-foreground); }
  .stepsList { margin-top: 6px; }
  .stepsList .item { border-left: 3px solid var(--card-border); padding-left: 8px; margin: 6px 0; cursor: pointer; }
  .small { font-size: 11px; }
  .thumbs { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
  .thumb { position:relative; border:1px solid var(--card-border); border-radius:6px; overflow:hidden; width:44px; height:44px; }
  .thumb img { width:100%; height:100%; object-fit:cover; }
  .thumb .x { position:absolute; top:-6px; right:-6px; background:#0008; color:#fff; border:0; border-radius:10px; width:18px; height:18px; font-size:11px; cursor:pointer; }
  </style>
</head>
<body>
  <div class="app">
    <div class="content">
      <div class="step">
        <div class="title">1. User Query <span class="badge">Step</span></div>
        <div class="muted small">Describe what you want to build. Attach screenshots if helpful.</div>
        <div class="input">
          <textarea id="taskText" placeholder="e.g., Add health check endpoint"></textarea>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button class="icon" id="attachBtn" title="Upload image">📎</button>
            <button id="sendBtn" title="Ctrl+Enter">Generate</button>
          </div>
          <input id="fileInput" type="file" accept="image/*" style="display:none" />
        </div>
        <div id="thumbs" class="thumbs"></div>
        <div class="small" style="margin-top:6px; display:none;" id="editQueryRow">
          <button id="editQueryBtn" style="background:transparent; color: var(--vscode-textLink-foreground); padding:0;">Edit…</button>
          <span class="muted" style="margin-left:6px;">refine your query inline</span>
        </div>
        <div class="small" style="margin-top:6px; display:none; gap:8px; align-items:center;" id="inlineEditActions">
          <button id="saveEditBtn">Save</button>
          <button id="cancelEditBtn" style="background:var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);">Cancel</button>
        </div>
      </div>

      <div class="step" id="planSpec">
        <div class="title">2. Plan Specification <span class="badge">Result</span></div>
        <div class="muted small">The specification will appear here after generation.</div>
        <div id="planContent" style="margin-top:6px;"></div>
      </div>

      <div class="step" id="savedPlans">
        <div class="title">Saved Plans <span class="badge">History</span></div>
        <div class="muted small">Open an existing plan from this workspace.</div>
        <div id="savedPlansList" style="margin-top:6px;"></div>
      </div>

      <div id="phases"></div>
    </div>

    <div class="footer">
      <div class="footer-actions">
        <button id="addPhaseBtn" title="Add a new phase">Add new phase</button>
        <button id="exportCopilotBtn" title="Copy a Copilot-ready prompt from this plan" disabled>Export to Copilot</button>
        <button id="deleteAllPlansBtn" title="Delete all saved plans">Delete all plans</button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
