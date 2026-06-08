import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export function useResumoFinanceiro() {
  return useQuery({
    queryKey: ['resumo'],
    queryFn: async () => {
      const res = await api.get('/casal/resumo')
      return res.data.dados as {
        saldoTotal: number
        totalEntradas: number
        totalSaidas: number
        totalParcelasAbertas: number
        percentualUsado: number
        orcamentoMensal?: number
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

interface FiltrosTransacao {
  mes?: number
  ano?: number
  categoria?: string
  contaId?: string
  pagina?: number
  limite?: number
}

export function useTransacoes(filtros: FiltrosTransacao = {}) {
  return useQuery({
    queryKey: ['transacoes', filtros],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filtros.mes) params.set('mes', String(filtros.mes))
      if (filtros.ano) params.set('ano', String(filtros.ano))
      if (filtros.categoria) params.set('categoria', filtros.categoria)
      if (filtros.contaId) params.set('contaId', filtros.contaId)
      if (filtros.pagina) params.set('pagina', String(filtros.pagina))
      if (filtros.limite) params.set('limite', String(filtros.limite))
      const res = await api.get(`/transacoes?${params}`)
      return res.data.dados as {
        transacoes: Transacao[]
        total: number
        pagina: number
        totalPaginas: number
      }
    },
  })
}

export interface Transacao {
  id: string
  descricao: string
  valor: number
  tipo: 'DEBITO' | 'CREDITO'
  categoria: string | null
  subcategoria: string | null
  estabelecimento: string | null
  data: string
  parcelada: boolean
  parcelaAtual: number | null
  parcelasTotal: number | null
  lancadaManualmente: boolean
  contaId: string | null
  casalId: string
}

export function useCategorias(mes: number, ano: number) {
  return useQuery({
    queryKey: ['categorias', mes, ano],
    queryFn: async () => {
      const res = await api.get(`/transacoes/categorias?mes=${mes}&ano=${ano}`)
      return res.data.dados as {
        categoria: string
        total: number
        limiteOrcamento: number | null
        percentualUsado: number
      }[]
    },
  })
}

export interface Conta {
  id: string
  nome: string
  banco: string
  tipo: string
  saldoAtual: number
  ultimoSync: string | null
  ativa: boolean
  usuarioId: string
  pluggyItemId: string | null
  pluggyContaId: string | null
}

export function useContas() {
  return useQuery({
    queryKey: ['contas'],
    queryFn: async () => {
      const res = await api.get('/pluggy/contas')
      return res.data.dados.contas as {
        usuarioId: string
        usuario: { id: string; nome: string }
        contas: Conta[]
      }[]
    },
  })
}

export function useCasal() {
  return useQuery({
    queryKey: ['casal'],
    queryFn: async () => {
      const res = await api.get('/casal')
      return res.data.dados as {
        id: string
        nome: string
        orcamentoMensal: number | null
        membros: { id: string; papel: string; usuario: { id: string; nome: string; email: string } }[]
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}
