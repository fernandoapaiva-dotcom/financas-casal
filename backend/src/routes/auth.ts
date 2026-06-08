import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { autenticacaoMiddleware } from '../middlewares/autenticacao';

export const router = Router();
const prisma = new PrismaClient();

// Map de convites em memória: token -> { casalId, expiresAt }
const convitesMap = new Map<string, { casalId: string; expiresAt: Date }>();

// POST /auth/registrar
router.post('/registrar', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nome, email, senha, telefone } = req.body;

    if (!nome || !email || !senha) {
      res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Nome, email e senha são obrigatórios'
      });
      return;
    }

    const usuarioExistente = await prisma.usuario.findFirst({
      where: { email, deletadoEm: null }
    });

    if (usuarioExistente) {
      res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'E-mail já cadastrado'
      });
      return;
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    // Transação para criar o usuário, casal e membro casal associado
    const resultado = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nome,
          email,
          senhaHash,
          telefone
        }
      });

      const casal = await tx.casal.create({
        data: {
          nome: `Casal de ${nome}`
        }
      });

      await tx.membroCasal.create({
        data: {
          casalId: casal.id,
          usuarioId: usuario.id,
          papel: 'ADMIN'
        }
      });

      return { usuario, casal };
    });

    const JWT_SECRET = process.env.JWT_SECRET || 'segredo_trocar_em_producao';
    const token = jwt.sign(
      { usuarioId: resultado.usuario.id, casalId: resultado.casal.id, email: resultado.usuario.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      dados: {
        token,
        usuario: {
          id: resultado.usuario.id,
          nome: resultado.usuario.nome,
          email: resultado.usuario.email
        }
      },
      erro: false,
      mensagem: 'Cadastro realizado'
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Email e senha são obrigatórios'
      });
      return;
    }

    const usuario = await prisma.usuario.findFirst({
      where: { email, deletadoEm: null }
    });

    if (!usuario) {
      res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'E-mail ou senha incorretos'
      });
      return;
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'E-mail ou senha incorretos'
      });
      return;
    }

    const membroCasal = await prisma.membroCasal.findFirst({
      where: { usuarioId: usuario.id }
    });

    if (!membroCasal) {
      res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Usuário não associado a um casal'
      });
      return;
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'segredo_trocar_em_producao';
    const token = jwt.sign(
      { usuarioId: usuario.id, casalId: membroCasal.casalId, email: usuario.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      dados: {
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email
        }
      },
      erro: false,
      mensagem: 'Login realizado'
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/convidar
router.post('/convidar', autenticacaoMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuarioLogado = req.usuario!;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // agora + 48 horas

    convitesMap.set(token, {
      casalId: usuarioLogado.casalId,
      expiresAt
    });

    res.json({
      dados: {
        link: `/convite/${token}`
      },
      erro: false,
      mensagem: 'Convite gerado'
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/aceitar-convite
router.post('/aceitar-convite', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, nome, senha, email } = req.body;

    if (!token || !nome || !senha || !email) {
      res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Token, nome, email e senha são obrigatórios'
      });
      return;
    }

    const convite = convitesMap.get(token);

    if (!convite) {
      res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Convite inválido'
      });
      return;
    }

    if (new Date() > convite.expiresAt) {
      convitesMap.delete(token);
      res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'Convite expirado'
      });
      return;
    }

    // Verificar se o e-mail já existe
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { email, deletadoEm: null }
    });

    if (usuarioExistente) {
      res.status(400).json({
        dados: null,
        erro: true,
        mensagem: 'E-mail já cadastrado'
      });
      return;
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    const resultado = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nome,
          email,
          senhaHash
        }
      });

      await tx.membroCasal.create({
        data: {
          casalId: convite.casalId,
          usuarioId: usuario.id,
          papel: 'MEMBRO'
        }
      });

      return usuario;
    });

    convitesMap.delete(token);

    const JWT_SECRET = process.env.JWT_SECRET || 'segredo_trocar_em_producao';
    const tokenJWT = jwt.sign(
      { usuarioId: resultado.id, casalId: convite.casalId, email: resultado.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      dados: {
        token: tokenJWT,
        usuario: {
          id: resultado.id,
          nome: resultado.nome,
          email: resultado.email
        }
      },
      erro: false,
      mensagem: 'Cadastro realizado'
    });
  } catch (error) {
    next(error);
  }
});
