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

interface IntegracaoStatus {
  configurado: boolean
  preview?: string
}

interface IntegracoesInfo {
  claudeApi: IntegracaoStatus
  pluggy: IntegracaoStatus
  evolutionApi: IntegracaoStatus
  iaConfig?: {
    provedor: string
    gemini: IntegracaoStatus
    claude: IntegracaoStatus
    openai: IntegracaoStatus
  }
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

  // Estados locais para Integrações
  const [showClaude, setShowClaude] = useState(false)
  const [claudeKeyInput, setClaudeKeyInput] = useState('')

  const [showPluggyId, setShowPluggyId] = useState(false)
  const [pluggyIdInput, setPluggyIdInput] = useState('')
  const [showPluggySecret, setShowPluggySecret] = useState(false)
  const [pluggySecretInput, setPluggySecretInput] = useState('')

  const [showEvolutionUrl, setShowEvolutionUrl] = useState(false)
  const [evolutionUrlInput, setEvolutionUrlInput] = useState('')
  const [showEvolutionInst, setShowEvolutionInst] = useState(false)
  const [evolutionInstInput, setEvolutionInstInput] = useState('')
  const [showEvolutionKey, setShowEvolutionKey] = useState(false)
  const [evolutionKeyInput, setEvolutionKeyInput] = useState('')

  const [statusTestes, setStatusTestes] = useState<{ [key: string]: { carregando: boolean; sucesso?: boolean; msg?: string } }>({})

  // Estados para Motor de IA
  const [provedorIA, setProvedorIA] = useState('gemini')
  const [geminiKeyInput, setGeminiKeyInput] = useState('')
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [openaiKeyInput, setOpenaiKeyInput] = useState('')
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [statusMotorIA, setStatusMotorIA] = useState<{ carregando: boolean; sucesso?: boolean; msg?: string }>({ carregando: false })

  // Buscar status das integrações
  const { data: statusIntegracoes, isLoading: carregandoIntegracoes, refetch: refetchIntegracoes } = useQuery<IntegracoesInfo>({
    queryKey: ['integracoes-status'],
    queryFn: async () => {
      const res = await api.get('/configuracoes/integracoes')
      return res.data.dados
    }
  })

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

  // Sincroniza provedorIA com o valor da API
  useEffect(() => {
    if (statusIntegracoes?.iaConfig?.provedor) {
      setProvedorIA(statusIntegracoes.iaConfig.provedor)
    }
  }, [statusIntegracoes])

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

  const atualizarIntegracaoMutation = useMutation({
    mutationFn: async (dados: { chave: string; valor: string }) => {
      const res = await api.put('/configuracoes/integracoes', dados)
      return res.data
    },
    onSuccess: () => {
      refetchIntegracoes()
      alert('Configuração salva com sucesso!')
    },
    onError: (err: any) => {
      alert(`Erro ao salvar: ${err.response?.data?.mensagem || err.message}`)
    }
  })

  const testarConexao = async (integracao: string) => {
    setStatusTestes(prev => ({
      ...prev,
      [integracao]: { carregando: true }
    }))

    try {
      const res = await api.post('/configuracoes/integracoes/testar', { integracao })
      const dados = res.data.dados
      setStatusTestes(prev => ({
        ...prev,
        [integracao]: {
          carregando: false,
          sucesso: dados.sucesso,
          msg: dados.mensagem
        }
      }))
    } catch (err: any) {
      setStatusTestes(prev => ({
        ...prev,
        [integracao]: {
          carregando: false,
          sucesso: false,
          msg: err.response?.data?.mensagem || err.message
        }
      }))
    }
  }

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

  if (isLoading || carregandoAlertas || carregandoIntegracoes) {
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

      {/* Motor de IA */}
      <Cartao>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>🤖 Motor de IA</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--cor-texto-fraco)', marginBottom: '16px' }}>
          Escolha qual provedor de IA será usado para análises financeiras, categorização e respostas no WhatsApp.
        </p>

