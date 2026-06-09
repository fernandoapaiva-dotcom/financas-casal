import { Router, Request, Response, NextFunction } from 'express';
import { autenticacaoMiddleware } from '../middlewares/autenticacao';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { chamarIA } from '../services/iaService';

export const router = Router();

const CHAVES_PERMITIDAS = [
  'CLAUDE_API_KEY',
  'PLUGGY_CLIENT_ID',
  'PLUGGY_CLIENT_SECRET',
  'EVOLUTION_API_URL',
  'EVOLUTION_INSTANCE',
  'EVOLUTION_API_KEY',
  'IA_PROVEDOR',
  'GEMINI_API_KEY',
  'OPENAI_API_KEY'
];

const ENV_PATH = path.resolve(__dirname, '../../.env');

// Auxiliar para atualizar chave no arquivo .env
function atualizarEnv(chave: string, valor: string) {
  let conteudo = '';
  if (fs.existsSync(ENV_PATH)) {
    conteudo = fs.readFileSync(ENV_PATH, 'utf8');
  }

  const linhas = conteudo.split(/\r?\n/);
  let chaveEncontrada = false;

  const novasLinhas = linhas.map(linha => {
    // Procura linhas no formato CHAVE=... ou CHAVE = ... ou CHAVE="..."
    const regex = new RegExp(`^\\s*${chave}\\s*=`);
    if (regex.test(linha)) {
      chaveEncontrada = true;
      return `${chave}="${valor}"`;
    }
    return linha;
  });

  if (!chaveEncontrada) {
    novasLinhas.push(`${chave}="${valor}"`);
  }

  fs.writeFileSync(ENV_PATH, novasLinhas.join('\n'), 'utf8');
}

// GET /configuracoes/integracoes
router.get('/integracoes', autenticacaoMiddleware, (req: Request, res: Response) => {
  try {
    const claudeKey = process.env.CLAUDE_API_KEY || '';
    const pluggyId = process.env.PLUGGY_CLIENT_ID || '';
    const pluggySecret = process.env.PLUGGY_CLIENT_SECRET || '';
    const evolutionUrl = process.env.EVOLUTION_API_URL || '';
    const evolutionInst = process.env.EVOLUTION_INSTANCE || '';
    const evolutionKey = process.env.EVOLUTION_API_KEY || '';

    const previewKey = (key: string) => {
      if (!key) return undefined;
      return `...${key.slice(-4)}`;
    };

    res.json({
      dados: {
        claudeApi: {
          configurado: !!claudeKey,
          preview: previewKey(claudeKey)
        },
        pluggy: {
          configurado: !!(pluggyId && pluggySecret)
        },
        evolutionApi: {
          configurado: !!(evolutionUrl && evolutionInst && evolutionKey)
        },
        iaConfig: {
          provedor: process.env.IA_PROVEDOR || 'gemini',
          gemini: { configurado: !!process.env.GEMINI_API_KEY, preview: previewKey(process.env.GEMINI_API_KEY || '') },
          claude: { configurado: !!process.env.CLAUDE_API_KEY, preview: previewKey(process.env.CLAUDE_API_KEY || '') },
          openai: { configurado: !!process.env.OPENAI_API_KEY, preview: previewKey(process.env.OPENAI_API_KEY || '') }
        }
      },
      erro: false,
      mensagem: 'Integrações listadas com sucesso'
    });
  } catch (error: any) {
    res.status(500).json({
      dados: null,
      erro: true,
      mensagem: error.message || 'Erro ao carregar configurações'
    });
  }
});

// PUT /configuracoes/integracoes
router.put('/integracoes', autenticacaoMiddleware, (req: Request, res: Response) => {
  try {
    const { chave, valor } = req.body;

    if (!chave || !CHAVES_PERMITIDAS.includes(chave)) {
      res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Chave inválida ou não permitida'
      });
      return;
    }

    // Atualiza em runtime
    process.env[chave] = valor || '';

    // Persiste no arquivo .env
    atualizarEnv(chave, valor || '');

    res.json({
      dados: { atualizado: true },
      erro: false,
      mensagem: 'Chave atualizada com sucesso'
    });
  } catch (error: any) {
    res.status(500).json({
      dados: null,
      erro: true,
      mensagem: error.message || 'Erro ao atualizar chave'
    });
  }
});

