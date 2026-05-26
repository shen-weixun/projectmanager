import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageMeta from '@/components/PageMeta'
import useAPIErrorHandler from '@/hooks/useAPIErrorHandler'
import { getCompanyInfoAPI, loginAPI } from '@/services/apis'
import { saveAccount, saveRoleKey, saveToken } from '@/utils/auth'
import { showError, showSuccess } from '@/utils/toastHelper'

type InputProps = {
  placeholder: string
  value: string
  onChange: (value: string) => void
  type?: string
}

const Input = ({ placeholder, value, onChange, type = 'text' }: InputProps) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

type ButtonProps = {
  text: string
  onClick: () => void
}

const Button = ({ text, onClick }: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full bg-blue-400 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2 px-4 rounded shadow-md transition duration-200"
    >
      {text}
    </button>
  )
}

type CompanyInfo = {
  CompanyName?: string
  CompanyNameEn?: string
  logo?: string
}

const LoginPage = () => {
  const navigate = useNavigate()
  const handleError = useAPIErrorHandler()
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const res = await getCompanyInfoAPI()
        if (res.status === -1) {
          handleError(res.error)
          return
        }

        setCompanyInfo(res.data)
      } catch (err) {
      }
    }
    fetchCompanyInfo()
  }, [handleError])

  const handleLogin = async () => {
    try {
      if (!username || !password) {
        showError({
          message: '請輸入帳號和密碼',
          position: 'top-center',
        })
        return
      }
      const res = await loginAPI(username, password)

      if (res.status === -1) {
        handleError(res.error)
        return
      }

      const token = String(res.data?.token ?? '')
      const roleKey = String(res.data?.roleKey ?? '')
      const account = String(res.data?.account ?? username)

      if (!token) {
        showError({
          message: '登入失敗，請檢查帳號或密碼',
          position: 'top-center',
        })
        return
      }

      saveToken(token, rememberMe)
      if (roleKey) {
        saveRoleKey(roleKey, rememberMe)
      }
      // 儲存帳號供首頁問候語使用
      saveAccount(account, rememberMe)

      showSuccess({ message: '登入成功', position: 'top-center' })
      setTimeout(() => {
        navigate('/')
      }, 1000)
    } catch (err: unknown) {
      handleError(err)
    }
  }

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 overflow-auto no-scrollbar">
      <PageMeta title="廣思內部系統登入" />
      <div className="flex items-center justify-center min-h-screen py-10">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl mx-4 p-8 sm:p-10 overflow-y-auto min-h-[75vh] flex flex-col justify-between">
          <div className="flex-1">
            <img
              src={companyInfo?.logo ?? ''}
              alt="Logo"
              className="h-24 w-24 mx-auto mb-2 transition-transform hover:scale-105"
            />
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
              {companyInfo?.CompanyName}
            </h1>
            <h2 className="text-xl font-semibold text-center text-gray-600 mb-4">
              {companyInfo?.CompanyNameEn}
            </h2>
            <hr className="border-gray-300 mb-6" />
            <h3 className="text-2xl font-bold text-center text-gray-700 mb-6">
              系統登入
            </h3>
            <Input placeholder="帳號" value={username} onChange={setUsername} />
            <Input
              placeholder="密碼"
              type="password"
              value={password}
              onChange={setPassword}
            />
            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center text-gray-600">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                記住我
              </label>
              <a href="#" className="text-blue-500 hover:underline text-sm">
                忘記密碼？
              </a>
            </div>
            <Button text="登入" onClick={handleLogin} />
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">
            © 2025 Qamstar Corp.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
