import { Plan } from '../types/plan';
import * as vscode from 'vscode';
import * as fs from 'fs';

export class PlanExporter {
  exportToJSON(plan: Plan): string {
    return JSON.stringify(plan, null, 2);
  }

  exportToMarkdown(plan: Plan): string {
    // Load template and inject plan data
    // ...existing code...
    const steps = plan.steps.map((step, i) => [
      `### Step ${i + 1}: ${step.description}`,
      `- Type: ${step.type}`,
      step.dependencies?.length ? `- Dependencies: ${step.dependencies.join(', ')}` : undefined,
      step.estimatedEffort ? `- Estimated Effort: ${step.estimatedEffort}` : undefined
    ].filter(Boolean).join('\n')).join('\n\n');
    return `# ${plan.title}\n\n${plan.description}\n\n## Steps\n${steps}\n\n---\n\n*Exported from Mini-Traycer*`;
  }

  exportToText(plan: Plan): string {
    return `${plan.title}\n${plan.description}\nSteps:\n${plan.steps.map((step, i) => `${i + 1}. ${step.description}`).join('\n')}`;
  }

  copyToClipboard(content: string) {
    vscode.env.clipboard.writeText(content);
  }

  saveToFile(content: string, filePath: string) {
    fs.writeFileSync(filePath, content);
  }
}
