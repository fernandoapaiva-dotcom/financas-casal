import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Botao from '../components/ui/Botao'
import Campo from '../components/ui/Campo'
import Cartao from '../components/ui/Cartao'
import Carregando from '../components/ui/Carregando'
import { useCasal } from '../hooks/useFinancas'
import { useAuthStore } from '../stores/authStore'

interface Alerta {
  tipo: 'VENCIMENTO' | 'ORCAMENTO' | 'PARCELA'
  titulo: string
  mensagem: string
  urgente: boolean
}

export default function Configuracoes() {
  const queryClient = useQueryClient()
  const { data: casal, isLoading } = useCasal()
  const logout = useAuthStore((state) => state.logout)
  const usuario = useAuthStore((state) => state.usuario)
  const setTelefoneStore = useAuthStore((state) => state.setTelefone)

  // Estados locais da parceria do casal
  const [nomeCasal, setNomeCasal] = useState('')
  const [orcamento, setOrcamento] = useState('')
  const [mensagemSucesso, setMensagemSucesso] = useState('')

  // Estados locais do telefone do membro
  const [telefone, setTelefone] = useState('')
  const [msgTelefone, setMsgTelefone] = useState('')

  // Estados locais do modal de verificação de compra
  const [modalAberto, setModalAberto] = useState(false)
  const [compraDescricao, setCompraDescricao] = useState('')
  const [compraValor, setCompraValor] = useState('')
  const [compraParcelas, setCompraParcelas] = useState('1')
  const [resultadoCompra, setResultadoCompra] = useState<any>(null)

  // Buscar alertas ativos
  const { data: alertas, isLoading: carregandoAlertas } = useQuery<Alerta[]>({
    queryKey: ['alertas'],
    queryFn: async () => {
      const res = await api.get('/alertas')
      return res.data.dados
    },
  })

  // Sincroniza dados locais com dados da query do casal
  useEffect(() => {
    if (casal) {
      setNomeCasal(casal.nome || '')
      setOrcamento(casal.orcamentoMensal ? String(casal.orcamentoMensal) : '')
    }
  }, [casal])

  // Sincroniza telefone local com o da authStore
  useEffect(() => {
    if (usuario) {
      setTelefone(usuario.telefone || '')
    }
  }, [usuario])

  const atualizarCasalMutation = useMutation({
    mutationFn: async (dadosAtualizados: { nome: string; orcamentoMensal: number | null }) => {
      const res = await api.put('/casal', dadosAtualizados)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casal'] })
      queryClient.invalidateQueries({ queryKey: ['resumo'] })
      setMensagemSucesso('Configurações salvas com sucesso!')
      setTimeout(() => setMensagemSucesso(''), 3000)
    },
  })

  const atualizarTelefoneMutation = useMutation({
    mutationFn: async (tel: string) => {
      const res = await api.put('/casal/membro', { telefone: tel })
      return res.data
    },
    onSuccess: (data) => {
      const telAtualizado = data.dados.telefone
      setTelefoneStore(telAtualizado)
      setMsgTelefone('✅ Número cadastrado')
      setTimeout(() => setMsgTelefone(''), 3000)
    },
    onError: (err: any) => {
      setMsgTelefone(`⚠️ ${err.response?.data?.mensagem || 'Erro ao cadastrar'}`)
    },
  })

  const verificarCompraMutation = useMutation({
    mutationFn: async (dados: { descricao: string; valor: number; parcelas: number }) => {
      const res = await api.post('/alertas/verificar-compra', dados)
      return res.data.dados
    },
    onSuccess: (dados) => {
      setResultadoCompra(dados)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeCasal) return

    atualizarCasalMutation.mutate({
      nome: nomeCasal,
      orcamentoMensal: orcamento ? parseFloat(orcamento) : null,
    })
  }

  const handleSalvarTelefone = (e: React.FormEvent) => {
    e.preventDefault()
    atualizarTelefoneMutation.mutate(telefone)
  }

  const handleVerificarCompra = (e: React.FormEvent) => {
    e.preventDefault()
    if (!compraDescricao || !compraValor) return

    verificarCompraMutation.mutate({
      descricao: compraDescricao,
      valor: parseFloat(compraValor),
      parcelas: parseInt(compraParcelas) || 1,
    })
  }

  if (isLoading || carregandoAlertas) {
    return <Carregando />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Configurações do Casal */}
      <Cartao>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '16px' }}>Dados do Casal</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Campo label="Nome da Parceria (Ex: Nosso Lar, Casal Silva)" value={nomeCasal} onChange={setNomeCasal} />
          
          <Campo label="Orçamento Mensal (R$)" value={orcamento} onChange={setOrcamento} type="number" />

          {mensagemSucesso && (
            <div style={{ color: 'var(--cor-sucesso)', fontSize: '0.85rem', fontWeight: 'bold' }}>
              {mensagemSucesso}
            </div>
          )}

          <Botao
            type="submit"
            variante="primario"
            carregando={atualizarCasalMutation.isPending}
            style={{ marginTop: '8px' }}
          >
            Salvar Alterações
          </Botao>
        </form>
      </Cartao>

      {/* Card Meu WhatsApp */}
      <Cartao>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>💬 Meu WhatsApp</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--cor-texto-fraco)', marginBottom: '12px' }}>
          Cadastre seu número para usar o bot no WhatsApp. Mande mensagens de gastos, peça o saldo ou pergunte se pode fazer uma compra.
        </p>
        <form onSubmit={handleSalvarTelefone} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Campo
            label="Telefone (apenas números com DDD, ex: 11999999999)"
            value={telefone}
            onChange={setTelefone}
            placeholder="Ex: 5511999999999"
          />

          {msgTelefone && (
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
              {msgTelefone}
            </div>
          )}

          {!msgTelefone && usuario?.telefone && (
            <div style={{ color: 'var(--cor-sucesso)', fontSize: '0.85rem', fontWeight: 'bold' }}>
              ✅ Número cadastrado
            </div>
          )}

          {!msgTelefone && !usuario?.telefone && (
            <div style={{ color: 'var(--cor-alerta)', fontSize: '0.85rem', fontWeight: 'bold' }}>
              ⚠️ Número não cadastrado
            </div>
          )}

          <Botao
            type="submit"
            variante="secundario"
            carregando={atualizarTelefoneMutation.isPending}
            style={{ marginTop: '4px' }}
          >
            Salvar Número
          </Botao>
        </form>
      </Cartao>

      {/* Card Painel de Alertas */}
      <Cartao>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.05rem' }}>🚨 Painel de Alertas</h3>
          <Botao variante="primario" tamanho="sm" onClick={() => setModalAberto(true)} style={{ width: 'auto' }}>
            Posso Comprar?
          </Botao>
        </div>

        {alertas && alertas.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--cor-texto-fraco)', textAlign: 'center', padding: '10px' }}>
            Nenhum alerta ativo no momento. Tudo sob controle!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alertas?.map((alerta, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--raio)',
                  background: alerta.urgente ? 'rgba(239, 68, 68, 0.1)' : 'var(--cor-card-2)',
                  borderLeft: `4px solid ${alerta.urgente ? 'var(--cor-perigo)' : 'var(--cor-alerta)'}`,
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span>{alerta.tipo === 'VENCIMENTO' ? '📅' : alerta.tipo === 'ORCAMENTO' ? '📈' : '💳'}</span>
                  <span>{alerta.titulo}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--cor-texto-fraco)', marginTop: '4px' }}>
                  {alerta.mensagem}
                </p>
              </div>
            ))}
          </div>
        )}
      </Cartao>

      {/* Membros do Casal */}
      <Cartao>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '12px' }}>Parceiros</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {casal?.membros.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--cor-borda)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{m.usuario.nome}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cor-texto-fraco)' }}>{m.usuario.email}</div>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  background: 'var(--cor-card-2)',
                  color: 'var(--cor-texto-fraco)',
                  padding: '4px 8px',
                  borderRadius: '12px',
                }}
              >
                {m.papel === 'ADMIN' ? 'Administrador' : 'Parceiro'}
              </span>
            </div>
          ))}
        </div>
      </Cartao>

      {/* Conta do Usuário e Sair */}
      <Cartao>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--cor-texto-fraco)', textAlign: 'center' }}>
            Deseja sair do aplicativo nesta máquina?
          </div>
          <Botao variante="perigo" onClick={logout}>
            Sair da Conta
          </Botao>
        </div>
      </Cartao>

      {/* Modal Verificar Compra */}
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
              <h3 style={{ fontSize: '1.1rem' }}>Verificar Compra (IA)</h3>
              <button
                onClick={() => {
                  setModalAberto(false)
                  setResultadoCompra(null)
                  setCompraDescricao('')
                  setCompraValor('')
                  setCompraParcelas('1')
                }}
                style={{ background: 'none', border: 'none', color: 'var(--cor-texto-fraco)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {!resultadoCompra ? (
              <form onSubmit={handleVerificarCompra} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Campo
                  label="O que quer comprar?"
                  value={compraDescricao}
                  onChange={setCompraDescricao}
                  placeholder="Ex: PlayStation 5"
                />

                <Campo
                  label="Valor total (R$)"
                  value={compraValor}
                  onChange={setCompraValor}
                  type="number"
                  placeholder="0.00"
                />

                <Campo
                  label="Em quantas parcelas?"
                  value={compraParcelas}
                  onChange={setCompraParcelas}
                  type="number"
                  placeholder="1"
                />

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
                    carregando={verificarCompraMutation.isPending}
                  >
                    Analisar Viabilidade
                  </Botao>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--raio)',
                    background: resultadoCompra.viavel ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderLeft: `4px solid ${resultadoCompra.viavel ? 'var(--cor-sucesso)' : 'var(--cor-perigo)'}`,
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  {resultadoCompra.viavel ? '✅ COMPRA VIÁVEL' : '❌ COMPRA NÃO RECOMENDADA'}
                </div>

                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Recomendação da IA:</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--cor-texto-fraco)' }}>{resultadoCompra.recomendacao}</p>
                </div>

                {resultadoCompra.alertas && resultadoCompra.alertas.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '4px', color: 'var(--cor-alerta)' }}>Alertas:</h4>
                    <ul style={{ fontSize: '0.8rem', color: 'var(--cor-texto-fraco)', paddingLeft: '20px' }}>
                      {resultadoCompra.alertas.map((alerta: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '2px' }}>{alerta}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Botao
                  type="button"
                  variante="secundario"
                  onClick={() => setResultadoCompra(null)}
                  style={{ marginTop: '8px' }}
                >
                  Nova Consulta
                </Botao>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
