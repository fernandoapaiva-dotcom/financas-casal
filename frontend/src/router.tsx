import { createBrowserRouter, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Registrar from './pages/Registrar'
import RotaProtegida from './RotaProtegida'
import Dashboard from './pages/Dashboard'
import Transacoes from './pages/Transacoes'
import Contas from './pages/Contas'
import Configuracoes from './pages/Configuracoes'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/registrar',
    element: <Registrar />,
  },
  {
    path: '/',
    element: <RotaProtegida />,
    children: [
      {
        path: '',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'transacoes',
        element: <Transacoes />,
      },
      {
        path: 'contas',
        element: <Contas />,
      },
      {
        path: 'configuracoes',
        element: <Configuracoes />,
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
])
