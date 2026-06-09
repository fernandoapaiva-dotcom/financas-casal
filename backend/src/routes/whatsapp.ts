import { Router, Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import { processarMensagem } from '../services/ragService'
import { enviarMensagem } from '../services/evolutionService'
import { autenticacaoMiddleware } from '../middlewares/autenticacao'

const prisma = new PrismaClient()
export const router = Router()

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function evolutionHeaders() {
  return { apikey: process.env.EVOLUTION_API_KEY || '' }
}

function evolutionBase() {
  return (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '')
}

function evolutionInstance() {
  return process.env.EVOLUTION_INSTANCE || 'financas-casal'
}

// ---------------------------------------------------------------------------
// GET /whatsapp/status  (requer autenticacao)
// ---------------------------------------------------------------------------
router.get('/status', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const base = evolutionBase()

    if (!base) {
      return res.json({
        dados: { conectado: false, estado: 'não configurado', numero: null },
        erro: false,
        mensagem: '',
      })
    }

    const resposta = await axios.get(`${base}/instance/fetchInstances`, {
      headers: evolutionHeaders(),
      timeout: 8000,
    })

    const instancias: any[] = Array.isArray(resposta.data) ? resposta.data : []
    const instancia = instancias.find(
      (i: any) => i.instance?.instanceName === evolutionInstance() || i.name === evolutionInstance()
    )

    if (!instancia) {
      return res.json({
        dados: { conectado: false, estado: 'instância não encontrada', numero: null },
        erro: false,
        mensagem: '',
      })
    }

    // Extrai estado e número de acordo com a versão da Evolution API
    const estado: string =
      instancia.instance?.state || instancia.instance?.status || instancia.state || 'desconhecido'
    const numero: string | null =
      instancia.instance?.ownerJid?.split('@')[0] ||
      instancia.ownerJid?.split('@')[0] ||
      null

    const conectado = estado === 'open' || estado === 'connected'

    return res.json({
      dados: { conectado, estado, numero },
      erro: false,
      mensagem: '',
    })
  } catch (error: any) {
    // Se a Evolution API não estiver acessível
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return res.json({
        dados: { conectado: false, estado: 'Evolution API inacessível', numero: null },
        erro: false,
        mensagem: '',
      })
    }
    next(error)
  }
})

// ---------------------------------------------------------------------------
// POST /whatsapp/criar-instancia  (requer autenticacao)
// ---------------------------------------------------------------------------
router.post('/criar-instancia', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const base = evolutionBase()
    if (!base) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Evolution API não configurada. Salve as credenciais antes.',
      })
    }

    await axios.post(
      `${base}/instance/create`,
      {
        instanceName: evolutionInstance(),
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      },
      { headers: evolutionHeaders(), timeout: 10000 }
    )

    return res.json({
      dados: { instanciaCriada: true },
      erro: false,
      mensagem: 'Instância criada com sucesso',
    })
  } catch (error: any) {
    // 409 = instância já existe — não é um erro real
    if (error.response?.status === 409) {
      return res.json({
        dados: { instanciaCriada: true },
        erro: false,
        mensagem: 'Instância já existente',
      })
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        dados: null,
        erro: true,
        mensagem: 'Evolution API inacessível. Verifique se está rodando.',
      })
    }
    next(error)
  }
})

// ---------------------------------------------------------------------------
// GET /whatsapp/qrcode  (requer autenticacao)
// ---------------------------------------------------------------------------
router.get('/qrcode', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const base = evolutionBase()
    if (!base) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Evolution API não configurada.',
      })
    }

    const resposta = await axios.get(
      `${base}/instance/connect/${evolutionInstance()}`,
      { headers: evolutionHeaders(), timeout: 10000 }
    )

    const data = resposta.data
    // A Evolution API pode retornar o base64 em locais diferentes dependendo da versão
    const qrcode: string =
      data?.base64 ||
      data?.qrcode?.base64 ||
      data?.code ||
      ''

    if (!qrcode) {
      return res.status(404).json({
        dados: null,
        erro: true,
        mensagem: 'QR Code não disponível. Tente novamente em instantes.',
      })
    }

    // Remove prefixo "data:image/png;base64," se já vier incluído
    const base64Limpo = qrcode.replace(/^data:image\/[a-z]+;base64,/, '')

    return res.json({
      dados: { qrcode: base64Limpo },
      erro: false,
      mensagem: '',
    })
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        dados: null,
        erro: true,
        mensagem: 'Evolution API inacessível.',
      })
    }
    next(error)
  }
})

// ---------------------------------------------------------------------------
// DELETE /whatsapp/desconectar  (requer autenticacao)
// ---------------------------------------------------------------------------
router.delete('/desconectar', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const base = evolutionBase()
    if (!base) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Evolution API não configurada.',
      })
    }

    await axios.delete(
      `${base}/instance/logout/${evolutionInstance()}`,
      { headers: evolutionHeaders(), timeout: 10000 }
    )

    return res.json({
      dados: null,
      erro: false,
      mensagem: 'WhatsApp desconectado',
    })
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        dados: null,
        erro: true,
        mensagem: 'Evolution API inacessível.',
      })
    }
    next(error)
  }
})

// ---------------------------------------------------------------------------
// POST /whatsapp/webhook  (Sem autenticação JWT — chamado pela Evolution API)
// ---------------------------------------------------------------------------
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body

    if (event !== 'messages.upsert') {
      return res.status(200).json({ recebido: true })
    }

    const remoteJid = data?.key?.remoteJid || ''
    const fromMe = data?.key?.fromMe

    if (remoteJid.includes('@g.us') || fromMe) {
      return res.status(200).json({ recebido: true })
    }

    const telefone = remoteJid.split('@')[0]
    const texto = data?.message?.conversation || data?.message?.extendedTextMessage?.text || ''

    if (!texto.trim()) {
      return res.status(200).json({ recebido: true })
    }

    const usuario = await prisma.usuario.findFirst({
      where: { telefone, deletadoEm: null },
    })

    if (!usuario) {
      await enviarMensagem(
        telefone,
        'Olá! Seu número não está cadastrado no FinançasCasal. Acesse o aplicativo e cadastre seu telefone nas configurações para começar a usar o bot.'
      )
      return res.status(200).json({ recebido: true })
    }

    const membro = await prisma.membroCasal.findFirst({
      where: { usuarioId: usuario.id },
    })

    if (!membro) {
      await enviarMensagem(
        telefone,
        'Olá! Você está cadastrado, mas ainda não faz parte de um Casal. Por favor, configure sua parceria no aplicativo.'
      )
      return res.status(200).json({ recebido: true })
    }

    const resposta = await processarMensagem(telefone, texto, membro.casalId)
    await enviarMensagem(telefone, resposta)

    return res.status(200).json({ recebido: true })
  } catch (error) {
    console.error('Erro no webhook de whatsapp:', error)
    return res.status(200).json({ recebido: true })
  }
})

// ---------------------------------------------------------------------------
// POST /whatsapp/teste  (requer autenticacao)
// ---------------------------------------------------------------------------
router.post('/teste', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mensagem } = req.body

    if (!mensagem) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'O campo mensagem é obrigatório',
      })
    }

    const casalId = req.usuario!.casalId
    const telefone = 'teste-api'

    const resposta = await processarMensagem(telefone, mensagem, casalId)

    return res.status(200).json({
      dados: { resposta },
      erro: false,
      mensagem: '',
    })
  } catch (error: any) {
    console.error('Erro na rota de teste do RAG:', error)
    return res.status(500).json({
      dados: null,
      erro: true,
      mensagem: 'Erro interno ao processar teste do bot',
    })
  }
})
