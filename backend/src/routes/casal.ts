import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { autenticacaoMiddleware } from '../middlewares/autenticacao';

export const router = Router();
const prisma = new PrismaClient();

// Aplica autenticação em todas as rotas do casal
router.use(autenticacaoMiddleware);

// GET /casal
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { casalId } = req.usuario!;

    const casal = await prisma.casal.findFirst({
      where: { id: casalId, deletadoEm: null },
      include: {
        membros: {
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!casal) {
      res.status(404).json({
        dados: null,
        erro: true,
        mensagem: 'Casal não encontrado'
      });
      return;
    }

    res.json({
      dados: casal,
      erro: false,
      mensagem: ''
    });
  } catch (error) {
    next(error);
  }
});

// PUT /casal
router.put('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { casalId } = req.usuario!;
    const { nome, orcamentoMensal } = req.body;

    const dataToUpdate: any = {};
    if (nome !== undefined) dataToUpdate.nome = nome;
    if (orcamentoMensal !== undefined) dataToUpdate.orcamentoMensal = orcamentoMensal;

    const casalAtualizado = await prisma.casal.update({
      where: { id: casalId },
      data: dataToUpdate
    });

    res.json({
      dados: casalAtualizado,
      erro: false,
      mensagem: 'Casal atualizado com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// GET /casal/resumo
router.get('/resumo', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { casalId } = req.usuario!;

    // 1. Obter o orçamento mensal do casal
    const casal = await prisma.casal.findFirst({
      where: { id: casalId },
      select: { orcamentoMensal: true }
    });

    const orcamentoMensal = casal?.orcamentoMensal || 0;

    // 2. Calcular saldoTotal: soma de saldoAtual de todas as Conta ativas do casal
    const contasAtivas = await prisma.conta.findMany({
      where: { casalId, ativa: true, deletadoEm: null },
      select: { saldoAtual: true }
    });

    const saldoTotal = contasAtivas.reduce((acc, conta) => acc + conta.saldoAtual, 0);

    // 3. Obter datas do mês atual (UTC)
    const agora = new Date();
    const ano = agora.getUTCFullYear();
    const mes = agora.getUTCMonth(); // 0-indexed

    const dataInicioMes = new Date(Date.UTC(ano, mes, 1, 0, 0, 0, 0));
    const dataFimMes = new Date(Date.UTC(ano, mes + 1, 1, 0, 0, 0, 0)); // início do mês seguinte

    // 4. Calcular totalEntradas: soma de valor das Transacao do casal no mês onde tipo = "CREDITO"
    const transacoesCredito = await prisma.transacao.findMany({
      where: {
        casalId,
        tipo: 'CREDITO',
        data: {
          gte: dataInicioMes,
          lt: dataFimMes
        },
        deletadoEm: null
      },
      select: { valor: true }
    });

    const totalEntradas = transacoesCredito.reduce((acc, t) => acc + t.valor, 0);

    // 5. Calcular totalSaidas: soma absoluta de valor das Transacao do casal no mês onde tipo = "DEBITO"
    const transacoesDebito = await prisma.transacao.findMany({
      where: {
        casalId,
        tipo: 'DEBITO',
        data: {
          gte: dataInicioMes,
          lt: dataFimMes
        },
        deletadoEm: null
      },
      select: { valor: true }
    });

    const totalSaidas = Math.abs(transacoesDebito.reduce((acc, t) => acc + t.valor, 0));

    // 6. Calcular totalParcelasAbertas: soma dos valores das Transacao parceladas ainda não pagas (parcelaAtual < parcelasTotal)
    // Nota: Como parcelaAtual e parcelasTotal são nullable, incluímos apenas registros onde ambos estão presentes.
    const transacoesParceladasAbertas = await prisma.transacao.findMany({
      where: {
        casalId,
        parcelada: true,
        deletadoEm: null,
        parcelaAtual: {
          not: null
        },
        parcelasTotal: {
          not: null
        }
      }
    });

    // Filtra transações onde parcelaAtual < parcelasTotal e soma o valor restante/atual
    // Vamos somar os valores das parcelas que ainda não foram totalmente pagas (parcelaAtual < parcelasTotal)
    const totalParcelasAbertas = transacoesParceladasAbertas
      .filter(t => t.parcelaAtual! < t.parcelasTotal!)
      .reduce((acc, t) => acc + t.valor, 0);

    // 7. Calcular percentualUsado: (totalSaidas / orcamentoMensal * 100) arredondado, ou 0 se não tiver orçamento
    const percentualUsado = orcamentoMensal > 0
      ? Math.round((totalSaidas / orcamentoMensal) * 100)
      : 0;

    res.json({
      dados: {
        saldoTotal,
        totalEntradas,
        totalSaidas,
        totalParcelasAbertas,
        percentualUsado
      },
      erro: false,
      mensagem: ''
    });
  } catch (error) {
    next(error);
  }
});
