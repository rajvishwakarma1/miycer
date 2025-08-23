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
}

export function deactivate() {
  logger.info('Mini-Traycer extension deactivated');
}
