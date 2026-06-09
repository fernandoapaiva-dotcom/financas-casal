import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticacaoMiddleware } from '../middlewares/autenticacao'
import { chamarIA } from '../services/iaService'

const prisma = new PrismaClient()
export const router = Router()

// GET /alertas - Busca alertas ativos para o casal
router.get('/', autenticacaoMiddleware, async (req: Request, res: Response) => {
  try {
    const casalId = req.usuario!.casalId
    const alertas = []

    const agora = new Date()
    const diaAtual = agora.getDate()
    const mesAtual = agora.getMonth() + 1
    const anoAtual = agora.getFullYear()

    // 1. Contas fixas vencendo nos próximos 5 dias
    const contasFixas = await prisma.contaFixa.findMany({
      where: {
        casalId,
        ativa: true,
        deletadoEm: null,
      },
    })

    contasFixas.forEach((cf) => {
      const diferenca = cf.diaVencimento - diaAtual
      if (diferenca >= 0 && diferenca <= 5) {
        alertas.push({
          tipo: 'VENCIMENTO',
          titulo: `Conta fixa próxima ao vencimento`,
          mensagem: `A conta "${cf.nome}" de R$ ${cf.valor.toFixed(2)} vence daqui a ${diferenca} dias (dia ${cf.diaVencimento}).`,
          urgente: diferenca <= 1,
        })
      }
    })

    // 2. Categorias que ultrapassaram 90% do orçamento do mês
    const orcamentosCategorias = await prisma.orcamentoCategoria.findMany({
      where: {
        casalId,
        mes: mesAtual,
        ano: anoAtual,
      },
    })

    const transacoesMes = await prisma.transacao.findMany({
      where: {
        casalId,
        deletadoEm: null,
        tipo: 'DEBITO',
        data: {
          gte: new Date(Date.UTC(anoAtual, mesAtual - 1, 1)),
          lte: new Date(Date.UTC(anoAtual, mesAtual, 0, 23, 59, 59, 999)),
        },
      },
    })

    const gastosCategoria: Record<string, number> = {}
    transacoesMes.forEach((t) => {
      const cat = t.categoria || 'Outro'
      gastosCategoria[cat] = (gastosCategoria[cat] || 0) + t.valor
    })

    orcamentosCategorias.forEach((oc) => {
      const gasto = gastosCategoria[oc.categoria] || 0
      const percent = (gasto / oc.limiteValor) * 100
      if (percent >= 90) {
        alertas.push({
          tipo: 'ORCAMENTO',
          titulo: `Limite de orçamento estourando`,
          mensagem: `Os gastos na categoria "${oc.categoria}" atingiram ${percent.toFixed(0)}% do limite de R$ ${oc.limiteValor.toFixed(2)} (Gasto atual: R$ ${gasto.toFixed(2)}).`,
          urgente: percent >= 100,
        })
      }
    })

    // Também verifica orçamento global do casal
    const casal = await prisma.casal.findUnique({ where: { id: casalId } })
    if (casal && casal.orcamentoMensal) {
      const totalGasto = transacoesMes.reduce((acc, curr) => acc + curr.valor, 0)
      const percentGlobal = (totalGasto / casal.orcamentoMensal) * 100
      if (percentGlobal >= 90) {
        alertas.push({
          tipo: 'ORCAMENTO',
          titulo: `Orçamento geral crítico`,
          mensagem: `Seus gastos mensais já atingiram ${percentGlobal.toFixed(0)}% do orçamento total de R$ ${casal.orcamentoMensal.toFixed(2)}.`,
          urgente: percentGlobal >= 100,
        })
      }
    }

    // 3. Parcelas com mais de 6 meses restantes
    const parcelasAbertas = await prisma.transacao.findMany({
      where: {
        casalId,
        deletadoEm: null,
        parcelada: true,
        parcelaAtual: { not: null },
        parcelasTotal: { not: null },
      },
    })

    parcelasAbertas.forEach((p) => {
      const restantes = p.parcelasTotal! - p.parcelaAtual!
      if (restantes > 6) {
        alertas.push({
          tipo: 'PARCELA',
          titulo: `Compromisso financeiro longo`,
          mensagem: `A compra "${p.descricao}" ainda possui ${restantes} parcelas de R$ ${p.valor.toFixed(2)} restantes.`,
          urgente: false,
        })
      }
    })

    return res.status(200).json({
      dados: alertas,
      erro: false,
      mensagem: '',
    })
  } catch (error) {
    console.error('Erro ao buscar alertas:', error)
    return res.status(500).json({
      dados: null,
      erro: true,
      mensagem: 'Erro ao obter alertas',
    })
  }
})

