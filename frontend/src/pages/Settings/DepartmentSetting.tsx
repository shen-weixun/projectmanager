import { Edit3, Settings2, Trash, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import useAPIErrorHandler from '@/hooks/useAPIErrorHandler'
import { showSuccess, showWarning } from '@/utils/toastHelper'
import {
    addDepartmentAPI,
    addDepartmentGroupAPI,
    deleteDepartmentAPI,
    deleteDepartmentGroupAPI,
    getDepartmentAPI,
    updateDepartmentAPI,
} from '@/services/apis'

type Department = {
    id: number
    name: string
    description: string
    groups: DepartmentGroup[]
}

const DepartmentSetting = () => {
    const handleError = useAPIErrorHandler()
    const [departments, setDepartments] = useState<Department[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingDept, setEditingDept] = useState<Department | null>(null)
    const [editingGroupsDept, setEditingGroupsDept] = useState<Department | null>(
        null
    )
    const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false)

    const fetchDepartments = useCallback(async () => {
        const res = await getDepartmentAPI()
        if (res.status === -1) {
            handleError(res.error)
            return
        }
        setDepartments(res.data)
    }, [handleError])

    useEffect(() => {
        fetchDepartments()
    }, [fetchDepartments])

    const openCreateModal = () => {
        setEditingDept(null)
        setIsModalOpen(true)
    }

    const openEditModal = (dept: Department) => {
        setEditingDept(dept)
        setIsModalOpen(true)
    }

    const handleSubmit = async (data: { name: string; description: string }) => {
        if (editingDept) {
            const res = await updateDepartmentAPI(
                editingDept.id,
                data.name,
                data.description
            )

            if (res.status === -1) {
                handleError(res.error)
                return
            }

            showSuccess('部門更新成功', '更新部門', 'top-right')
            fetchDepartments()
        } else {
            const newDept: Department = {
                id: departments.length + 1,
                name: data.name,
                description: data.description,
                groups: [],
            }

            try {
                const res = await addDepartmentAPI(newDept.name, newDept.description)

                if (res.status === -1) {
                    handleError(res.error)
                    return
                }

                showSuccess('部門新增成功', '新增部門', 'top-right')
                fetchDepartments()
            } catch (error) {
                handleError(error)
            }
        }
        setIsModalOpen(false)
    }

    const handleDelete = async (id: number) => {
        if (confirm('確定要刪除這個部門嗎？')) {
            const res = await deleteDepartmentAPI(id)
            if (res.status === -1) {
                handleError(res.error)
                return
            }

            showSuccess('部門刪除成功', '刪除部門', 'top-right')
            fetchDepartments()
        }
    }

    const handleManageGroups = (dept: Department) => {
        setEditingGroupsDept(dept)
        setIsGroupEditorOpen(true)
    }

    const renderActions = (dept: Department) => {
        return (
            <div className="flex space-x-2">
                <button
                    onClick={() => openEditModal(dept)}
                    title="編輯部門"
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                >
                    <Edit3 size={18} />
                </button>
                <button
                    onClick={() => handleDelete(dept.id)}
                    title="刪除部門"
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                >
                    <Trash size={18} />
                </button>
                <button
                    onClick={() => handleManageGroups(dept)}
                    title="管理組別"
                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                >
                    <Settings2 size={18} />
                </button>
            </div>
        )
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">部門管理</h2>
                <button
                    onClick={openCreateModal}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    新增部門
                </button>
            </div>

            {/* Table for larger screens */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                    <thead>
                        <tr className="bg-gray-100 text-left">
                            <th className="p-3 text-center w-16 md:w-24">部門名稱</th>
                            <th className="p-3">描述</th>
                            <th className="p-3 text-center w-16 md:w-24">組別數量</th>
                            <th className="p-3 text-center w-16 md:w-24">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {departments.length > 0 ? (
                            departments.map((dept) => (
                                <tr key={dept.id} className="border-b">
                                    <td className="p-3 text-center">{dept.name}</td>
                                    <td className="p-3">{dept.description}</td>
                                    <td className="p-3 text-center">{dept.groups.length}</td>
                                    <td className="p-3 text-center">{renderActions(dept)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="p-3 text-center">
                                    目前沒有任何部門。請新增一個部門。
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile view */}
            <div className="block md:hidden space-y-4">
                {departments.map((dept) => (
                    <div className="bg-white p-4 rounded-lg shadow space-y-2">
                        <div className="text-lg font-semibold">{dept.name}</div>
                        <div className="text-sm text-gray-700">📝 {dept.description}</div>
                        <div className="text-sm text-gray-600">
                            👥 組別數量：{dept.groups.length}
                        </div>
                        <div className="flex space-x-3 pt-1">
                            <button
                                onClick={() => openEditModal(dept)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                <Edit3 size={18} />
                            </button>
                            <button
                                onClick={() => handleManageGroups(dept)}
                                className="text-green-600 hover:text-green-800"
                            >
                                <Settings2 size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(dept.id)}
                                className="text-red-600 hover:text-red-800"
                            >
                                <Trash size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            <DepartmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                defaultValue={editingDept ?? undefined}
                mode={editingDept ? 'edit' : 'create'}
            />

            {/* Group Editor Modal */}
            {editingGroupsDept && (
                <GroupEditorModal
                    isOpen={isGroupEditorOpen}
                    onClose={() => setIsGroupEditorOpen(false)}
                    department={editingGroupsDept}
                    groups={editingGroupsDept.groups}
                    onSave={(newGroups) => {
                        setDepartments((prev) =>
                            prev.map((d) =>
                                d.id === editingGroupsDept.id ? { ...d, groups: newGroups } : d
                            )
                        )
                    }}
                    fetchDepartments={fetchDepartments}
                    handleError={handleError}
                />
            )}
        </div>
    )
}

export default DepartmentSetting

{
    /* Department Modal */
}
type ModalProps = {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: { name: string; description: string }) => void
    defaultValue?: { name?: string; description?: string }
    mode?: 'create' | 'edit'
}

const DepartmentModal = ({
    isOpen,
    onClose,
    onSubmit,
    defaultValue,
    mode = 'create',
}: ModalProps) => {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')

    useEffect(() => {
        // Modal 開啟或切換編輯資料時，同步表單預設值。
        if (defaultValue) {
            setName(defaultValue.name ?? '')
            setDescription(defaultValue.description ?? '')
        } else {
            setName('')
            setDescription('')
        }
    }, [defaultValue, isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
                <h2 className="text-lg font-semibold mb-4">
                    {mode === 'create' ? '新增部門' : '編輯部門'}
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">部門名稱</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">描述</label>
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded border hover:bg-gray-100"
                        >
                            取消
                        </button>
                        <button
                            onClick={() => onSubmit({ name, description })}
                            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                        >
                            儲存
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

{
    /* Group Editor Modal */
}
type DepartmentGroup = {
    id: number
    name: string
}

type Props = {
    isOpen: boolean
    onClose: () => void
    department: Department
    groups: DepartmentGroup[]
    onSave: (newGroups: DepartmentGroup[]) => void
    fetchDepartments: () => void
    handleError: (error: unknown) => void
}

const GroupEditorModal = ({
    isOpen,
    onClose,
    groups,
    onSave,
    department,
    fetchDepartments,
    handleError,
}: Props) => {
    const [groupList, setGroupList] = useState<DepartmentGroup[]>([])
    const [newGroup, setNewGroup] = useState('')

    useEffect(() => {
        // Modal 開啟或部門群組更新時，同步目前可編輯的群組清單。
        setGroupList(groups)
    }, [groups, isOpen])

    const handleAdd = async () => {
        const trimmed = newGroup.trim()
        if (!trimmed) {
            showWarning('組別名稱不能為空', '新增組別', 'top-right')
            return
        } else if (groupList.some((g) => g.name === trimmed)) {
            showWarning('組別名稱已存在', '新增組別', 'top-right')
            return
        }

        const res = await addDepartmentGroupAPI(department.id ?? 0, trimmed)
        if (res.status === -1) {
            handleError(res.error)
            return
        }
        showSuccess('組別新增成功', '新增組別', 'top-right')
        setGroupList((prev) => [...prev, { id: res.data.id, name: trimmed }])
        fetchDepartments()
        setNewGroup('')
    }

    const handleDelete = async (index: number) => {
        const res = await deleteDepartmentGroupAPI(
            department.id ?? 0,
            groupList[index].id
        )
        if (res.status === -1) {
            handleError(res.error)
            return
        }
        showSuccess('組別刪除成功', '刪除組別', 'top-right')
        setGroupList((prev) => prev.filter((_, i) => i !== index))
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg space-y-4">
                <h2 className="text-lg font-semibold">
                    編輯「{department.name}」的組別
                </h2>

                <div className="flex space-x-2">
                    <input
                        className="flex-1 border rounded px-3 py-2"
                        placeholder="新增組別名稱"
                        value={newGroup}
                        onChange={(e) => setNewGroup(e.target.value)}
                    />
                    <button
                        onClick={handleAdd}
                        className="bg-blue-500 text-white px-3 rounded hover:bg-blue-600"
                    >
                        新增
                    </button>
                </div>

                <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {groupList.map((group, index) => (
                        <li
                            key={index}
                            className="flex justify-between items-center border px-3 py-2 rounded"
                        >
                            <span>{group.name}</span>
                            <button
                                onClick={() => handleDelete(index)}
                                className="text-red-500 hover:text-red-700"
                                title="刪除"
                            >
                                <X size={18} />
                            </button>
                        </li>
                    ))}
                    {groupList.length === 0 && (
                        <li className="text-sm text-gray-500">尚未新增任何組別</li>
                    )}
                </ul>

                <div className="flex justify-end space-x-2 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                    >
                        取消
                    </button>
                    <button
                        onClick={() => {
                            onSave(groupList)
                            onClose()
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        儲存
                    </button>
                </div>
            </div>
        </div>
    )
}
