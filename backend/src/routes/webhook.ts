import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../services/db';
import { syncConta } from '../jobs/syncTransacoes';

export const router = Router();

// POST /webhook/pluggy
router.post('/pluggy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assinatura = req.headers['x-pluggy-signature'];
    const corpo = JSON.stringify(req.body);
    const esperado = crypto
      .createHmac('sha256', process.env.PLUGGY_CLIENT_SECRET || '')
      .update(corpo)
      .digest('hex');

    if (assinatura !== esperado) {
      return res.status(401).json({
        dados: null,
        erro: true,
        mensagem: 'Assinatura inválida',
      });
    }

    const { event, itemId, id } = req.body;

    if (event === 'item/updated' || event === 'transaction/created') {
      // O id do item pode estar em itemId ou id dependendo do evento
      const targetItemId = itemId || id;

      if (targetItemId) {
        const contas = await prisma.conta.findMany({
          where: {
            pluggyItemId: targetItemId,
            deletadoEm: null,
          },
        });

        contas.forEach((conta) => {
          syncConta(conta.id).catch((err) => {
            console.error(`Erro ao sincronizar conta ${conta.id} via Webhook:`, err);
          });
        });
      }
    }

    return res.status(200).json({
      dados: null,
      erro: false,
      mensagem: 'Webhook processado',
    });
  } catch (error) {
    next(error);
  }
});
