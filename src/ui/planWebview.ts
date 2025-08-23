import * as vscode from 'vscode';
import { Plan } from '../types/plan';

export class PlanWebview {
  private panel: vscode.WebviewPanel | undefined;
  private currentPlan: Plan | undefined;
  private onExport?: (plan: Plan) => void;

  show(plan: Plan) {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'miniTraycerPlan',
        `Plan: ${plan.title}`,
        vscode.ViewColumn.One,
        { enableScripts: true }
      );
      this.panel.onDidDispose(() => { this.panel = undefined; });
      this.panel.webview.onDidReceiveMessage((message) => {
        if (message?.command === 'export' && this.currentPlan && this.onExport) {
          this.onExport(this.currentPlan);
        }
      });
    }
    this.currentPlan = plan;
    this.panel.webview.html = this.getHtml(plan);
  }

  setOnExport(handler: (plan: Plan) => void) {
    this.onExport = handler;
  }

  private getHtml(plan: Plan): string {
    // Basic interactive editor UI
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plan Editor</title>
  <style>
    body { font-family: sans-serif; margin: 1em; }
    .step { margin-bottom: 1em; padding: 1em; border: 1px solid #ccc; border-radius: 4px; }
    .step-title { font-weight: bold; }
    .step-type { font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <h1>${plan.title}</h1>
  <p>${plan.description}</p>
  <div id="steps">
    ${plan.steps.map((step, i) => `<div class="step"><div class="step-title">Step ${i + 1}: ${step.description}</div><div class="step-type">Type: ${step.type}</div></div>`).join('')}
  </div>
  <button onclick="exportPlan()">Export</button>
  <script>
    const vscode = acquireVsCodeApi();
    function exportPlan() {
      vscode.postMessage({ command: 'export' });
    }
  </script>
</body>
</html>`;
  }
}
