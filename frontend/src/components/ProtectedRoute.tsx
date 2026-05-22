import { Navigate } from 'react-router-dom'
import { isUserLoggedIn, removeToken } from '@/utils/auth'

type Props = {
  children: React.ReactElement
}

const ProtectedRoute = ({ children }: Props) => {
  const tokenValid = isUserLoggedIn()

  if (!tokenValid) {
    removeToken()
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
