import React from 'react'

interface CartaoProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

export default function Cartao({ children, className, style, onClick }: CartaoProps) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: 'var(--cor-card)',
        borderRadius: 'var(--raio)',
        padding: '20px',
        border: '1px solid var(--cor-borda)',
        boxShadow: 'var(--sombra)',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
