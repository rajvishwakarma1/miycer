import axios from 'axios';
import { config } from './config';
import { logger } from './logger';
import { ImageAttachment } from '../types/attachments';

function withKey(url: string, key: string) {
  if (url.includes('?')) return `${url}&key=${encodeURIComponent(key)}`;
  return `${url}?key=${encodeURIComponent(key)}`;
}

export const apiClient = {
  async generatePlan(prompt: string, attachments: ImageAttachment[] = []) {
  const apiKey = await config.getApiKeyAsync();
  let endpoint = config.getApiEndpoint();
  const url = withKey(endpoint, apiKey);
  const timeout = Number(config.get('requestTimeoutMs', 30000));
    const doCall = async () => {
      logger.debug('Calling Gemini', { endpoint: endpoint.split('?')[0], promptPreview: prompt.slice(0, 200) });
      // Build parts: user text + any inline images
      const parts: any[] = [{ text: prompt }];
      for (const att of attachments) {
        if (!att?.dataBase64) continue;
        parts.push({ inlineData: { mimeType: att.mime || 'image/png', data: att.dataBase64 } });
      }
      return axios.post(
        url,
        {
          contents: [
            {
              role: 'user',
              parts
            }
          ],
          generationConfig: {
            temperature: 0.4,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout
        }
      );
    };
    try {
      let response = await doCall();
      logger.info('Gemini API response received');
      // If no text returned, retry once with a strict JSON instruction
      const parts = response.data?.candidates?.[0]?.content?.parts;
      const gotText = Array.isArray(parts) && parts.some((p: any) => typeof p?.text === 'string' && p.text.trim());
      if (!gotText) {
        logger.warn('Empty response text; retrying with JSON-only instruction');
        const strictPrompt = `${prompt}\n\nReturn ONLY JSON matching this TypeScript type:\ninterface Plan { id: string; title: string; description: string; steps: { id: string; description: string; type: 'ANALYSIS'|'IMPLEMENTATION'|'TESTING'|'REFACTORING'|'DOCUMENTATION'|'OTHER'; dependencies?: string[]; estimatedEffort?: string; }[] }`;
    const retry = await axios.post(
          url,
          {
            contents: [
      { role: 'user', parts: [{ text: strictPrompt }] }
            ],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
          },
          { headers: { 'Content-Type': 'application/json' }, timeout }
        );
        logger.info('Gemini API retry response received');
        return retry.data;
      }
      return response.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const msg = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : (err?.message || String(err));
      // Handle rate limiting: retry once after short backoff
      if (status === 429) {
        logger.warn('Rate limited by Gemini (429). Retrying once after 1.5s backoff.');
        await new Promise(res => setTimeout(res, 1500));
        try {
          const retryResp = await doCall();
          logger.info('Gemini API response received after backoff');
          return retryResp.data;
        } catch (e2: any) {
          const s2 = e2?.response?.status;
          const d2 = e2?.response?.data;
          const m2 = d2 ? (typeof d2 === 'string' ? d2 : JSON.stringify(d2)) : (e2?.message || String(e2));
          logger.error('Gemini API error after retry', { status: s2, msg: m2 });
          throw new Error(`Gemini API error after retry (429): ${m2}`);
        }
      }
      // Clarify API key errors
      const lower = String(msg).toLowerCase();
      if (status === 400 && (lower.includes('api key') || lower.includes('key not found') || lower.includes('api_key_invalid'))) {
        const helpful = 'API key invalid or missing. Use the command: Mini-Traycer: Set Gemini API Key.';
        logger.error('Gemini API key error', { status, msg });
        throw new Error(helpful);
      }
      logger.error('Gemini API error', { status, msg });
      throw new Error(`Gemini API error (${status || 'no-status'}): ${msg}`);
    }
  }
};
