const cacheCategorias = new Map<string, { categoria: string; subcategoria: string }>();
import { chamarIA } from './iaService';

// Regras locais por palavras-chave
const regrasLocais: { palavras: string[]; resultado: { categoria: string; subcategoria: string } }[] = [
  {
    palavras: ['posto', 'shell', 'ipiranga', 'petrobras', 'combustivel', 'gasolina', 'etanol'],
    resultado: { categoria: 'Transporte', subcategoria: 'Combustível' },
  },
  {
    palavras: ['uber', '99', 'taxi', 'cabify', 'passagem', 'metrô', 'onibus', 'trem'],
    resultado: { categoria: 'Transporte', subcategoria: 'Mobilidade' },
  },
  {
    palavras: ['supermercado', 'mercado', 'extra', 'carrefour', 'pao de acucar', 'atacado', 'hortifruti', 'feira'],
    resultado: { categoria: 'Alimentação', subcategoria: 'Supermercado' },
  },
  {
    palavras: ['ifood', 'rappi', 'uber eats', 'delivery', 'restaurante', 'lanchonete', 'pizzaria', 'hamburger', 'sushi'],
    resultado: { categoria: 'Alimentação', subcategoria: 'Delivery/Restaurante' },
  },
  {
    palavras: ['netflix', 'spotify', 'amazon prime', 'disney', 'globoplay', 'hbo', 'youtube premium', 'deezer'],
    resultado: { categoria: 'Lazer', subcategoria: 'Streaming' },
  },
  {
    palavras: ['farmacia', 'drogaria', 'ultrafarma', 'droga', 'remedios', 'medicamento'],
    resultado: { categoria: 'Saúde', subcategoria: 'Farmácia' },
  },
  {
    palavras: ['hospital', 'clinica', 'medico', 'consulta', 'dentista', 'laboratorio', 'exame'],
    resultado: { categoria: 'Saúde', subcategoria: 'Consultas' },
  },
  {
    palavras: ['salario', 'pagamento folha', 'holerite', 'remuneracao'],
    resultado: { categoria: 'Renda', subcategoria: 'Salário' },
  },
  {
    palavras: ['aluguel', 'condominio', 'iptu', 'agua', 'luz', 'energia', 'gas', 'internet', 'telefone'],
    resultado: { categoria: 'Moradia', subcategoria: 'Contas' },
  },
  {
    palavras: ['escola', 'faculdade', 'curso', 'mensalidade', 'livro', 'material escolar'],
    resultado: { categoria: 'Educação', subcategoria: 'Ensino' },
  },
  {
    palavras: ['roupa', 'calçado', 'shopping', 'zara', 'renner', 'riachuelo', 'c&a', 'hering'],
    resultado: { categoria: 'Vestuário', subcategoria: 'Roupas' },
  },
  {
    palavras: ['pix recebido', 'transferencia recebida', 'ted recebido'],
    resultado: { categoria: 'Renda', subcategoria: 'Transferência recebida' },
  },
  {
    palavras: ['pix enviado', 'transferencia enviada', 'ted enviado'],
    resultado: { categoria: 'Transferência', subcategoria: 'Enviada' },
  },
];

export async function categorizarTransacao(
  descricao: string,
  estabelecimento: string
): Promise<{ categoria: string; subcategoria: string }> {
  const chave = `${descricao}|${estabelecimento}`;

  // Verificar cache
  if (cacheCategorias.has(chave)) {
    return cacheCategorias.get(chave)!;
  }

  const textoCombinado = `${descricao} ${estabelecimento}`.toLowerCase();

  // Camada 1: Regras locais
  for (const regra of regrasLocais) {
    if (regra.palavras.some((p) => textoCombinado.includes(p))) {
      cacheCategorias.set(chave, regra.resultado);
      return regra.resultado;
    }
  }

  // Camada 2: Fallback chamarIA
  try {
    const prompt = `Categorize esta transação financeira brasileira. Descrição: ${descricao}. Estabelecimento: ${estabelecimento}. Responda APENAS com JSON sem markdown: { "categoria": "...", "subcategoria": "..." }. Categorias possíveis: Alimentação, Transporte, Saúde, Lazer, Moradia, Educação, Vestuário, Renda, Transferência, Serviços, Outro.`;
    const contentText = await chamarIA(prompt);
    if (contentText) {
      // Remover qualquer tag ```json se presente
      const cleanJson = contentText.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.categoria && parsed.subcategoria) {
        const resultado = {
          categoria: parsed.categoria,
          subcategoria: parsed.subcategoria,
        };
        cacheCategorias.set(chave, resultado);
        return resultado;
      }
    }
  } catch (error) {
    console.error('Erro ao chamar IA para categorização:', error);
  }

  const padrao = { categoria: 'Outro', subcategoria: 'Não categorizado' };
  cacheCategorias.set(chave, padrao);
  return padrao;
}
