import { create } from 'zustand'
import api from '../services/api'

interface Usuario {
  id: string
  nome: string
  email: string
  telefone?: string | null
}

interface AuthState {
  usuario: Usuario | null
  token: string | null
  casalId: string | null
  autenticado: boolean
  login: (email: string, senha: string) => Promise<void>
  registrar: (nome: string, email: string, senha: string) => Promise<void>
  logout: () => void
  restaurarSessao: () => void
  setTelefone: (telefone: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  token: null,
  casalId: null,
  autenticado: false,

  login: async (email, senha) => {
    const res = await api.post('/auth/login', { email, senha })
    const { token, usuario } = res.data.dados
    // Decodifica o JWT para extrair casalId
    const payload = JSON.parse(atob(token.split('.')[1]))
    localStorage.setItem('token', token)
    localStorage.setItem('usuario', JSON.stringify(usuario))
    localStorage.setItem('casalId', payload.casalId)
    set({ token, usuario, casalId: payload.casalId, autenticado: true })
  },

  registrar: async (nome, email, senha) => {
    const res = await api.post('/auth/registrar', { nome, email, senha })
    const { token, usuario } = res.data.dados
    const payload = JSON.parse(atob(token.split('.')[1]))
    localStorage.setItem('token', token)
    localStorage.setItem('usuario', JSON.stringify(usuario))
    localStorage.setItem('casalId', payload.casalId)
    set({ token, usuario, casalId: payload.casalId, autenticado: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    localStorage.removeItem('casalId')
    set({ token: null, usuario: null, casalId: null, autenticado: false })
    window.location.href = '/login'
  },

  restaurarSessao: () => {
    const token = localStorage.getItem('token')
    const usuarioStr = localStorage.getItem('usuario')
    const casalId = localStorage.getItem('casalId')
    if (token && usuarioStr) {
      try {
        // Verifica se token não expirou
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('token')
          localStorage.removeItem('usuario')
          localStorage.removeItem('casalId')
          return
        }
        const usuario = JSON.parse(usuarioStr)
        set({ token, usuario, casalId, autenticado: true })
      } catch {
        // Token inválido
      }
    }
  },

  setTelefone: (telefone) => {
    set((state) => {
      if (!state.usuario) return state
      const novoUsuario = { ...state.usuario, telefone }
      localStorage.setItem('usuario', JSON.stringify(novoUsuario))
      return { usuario: novoUsuario }
    })
  },
}))
