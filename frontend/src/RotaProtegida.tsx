import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'

export default function RotaProtegida() {
  const autenticado = useAuthStore((state) => state.autenticado)

  if (!autenticado) {
    return <Navigate to="/login" replace />
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}
