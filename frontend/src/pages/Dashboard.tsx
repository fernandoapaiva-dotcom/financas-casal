import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import Botao from '../components/ui/Botao'
import Cartao from '../components/ui/Cartao'
import Carregando from '../components/ui/Carregando'
import Valor from '../components/ui/Valor'
import { useResumoFinanceiro, useCategorias, useTransacoes } from '../hooks/useFinancas'

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

const CORES_PIE = [
  '#7c3aed', // primaria
  '#10b981', // sucesso
  '#3b82f6', // azul
  '#f59e0b', // alerta
  '#ef4444', // perigo
  '#ec4899', // rosa
  '#06b6d4', // ciano
  '#8b5cf6', // roxo mais claro
]

export default function Dashboard() {
  const dataAtual = new Date()
  const mesAtual = dataAtual.getMonth() + 1
  const anoAtual = dataAtual.getFullYear()

  const { data: resumo, isLoading: carregandoResumo, refetch: atualizarResumo } = useResumoFinanceiro()
  const { data: categorias, isLoading: carregandoCategorias } = useCategorias(mesAtual, anoAtual)
  const { data: dadosTransacoes, isLoading: carregandoTransacoes } = useTransacoes({ limite: 5 })

  const isLoading = carregandoResumo || carregandoCategorias || carregandoTransacoes

  if (isLoading) {
    return <Carregando />
  }

  const saldo = resumo?.saldoTotal ?? 0
  const orcamento = resumo?.orcamentoMensal ?? 0
  const percentualUsado = resumo?.percentualUsado ?? 0

  // Determinar cor da barra de orçamento
  let corOrcamento = 'var(--cor-sucesso)'
  if (percentualUsado >= 90) {
    corOrcamento = 'var(--cor-perigo)'
  } else if (percentualUsado >= 70) {
    corOrcamento = 'var(--cor-alerta)'
  }

  // Preparar dados para o gráfico de pizza
  const dadosGrafico = (categorias ?? [])
    .filter(cat => cat.total > 0)
    .map(cat => ({
      name: cat.categoria,
      value: cat.total,
    }))

  const ultimasTransacoes = dadosTransacoes?.transacoes ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Resumo de Saldos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Cartao>
          <div style={{ fontSize: '0.85rem', color: 'var(--cor-texto-fraco)', marginBottom: '4px' }}>
            Saldo Total
          </div>
          <Valor valor={saldo} tamanho="lg" />
        </Cartao>
        <Cartao>
          <div style={{ fontSize: '0.85rem', color: 'var(--cor-texto-fraco)', marginBottom: '4px' }}>
            Disponível
          </div>
          <Valor valor={orcamento > 0 ? Math.max(0, orcamento - (resumo?.totalSaidas ?? 0)) : saldo} tamanho="lg" />
        </Cartao>
      </div>

      {/* Progresso do Orçamento */}
      {orcamento > 0 && (
        <Cartao>
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Orçamento Mensal</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--cor-texto-fraco)', marginLeft: 'auto' }}>
              {percentualUsado.toFixed(0)}% de <Valor valor={orcamento} tamanho="sm" />
            </span>
          </div>
          <div style={{ width: '100%', height: '10px', background: 'var(--cor-borda)', borderRadius: '5px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, percentualUsado)}%`,
                height: '100%',
                background: corOrcamento,
                borderRadius: '5px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </Cartao>
      )}

      {/* Gráfico de Categorias */}
      {dadosGrafico.length > 0 && (
        <Cartao>
          <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Gastos por Categoria</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
            <div style={{ width: '150px', height: '150px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosGrafico}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dadosGrafico.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_PIE[index % CORES_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
                    contentStyle={{ background: 'var(--cor-card)', borderColor: 'var(--cor-borda)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '20px' }}>
              {dadosGrafico.slice(0, 5).map((cat, idx) => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', gap: '8px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: CORES_PIE[idx % CORES_PIE.length],
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ color: 'var(--cor-texto-fraco)' }}>{cat.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>
                    <Valor valor={cat.value} tamanho="sm" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Cartao>
      )}

      {/* Últimas Transações */}
      <Cartao>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1rem' }}>Últimos Gastos</h3>
          <Botao variante="secundario" tamanho="sm" onClick={() => atualizarResumo()}>
            Atualizar
          </Botao>
        </div>
        {ultimasTransacoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--cor-texto-fraco)', fontSize: '0.9rem' }}>
            Nenhuma transação lançada ainda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ultimasTransacoes.map((t) => {
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
                        {t.categoria || 'Sem categoria'} • {new Date(t.data).toLocaleDateString('pt-BR')}
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
        )}
      </Cartao>
    </div>
  )
}
