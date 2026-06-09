import { PrismaClient } from '@prisma/client'
import { chamarIA } from './iaService'

const prisma = new PrismaClient()

export async function buscarContextoFinanceiro(casalId: string): Promise<string> {
  const agora = new Date()
  const mesAtual = agora.getMonth() + 1
  const anoAtual = agora.getFullYear()

  const dataInicioMes = new Date(Date.UTC(anoAtual, mesAtual - 1, 1))
  const dataFimMes = new Date(Date.UTC(anoAtual, mesAtual, 0, 23, 59, 59, 999))

  const mesAnoLabel = `${String(mesAtual).padStart(2, '0')}/${anoAtual}`

  // 1. Resumo do mês atual e contas
  const transacoesMes = await prisma.transacao.findMany({
    where: {
      casalId,
      deletadoEm: null,
      data: {
        gte: dataInicioMes,
        lte: dataFimMes,
      },
    },
  })

  let totalEntradas = 0
  let totalSaidas = 0
  transacoesMes.forEach((t) => {
    if (t.tipo === 'CREDITO') {
      totalEntradas += t.valor
    } else {
      totalSaidas += t.valor
    }
  })

  const contas = await prisma.conta.findMany({
    where: {
      casalId,
      deletadoEm: null,
      ativa: true,
    },
  })
  const saldoTotal = contas.reduce((acc, curr) => acc + curr.saldoAtual, 0)

  // 2. Top categorias com mais gastos no mês
  const agrupadoCategorias: Record<string, number> = {}
  transacoesMes
    .filter((t) => t.tipo === 'DEBITO')
    .forEach((t) => {
      const cat = t.categoria || 'Outro'
      agrupadoCategorias[cat] = (agrupadoCategorias[cat] || 0) + t.valor
    })

  const topCategorias = Object.entries(agrupadoCategorias)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // 3. Transações dos últimos 7 dias (máx 20)
  const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  const ultimasTransacoes = await prisma.transacao.findMany({
    where: {
      casalId,
      deletadoEm: null,
      data: {
        gte: seteDiasAtras,
      },
    },
    orderBy: {
      data: 'desc',
    },
    take: 20,
  })

  // 4. Contas fixas ativas
  const contasFixas = await prisma.contaFixa.findMany({
    where: {
      casalId,
      deletadoEm: null,
      ativa: true,
    },
    orderBy: {
      diaVencimento: 'asc',
    },
  })

  // 5. Parcelas em aberto
  const parcelasAbertas = await prisma.transacao.findMany({
    where: {
      casalId,
      deletadoEm: null,
      parcelada: true,
      parcelaAtual: {
        not: null,
      },
      parcelasTotal: {
        not: null,
      },
    },
  })

  const parcelasFiltro = parcelasAbertas.filter((p) => {
    return p.parcelaAtual! < p.parcelasTotal!
  })

  // 6. Orçamento mensal do casal e percentual usado
  const casal = await prisma.casal.findUnique({
    where: { id: casalId },
  })
  const orcamento = casal?.orcamentoMensal ?? 0
  const percentualUsado = orcamento > 0 ? (totalSaidas / orcamento) * 100 : 0

  // Montar a string formatada
  let contexto = `=== CONTEXTO FINANCEIRO DO CASAL (${mesAnoLabel}) ===
SALDO ATUAL: R$ ${saldoTotal.toFixed(2)}
ENTRADAS NO MÊS: R$ ${totalEntradas.toFixed(2)}
SAÍDAS NO MÊS: R$ ${totalSaidas.toFixed(2)}
ORÇAMENTO MENSAL: R$ ${orcamento.toFixed(2)} (${percentualUsado.toFixed(0)}% usado)

TOP CATEGORIAS:`
  if (topCategorias.length === 0) {
    contexto += '\n- Nenhuma categoria com gastos ainda.'
  } else {
    topCategorias.forEach(([cat, val]) => {
      contexto += `\n- ${cat}: R$ ${val.toFixed(2)}`
    })
  }

  contexto += '\n\nÚLTIMAS TRANSAÇÕES:'
  if (ultimasTransacoes.length === 0) {
    contexto += '\n- Nenhuma transação nos últimos 7 dias.'
  } else {
    ultimasTransacoes.forEach((t) => {
      const dataFmt = new Date(t.data).toLocaleDateString('pt-BR')
      contexto += `\n- ${dataFmt} | ${t.descricao} | R$ ${t.valor.toFixed(2)} | ${t.tipo === 'DEBITO' ? 'Débito' : 'Crédito'}`
    })
  }

  contexto += '\n\nPARCELAS EM ABERTO:'
  if (parcelasFiltro.length === 0) {
    contexto += '\n- Nenhuma parcela em aberto.'
  } else {
    parcelasFiltro.forEach((p) => {
      contexto += `\n- ${p.descricao} ${p.parcelaAtual}/${p.parcelasTotal} | R$ ${p.valor.toFixed(2)}/mês`
    })
  }

  contexto += '\n\nCONTAS FIXAS:'
  if (contasFixas.length === 0) {
    contexto += '\n- Nenhuma conta fixa cadastrada.'
  } else {
    contasFixas.forEach((cf) => {
      contexto += `\n- ${cf.nome} | R$ ${cf.valor.toFixed(2)} | vence dia ${cf.diaVencimento}`
    })
  }

  return contexto
}

