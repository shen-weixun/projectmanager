import { Building2, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import useAPIErrorHandler from '@/hooks/useAPIErrorHandler'
import { getCompanyFullInfoAPI, updateCompanyFullInfoAPI, type CompanyFullInfo } from '@/services/apis'
import { showSuccess, showWarning } from '@/utils/toastHelper'
import defaultLogo from '@/assets/images/logo.png'

type CompanyForm = {
    name: string
    nameEn: string
    phone: string
    email: string
    address: string
}

const emptyForm: CompanyForm = {
    name: '',
    nameEn: '',
    phone: '',
    email: '',
    address: '',
}

const CompanyInfoSetting = () => {
    const handleError = useAPIErrorHandler()
    const [info, setInfo] = useState<CompanyFullInfo | null>(null)
    const [form, setForm] = useState<CompanyForm>(emptyForm)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [logoError, setLogoError] = useState(false)

    const loadInfo = useCallback(async () => {
        setIsLoading(true)
        const res = await getCompanyFullInfoAPI()
        if (res.status === -1) {
            handleError(res.error)
            setIsLoading(false)
            return
        }
        setInfo(res.data)
        setForm({
            name: res.data.name,
            nameEn: res.data.nameEn,
            phone: res.data.phone,
            email: res.data.email,
            address: res.data.address,
        })
        setIsLoading(false)
    }, [handleError])

    useEffect(() => {
        loadInfo()
    }, [loadInfo])

    const hasChanges = useMemo(() => {
        if (!info) return false
        return (
            form.name !== info.name ||
            form.nameEn !== info.nameEn ||
            form.phone !== info.phone ||
            form.email !== info.email ||
            form.address !== info.address
        )
    }, [form, info])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!hasChanges) {
            showWarning('資料沒有變更', '公司資訊管理', 'top-right')
            return
        }
        setIsSaving(true)
        const res = await updateCompanyFullInfoAPI(form)
        setIsSaving(false)
        if (res.status === -1) {
            handleError(res.error)
            return
        }
        setInfo(res.data)
        showSuccess('公司資訊已更新', '公司資訊管理', 'top-right')
    }

    const logoSrc = info?.logo?.trim()
    const resolvedLogo =
        logoSrc && !logoError && (logoSrc.startsWith('http') || logoSrc.startsWith('/'))
            ? logoSrc
            : defaultLogo

    const readonlyClass = 'w-full rounded border border-gray-200 bg-gray-100 px-3 py-2 text-gray-600'
    const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

    if (isLoading) {
        return <div className="flex h-full items-center justify-center text-gray-600">載入公司資訊中...</div>
    }

    return (
        <div className="mx-auto w-full max-w-4xl p-6">
            <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded bg-blue-50 text-blue-600">
                    <Building2 size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">公司資訊管理</h1>
                    <p className="text-sm text-gray-500">Logo 僅供顯示，其餘欄位可由管理員更新。</p>
                </div>
            </div>

            {/* Logo 預覽 */}
            <div className="mb-6 flex items-center gap-5 rounded-lg border border-gray-200 bg-gray-50 p-5">
                <img
                    src={resolvedLogo}
                    alt="Company Logo"
                    className="h-20 w-20 rounded-lg object-contain border border-gray-200 bg-white p-1"
                    onError={() => setLogoError(true)}
                />
                <div>
                    <p className="text-base font-semibold text-gray-800">{info?.name || '—'}</p>
                    <p className="text-sm text-gray-500">{info?.nameEn || '—'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded bg-white p-6 shadow">
                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">公司中文名稱</label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            className={inputClass}
                            placeholder="請輸入公司中文名稱"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">公司英文名稱</label>
                        <input
                            value={form.nameEn}
                            onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                            className={inputClass}
                            placeholder="請輸入公司英文名稱"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">電話</label>
                        <input
                            value={form.phone}
                            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                            className={inputClass}
                            placeholder="04-XXXX-XXXX"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                            className={inputClass}
                            placeholder="info@example.com"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">地址</label>
                        <input
                            value={form.address}
                            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                            className={inputClass}
                            placeholder="請輸入公司地址"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Logo 路徑（唯讀）</label>
                        <input value={info?.logo || '尚未設定'} readOnly className={readonlyClass} />
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving || !hasChanges}
                        className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                        <Save size={18} />
                        {isSaving ? '儲存中...' : '儲存變更'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default CompanyInfoSetting