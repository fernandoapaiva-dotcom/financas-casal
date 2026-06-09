import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db';
import * as pluggyService from '../services/pluggyService';
import { syncTodasContas } from '../jobs/syncTransacoes';
import { autenticacaoMiddleware } from '../middlewares/autenticacao';

export const router = Router();

// POST /pluggy/token-conexao
router.post('/token-conexao', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Credenciais Pluggy não configuradas',
      });
    }

    const accessToken = await pluggyService.gerarTokenConexao();

    return res.status(200).json({
      dados: { accessToken },
      erro: false,
      mensagem: '',
    });
  } catch (error) {
    next(error);
  }
});

// POST /pluggy/conectar
router.post('/conectar', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId, nomeAmigavel, banco } = req.body;

    if (!itemId || !banco) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'itemId e banco são obrigatórios',
      });
    }

    const resultadoContas = await pluggyService.buscarContas(itemId);
    let contasCriadas = 0;

    for (const contaPluggy of resultadoContas.results) {
      // Mapear tipo
      let tipo = 'INVESTIMENTO';
      const tipoOriginal = contaPluggy.type as string;
      if (tipoOriginal === 'CHECKING') tipo = 'CORRENTE';
      else if (tipoOriginal === 'SAVINGS') tipo = 'POUPANCA';
      else if (tipoOriginal === 'CREDIT') tipo = 'CARTAO_CREDITO';

      await prisma.conta.create({
        data: {
          pluggyItemId: itemId,
          pluggyContaId: contaPluggy.id,
          nome: nomeAmigavel || contaPluggy.name,
          banco,
          tipo,
          saldoAtual: contaPluggy.balance,
          usuarioId: req.usuario!.id,
          casalId: req.usuario!.casalId,
        },
      });

      contasCriadas++;
    }

    // Dispara a sincronização em segundo plano
    syncTodasContas(req.usuario!.casalId).catch((err) => {
      console.error('Erro no sync de segundo plano após conectar contas:', err);
    });

    return res.status(200).json({
      dados: { contasCriadas },
      erro: false,
      mensagem: 'Contas conectadas com sucesso',
    });
  } catch (error) {
    next(error);
  }
});

// GET /pluggy/contas
router.get('/contas', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const casalId = req.usuario!.casalId;

    const contas = await prisma.conta.findMany({
      where: {
        casalId,
        deletadoEm: null,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    // Agrupar por usuarioId no resultado
    const agrupado = contas.reduce((acc: any, conta) => {
      const uId = conta.usuarioId;
      if (!acc[uId]) {
        acc[uId] = {
          usuarioId: uId,
          usuario: conta.usuario,
          contas: [],
        };
      }
      const { usuario, ...dadosConta } = conta;
      acc[uId].contas.push(dadosConta);
      return acc;
    }, {});

    const contasAgrupadas = Object.values(agrupado);

    return res.status(200).json({
      dados: { contas: contasAgrupadas },
      erro: false,
      mensagem: '',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /pluggy/contas/:id
router.delete('/contas/:id', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const casalId = req.usuario!.casalId;

    // Verificar se pertence ao casal
    const conta = await prisma.conta.findFirst({
      where: { id: id as string, casalId, deletadoEm: null },
    });

    if (!conta) {
      return res.status(404).json({
        dados: null,
        erro: true,
        mensagem: 'Conta não encontrada ou não pertence ao casal',
      });
    }

    await prisma.conta.update({
      where: { id: id as string },
      data: {
        deletadoEm: new Date(),
      },
    });

    return res.status(200).json({
      dados: null,
      erro: false,
      mensagem: 'Conta desconectada',
    });
  } catch (error) {
    next(error);
  }
});
