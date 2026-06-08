const estiloSpinner: React.CSSProperties = {
  border: '3px solid var(--cor-borda)',
  borderTop: '3px solid var(--cor-primaria)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}

import React from 'react'

const css = `@keyframes spin { to { transform: rotate(360deg); } }`

export default function Carregando() {
  return (
    <>
      <style>{css}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '200px',
        }}
      >
        <div style={{ ...estiloSpinner, width: '40px', height: '40px' }} />
      </div>
    </>
  )
}

export function CarregandoInline() {
  return (
    <>
      <style>{css}</style>
      <div style={{ ...estiloSpinner, width: '20px', height: '20px', display: 'inline-block' }} />
    </>
  )
}
