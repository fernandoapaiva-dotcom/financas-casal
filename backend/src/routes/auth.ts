import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../services/db';
import { autenticacaoMiddleware } from '../middlewares/autenticacao';

export const router = Router();

// Map para armazenar os convites em memória: Map<token, { casalId: string, email: string, expiresAt: Date }>
const convitesMap = new Map<string, { casalId: string; email: string; expiresAt: Date }>();

// Auxiliar para gerar o token JWT
function gerarToken(usuarioId: string, casalId: string, email: string): string {
  const segredo = process.env.JWT_SECRET || 'segredo_trocar_em_producao';
  return jwt.sign({ usuarioId, casalId, email }, segredo, { expiresIn: '30d' });
}

// POST /auth/registrar
router.post('/registrar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nome, email, senha, telefone } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Nome, email e senha são obrigatórios',
      });
    }

    // Verificar se o email já existe
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { email, deletadoEm: null },
    });

    if (usuarioExistente) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Este email já está cadastrado',
      });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    // Criar tudo em transação para consistência
    const resultado = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nome,
          email,
          senhaHash,
          telefone,
        },
      });

      const casal = await tx.casal.create({
        data: {
          nome: `Casal de ${nome}`,
        },
      });

      await tx.membroCasal.create({
        data: {
          casalId: casal.id,
          usuarioId: usuario.id,
          papel: 'ADMIN',
        },
      });

      return { usuario, casal };
    });

    const token = gerarToken(resultado.usuario.id, resultado.casal.id, resultado.usuario.email);

    return res.status(201).json({
      dados: {
        token,
        usuario: {
          id: resultado.usuario.id,
          nome: resultado.usuario.nome,
          email: resultado.usuario.email,
        },
      },
      erro: false,
      mensagem: 'Cadastro realizado',
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Email e senha são obrigatórios',
      });
    }

    const usuario = await prisma.usuario.findFirst({
      where: { email, deletadoEm: null },
    });

    if (!usuario) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Credenciais inválidas',
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Credenciais inválidas',
      });
    }

    const membro = await prisma.membroCasal.findFirst({
      where: { usuarioId: usuario.id },
    });

    if (!membro) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Usuário não está associado a nenhum casal',
      });
    }

    const token = gerarToken(usuario.id, membro.casalId, usuario.email);

    return res.status(200).json({
      dados: {
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
        },
      },
      erro: false,
      mensagem: 'Login realizado',
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/convidar (requer autenticacao)
router.post('/convidar', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Email é obrigatório',
      });
    }

    const casalId = req.usuario!.casalId;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas a partir de agora

    convitesMap.set(token, { casalId, email, expiresAt });

    return res.status(200).json({
      dados: {
        link: `/convite/${token}`,
      },
      erro: false,
      mensagem: 'Convite gerado',
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/aceitar-convite
router.post('/aceitar-convite', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, nome, senha } = req.body;

    if (!token || !nome || !senha) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Token, nome e senha são obrigatórios',
      });
    }

    const convite = convitesMap.get(token);

    if (!convite) {
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Convite inválido ou expirado',
      });
    }

    if (new Date() > convite.expiresAt) {
      convitesMap.delete(token);
      return res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Convite expirado',
      });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    const resultado = await prisma.$transaction(async (tx) => {
      const conviteInfo = convitesMap.get(token);
      if (!conviteInfo) {
        throw new Error('Convite inválido');
      }

      const emailConvidado = conviteInfo.email;

      const usuario = await tx.usuario.create({
        data: {
          nome,
          email: emailConvidado,
          senhaHash,
        },
      });

      await tx.membroCasal.create({
        data: {
          casalId: conviteInfo.casalId,
          usuarioId: usuario.id,
          papel: 'MEMBRO',
        },
      });

      return { usuario, casalId: conviteInfo.casalId };
    });

    convitesMap.delete(token);

    const jwtToken = gerarToken(resultado.usuario.id, resultado.casalId, resultado.usuario.email);

    return res.status(200).json({
      dados: {
        token: jwtToken,
        usuario: {
          id: resultado.usuario.id,
          nome: resultado.usuario.nome,
          email: resultado.usuario.email,
        },
      },
      erro: false,
      mensagem: 'Cadastro realizado',
    });
  } catch (error) {
    next(error);
  }
});
