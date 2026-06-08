interface ValorProps {
  valor: number
  tamanho?: 'sm' | 'md' | 'lg'
  tipo?: 'DEBITO' | 'CREDITO'
}

const tamanhos = { sm: '14px', md: '18px', lg: '28px' }

export default function Valor({ valor, tamanho = 'md', tipo }: ValorProps) {
  const formatado = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  
  // Determina cor com base no tipo explicitly fornecido ou no valor
  let cor = 'var(--cor-sucesso)'
  if (tipo === 'DEBITO') {
    cor = 'var(--cor-perigo)'
  } else if (tipo === 'CREDITO') {
    cor = 'var(--cor-sucesso)'
  } else {
    cor = valor >= 0 ? 'var(--cor-sucesso)' : 'var(--cor-perigo)'
  }

  return (
    <span
      style={{
        fontSize: tamanhos[tamanho],
        fontWeight: 'bold',
        color: cor,
      }}
    >
      {formatado}
    </span>
  )
}
