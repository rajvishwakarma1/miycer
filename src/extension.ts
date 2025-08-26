import * as vscode from 'vscode';
import { PlanService } from './services/planGenerator';
import { PlanStorage } from './services/planStorage';
import { PlanExporter } from './services/planExporter';
import { UIController } from './ui/uiController';
import { CodebaseScanner } from './services/codebaseScanner';
import { logger } from './utils/logger';
import { TraycerViewProvider } from './ui/traycerView';

let uiController: UIController;
let planService: PlanService;
let planStorage: PlanStorage;
let planExporter: PlanExporter;
let codebaseScanner: CodebaseScanner;

export function activate(context: vscode.ExtensionContext) {
  logger.info('Mini-Traycer extension activated');

  planStorage = new PlanStorage(context);
  codebaseScanner = new CodebaseScanner();
  planService = new PlanService();
  planExporter = new PlanExporter();
  uiController = new UIController(context, planStorage, planService, planExporter, codebaseScanner);
  const traycerProvider = new TraycerViewProvider(context, uiController);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(TraycerViewProvider.viewId, traycerProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miniTraycer.createPlan', async () => {
      await uiController.createPlan();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miniTraycer.exportPlan', async () => {
      await uiController.exportPlan();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miniTraycer.clearAllPlans', async () => {
      await uiController.clearAllPlans();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('miniTraycer.setApiKey', async () => {
      const current = process.env.GEMINI_API_KEY || (vscode.workspace.getConfiguration('miniTraycer').get('geminiApiKey') as string | undefined) || '';
      const entered = await vscode.window.showInputBox({
        prompt: 'Enter your Gemini API key',
        placeHolder: 'AIza... (stored in user settings)',
        ignoreFocusOut: true,
        password: true,
        value: current,
        validateInput: (v) => (/^AIza[0-9A-Za-z_\-]{20,}$/.test(String(v || '').trim()) ? undefined : 'Enter a valid Gemini API key (starts with AIza...)')
      });
      if (!entered) return;
      await vscode.workspace.getConfiguration('miniTraycer').update('geminiApiKey', entered.trim(), vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage('Mini-Traycer: Gemini API key updated.');
    })
  );
}

export function deactivate() {
  logger.info('Mini-Traycer extension deactivated');
}
