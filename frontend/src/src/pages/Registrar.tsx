import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import Campo from '../components/ui/Campo'
import Botao from '../components/ui/Botao'

export default function Registrar() {
  const navigate = useNavigate()
  const registrar = useAuthStore(s => s.registrar)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (senha !== confirmar) {
      setErro('As senhas não coincidem')
      return
    }
    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres')
      return
    }
    setCarregando(true)
    try {
      await registrar(nome, email, senha)
      navigate('/dashboard')
    } catch (err: any) {
      setErro(err?.response?.data?.mensagem || 'Erro ao cadastrar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--cor-fundo)',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>💰</div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--cor-primaria)', marginBottom: '8px' }}>
            FinançasCasal
          </h1>
          <p style={{ color: 'var(--cor-texto-fraco)' }}>Crie sua conta gratuitamente</p>
        </div>

        <div style={{
          background: 'var(--cor-card)',
          borderRadius: 'var(--raio)',
          padding: '32px',
          border: '1px solid var(--cor-borda)',
          boxShadow: 'var(--sombra)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Campo label="Nome completo" value={nome} onChange={setNome} placeholder="Seu nome" />
            <Campo label="Email" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />
            <Campo label="Senha" type="password" value={senha} onChange={setSenha} placeholder="Mínimo 6 caracteres" />
            <Campo label="Confirmar senha" type="password" value={confirmar} onChange={setConfirmar} placeholder="Repita a senha" />
            {erro && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid var(--cor-perigo)',
                borderRadius: '8px',
                padding: '12px',
                color: 'var(--cor-perigo)',
                fontSize: '14px',
              }}>
                {erro}
              </div>
            )}
            <Botao type="submit" variante="primario" carregando={carregando}>
              Criar conta
            </Botao>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--cor-texto-fraco)', fontSize: '14px' }}>
            Já tem conta?{' '}
            <Link to="/login" style={{ color: 'var(--cor-primaria)', textDecoration: 'none', fontWeight: 600 }}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
