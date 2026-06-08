import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import Campo from '../components/ui/Campo'
import Botao from '../components/ui/Botao'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await login(email, senha)
      navigate('/dashboard')
    } catch {
      setErro('Email ou senha incorretos')
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
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>💰</div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--cor-primaria)', marginBottom: '8px' }}>
            FinançasCasal
          </h1>
          <p style={{ color: 'var(--cor-texto-fraco)' }}>Controle financeiro do casal</p>
        </div>

        {/* Form */}
        <div style={{
          background: 'var(--cor-card)',
          borderRadius: 'var(--raio)',
          padding: '32px',
          border: '1px solid var(--cor-borda)',
          boxShadow: 'var(--sombra)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Campo
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="seu@email.com"
            />
            <Campo
              label="Senha"
              type="password"
              value={senha}
              onChange={setSenha}
              placeholder="••••••••"
            />
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
              Entrar
            </Botao>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--cor-texto-fraco)', fontSize: '14px' }}>
            Não tem conta?{' '}
            <Link to="/registrar" style={{ color: 'var(--cor-primaria)', textDecoration: 'none', fontWeight: 600 }}>
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
