import * as vscode from 'vscode';
import { PlanStorage } from '../services/planStorage';
import { PlanService } from '../services/planGenerator';
import { PlanExporter } from '../services/planExporter';
import { CodebaseScanner } from '../services/codebaseScanner';
import { PlanTreeProvider } from './planTreeProvider';
import { PlanWebview } from './planWebview';
import { Plan } from '../types/plan';
import { ImageAttachment } from '../types/attachments';
import { logger } from '../utils/logger';

export class UIController {
  private planTreeProvider: PlanTreeProvider;
  private planWebview: PlanWebview;
  private planStorage: PlanStorage;
  private planService: PlanService;
  private planExporter: PlanExporter;
  private codebaseScanner: CodebaseScanner;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, planStorage: PlanStorage, planService: PlanService, planExporter: PlanExporter, codebaseScanner: CodebaseScanner) {
    this.context = context;
    this.planStorage = planStorage;
    this.planService = planService;
    this.planExporter = planExporter;
    this.codebaseScanner = codebaseScanner;
    this.planTreeProvider = new PlanTreeProvider(context.extensionUri);
  this.planWebview = new PlanWebview();
  this.planWebview.setOnExport((plan) => this.exportPlanToFile(plan));
    vscode.window.registerTreeDataProvider('planTree', this.planTreeProvider);
  }

  async createPlan(): Promise<Plan | undefined> {
    const requirement = await vscode.window.showInputBox({ prompt: 'Describe the coding task or feature to plan.' });
    if (!requirement) return;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showInformationMessage('No workspace folder open; generating plan without codebase context.');
    }
    const codebase = this.codebaseScanner.scan(workspaceRoot || '');
    let result: Plan | undefined;
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Generating plan...' }, async () => {
      try {
        const plan = await this.planService.generatePlan({ requirement, codebase });
        this.planStorage.save(plan);
        this.planTreeProvider.setPlans(this.planStorage.listSavedPlans());
        this.planWebview.show(plan);
        logger.info('Plan generated and displayed.');
        result = plan;
      } catch (err) {
        logger.error('Plan generation failed', err);
        const choice = await vscode.window.showErrorMessage('Failed to generate plan. View logs?', 'Open Logs');
        if (choice === 'Open Logs') {
          logger.show();
        }
      }
    });
    return result;
  }

  // Expose saved plans for webview to pre-populate list
  listSavedPlans(): Plan[] {
    try {
      return this.planStorage.listSavedPlans();
    } catch {
      return [];
    }
  }

  getPlanById(id: string): Plan | undefined {
    try {
      return this.planStorage.load(id);
    } catch {
      return undefined;
    }
  }

  async createPlanFromRequirement(requirement: string, attachments: ImageAttachment[] = []): Promise<Plan | undefined> {
    if (!requirement?.trim()) return undefined;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showInformationMessage('No workspace folder open; generating plan without codebase context.');
    }
    const codebase = this.codebaseScanner.scan(workspaceRoot || '');
    let result: Plan | undefined;
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Generating plan...' }, async () => {
      try {
        const plan = await this.planService.generatePlan({ requirement, codebase }, attachments);
        this.planStorage.save(plan);
        this.planTreeProvider.setPlans(this.planStorage.listSavedPlans());
        this.planWebview.show(plan);
        logger.info('Plan generated and displayed.');
        result = plan;
      } catch (err) {
        logger.error('Plan generation failed', err);
        const choice = await vscode.window.showErrorMessage('Failed to generate plan. View logs?', 'Open Logs');
        if (choice === 'Open Logs') logger.show();
      }
    });
    return result;
  }

  async exportPlan() {
    const plans = this.planStorage.listSavedPlans();
    if (plans.length === 0) {
      vscode.window.showInformationMessage('No plans to export.');
      return;
    }
    const planTitles = plans.map(p => p.title);
    const selected = await vscode.window.showQuickPick(planTitles, { placeHolder: 'Select a plan to export' });
    if (!selected) return;
    const plan = plans.find(p => p.title === selected)!;
    const format = await vscode.window.showQuickPick(['JSON', 'Markdown', 'Text'], { placeHolder: 'Select export format' });
    if (!format) return;
    let content = '';
    if (format === 'JSON') content = this.planExporter.exportToJSON(plan);
    else if (format === 'Markdown') content = this.planExporter.exportToMarkdown(plan);
    else content = this.planExporter.exportToText(plan);
    this.planExporter.copyToClipboard(content);
    vscode.window.showInformationMessage('Plan exported to clipboard.');
  }

  private async exportPlanToFile(plan: Plan) {
  const md = this.planExporter.exportToMarkdown(plan);
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const preferredTitle = (plan.metadata?.derivedTitle as string) || plan.title;
  const safeTitle = preferredTitle.replace(/[^a-z0-9\-_]+/gi, '-').replace(/-+/g, '-');
    const defaultName = `${safeTitle || 'plan'}.md`;

    // Ask user where to save
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Save to workspace root', description: workspaceRoot || 'No workspace open' },
        { label: 'Choose folder…', description: 'Pick a folder to save the Markdown file' }
      ],
      { placeHolder: 'Where should the plan be saved?' }
    );
    if (!choice) return;

    let targetDir: string | undefined;
    if (choice.label === 'Choose folder…') {
      const selected = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select folder',
        defaultUri: workspaceRoot ? vscode.Uri.file(workspaceRoot) : undefined
      });
      if (!selected || selected.length === 0) return; // user cancelled
      targetDir = selected[0].fsPath;
    } else {
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('Open a workspace folder or choose a folder to save the plan.');
        return;
      }
      targetDir = workspaceRoot;
    }

    const path = require('path');
    const fs = require('fs');
    const filePath = path.join(targetDir, defaultName);
    try {
      fs.writeFileSync(filePath, md, 'utf8');
      vscode.window.showInformationMessage(`Plan saved to ${filePath}`);
    } catch (e) {
      vscode.window.showErrorMessage('Failed to save plan file. See logs.');
    }
  }

  async clearAllPlans() {
    const confirm = await vscode.window.showWarningMessage(
      'Delete all saved Mini-Traycer plans? This cannot be undone.',
      { modal: true },
      'Delete All'
    );
    if (confirm !== 'Delete All') return;
    this.planStorage.clearAll();
    this.planTreeProvider.setPlans([]);
    vscode.window.showInformationMessage('All Mini-Traycer plans have been deleted.');
  }
}
