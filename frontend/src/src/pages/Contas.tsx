import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Botao from '../components/ui/Botao'
import Cartao from '../components/ui/Cartao'
import Carregando from '../components/ui/Carregando'
import Valor from '../components/ui/Valor'
import { useContas } from '../hooks/useFinancas'

declare global {
  interface Window {
    PluggyConnect: any
  }
}

export default function Contas() {
  const queryClient = useQueryClient()
  const { data: agrupamentosContas, isLoading: carregandoContas } = useContas()
  const [carregandoPluggy, setCarregandoPluggy] = useState(false)

  // Mutação para deletar/desconectar uma conta
  const deletarContaMutation = useMutation({
    mutationFn: async (contaId: string) => {
      // Endpoint de soft delete conforme as convenções da API
      const res = await api.delete(`/pluggy/contas/${contaId}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas'] })
      queryClient.invalidateQueries({ queryKey: ['resumo'] })
    },
  })

  // Carrega o script do Pluggy Connect dinamicamente
  useEffect(() => {
    if (window.PluggyConnect) return

    const script = document.createElement('script')
    script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2/pluggy-connect.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      // Não removemos para evitar recarregar à toa se navegar de volta
    }
  }, [])

  const handleConectarConta = async () => {
    if (!window.PluggyConnect) {
      alert('O plugin de conexão bancária ainda está carregando. Tente novamente em instantes.')
      return
    }

    try {
      setCarregandoPluggy(true)
      // Buscar token de conexão no backend
      const res = await api.post('/pluggy/token')
      const tokenConexao = res.data.dados.accessToken // formato retornado pelo backend

      const pluggyOpt = {
        updateItem: null,
        onSuccess: async (itemData: { item: { id: string } }) => {
          // Salvar ou atualizar conexão no backend
          try {
            await api.post('/pluggy/conectar', { itemId: itemData.item.id })
            queryClient.invalidateQueries({ queryKey: ['contas'] })
            queryClient.invalidateQueries({ queryKey: ['resumo'] })
            queryClient.invalidateQueries({ queryKey: ['transacoes'] })
          } catch (err) {
            console.error('Erro ao salvar conexão com Pluggy:', err)
          }
        },
        onError: (error: any) => {
          console.error('Erro no widget Pluggy Connect:', error)
        },
      }

      const pluggyConnect = new window.PluggyConnect(tokenConexao, pluggyOpt)
      pluggyConnect.init()
    } catch (err) {
      console.error('Erro ao inicializar Pluggy Connect:', err)
      alert('Não foi possível iniciar a conexão bancária.')
    } finally {
      setCarregandoPluggy(false)
    }
  }

  const handleDeletar = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja desconectar e remover a conta "${nome}"?`)) {
      deletarContaMutation.mutate(id)
    }
  }

  if (carregandoContas) {
    return <Carregando />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Botão de Conectar */}
      <Cartao>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
          <span style={{ fontSize: '2rem' }}>🔌</span>
          <div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>Sincronização Bancária Automática</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--cor-texto-fraco)', maxWidth: '280px' }}>
              Conecte suas contas com segurança e veja seus gastos atualizados automaticamente.
            </p>
          </div>
          <Botao
            variante="primario"
            onClick={handleConectarConta}
            carregando={carregandoPluggy}
            style={{ marginTop: '8px', width: '100%', maxWidth: '240px' }}
          >
            Conectar Nova Conta
          </Botao>
        </div>
      </Cartao>

      {/* Lista de Contas por Usuário */}
      {(agrupamentosContas ?? []).map((agrupamento) => (
        <div key={agrupamento.usuarioId} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--cor-texto-fraco)', fontWeight: 'bold', padding: '0 4px' }}>
            Contas de {agrupamento.usuario.nome}
          </div>

          {agrupamento.contas.length === 0 ? (
            <Cartao>
              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--cor-texto-fraco)', fontSize: '0.85rem' }}>
                Nenhuma conta conectada por este usuário.
              </div>
            </Cartao>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {agrupamento.contas.map((c) => (
                <Cartao key={c.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{c.nome}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cor-texto-fraco)' }}>
                        {c.banco} • {c.tipo === 'CREDIT' ? 'Cartão de Crédito' : 'Conta Corrente'}
                      </div>
                      {c.ultimoSync && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--cor-texto-fraco)', marginTop: '4px' }}>
                          Sincronizado: {new Date(c.ultimoSync).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        <Valor valor={c.saldoAtual} />
                      </div>
                      <button
                        onClick={() => handleDeletar(c.id, c.nome)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--cor-perigo)',
                          cursor: 'pointer',
                          fontSize: '1.1rem',
                          padding: '4px',
                        }}
                        title="Remover conta"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </Cartao>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
