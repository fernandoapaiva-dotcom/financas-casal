import axios from 'axios';

export type IAProvedor = 'gemini' | 'claude' | 'openai';

export async function chamarIA(prompt: string, sistemaPrompt?: string): Promise<string> {
  const provedor = (process.env.IA_PROVEDOR || 'gemini').toLowerCase() as IAProvedor;

  try {
    if (provedor === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return '';

      const contentText = sistemaPrompt ? `${sistemaPrompt}\n\n${prompt}` : prompt;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: contentText }] }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (provedor === 'claude') {
      const apiKey = process.env.CLAUDE_API_KEY;
      if (!apiKey) return '';

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-haiku-4-5',
          max_tokens: 500,
          system: sistemaPrompt || undefined,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      );

      return response.data?.content?.[0]?.text || '';
    }

    if (provedor === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return '';

      const messages: any[] = [];
      if (sistemaPrompt) {
        messages.push({ role: 'system', content: sistemaPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          max_tokens: 500,
          messages
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data?.choices?.[0]?.message?.content || '';
    }

    return '';
  } catch (error) {
    console.error(`Erro ao chamar provedor de IA (${provedor}):`, error);
    return '';
  }
}
