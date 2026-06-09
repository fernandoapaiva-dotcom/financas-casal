import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db';
import { autenticacaoMiddleware } from '../middlewares/autenticacao';

export const router = Router();

// GET /transacoes
router.get('/', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const casalId = req.usuario!.casalId;
    const { mes, ano, categoria, contaId, pagina = '1', limite = '50' } = req.query;

    const pageNum = parseInt(pagina as string, 10);
    const limitNum = parseInt(limite as string, 10);

    const filtro: any = {
      casalId,
      deletadoEm: null,
    };

    if (mes && ano) {
      const mesInt = parseInt(mes as string, 10);
      const anoInt = parseInt(ano as string, 10);
      const inicioMes = new Date(Date.UTC(anoInt, mesInt - 1, 1, 0, 0, 0, 0));
      const fimMes = new Date(Date.UTC(anoInt, mesInt, 1, 0, 0, 0, 0));

      filtro.data = {
        gte: inicioMes,
        lt: fimMes,
      };
    }

    if (categoria) {
      filtro.categoria = categoria as string;
    }

    if (contaId) {
      filtro.contaId = contaId as string;
    }

    const skip = (pageNum - 1) * limitNum;

    const [transacoes, total] = await Promise.all([
      prisma.transacao.findMany({
        where: filtro,
        skip,
        take: limitNum,
        orderBy: { data: 'desc' },
      }),
      prisma.transacao.count({ where: filtro }),
    ]);

    return res.status(200).json({
      dados: {
        transacoes,
        total,
        pagina: pageNum,
        totalPaginas: Math.ceil(total / limitNum),
      },
      erro: false,
      mensagem: '',
    });
  } catch (error) {
    next(error);
  }
});

// GET /transacoes/categorias (colocado antes de /:id para evitar conflito de rotas)
router.get('/categorias', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const casalId = req.usuario!.casalId;
    const { mes, ano } = req.query;

    if (!mes || !ano) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Mês e ano são obrigatórios',
      });
    }

    const mesInt = parseInt(mes as string, 10);
    const anoInt = parseInt(ano as string, 10);
    const inicioMes = new Date(Date.UTC(anoInt, mesInt - 1, 1, 0, 0, 0, 0));
    const fimMes = new Date(Date.UTC(anoInt, mesInt, 1, 0, 0, 0, 0));

    // Buscar transações de débito do casal no período
    const transacoes = await prisma.transacao.findMany({
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

    // Agrupar por categoria
    const grupos: { [categoria: string]: number } = {};
    transacoes.forEach((t) => {
      const cat = t.categoria || 'Outro';
      grupos[cat] = (grupos[cat] || 0) + Math.abs(t.valor);
    });

    // Buscar os orçamentos de categoria para esse mês/ano
    const orcamentos = await prisma.orcamentoCategoria.findMany({
      where: {
        casalId,
        mes: mesInt,
        ano: anoInt,
      },
    });

    const orcamentosMap = new Map<string, number>();
    orcamentos.forEach((o) => {
      orcamentosMap.set(o.categoria, o.limiteValor);
    });

    const resultado = Object.keys(grupos).map((cat) => {
      const total = grupos[cat];
      const limiteOrcamento = orcamentosMap.get(cat) || null;
      const percentualUsado =
        limiteOrcamento && limiteOrcamento > 0 ? Math.round((total / limiteOrcamento) * 100) : 0;

      return {
        categoria: cat,
        total,
        limiteOrcamento,
        percentualUsado,
      };
    });

    resultado.sort((a, b) => b.total - a.total);

    return res.status(200).json({
      dados: resultado,
      erro: false,
      mensagem: '',
    });
  } catch (error) {
    next(error);
  }
});

// POST /transacoes
router.post('/', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const casalId = req.usuario!.casalId;
    const {
      descricao,
      valor,
      tipo,
      data,
      categoria,
      subcategoria,
      contaId,
      estabelecimento,
      parcelada,
      parcelasTotal,
    } = req.body;

    if (!descricao || valor === undefined || !tipo || !data) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Descrição, valor, tipo e data são obrigatórios',
      });
    }

    const valorAbs = Math.abs(valor);

    if (parcelada === true && parcelasTotal && parcelasTotal > 1) {
      const transacoesCriadas: any[] = [];
      const dataBase = new Date(data);

      await prisma.$transaction(async (tx) => {
        for (let n = 1; n <= parcelasTotal; n++) {
          const dataParcela = new Date(dataBase);
          dataParcela.setUTCMonth(dataBase.getUTCMonth() + n - 1);

          const novaTransacao = await tx.transacao.create({
            data: {
              descricao: `${descricao} ${n}/${parcelasTotal}`,
              valor: valorAbs,
              tipo,
              data: dataParcela,
              categoria: categoria || null,
              subcategoria: subcategoria || null,
              contaId: contaId || null,
              estabelecimento: estabelecimento || null,
              parcelada: true,
              parcelaAtual: n,
              parcelasTotal,
              lancadaManualmente: true,
              casalId,
            },
          });
          transacoesCriadas.push(novaTransacao);
        }
      });

      return res.status(201).json({
        dados: { transacoesCriadas: transacoesCriadas.length },
        erro: false,
        mensagem: 'Parcelas lançadas',
      });
    } else {
      const novaTransacao = await prisma.transacao.create({
        data: {
          descricao,
          valor: valorAbs,
          tipo,
          data: new Date(data),
          categoria: categoria || null,
          subcategoria: subcategoria || null,
          contaId: contaId || null,
          estabelecimento: estabelecimento || null,
          parcelada: false,
          lancadaManualmente: true,
          casalId,
        },
      });

      return res.status(201).json({
        dados: novaTransacao,
        erro: false,
        mensagem: '',
      });
    }
  } catch (error) {
    next(error);
  }
});

// PUT /transacoes/:id
router.put('/:id', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const casalId = req.usuario!.casalId;
    const { descricao, valor, categoria, subcategoria, data } = req.body;

    const transacao = await prisma.transacao.findFirst({
      where: { id: id as string, casalId, deletadoEm: null },
    });

    if (!transacao) {
      return res.status(404).json({
        dados: null,
        erro: true,
        mensagem: 'Transação não encontrada ou não pertence ao casal',
      });
    }

    const dadosAtualizacao: any = {};
    if (descricao !== undefined) dadosAtualizacao.descricao = descricao;
    if (valor !== undefined) dadosAtualizacao.valor = Math.abs(valor);
    if (categoria !== undefined) dadosAtualizacao.categoria = categoria;
    if (subcategoria !== undefined) dadosAtualizacao.subcategoria = subcategoria;
    if (data !== undefined) dadosAtualizacao.data = new Date(data);

    const transacaoAtualizada = await prisma.transacao.update({
      where: { id: id as string },
      data: dadosAtualizacao,
    });

    return res.status(200).json({
      dados: transacaoAtualizada,
      erro: false,
      mensagem: 'Transação atualizada',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /transacoes/:id
router.delete('/:id', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const casalId = req.usuario!.casalId;

    const transacao = await prisma.transacao.findFirst({
      where: { id: id as string, casalId, deletadoEm: null },
    });

    if (!transacao) {
      return res.status(404).json({
        dados: null,
        erro: true,
        mensagem: 'Transação não encontrada ou não pertence ao casal',
      });
    }

    await prisma.transacao.update({
      where: { id: id as string },
      data: {
        deletadoEm: new Date(),
      },
    });

    return res.status(200).json({
      dados: null,
      erro: false,
      mensagem: 'Transação removida',
    });
  } catch (error) {
    next(error);
  }
});
