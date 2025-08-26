import * as vscode from 'vscode';

export const config = {
  get(key: string, defaultValue?: any) {
    return vscode.workspace.getConfiguration('miniTraycer').get(key, defaultValue);
  },
  set(key: string, value: any, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global) {
    return vscode.workspace.getConfiguration('miniTraycer').update(key, value, target);
  },
  isLikelyGeminiKey(key: string | undefined | null) {
    if (!key) return false;
    const k = String(key).trim();
    // Gemini keys often start with AIza and are > 25 chars
    return /^AIza[0-9A-Za-z_\-]{20,}$/.test(k);
  },
  getApiKey() {
    return process.env.GEMINI_API_KEY || config.get('geminiApiKey');
  },
  async getApiKeyAsync(): Promise<string> {
    const env = process.env.GEMINI_API_KEY;
    if (config.isLikelyGeminiKey(env)) return String(env).trim();
    const fromSettings = config.get('geminiApiKey');
    if (config.isLikelyGeminiKey(fromSettings)) return String(fromSettings).trim();
    const entered = await vscode.window.showInputBox({
      prompt: 'Enter your Gemini API key',
      placeHolder: 'AIza... (kept locally in user settings)',
      ignoreFocusOut: true,
      password: true,
      validateInput: (v) => (config.isLikelyGeminiKey(v) ? undefined : 'Enter a valid Gemini API key (starts with AIza...)')
    });
    if (!entered) throw new Error('Gemini API key not provided.');
    const trimmed = entered.trim();
    await config.set('geminiApiKey', trimmed, vscode.ConfigurationTarget.Global);
    return trimmed;
  },
  getApiEndpoint() {
    return config.get('geminiApiEndpoint', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent');
  }
};
