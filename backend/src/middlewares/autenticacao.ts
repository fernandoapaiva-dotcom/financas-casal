import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        casalId: string;
        email: string;
      };
    }
  }
}

export function autenticacaoMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      dados: null,
      erro: true,
      mensagem: 'Não autorizado'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'segredo_trocar_em_producao';
    const payload = jwt.verify(token, JWT_SECRET) as {
      usuarioId: string;
      casalId: string;
      email: string;
    };

    req.usuario = {
      id: payload.usuarioId,
      casalId: payload.casalId,
      email: payload.email
    };

    next();
  } catch (error) {
    res.status(401).json({
      dados: null,
      erro: true,
      mensagem: 'Não autorizado'
    });
  }
}
