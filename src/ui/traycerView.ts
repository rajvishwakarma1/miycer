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
        const plan = await this.ui.createPlanFromRequirement(msg.text.trim());
        if (plan) {
          this.view?.webview.postMessage({ command: 'planCreated', plan: {
            id: plan.id,
            title: plan.title,
            description: plan.description,
            steps: plan.steps?.map(s => ({ id: s.id, description: s.description, type: s.type })) || []
          }});
        } else {
          this.view?.webview.postMessage({ command: 'planError', message: 'Failed to generate plan. Check logs from Mini-Traycer.' });
        }
      } else if (msg?.command === 'ready') {
        try { logger.info('TraycerView: webview ready'); } catch {}
        this.view?.webview.postMessage({ command: 'readyAck' });
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
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 8px; }
    .step { border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 10px; margin: 8px 0; }
    .step .title { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .badge { font-size: 11px; padding: 2px 6px; border-radius: 999px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    .muted { color: var(--vscode-descriptionForeground); font-size: 12px; }
    .input { display: flex; gap: 6px; align-items: stretch; margin-top: 10px; }
    textarea { flex: 1; min-height: 72px; resize: vertical; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 6px; padding: 8px; }
    button { padding: 6px 10px; border: none; border-radius: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; }
    .stepsList { margin-top: 6px; }
    .stepsList .item { border-left: 3px solid var(--vscode-panel-border); padding-left: 8px; margin: 6px 0; }
    .small { font-size: 11px; }
  </style>
</head>
<body>
  <div class="step">
    <div class="title">1. User Query <span class="badge">Step</span></div>
    <div class="muted small">Describe what you want to build. Keep it short and specific.</div>
    <div class="input">
      <textarea id="taskText" placeholder="e.g., Add health check endpoint"></textarea>
      <button id="sendBtn" title="Ctrl+Enter">Generate</button>
    </div>
  </div>

  <div class="step" id="planSpec">
    <div class="title">2. Plan Specification <span class="badge">Result</span></div>
    <div class="muted small">The specification will appear here after generation.</div>
    <div id="planContent" style="margin-top:6px;"></div>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
