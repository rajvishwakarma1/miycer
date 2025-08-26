import { Plan } from '../types/plan';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class PlanStorage {
  private context: vscode.ExtensionContext;
  private storageKey = 'miniTraycer.plans';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  save(plan: Plan) {
    const plans = this.loadAll();
    plans[plan.id] = plan;
    this.context.workspaceState.update(this.storageKey, plans);
  }

  load(id: string): Plan | undefined {
    const plans = this.loadAll();
    return plans[id];
  }

  loadAll(): Record<string, Plan> {
    return this.context.workspaceState.get<Record<string, Plan>>(this.storageKey, {});
  }

  saveToFile(plan: Plan, filePath: string) {
    fs.writeFileSync(filePath, JSON.stringify(plan, null, 2));
  }

  listSavedPlans(): Plan[] {
    return Object.values(this.loadAll());
  }

  delete(id: string) {
    const plans = this.loadAll();
    delete plans[id];
    this.context.workspaceState.update(this.storageKey, plans);
  }

  clearAll() {
    this.context.workspaceState.update(this.storageKey, {});
  }
}
