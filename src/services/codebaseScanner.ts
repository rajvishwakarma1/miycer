import { CodebaseSummary } from '../types/plan';
import { Project, SyntaxKind } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

export class CodebaseScanner {
  public scan(workspaceRoot: string): CodebaseSummary {
    // Handle no workspace or invalid root
    if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
      return { files: [], components: [], technologies: [], dependencies: [] };
    }
    // Shallow scan: list files
    const files = this.listSourceFiles(workspaceRoot);
    // Deep scan: extract components, technologies, dependencies
    const { components, technologies, dependencies } = this.analyzeFiles(files);
    return { files, components, technologies, dependencies };
  }

  private listSourceFiles(root: string): string[] {
    // Only .ts, .js, .tsx, .jsx files
    const result: string[] = [];
    const walk = (dir: string) => {
  if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
          if (!['node_modules', 'out', '.git'].includes(entry)) walk(fullPath);
        } else if (/\.(ts|js|tsx|jsx)$/.test(entry)) {
          result.push(fullPath);
        }
      }
    };
    walk(root);
    return result;
  }

  private analyzeFiles(files: string[]) {
    const project = new Project();
    const components: string[] = [];
    const technologies: Set<string> = new Set();
    const dependencies: Set<string> = new Set();
    for (const file of files) {
      project.addSourceFileAtPath(file);
    }
    for (const sourceFile of project.getSourceFiles()) {
      // Extract exports, imports, classes, functions
      sourceFile.getExportedDeclarations().forEach((decls, name) => {
        components.push(name);
      });
      sourceFile.getImportDeclarations().forEach(imp => {
        const module = imp.getModuleSpecifierValue();
        dependencies.add(module);
      });
      // Detect technologies by file extension
      const ext = path.extname(sourceFile.getFilePath());
      if (ext === '.tsx' || ext === '.jsx') technologies.add('React');
      if (ext === '.ts' || ext === '.js') technologies.add('TypeScript/JavaScript');
    }
    return {
      components,
      technologies: Array.from(technologies),
      dependencies: Array.from(dependencies)
    };
  }
}