// POST /configuracoes/integracoes/testar
router.post('/integracoes/testar', autenticacaoMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { integracao } = req.body;

  try {
    if (integracao === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.json({ dados: { sucesso: false, message: 'Chave do Gemini não configurada' }, erro: false });
        return;
      }

      // Backup do provedor atual para teste forçado do gemini
      const backupProvedor = process.env.IA_PROVEDOR;
      process.env.IA_PROVEDOR = 'gemini';
      const result = await chamarIA('Responda apenas: ok');
      process.env.IA_PROVEDOR = backupProvedor;

      if (result && result.toLowerCase().includes('ok')) {
        res.json({ dados: { sucesso: true, mensagem: 'Gemini respondendo com sucesso!' }, erro: false });
      } else {
        res.json({ dados: { sucesso: false, mensagem: 'Resposta inesperada ou vazia do Gemini' }, erro: false });
      }
      return;
    }

    if (integracao === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.json({ dados: { sucesso: false, mensagem: 'Chave da OpenAI não configurada' }, erro: false });
        return;
      }

      const backupProvedor = process.env.IA_PROVEDOR;
      process.env.IA_PROVEDOR = 'openai';
      const result = await chamarIA('Responda apenas: ok');
      process.env.IA_PROVEDOR = backupProvedor;

      if (result && result.toLowerCase().includes('ok')) {
        res.json({ dados: { sucesso: true, mensagem: 'OpenAI respondendo com sucesso!' }, erro: false });
      } else {
        res.json({ dados: { sucesso: false, mensagem: 'Resposta inesperada ou vazia da OpenAI' }, erro: false });
      }
      return;
    }

    if (integracao === 'claude') {
      const apiKey = process.env.CLAUDE_API_KEY;
      if (!apiKey) {
        res.json({ dados: { sucesso: false, mensagem: 'Chave da Claude API não configurada' }, erro: false });
        return;
      }

      const backupProvedor = process.env.IA_PROVEDOR;
      process.env.IA_PROVEDOR = 'claude';
      const result = await chamarIA('Responda apenas: ok');
      process.env.IA_PROVEDOR = backupProvedor;

      if (result && result.toLowerCase().includes('ok')) {
        res.json({ dados: { sucesso: true, mensagem: 'Claude respondendo com sucesso!' }, erro: false });
      } else {
        res.json({ dados: { sucesso: false, mensagem: 'Resposta inesperada ou vazia do Claude' }, erro: false });
      }
      return;
    }

    if (integracao === 'pluggy') {
      const clientId = process.env.PLUGGY_CLIENT_ID;
      const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        res.json({ dados: { sucesso: false, mensagem: 'Pluggy Client ID ou Secret não configurados' }, erro: false });
        return;
      }

      try {
        const response = await axios.post('https://api.pluggy.ai/auth', {
          clientId,
          clientSecret
        });
        if (response.data && response.data.apiKey) {
          res.json({ dados: { sucesso: true, mensagem: 'Conexão com Pluggy realizada com sucesso!' }, erro: false });
        } else {
          res.json({ dados: { sucesso: false, mensagem: 'Pluggy não retornou apiKey no login' }, erro: false });
        }
      } catch (err: any) {
        const errMsg = err.response?.data?.message || err.message;
        res.json({ dados: { sucesso: false, mensagem: `Erro Pluggy: ${errMsg}` }, erro: false });
      }
      return;
    }

    if (integracao === 'evolution') {
      const apiUrl = process.env.EVOLUTION_API_URL;
      const apiKey = process.env.EVOLUTION_API_KEY;
      const instance = process.env.EVOLUTION_INSTANCE;

      if (!apiUrl || !apiKey || !instance) {
        res.json({ dados: { sucesso: false, mensagem: 'Variáveis da Evolution API não configuradas totalmente' }, erro: false });
        return;
      }

      try {
        const cleanUrl = apiUrl.replace(/\/$/, '');
        const response = await axios.get(`${cleanUrl}/instance/connectionState/${instance}`, {
          headers: { apikey: apiKey }
        });
        const status = response.data?.instance?.state || 'unknown';
        res.json({ dados: { sucesso: true, mensagem: `Evolution API ativa! Estado da instância: ${status}` }, erro: false });
      } catch (err: any) {
        const errMsg = err.response?.data?.message || err.message;
        res.json({ dados: { sucesso: false, mensagem: `Erro Evolution API: ${errMsg}` }, erro: false });
      }
      return;
    }

    res.status(400).json({
      dados: null,
      erro: true,
      mensagem: 'Integração inválida'
    });
  } catch (error: any) {
    res.status(500).json({
      dados: null,
      erro: true,
      mensagem: error.message || 'Erro interno ao testar integração'
    });
  }
});
