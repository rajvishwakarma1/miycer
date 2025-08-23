import * as vscode from 'vscode';

export const logger = {
  debug: (msg: string, ...args: any[]) => output('DEBUG', msg, ...args),
  info: (msg: string, ...args: any[]) => output('INFO', msg, ...args),
  warn: (msg: string, ...args: any[]) => output('WARN', msg, ...args),
  error: (msg: string, ...args: any[]) => output('ERROR', msg, ...args),
  show: () => channel.show(true),
};

const channel = vscode.window.createOutputChannel('Mini-Traycer');

function fmt(arg: any): string {
  if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
  try {
    return typeof arg === 'string' ? arg : JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function output(level: string, msg: string, ...args: any[]) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg} ${args.map(fmt).join(' ')}`;
  channel.appendLine(line);
}
