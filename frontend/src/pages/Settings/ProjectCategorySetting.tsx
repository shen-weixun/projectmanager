import { Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import useAPIErrorHandler from '@/hooks/useAPIErrorHandler'
import { getProjectOptionsManageAPI, createProjectOptionAPI } from '@/services/apis'
import { showSuccess, showWarning } from '@/utils/toastHelper'
import type { ProjectOptionItem } from '@/services/apis'

const ProjectCategorySetting = () => {
    const handleError = useAPIErrorHandler()
    const [categories, setCategories] = useState<ProjectOptionItem[]>([])
    const [newCategory, setNewCategory] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)

    const loadCategories = useCallback(async () => {
        setIsLoading(true)
        const res = await getProjectOptionsManageAPI()
        if (res.status === -1) {
            handleError(res.error)
            setIsLoading(false)
            return
        }
        setCategories(res.data.filter((item) => item.optionType === 'category'))
        setIsLoading(false)
    }, [handleError])

    useEffect(() => {
        loadCategories()
    }, [loadCategories])

    const handleAdd = async () => {
        const value = newCategory.trim()
        if (!value) {
            showWarning('類別名稱不可為空', '專案類別管理', 'top-right')
            return
        }
        if (categories.some((c) => c.value === value)) {
            showWarning('此類別已存在', '專案類別管理', 'top-right')
            return
        }
        setIsAdding(true)
        const res = await createProjectOptionAPI('category', value)
        setIsAdding(false)
        if (res.status === -1) {
            handleError(res.error)
            return
        }
        showSuccess(`已新增類別「${value}」`, '專案類別管理', 'top-right')
        setNewCategory('')
        await loadCategories()
    }

    if (isLoading) {
        return <div className="flex h-full items-center justify-center text-gray-600">載入中...</div>
    }

    return (
        <div className="mx-auto w-full max-w-2xl p-6">
            <h1 className="mb-1 text-2xl font-semibold text-gray-900">專案類別管理</h1>
            <p className="mb-6 text-sm text-gray-500">新增後可在專案管理頁面依類別篩選專案。</p>

            {/* 新增表單 */}
            <div className="mb-6 flex gap-3">
                <input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="輸入新類別名稱，例如：CITD、SBIR、內部"
                />
                <button
                    onClick={handleAdd}
                    disabled={isAdding}
                    className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-300"
                >
                    <Plus size={16} />
                    新增
                </button>
            </div>

            {/* 類別清單 */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                {categories.length === 0 ? (
                    <div className="py-10 text-center text-gray-500">尚未新增任何專案類別</div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {categories.map((cat, index) => (
                            <li key={cat.id} className="flex items-center justify-between px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                        {index + 1}
                                    </span>
                                    <span className="text-base font-medium text-gray-800">{cat.value}</span>
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {cat.isActive ? '啟用' : '停用'}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

export default ProjectCategorySetting