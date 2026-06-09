import axios from 'axios'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
export const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'financas-casal'

export async function enviarMensagem(telefone: string, mensagem: string): Promise<void> {
  try {
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`
    // A Evolution API geralmente requer telefone com código do país (ex: 5511999999999)
    await axios.post(
      url,
      {
        number: telefone,
        text: mensagem,
      },
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
        },
      }
    )
  } catch (error: any) {
    console.error('Falha ao enviar mensagem via Evolution API:', error?.response?.data || error?.message || error)
  }
}

export async function verificarInstancia(): Promise<boolean> {
  try {
    const url = `${EVOLUTION_API_URL}/instance/fetchInstances`
    const response = await axios.get(url, {
      headers: {
        apikey: EVOLUTION_API_KEY,
      },
    })
    
    // Procura a instância na lista e verifica se está conectada
    const instancias = response.data
    if (Array.isArray(instancias)) {
      const inst = instancias.find((i: any) => i.instanceName === EVOLUTION_INSTANCE)
      return inst ? inst.status === 'open' || inst.connectionStatus === 'CONNECTED' : false
    }
    return false
  } catch (error: any) {
    console.error('Erro ao verificar instância da Evolution API:', error?.response?.data || error?.message || error)
    return false
  }
}
