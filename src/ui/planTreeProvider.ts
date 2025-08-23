import * as vscode from 'vscode';
import { Plan, PlanStep } from '../types/plan';

export class PlanTreeProvider implements vscode.TreeDataProvider<PlanTreeItem> {
  private plans: Plan[] = [];
  private extensionUri: vscode.Uri;
  private _onDidChangeTreeData: vscode.EventEmitter<PlanTreeItem | undefined | void> = new vscode.EventEmitter<PlanTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<PlanTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  setPlans(plans: Plan[]) {
    this.plans = plans;
    this._onDidChangeTreeData.fire();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PlanTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PlanTreeItem): Thenable<PlanTreeItem[]> {
    if (!element) {
      return Promise.resolve(this.plans.map(plan => {
        const item = new PlanTreeItem(plan.title, vscode.TreeItemCollapsibleState.Collapsed, plan);
        item.iconPath = getIconPaths(this.extensionUri, 'plan');
        return item;
      }));
    } else if (element.plan) {
      return Promise.resolve(element.plan.steps.map(step => {
        const item = new PlanTreeItem(step.description, vscode.TreeItemCollapsibleState.None, undefined, step);
        item.iconPath = getIconPaths(this.extensionUri, 'step');
        return item;
      }));
    }
    return Promise.resolve([]);
  }
}

export class PlanTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly plan?: Plan,
    public readonly step?: PlanStep
  ) {
    super(label, collapsibleState);
    this.contextValue = plan ? 'plan' : 'step';
  }
}

// Helper to build icon paths with proper vscode.Uri
export function getIconPaths(extensionUri: vscode.Uri, type: 'plan' | 'step'): { light: vscode.Uri; dark: vscode.Uri } {
  const file = type === 'plan' ? 'plan.svg' : 'step.svg';
  const rel = vscode.Uri.joinPath(extensionUri, 'resources', 'icons', file);
  return { light: rel, dark: rel };
}