export async function extrairLancamento(mensagem: string): Promise<{ valor: number; descricao: string; tipo: 'DEBITO' | 'CREDITO' } | null> {
  const padraoDebito = /gastei|paguei|comprei|gasto de/i
  const padraoCredito = /recebi|entrou|salário|pagamento de/i

  const ehDebito = padraoDebito.test(mensagem)
  const ehCredito = padraoCredito.test(mensagem)

  if (!ehDebito && !ehCredito) return null

  // Tenta extrair um valor numérico
  const matchValor = mensagem.match(/\b\d+(?:[\.,]\d{2})?\b/)
  if (!matchValor) return null

  const valorRaw = matchValor[0]
  const valor = parseFloat(valorRaw.replace(',', '.'))

  if (isNaN(valor)) return null

  let descricao = mensagem
    .replace(padraoDebito, '')
    .replace(padraoCredito, '')
    .replace(valorRaw, '')
    .replace(/\breais\b/gi, '')
    .replace(/\bde\b/gi, '')
    .replace(/\bno\b/gi, '')
    .replace(/\bna\b/gi, '')
    .replace(/\bem\b/gi, '')
    .trim()

  descricao = descricao.replace(/\s+/g, ' ')

  if (!descricao) {
    descricao = ehDebito ? 'Gasto manual' : 'Receita manual'
  }

  return {
    valor,
    descricao,
    tipo: ehDebito ? 'DEBITO' : 'CREDITO',
  }
}

export async function processarMensagem(telefone: string, mensagemUsuario: string, casalId: string): Promise<string> {
  // 1. Verificar intenção de Lançamento
  const lancamento = await extrairLancamento(mensagemUsuario)
  if (lancamento) {
    const conta = await prisma.conta.findFirst({
      where: { casalId, deletadoEm: null, ativa: true },
    })

    const novaTransacao = await prisma.transacao.create({
      data: {
        casalId,
        contaId: conta?.id || null,
        descricao: lancamento.descricao,
        valor: lancamento.valor,
        tipo: lancamento.tipo,
        categoria: lancamento.tipo === 'CREDITO' ? 'Renda' : 'Outro',
        data: new Date(),
        lancadaManualmente: true,
      },
    })

    if (conta) {
      const operacao = lancamento.tipo === 'DEBITO' ? -1 : 1
      await prisma.conta.update({
        where: { id: conta.id },
        data: {
          saldoAtual: {
            increment: lancamento.valor * operacao,
          },
        },
      })
    }

    return `✅ Transação lançada com sucesso!\n📝 Descrição: *${novaTransacao.descricao}*\n💰 Valor: *R$ ${novaTransacao.valor.toFixed(2)}* (${novaTransacao.tipo === 'DEBITO' ? 'Débito' : 'Crédito'})`
  }

  // Obter contexto financeiro
  const contexto = await buscarContextoFinanceiro(casalId)

  // 2. Verificar intenção de Saldo
  const padraoSaldo = /\b(saldo|quanto tenho|quanto sobrou)\b/i
  if (padraoSaldo.test(mensagemUsuario)) {
    const linhas = contexto.split('\n')
    const saldoLinha = linhas.find((l) => l.includes('SALDO ATUAL:')) || ''
    const entradasLinha = linhas.find((l) => l.includes('ENTRADAS NO MÊS:')) || ''
    const saidasLinha = linhas.find((l) => l.includes('SAÍDAS NO MÊS:')) || ''
    const orcamentoLinha = linhas.find((l) => l.includes('ORÇAMENTO MENSAL:')) || ''

    return `📊 *Resumo Financeiro do Casal:*\n\n${saldoLinha}\n${entradasLinha}\n${saidasLinha}\n${orcamentoLinha}`
  }

  // 3. Consulta Inteligente via iaService
  try {
    const sistemaPrompt = 'Você é um assistente financeiro pessoal de um casal brasileiro. Responda sempre em português, de forma direta e amigável. Use os dados financeiros fornecidos para responder com precisão. Formate valores sempre como R$ X.XXX,XX. Seja conciso — respostas para WhatsApp devem ter no máximo 5 linhas. Quando perguntarem se podem comprar algo, analise o orçamento disponível e dê uma recomendação clara: sim, não, ou com ressalvas.'
    const prompt = `DADOS FINANCEIROS:\n${contexto}\n\nPERGUNTA DO USUÁRIO: ${mensagemUsuario}`
    
    const respostaIA = await chamarIA(prompt, sistemaPrompt)
    return respostaIA || 'Desculpe, não consegui obter uma resposta do assistente.'
  } catch (error: any) {
    console.error('Erro ao processar resposta via iaService:', error)
    return '⚠️ Desculpe, estou com dificuldades para consultar a inteligência artificial agora.'
  }
}
