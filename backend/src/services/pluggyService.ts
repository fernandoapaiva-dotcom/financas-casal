import { PluggyClient } from 'pluggy-sdk';

let cliente: PluggyClient | null = null;

function getCliente(): PluggyClient {
  if (!cliente) {
    const clientId = process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('Credenciais Pluggy não configuradas');
    }
    cliente = new PluggyClient({
      clientId,
      clientSecret,
    });
  }
  return cliente;
}

export async function gerarTokenConexao(): Promise<string> {
  const resultado = await getCliente().createConnectToken();
  return resultado.accessToken;
}

export async function buscarContas(itemId: string) {
  return await getCliente().fetchAccounts(itemId);
}

export async function buscarTransacoes(contaId: string, de: Date, ate: Date) {
  return await getCliente().fetchTransactions(contaId, {
    from: de.toISOString().split('T')[0],
    to: ate.toISOString().split('T')[0],
  });
}

export async function buscarSaldo(contaId: string) {
  const conta = await getCliente().fetchAccount(contaId);
  return conta.balance;
}
