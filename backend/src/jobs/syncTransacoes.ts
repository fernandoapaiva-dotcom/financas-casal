import cron from 'node-cron';
import { prisma } from '../services/db';
import * as pluggyService from '../services/pluggyService';
import { categorizarTransacao } from '../services/categorizacaoService';

export async function detectarParcela(descricao: string): Promise<{
  parcelada: boolean;
  parcelaAtual: number | null;
  parcelasTotal: number | null;
}> {
  const regex = /(\d+)\s*\/\s*(\d+)/;
  const match = descricao.match(regex);

  if (match) {
    return {
      parcelada: true,
      parcelaAtual: parseInt(match[1], 10),
      parcelasTotal: parseInt(match[2], 10),
    };
  }

  return {
    parcelada: false,
    parcelaAtual: null,
    parcelasTotal: null,
  };
}

export async function syncConta(contaId: string): Promise<void> {
  const conta = await prisma.conta.findFirst({
    where: { id: contaId, deletadoEm: null },
  });

  if (!conta || !conta.pluggyContaId) {
    return;
  }

  const hoje = new Date();
  const de = conta.ultimoSync ? new Date(conta.ultimoSync) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const ate = hoje;

  try {
    const resultadoTransacoes = await pluggyService.buscarTransacoes(conta.pluggyContaId, de, ate);

    for (const txPluggy of resultadoTransacoes.results) {
      // 1. Verifica se já existe
      const existente = await prisma.transacao.findUnique({
        where: { pluggyTransacaoId: txPluggy.id },
      });

      if (existente) {
        continue;
      }

      // 2. Cria se não existe
      const { categoria, subcategoria } = await categorizarTransacao(
        txPluggy.description,
        txPluggy.merchant?.name || ''
      );

      const infoParcela = await detectarParcela(txPluggy.description);
      const tipo = txPluggy.amount > 0 ? 'CREDITO' : 'DEBITO';

      await prisma.transacao.create({
        data: {
          contaId: conta.id,
          casalId: conta.casalId,
          pluggyTransacaoId: txPluggy.id,
          descricao: txPluggy.description,
          valor: Math.abs(txPluggy.amount),
          tipo,
          categoria,
          subcategoria,
          estabelecimento: txPluggy.merchant?.name || null,
          data: new Date(txPluggy.date),
          parcelada: infoParcela.parcelada,
          parcelaAtual: infoParcela.parcelaAtual,
          parcelasTotal: infoParcela.parcelasTotal,
          lancadaManualmente: false,
        },
      });
    }

    // 3. Atualizar saldo
    const novoSaldo = await pluggyService.buscarSaldo(conta.pluggyContaId);
    await prisma.conta.update({
      where: { id: conta.id },
      data: {
        saldoAtual: novoSaldo,
        ultimoSync: new Date(),
      },
    });
  } catch (error) {
    console.error(`Erro ao sincronizar conta ${contaId}:`, error);
  }
}

export async function syncTodasContas(casalId?: string): Promise<void> {
  const filtro: any = {
    deletadoEm: null,
    ativa: true,
    pluggyContaId: { not: null },
  };

  if (casalId) {
    filtro.casalId = casalId;
  }

  const contas = await prisma.conta.findMany({
    where: filtro,
  });

  const resultados = await Promise.allSettled(contas.map((c) => syncConta(c.id)));

  resultados.forEach((res, idx) => {
    if (res.status === 'rejected') {
      console.error(`Erro sync conta ${contas[idx].id}:`, res.reason);
    }
  });
}

export function agendarSync(): void {
  // A cada 2 horas: '0 */2 * * *'
  cron.schedule('0 */2 * * *', async () => {
    console.log(`[Job Sync] Iniciado em ${new Date().toISOString()}`);
    try {
      await syncTodasContas();
      console.log(`[Job Sync] Finalizado em ${new Date().toISOString()}`);
    } catch (err) {
      console.error('[Job Sync] Falhou:', err);
    }
  });
}
