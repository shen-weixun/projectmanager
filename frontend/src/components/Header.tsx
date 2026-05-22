import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { getCompanyInfoAPI, logoutAPI } from '@/services/apis'
import defaultLogo from '@/assets/images/logo.png'

type HeaderProps = { title: string }

type CompanyLogo = { logo: string }

const Header = ({ title }: HeaderProps) => {
  const [companyLogo, setCompanyLogo] = useState<CompanyLogo | null>(null)
  const [logoError, setLogoError] = useState(false)
  const logoSrc = companyLogo?.logo?.trim()

  const resolvedLogoSrc =
    logoSrc &&
      !logoError &&
      (logoSrc.startsWith('http://') ||
        logoSrc.startsWith('https://') ||
        logoSrc.startsWith('/'))
      ? logoSrc
      : defaultLogo

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const res = await getCompanyInfoAPI()
        if (res.status === -1) {
          return
        }
        setCompanyLogo({ logo: res.data.logo ?? '' })
      } catch {
        // 靜默處理，logo 載入失敗不影響系統使用
      }
    }
    fetchCompanyInfo()
  }, [])

  useEffect(() => {
    setLogoError(false)
  }, [logoSrc])

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow z-50 flex items-center justify-between px-6 select-none">
      <div className="flex items-center space-x-2">
        <img
          src={resolvedLogoSrc}
          alt="Logo"
          className="h-8 w-8 object-contain"
          onError={() => setLogoError(true)}
        />
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
      </div>
      <button
        className="inline-flex items-center text-sm text-red-500 font-medium hover:underline"
        onClick={() => {
          logoutAPI()
        }}
      >
        <LogOut className="mr-1 h-4 w-4" />
        登出
      </button>
    </header>
  )
}

export default Header
