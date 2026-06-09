import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { processarMensagem } from '../services/ragService'
import { enviarMensagem } from '../services/evolutionService'
import { autenticacaoMiddleware } from '../middlewares/autenticacao'

const prisma = new PrismaClient()
export const router = Router()

// Webhook da Evolution API (Sem autenticação JWT)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body

    // Ignora eventos que não sejam de mensagens recebidas
    if (event !== 'messages.upsert') {
      return res.status(200).json({ recebido: true })
    }

    const remoteJid = data?.key?.remoteJid || ''
    const fromMe = data?.key?.fromMe

    // Ignora mensagens de grupos ou enviadas pelo próprio bot
    if (remoteJid.includes('@g.us') || fromMe) {
      return res.status(200).json({ recebido: true })
    }

    const telefone = remoteJid.split('@')[0]
    const texto = data?.message?.conversation || data?.message?.extendedTextMessage?.text || ''

    if (!texto.trim()) {
      return res.status(200).json({ recebido: true })
    }

    // Busca usuário cadastrado por telefone
    const usuario = await prisma.usuario.findFirst({
      where: {
        telefone,
        deletadoEm: null,
      },
    })

    if (!usuario) {
      await enviarMensagem(
        telefone,
        'Olá! Seu número não está cadastrado no FinançasCasal. Acesse o aplicativo e cadastre seu telefone nas configurações para começar a usar o bot.'
      )
      return res.status(200).json({ recebido: true })
    }

    // Busca o casal do usuário
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

    // Processa de forma assíncrona para responder a Evolution API rapidamente
    // Mas aguardamos o resultado interno para poder responder via whatsapp
    const resposta = await processarMensagem(telefone, texto, membro.casalId)
    await enviarMensagem(telefone, resposta)

    return res.status(200).json({ recebido: true })
  } catch (error) {
    console.error('Erro no webhook de whatsapp:', error)
    return res.status(200).json({ recebido: true }) // Nunca retornar erro HTTP à Evolution API
  }
})

// Rota de teste do RAG via requisição autenticada
router.post('/teste', autenticacaoMiddleware, async (req: Request, res: Response) => {
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