        {/* Select de provedor */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--cor-texto-fraco)', display: 'block', marginBottom: '6px' }}>
            Provedor de IA
          </label>
          <select
            value={provedorIA}
            onChange={async (e) => {
              const novoProvedor = e.target.value
              setProvedorIA(novoProvedor)
              try {
                await api.put('/configuracoes/integracoes', { chave: 'IA_PROVEDOR', valor: novoProvedor })
                refetchIntegracoes()
              } catch (err: any) {
                alert(`Erro ao salvar provedor: ${err.response?.data?.mensagem || err.message}`)
              }
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--raio)',
              border: '1px solid var(--cor-borda)',
              background: 'var(--cor-card-2)',
              color: 'var(--cor-texto)',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <option value="gemini">✨ Gemini (Gratuito)</option>
            <option value="claude">Claude (Anthropic)</option>
            <option value="openai">OpenAI (GPT-4o-mini)</option>
          </select>
        </div>

        {/* Campo de API key baseado no provedor selecionado */}
        {provedorIA === 'gemini' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--cor-texto-fraco)' }}>
                Obtenha sua chave gratuita em{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--cor-primaria)', textDecoration: 'none' }}>
                  Google AI Studio
                </a>
              </span>
              {statusIntegracoes?.iaConfig?.gemini.configurado && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px',
                  background: 'rgba(16,185,129,0.1)', color: 'var(--cor-sucesso)', fontWeight: 'bold' }}>
                  Configurado {statusIntegracoes.iaConfig.gemini.preview}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Campo
                  label="GEMINI_API_KEY"
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiKeyInput}
                  onChange={setGeminiKeyInput}
                  placeholder="AIza..."
                />
                <button type="button" onClick={() => setShowGeminiKey(!showGeminiKey)}
                  style={{ position: 'absolute', right: '10px', top: '32px', background: 'none',
                    border: 'none', color: 'var(--cor-texto-fraco)', cursor: 'pointer' }}>
                  {showGeminiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <Botao variante="primario" style={{ width: 'auto', padding: '10px 16px' }}
                onClick={() => atualizarIntegracaoMutation.mutate({ chave: 'GEMINI_API_KEY', valor: geminiKeyInput })}>
                Salvar
              </Botao>
            </div>
          </div>
        )}

        {provedorIA === 'claude' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--cor-texto-fraco)' }}>
                Obtenha sua chave em{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--cor-primaria)', textDecoration: 'none' }}>
                  console.anthropic.com
                </a>
              </span>
              {statusIntegracoes?.iaConfig?.claude.configurado && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px',
                  background: 'rgba(16,185,129,0.1)', color: 'var(--cor-sucesso)', fontWeight: 'bold' }}>
                  Configurado {statusIntegracoes.iaConfig.claude.preview}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Campo
                  label="CLAUDE_API_KEY"
                  type={showClaude ? 'text' : 'password'}
                  value={claudeKeyInput}
                  onChange={setClaudeKeyInput}
                  placeholder="sk-ant-..."
                />
                <button type="button" onClick={() => setShowClaude(!showClaude)}
                  style={{ position: 'absolute', right: '10px', top: '32px', background: 'none',
                    border: 'none', color: 'var(--cor-texto-fraco)', cursor: 'pointer' }}>
                  {showClaude ? '🙈' : '👁️'}
                </button>
              </div>
              <Botao variante="primario" style={{ width: 'auto', padding: '10px 16px' }}
                onClick={() => atualizarIntegracaoMutation.mutate({ chave: 'CLAUDE_API_KEY', valor: claudeKeyInput })}>
                Salvar
              </Botao>
            </div>
          </div>
        )}

        {provedorIA === 'openai' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--cor-texto-fraco)' }}>
                Obtenha sua chave em{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--cor-primaria)', textDecoration: 'none' }}>
                  platform.openai.com
                </a>
              </span>
              {statusIntegracoes?.iaConfig?.openai.configurado && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px',
                  background: 'rgba(16,185,129,0.1)', color: 'var(--cor-sucesso)', fontWeight: 'bold' }}>
                  Configurado {statusIntegracoes.iaConfig.openai.preview}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Campo
                  label="OPENAI_API_KEY"
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiKeyInput}
                  onChange={setOpenaiKeyInput}
                  placeholder="sk-..."
                />
                <button type="button" onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  style={{ position: 'absolute', right: '10px', top: '32px', background: 'none',
                    border: 'none', color: 'var(--cor-texto-fraco)', cursor: 'pointer' }}>
                  {showOpenaiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <Botao variante="primario" style={{ width: 'auto', padding: '10px 16px' }}
                onClick={() => atualizarIntegracaoMutation.mutate({ chave: 'OPENAI_API_KEY', valor: openaiKeyInput })}>
                Salvar
              </Botao>
            </div>
          </div>
        )}

        {/* Botão Testar */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Botao
            variante="secundario"
            style={{ width: 'auto', padding: '10px 20px' }}
            onClick={async () => {
              setStatusMotorIA({ carregando: true })
              try {
                const res = await api.post('/configuracoes/integracoes/testar', { integracao: provedorIA })
                const dados = res.data.dados
                setStatusMotorIA({ carregando: false, sucesso: dados.sucesso, msg: dados.mensagem })
              } catch (err: any) {
                setStatusMotorIA({ carregando: false, sucesso: false, msg: err.response?.data?.mensagem || err.message })
              }
            }}
            disabled={statusMotorIA.carregando}
          >
            {statusMotorIA.carregando ? 'Testando...' : '🔌 Testar conexão'}
          </Botao>
          {statusMotorIA.msg && (
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 'bold',
              color: statusMotorIA.sucesso ? 'var(--cor-sucesso)' : 'var(--cor-perigo)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <span>{statusMotorIA.sucesso ? '✅' : '❌'}</span>
              <span>{statusMotorIA.msg}</span>
            </span>
          )}
        </div>
      </Cartao>

      {/* Integrações e APIs */}
      <Cartao>

        <h3 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>⚙️ Integrações e APIs</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--cor-texto-fraco)', marginBottom: '16px' }}>
          Configure as credenciais e conexões com APIs externas para utilizar os recursos de inteligência artificial, importação bancária e WhatsApp.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Claude API */}
          <div style={{ borderBottom: '1px solid var(--cor-borda)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Claude API (Anthropic)</span>
              <span style={{
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '12px',
                background: statusIntegracoes?.claudeApi.configurado ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: statusIntegracoes?.claudeApi.configurado ? 'var(--cor-sucesso)' : 'var(--cor-alerta)',
                fontWeight: 'bold'
              }}>
                {statusIntegracoes?.claudeApi.configurado ? `Configurado (${statusIntegracoes.claudeApi.preview})` : 'Não configurado'}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-end', marginTop: '12px' }}>
              <div style={{ flex: '1 1 250px', position: 'relative' }}>
                <Campo
                  label="CLAUDE_API_KEY"
                  type={showClaude ? 'text' : 'password'}
                  value={claudeKeyInput}
                  onChange={setClaudeKeyInput}
                  placeholder="Inserir nova chave"
                />
                <button
                  type="button"
                  onClick={() => setShowClaude(!showClaude)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '32px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--cor-texto-fraco)',
                    cursor: 'pointer'
                  }}
                >
                  {showClaude ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Botao
                  variante="primario"
                  style={{ width: 'auto', padding: '10px 16px' }}
                  onClick={() => atualizarIntegracaoMutation.mutate({ chave: 'CLAUDE_API_KEY', valor: claudeKeyInput })}
                  carregando={atualizarIntegracaoMutation.isPending && atualizarIntegracaoMutation.variables?.chave === 'CLAUDE_API_KEY'}
                >
                  Salvar
                </Botao>
                <Botao
                  variante="secundario"
                  style={{ width: 'auto', padding: '10px 16px' }}
                  onClick={() => testarConexao('claude')}
                  disabled={statusTestes['claude']?.carregando}
                >
                  {statusTestes['claude']?.carregando ? 'Testando...' : 'Testar Conexão'}
                </Botao>
              </div>
            </div>
            {statusTestes['claude']?.msg && (
              <div style={{
                marginTop: '10px',
                fontSize: '0.8rem',
                color: statusTestes['claude']?.sucesso ? 'var(--cor-sucesso)' : 'var(--cor-perigo)',
                fontWeight: 'bold'
              }}>
                {statusTestes['claude']?.msg}
              </div>
            )}
          </div>

          {/* Pluggy */}
          <div style={{ borderBottom: '1px solid var(--cor-borda)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Pluggy (Integração Bancária)</span>
              <span style={{
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '12px',
                background: statusIntegracoes?.pluggy.configurado ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: statusIntegracoes?.pluggy.configurado ? 'var(--cor-sucesso)' : 'var(--cor-alerta)',
                fontWeight: 'bold'
              }}>
                {statusIntegracoes?.pluggy.configurado ? 'Configurado' : 'Não configurado'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Campo
                  label="PLUGGY_CLIENT_ID"
                  type={showPluggyId ? 'text' : 'password'}
                  value={pluggyIdInput}
                  onChange={setPluggyIdInput}
                  placeholder="Inserir novo Client ID"
                />
                <button
                  type="button"
                  onClick={() => setShowPluggyId(!showPluggyId)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '32px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--cor-texto-fraco)',
                    cursor: 'pointer'
                  }}
                >
                  {showPluggyId ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Campo
                  label="PLUGGY_CLIENT_SECRET"
                  type={showPluggySecret ? 'text' : 'password'}
                  value={pluggySecretInput}
                  onChange={setPluggySecretInput}
                  placeholder="Inserir novo Client Secret"
                />
                <button
                  type="button"
                  onClick={() => setShowPluggySecret(!showPluggySecret)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '32px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--cor-texto-fraco)',
                    cursor: 'pointer'
                  }}
                >
                  {showPluggySecret ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Botao
                  variante="primario"
                  style={{ width: 'auto', padding: '10px 16px' }}
                  onClick={async () => {
                    if (pluggyIdInput) await atualizarIntegracaoMutation.mutateAsync({ chave: 'PLUGGY_CLIENT_ID', valor: pluggyIdInput })
                    if (pluggySecretInput) await atualizarIntegracaoMutation.mutateAsync({ chave: 'PLUGGY_CLIENT_SECRET', valor: pluggySecretInput })
                  }}
                  carregando={atualizarIntegracaoMutation.isPending}
                >
                  Salvar
                </Botao>
                <Botao
                  variante="secundario"
                  style={{ width: 'auto', padding: '10px 16px' }}
                  onClick={() => testarConexao('pluggy')}
                  disabled={statusTestes['pluggy']?.carregando}
                >
                  {statusTestes['pluggy']?.carregando ? 'Testando...' : 'Testar Conexão'}
                </Botao>
              </div>
            </div>
            {statusTestes['pluggy']?.msg && (
              <div style={{
                marginTop: '10px',
                fontSize: '0.8rem',
                color: statusTestes['pluggy']?.sucesso ? 'var(--cor-sucesso)' : 'var(--cor-perigo)',
                fontWeight: 'bold'
              }}>
                {statusTestes['pluggy']?.msg}
              </div>
            )}
          </div>

          {/* Evolution API */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Evolution API (WhatsApp Bot)</span>
              <span style={{
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '12px',
                background: statusIntegracoes?.evolutionApi.configurado ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: statusIntegracoes?.evolutionApi.configurado ? 'var(--cor-sucesso)' : 'var(--cor-alerta)',
                fontWeight: 'bold'
              }}>
                {statusIntegracoes?.evolutionApi.configurado ? 'Configurado' : 'Não configurado'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Campo
                  label="EVOLUTION_API_URL"
                  type={showEvolutionUrl ? 'text' : 'password'}
                  value={evolutionUrlInput}
                  onChange={setEvolutionUrlInput}
                  placeholder="Ex: http://localhost:8080"
                />
                <button
                  type="button"
                  onClick={() => setShowEvolutionUrl(!showEvolutionUrl)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '32px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--cor-texto-fraco)',
                    cursor: 'pointer'
                  }}
                >
                  {showEvolutionUrl ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Campo
                  label="EVOLUTION_INSTANCE"
                  type={showEvolutionInst ? 'text' : 'password'}
                  value={evolutionInstInput}
                  onChange={setEvolutionInstInput}
                  placeholder="Ex: financas-casal"
                />
                <button
                  type="button"
                  onClick={() => setShowEvolutionInst(!showEvolutionInst)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '32px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--cor-texto-fraco)',
                    cursor: 'pointer'
                  }}
                >
                  {showEvolutionInst ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Campo
                  label="EVOLUTION_API_KEY"
                  type={showEvolutionKey ? 'text' : 'password'}
                  value={evolutionKeyInput}
                  onChange={setEvolutionKeyInput}
                  placeholder="Inserir Evolution API Token"
                />
                <button
                  type="button"
                  onClick={() => setShowEvolutionKey(!showEvolutionKey)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '32px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--cor-texto-fraco)',
                    cursor: 'pointer'
                  }}
                >
                  {showEvolutionKey ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Botao
                  variante="primario"
                  style={{ width: 'auto', padding: '10px 16px' }}
                  onClick={async () => {
                    if (evolutionUrlInput) await atualizarIntegracaoMutation.mutateAsync({ chave: 'EVOLUTION_API_URL', valor: evolutionUrlInput })
                    if (evolutionInstInput) await atualizarIntegracaoMutation.mutateAsync({ chave: 'EVOLUTION_INSTANCE', valor: evolutionInstInput })
                    if (evolutionKeyInput) await atualizarIntegracaoMutation.mutateAsync({ chave: 'EVOLUTION_API_KEY', valor: evolutionKeyInput })
                  }}
                  carregando={atualizarIntegracaoMutation.isPending}
                >
                  Salvar
                </Botao>
                <Botao
                  variante="secundario"
                  style={{ width: 'auto', padding: '10px 16px' }}
                  onClick={() => testarConexao('evolution')}
                  disabled={statusTestes['evolution']?.carregando}
                >
                  {statusTestes['evolution']?.carregando ? 'Testando...' : 'Testar Conexão'}
                </Botao>
              </div>
            </div>
            {statusTestes['evolution']?.msg && (
              <div style={{
                marginTop: '10px',
                fontSize: '0.8rem',
                color: statusTestes['evolution']?.sucesso ? 'var(--cor-sucesso)' : 'var(--cor-perigo)',
                fontWeight: 'bold'
              }}>
                {statusTestes['evolution']?.msg}
              </div>
            )}
          </div>
        </div>
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

      {/* Parceiros */}
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
