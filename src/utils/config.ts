import * as vscode from 'vscode';

export const config = {
  get(key: string, defaultValue?: any) {
    return vscode.workspace.getConfiguration('miniTraycer').get(key, defaultValue);
  },
  set(key: string, value: any, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global) {
    return vscode.workspace.getConfiguration('miniTraycer').update(key, value, target);
  },
  getApiKey() {
    return process.env.GEMINI_API_KEY || config.get('geminiApiKey');
  },
  async getApiKeyAsync(): Promise<string> {
    const env = process.env.GEMINI_API_KEY;
    if (env) return env;
    const fromSettings = config.get('geminiApiKey');
    if (fromSettings) return String(fromSettings);
    const entered = await vscode.window.showInputBox({
      prompt: 'Enter your Gemini API key',
      placeHolder: 'AIza... (kept locally in user settings)',
      ignoreFocusOut: true,
      password: true,
      validateInput: (v) => (v && v.trim().length > 10 ? undefined : 'Enter a valid key')
    });
    if (!entered) throw new Error('Gemini API key not provided.');
    await config.set('geminiApiKey', entered, vscode.ConfigurationTarget.Global);
    return entered;
  },
  getApiEndpoint() {
    return config.get('geminiApiEndpoint', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent');
  }
};
