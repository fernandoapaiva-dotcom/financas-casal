import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db';
import { autenticacaoMiddleware } from '../middlewares/autenticacao';

export const router = Router();

// GET /casal
router.get('/', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const casalId = req.usuario!.casalId;

    const casal = await prisma.casal.findUnique({
      where: { id: casalId, deletadoEm: null },
      include: {
        membros: {
          select: {
            id: true,
            papel: true,
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!casal) {
      return res.status(404).json({
        dados: null,
        erro: true,
        mensagem: 'Casal não encontrado',
      });
    }

    return res.status(200).json({
      dados: casal,
      erro: false,
      mensagem: '',
    });
  } catch (error) {
    next(error);
  }
});

// PUT /casal
router.put('/', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const casalId = req.usuario!.casalId;
    const { nome, orcamentoMensal } = req.body;

    const dadosAtualizacao: any = {};
    if (nome !== undefined) dadosAtualizacao.nome = nome;
    if (orcamentoMensal !== undefined) dadosAtualizacao.orcamentoMensal = orcamentoMensal;

    const casalAtualizado = await prisma.casal.update({
      where: { id: casalId },
      data: dadosAtualizacao,
    });

    return res.status(200).json({
      dados: casalAtualizado,
      erro: false,
      mensagem: 'Casal atualizado com sucesso',
    });
  } catch (error) {
    next(error);
  }
});

// GET /casal/resumo
router.get('/resumo', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const casalId = req.usuario!.casalId;

    // Obter data atual em UTC para calcular entradas/saídas do mês
    const agora = new Date();
    const ano = agora.getUTCFullYear();
    const mes = agora.getUTCMonth();
    const inicioMes = new Date(Date.UTC(ano, mes, 1, 0, 0, 0, 0));
    const fimMes = new Date(Date.UTC(ano, mes + 1, 1, 0, 0, 0, 0));

    // 1. saldoTotal: soma de saldoAtual de todas as contas ativas do casal
    const contas = await prisma.conta.findMany({
      where: {
        casalId,
        ativa: true,
        deletadoEm: null,
      },
    });
    const saldoTotal = contas.reduce((acc, c) => acc + c.saldoAtual, 0);

    // 2. totalEntradas: soma de valor das Transacoes no mês com tipo = CREDITO
    const agregadorEntradas = await prisma.transacao.aggregate({
      _sum: {
        valor: true,
      },
      where: {
        casalId,
        tipo: 'CREDITO',
        deletadoEm: null,
        data: {
          gte: inicioMes,
          lt: fimMes,
        },
      },
    });
    const totalEntradas = agregadorEntradas._sum.valor || 0;

    // 3. totalSaidas: soma absoluta de valor das Transacoes no mês com tipo = DEBITO
    const agregadorSaidas = await prisma.transacao.aggregate({
      _sum: {
        valor: true,
      },
      where: {
        casalId,
        tipo: 'DEBITO',
        deletadoEm: null,
        data: {
          gte: inicioMes,
          lt: fimMes,
        },
      },
    });
    const totalSaidas = Math.abs(agregadorSaidas._sum.valor || 0);

    // 4. totalParcelasAbertas: soma de valor das Transacao parceladas (parcelaAtual < parcelasTotal)
    const transacoesParceladas = await prisma.transacao.findMany({
      where: {
        casalId,
        parcelada: true,
        deletadoEm: null,
        AND: [
          { parcelaAtual: { not: null } },
          { parcelasTotal: { not: null } },
        ],
      },
    });
    const totalParcelasAbertas = transacoesParceladas
      .filter((t) => t.parcelaAtual! < t.parcelasTotal!)
      .reduce((acc, t) => acc + t.valor, 0);

    // 5. percentualUsado: totalSaidas / orcamentoMensal * 100
    const casal = await prisma.casal.findUnique({
      where: { id: casalId },
    });
    const orcamentoMensal = casal?.orcamentoMensal || 0;
    const percentualUsado = orcamentoMensal > 0 ? Math.round((totalSaidas / orcamentoMensal) * 100) : 0;

    return res.status(200).json({
      dados: {
        saldoTotal,
        totalEntradas,
        totalSaidas,
        totalParcelasAbertas,
        percentualUsado,
      },
      erro: false,
      mensagem: '',
    });
  } catch (error) {
    next(error);
  }
});

// PUT /casal/membro
router.put('/membro', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioId = req.usuario!.id;
    const { telefone } = req.body;

    if (!telefone) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'O campo telefone é obrigatório',
      });
    }

    // Valida formato: apenas números, 10 ou 11 dígitos
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length !== 10 && telefoneLimpo.length !== 11) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'O telefone deve possuir 10 ou 11 dígitos numéricos',
      });
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: { telefone: telefoneLimpo },
    });

    return res.status(200).json({
      dados: { telefone: usuarioAtualizado.telefone },
      erro: false,
      mensagem: 'Telefone atualizado com sucesso',
    });
  } catch (error) {
    next(error);
  }
});

