import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCasal } from '../hooks/useFinancas'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { data: casal } = useCasal()
  const location = useLocation()

  // Pegar a inicial do nome do casal ou membro
  const nomeCasal = casal?.nome || 'Casal'
  const inicial = nomeCasal.charAt(0).toUpperCase()

  const links = [
    { caminho: '/dashboard', label: 'Início', icone: '🏠' },
    { caminho: '/transacoes', label: 'Gastos', icone: '📋' },
    { caminho: '/contas', label: 'Contas', icone: '🏦' },
    { caminho: '/configuracoes', label: 'Config', icone: '⚙️' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Fixo */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'var(--cor-card)',
          borderBottom: '1px solid var(--cor-borda)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 100,
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--cor-texto)' }}>
          {nomeCasal}
        </span>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--cor-primaria)',
            color: 'var(--cor-texto)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '0.9rem',
          }}
        >
          {inicial}
        </div>
      </header>

      {/* Área de Conteúdo */}
      <main
        style={{
          flex: 1,
          padding: '16px',
          paddingTop: '76px', // 60px header + 16px margem
          paddingBottom: '80px', // 64px bottom nav + 16px margem
          maxWidth: '800px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {children}
      </main>

      {/* Bottom Nav Fixo */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: 'var(--cor-card)',
          borderTop: '1px solid var(--cor-borda)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 100,
        }}
      >
        {links.map((link) => {
          const ativo = location.pathname === link.caminho
          return (
            <Link
              key={link.caminho}
              to={link.caminho}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                color: ativo ? 'var(--cor-primaria)' : 'var(--cor-texto-fraco)',
                fontSize: '0.8rem',
                gap: '4px',
                width: '60px',
                transition: 'color 0.2s ease',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{link.icone}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
