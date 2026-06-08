import { Request, Response, NextFunction } from 'express';

export function errosMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(err.stack);

  res.status(500).json({
    dados: null,
    erro: true,
    mensagem: err.message || 'Erro interno'
  });
}
