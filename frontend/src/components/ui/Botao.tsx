import React from 'react'

interface BotaoProps {
  children: React.ReactNode
  variante?: 'primario' | 'secundario' | 'perigo' | 'sucesso'
  carregando?: boolean
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  style?: React.CSSProperties
  tamanho?: 'sm' | 'md' | 'lg'
}

export default function Botao({
  children,
  variante = 'primario',
  carregando = false,
  disabled = false,
  onClick,
  type = 'button',
  style,
  tamanho = 'md',
}: BotaoProps) {
  const paddings = {
    sm: '6px 12px',
    md: '12px 24px',
    lg: '16px 32px',
  }
  const fontSizes = {
    sm: '13px',
    md: '16px',
    lg: '18px',
  }

  const estiloBase: React.CSSProperties = {
    padding: paddings[tamanho],
    borderRadius: '8px',
    cursor: carregando || disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    fontWeight: 600,
    fontSize: fontSizes[tamanho],
    width: '100%',
    transition: 'all 200ms',
    opacity: carregando || disabled ? 0.7 : 1,
  }

  const estilosPorVariante: Record<string, React.CSSProperties> = {
    primario: {
      background: 'var(--cor-primaria)',
      color: '#fff',
    },
    secundario: {
      background: 'transparent',
      border: '1px solid var(--cor-borda)',
      color: 'var(--cor-texto)',
    },
    perigo: {
      background: 'var(--cor-perigo)',
      color: '#fff',
    },
    sucesso: {
      background: 'var(--cor-sucesso)',
      color: '#fff',
    },
  }

  return (
    <button
      type={type}
      onClick={!carregando && !disabled ? onClick : undefined}
      disabled={carregando || disabled}
      style={{ ...estiloBase, ...estilosPorVariante[variante], ...style }}
      onMouseOver={e => {
        if (!carregando && !disabled && variante === 'primario') {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--cor-primaria-hover)'
        }
      }}
      onMouseOut={e => {
        if (variante === 'primario') {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--cor-primaria)'
        }
      }}
    >
      {carregando ? '...' : children}
    </button>
  )
}
