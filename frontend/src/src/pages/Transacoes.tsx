import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Botao from '../components/ui/Botao'
import Campo from '../components/ui/Campo'
import Cartao from '../components/ui/Cartao'
import Carregando from '../components/ui/Carregando'
import Valor from '../components/ui/Valor'
import { useTransacoes, useContas } from '../hooks/useFinancas'

const CATEGORIAS_PADRAO = [
  'Alimentação',
  'Transporte',
  'Saúde',
  'Lazer',
  'Moradia',
  'Educação',
  'Vestuário',
  'Renda',
  'Outro',
]

const EMOJI_MAPA: Record<string, string> = {
  'Alimentação': '🍽️',
  'Transporte': '🚗',
  'Saúde': '💊',
  'Lazer': '🎮',
  'Moradia': '🏠',
  'Educação': '📚',
  'Vestuário': '👕',
  'Renda': '💰',
  'Outro': '📌',
}

export default function Transacoes() {
  const queryClient = useQueryClient()
  const dataAtual = new Date()

  // Filtros
  const [mes, setMes] = useState(dataAtual.getMonth() + 1)
  const [ano, setAno] = useState(dataAtual.getFullYear())
  const [categoria, setCategoria] = useState('')

  // Modal de Transação
  const [modalAberto, setModalAberto] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState<'DEBITO' | 'CREDITO'>('DEBITO')
  const [catSelecionada, setCatSelecionada] = useState('Outro')
  const [contaId, setContaId] = useState('')

  // Buscar transações e contas
  const { data: dadosTransacoes, isLoading: carregandoTransacoes } = useTransacoes({ mes, ano, categoria })
  const { data: dadosContas } = useContas()

  // Extrair todas as contas do casal num array plano
  const contasPlanas = (dadosContas ?? []).flatMap((c) => c.contas)

  // Criar transação manual
  const criarTransacaoMutation = useMutation({
    mutationFn: async (novaTransacao: any) => {
      const res = await api.post('/transacoes', novaTransacao)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] })
      queryClient.invalidateQueries({ queryKey: ['resumo'] })
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
      // Resetar form e fechar modal
      setDescricao('')
      setValor('')
      setTipo('DEBITO')
      setCatSelecionada('Outro')
      setContaId('')
      setModalAberto(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!descricao || !valor) return

    criarTransacaoMutation.mutate({
      descricao,
      valor: parseFloat(valor),
      tipo,
      categoria: catSelecionada,
      data: new Date().toISOString(), // Lança com a data/hora atual em formato ISO (UTC)
      contaId: contaId || null,
    })
  }

  // Agrupar transações por dia
  const transacoes = dadosTransacoes?.transacoes ?? []
  const transacoesAgrupadas: Record<string, typeof transacoes> = {}

  transacoes.forEach((t) => {
    const dataStr = new Date(t.data).toLocaleDateString('pt-BR')
    if (!transacoesAgrupadas[dataStr]) {
      transacoesAgrupadas[dataStr] = []
    }
    transacoesAgrupadas[dataStr].push(t)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', minHeight: '80vh' }}>
      {/* Filtros */}
      <Cartao>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <Campo label="Mês">
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--raio)',
                background: 'var(--cor-fundo)',
                color: 'var(--cor-texto)',
                border: '1px solid var(--cor-borda)',
              }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Ano">
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--raio)',
                background: 'var(--cor-fundo)',
                color: 'var(--cor-texto)',
                border: '1px solid var(--cor-borda)',
              }}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        {/* Chips de Categoria */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setCategoria('')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: 'none',
              background: categoria === '' ? 'var(--cor-primaria)' : 'var(--cor-card-2)',
              color: 'var(--cor-texto)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem',
            }}
          >
            Todas
          </button>
          {CATEGORIAS_PADRAO.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: 'none',
                background: categoria === cat ? 'var(--cor-primaria)' : 'var(--cor-card-2)',
                color: 'var(--cor-texto)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '0.85rem',
              }}
            >
              {EMOJI_MAPA[cat] || '📌'} {cat}
            </button>
          ))}
        </div>
      </Cartao>

      {/* Lista de Transações */}
      {carregandoTransacoes ? (
        <Carregando />
      ) : transacoes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--cor-texto-fraco)' }}>
          Nenhum gasto encontrado para os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(transacoesAgrupadas).map(([data, itens]) => {
            // Calcular total do dia
            const totalDia = itens.reduce(
              (acc, curr) => acc + (curr.tipo === 'DEBITO' ? -curr.valor : curr.valor),
              0
            )

            return (
              <div key={data} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 4px',
                    fontSize: '0.85rem',
                    color: 'var(--cor-texto-fraco)',
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>{data}</span>
                  <span>
                    Total: <Valor valor={totalDia} />
                  </span>
                </div>

                <Cartao>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {itens.map((t) => {
                      const emoji = EMOJI_MAPA[t.categoria || ''] || '📌'
                      return (
                        <div
                          key={t.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingBottom: '8px',
                            borderBottom: '1px solid var(--cor-borda)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '1.4rem' }}>{emoji}</span>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{t.descricao}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--cor-texto-fraco)' }}>
                                {t.categoria || 'Sem categoria'}
                                {t.contaId && ` • ${contasPlanas.find((c) => c.id === t.contaId)?.nome || 'Conta'}`}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                            <Valor valor={t.valor} tipo={t.tipo === 'DEBITO' ? 'DEBITO' : 'CREDITO'} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Cartao>
              </div>
            )
          })}
        </div>
      )}

      {/* FAB - Botão de Adicionar */}
      <button
        onClick={() => setModalAberto(true)}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--cor-primaria)',
          color: 'var(--cor-texto)',
          border: 'none',
          fontSize: '1.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--sombra)',
          cursor: 'pointer',
          zIndex: 99,
        }}
      >
        +
      </button>

      {/* Modal Manual de Lançamento */}
      {modalAberto && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 200,
          }}
        >
          <div
            style={{
              background: 'var(--cor-card)',
              border: '1px solid var(--cor-borda)',
              borderRadius: 'var(--raio)',
              padding: '20px',
              width: '100%',
              maxWidth: '450px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Lançar Transação</h3>
              <button
                onClick={() => setModalAberto(false)}
                style={{ background: 'none', border: 'none', color: 'var(--cor-texto-fraco)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Campo label="Descrição">
                <input
                  type="text"
                  required
                  placeholder="Ex: Supermercado BH"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--raio)',
                    background: 'var(--cor-fundo)',
                    color: 'var(--cor-texto)',
                    border: '1px solid var(--cor-borda)',
                  }}
                />
              </Campo>

              <Campo label="Valor (R$)">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--raio)',
                    background: 'var(--cor-fundo)',
                    color: 'var(--cor-texto)',
                    border: '1px solid var(--cor-borda)',
                  }}
                />
              </Campo>

              <Campo label="Tipo">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Botao
                    type="button"
                    variante={tipo === 'DEBITO' ? 'perigo' : 'secundario'}
                    onClick={() => setTipo('DEBITO')}
                    style={{ flex: 1 }}
                  >
                    Saída (Débito)
                  </Botao>
                  <Botao
                    type="button"
                    variante={tipo === 'CREDITO' ? 'sucesso' : 'secundario'}
                    onClick={() => setTipo('CREDITO')}
                    style={{ flex: 1 }}
                  >
                    Entrada (Crédito)
                  </Botao>
                </div>
              </Campo>

              <Campo label="Categoria">
                <select
                  value={catSelecionada}
                  onChange={(e) => setCatSelecionada(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--raio)',
                    background: 'var(--cor-fundo)',
                    color: 'var(--cor-texto)',
                    border: '1px solid var(--cor-borda)',
                  }}
                >
                  {CATEGORIAS_PADRAO.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Conta (Opcional)">
                <select
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--raio)',
                    background: 'var(--cor-fundo)',
                    color: 'var(--cor-texto)',
                    border: '1px solid var(--cor-borda)',
                  }}
                >
                  <option value="">Selecione uma conta...</option>
                  {contasPlanas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.banco})
                    </option>
                  ))}
                </select>
              </Campo>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <Botao
                  type="button"
                  variante="secundario"
                  style={{ flex: 1 }}
                  onClick={() => setModalAberto(false)}
                >
                  Cancelar
                </Botao>
                <Botao
                  type="submit"
                  variante="primario"
                  style={{ flex: 1 }}
                  carregando={criarTransacaoMutation.isPending}
                >
                  Salvar
                </Botao>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
