import React from 'react'

interface CampoProps {
  label: string
  erro?: string
  children?: React.ReactNode
  type?: string
  value?: string
  onChange?: (v: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function Campo({
  label,
  erro,
  children,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
}: CampoProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ color: 'var(--cor-texto-fraco)', fontSize: '14px', fontWeight: 500 }}>
        {label}
      </label>
      
      {children ? (
        children
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            background: 'var(--cor-card-2)',
            border: `1px solid ${erro ? 'var(--cor-perigo)' : 'var(--cor-borda)'}`,
            color: 'var(--cor-texto)',
            padding: '12px',
            borderRadius: '8px',
            width: '100%',
            outline: 'none',
            transition: 'border-color 200ms',
          }}
          onFocus={e => {
            if (!erro) e.currentTarget.style.borderColor = 'var(--cor-primaria)'
          }}
          onBlur={e => {
            if (!erro) e.currentTarget.style.borderColor = 'var(--cor-borda)'
          }}
        />
      )}

      {erro && (
        <span style={{ color: 'var(--cor-perigo)', fontSize: '13px' }}>{erro}</span>
      )}
    </div>
  )
}