// POST /alertas/verificar-compra - Análise de viabilidade de compra com iaService
router.post('/verificar-compra', autenticacaoMiddleware, async (req: Request, res: Response) => {
  try {
    const casalId = req.usuario!.casalId
    const { descricao, valor, parcelas = 1 } = req.body

    if (!descricao || !valor) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Campos descrição e valor são obrigatórios',
      })
    }

    const valorParcela = valor / parcelas

    const contas = await prisma.conta.findMany({
      where: { casalId, deletadoEm: null, ativa: true },
    })
    const saldo = contas.reduce((acc, curr) => acc + curr.saldoAtual, 0)

    const casal = await prisma.casal.findUnique({ where: { id: casalId } })
    const orcamento = casal?.orcamentoMensal || 0

    const parceladas = await prisma.transacao.findMany({
      where: {
        casalId,
        deletadoEm: null,
        parcelada: true,
        parcelaAtual: { not: null },
        parcelasTotal: { not: null },
      },
    })
    const parcelasAtivas = parceladas.filter((p) => p.parcelaAtual! < p.parcelasTotal!)
    const comprometimentoAtual = parcelasAtivas.reduce((acc, curr) => acc + curr.valor, 0)

    const comprometimentoNovo = comprometimentoAtual + valorParcela

    const percentAtual = orcamento > 0 ? (comprometimentoAtual / orcamento) * 100 : 0
    const percentNovo = orcamento > 0 ? (comprometimentoNovo / orcamento) * 100 : 0

    const prompt = `Analise se este casal pode fazer esta compra:
COMPRA: ${descricao} por R$ ${valor.toFixed(2)} em ${parcelas}x de R$ ${valorParcela.toFixed(2)}
SALDO ATUAL: R$ ${saldo.toFixed(2)}
COMPROMETIMENTO ATUAL: R$ ${comprometimentoAtual.toFixed(2)}/mês (${percentAtual.toFixed(0)}% do orçamento)
COMPROMETIMENTO COM A COMPRA: R$ ${comprometimentoNovo.toFixed(2)}/mês (${percentNovo.toFixed(0)}% do orçamento)

Responda estritamente com um JSON contendo os seguintes campos, sem nenhum texto adicional antes ou depois:
{
  "viavel": boolean,
  "recomendacao": "string (máx 3 linhas)",
  "alertas": ["string"]
}`

    const sistemaPrompt = 'Você é um assistente financeiro estruturado. Retorne apenas o JSON limpo contendo as chaves viavel, recomendacao e alertas.'
    let textoResposta = await chamarIA(prompt, sistemaPrompt)
    
    // Limpeza rápida caso a IA adicione tags de markdown
    textoResposta = (textoResposta || '{}').replace(/```json|```/gi, '').trim()

    let analise = { viavel: false, recomendacao: 'Não foi possível analisar a compra.', alertas: [] }
    try {
      analise = JSON.parse(textoResposta)
    } catch (e) {
      console.error('Erro ao converter resposta da IA em JSON:', textoResposta, e)
    }

    return res.status(200).json({
      dados: analise,
      erro: false,
      mensagem: '',
    })
  } catch (error) {
    console.error('Erro ao analisar compra:', error)
    return res.status(500).json({
      dados: null,
      erro: true,
      mensagem: 'Erro ao analisar compra',
    })
  }
})
