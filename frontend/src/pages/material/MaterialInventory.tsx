import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ClipboardList, Minus, Pencil, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import useAPIErrorHandler from '@/hooks/useAPIErrorHandler'
import {
  createMaterialInventoryAPI,
  deleteMaterialInventoryAPI,
  getMaterialInventoryAPI,
  getUsersListAPI,
  transferMaterialInventoryAPI,
  updateMaterialInventoryAPI,
} from '@/services/apis'
import type { MaterialItem, MaterialPayload, UserListItem } from '@/types/api'
import { getRoleKey } from '@/utils/auth'
import { showError, showSuccess } from '@/utils/toastHelper'

type MaterialForm = {
  name: string
  quantity: string
  keeperUserId: string
  location: string
  brand: string
  model: string
  serialNumber: string
  assetPrice: string
  expiryDate: string
}

const emptyForm: MaterialForm = {
  name: '',
  quantity: '1',
  keeperUserId: '',
  location: '',
  brand: '',
  model: '',
  serialNumber: '',
  assetPrice: '',
  expiryDate: '',
}

const MATERIAL_MANAGER_ROLES = ['super', 'boss', 'pm_leader', 'rd_leader']

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

const toPayload = (form: MaterialForm): { payload: MaterialPayload | null; error?: string } => {
  const quantity = Number(form.quantity)
  const keeperUserId = Number(form.keeperUserId)
  const price = form.assetPrice.trim()

  if (!form.name.trim()) return { payload: null, error: '請輸入材料名稱' }
  if (!form.quantity.trim()) return { payload: null, error: '請輸入數量' }
  if (!Number.isInteger(quantity) || quantity < 0) return { payload: null, error: '數量必須是 0 以上的整數' }
  if (!Number.isInteger(keeperUserId) || keeperUserId <= 0) return { payload: null, error: '請選擇保管人' }
  if (!form.location.trim()) return { payload: null, error: '請輸入存放位置' }
  if (price && (!Number.isFinite(Number(price)) || Number(price) < 0)) return { payload: null, error: '資產價格必須是 0 以上的數字' }

  return {
    payload: {
      name: form.name.trim(),
      quantity,
      keeperUserId,
      location: form.location.trim(),
      brand: form.brand.trim() || undefined,
      model: form.model.trim() || undefined,
      serialNumber: form.serialNumber.trim() || undefined,
      assetPrice: price || undefined,
      expiryDate: form.expiryDate || undefined,
    },
  }
}

const formFromMaterial = (material: MaterialItem): MaterialForm => ({
  name: material.name,
  quantity: String(material.quantity),
  keeperUserId: material.keeperUserId ? String(material.keeperUserId) : '',
  location: material.location,
  brand: material.brand ?? '',
  model: material.model ?? '',
  serialNumber: material.serialNumber ?? '',
  assetPrice: material.assetPrice ? String(material.assetPrice) : '',
  expiryDate: material.expiryDate ?? '',
})

const MaterialInventoryPage = () => {
  const handleError = useAPIErrorHandler()
  const roleKey = getRoleKey()
  const canManageMaterials = MATERIAL_MANAGER_ROLES.includes(roleKey ?? '')
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [users, setUsers] = useState<UserListItem[]>([])
  const [form, setForm] = useState<MaterialForm>(emptyForm)
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null)
  const [editForm, setEditForm] = useState<MaterialForm>(emptyForm)
  const [transferringMaterial, setTransferringMaterial] = useState<MaterialItem | null>(null)
  const [deletingMaterial, setDeletingMaterial] = useState<MaterialItem | null>(null)
  const [transferQuantity, setTransferQuantity] = useState('1')
  const [transferUserId, setTransferUserId] = useState('')
  const [search, setSearch] = useState('')
  const [isNameOpen, setIsNameOpen] = useState(false)
  const [isEditNameOpen, setIsEditNameOpen] = useState(false)
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false)

  const loadData = async () => {
    const [materialRes, userRes] = await Promise.all([getMaterialInventoryAPI(), getUsersListAPI()])
    if (materialRes.status === 0) setMaterials(materialRes.data)
    if (userRes.status === 0) setUsers(userRes.data)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const totalQuantity = useMemo(
    () => materials.reduce((sum, material) => sum + material.quantity, 0),
    [materials]
  )

  const filteredMaterials = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return materials
    return materials.filter((material) =>
      [material.name, material.keeper, material.location, material.brand, material.model, material.serialNumber]
        .some((value) => String(value ?? '').toLowerCase().includes(keyword))
    )
  }, [materials, search])

  const materialNameOptions = useMemo(
    () => Array.from(new Set(materials.map((material) => material.name.trim()).filter(Boolean))),
    [materials]
  )

  const locationOptions = useMemo(
    () => Array.from(new Set(materials.map((material) => material.location.trim()).filter(Boolean))),
    [materials]
  )

  const handleCreate = async () => {
    const { payload, error } = toPayload(form)
    if (error) {
      showError(error, '欄位未填')
      return
    }
    if (!payload) return
    if (payload.quantity <= 0) {
      showError('新增材料數量必須大於 0', '欄位錯誤')
      return
    }

    const response = await createMaterialInventoryAPI(payload)
    if (response.status !== 0) {
      handleError(response.error)
      return
    }
    setMaterials((prev) => [response.data, ...prev])
    setForm(emptyForm)
    showSuccess('材料已新增')
  }

  const handleUpdate = async () => {
    if (!editingMaterial) return
    const { payload, error } = toPayload(editForm)
    if (error) {
      showError(error, '欄位未填')
      return
    }
    if (!payload) return

    const response = await updateMaterialInventoryAPI(editingMaterial.id, payload)
    if (response.status !== 0) {
      handleError(response.error)
      return
    }
    setMaterials((prev) => prev.map((material) => (material.id === editingMaterial.id ? response.data : material)))
    setEditingMaterial(null)
    showSuccess('材料已更新')
  }

  const handleTransfer = async () => {
    if (!transferringMaterial) return
    const quantity = Number(transferQuantity)
    const transferUserIdNumber = Number(transferUserId)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      showError('移管數量必須大於 0', '欄位錯誤')
      return
    }
    if (quantity > transferringMaterial.quantity) {
      showError('移管數量不能超過現有數量', '欄位錯誤')
      return
    }
    if (!Number.isInteger(transferUserIdNumber) || transferUserIdNumber <= 0) {
      showError('請選擇移管人', '欄位未填')
      return
    }

    const response = await transferMaterialInventoryAPI({ id: transferringMaterial.id, quantity, transferUserId: transferUserIdNumber })
    if (response.status !== 0) {
      handleError(response.error)
      return
    }
    setMaterials((prev) => prev.map((material) => (material.id === transferringMaterial.id ? response.data : material)))
    setTransferringMaterial(null)
    setTransferUserId('')
    showSuccess('材料已移管')
  }

  const handleDelete = async () => {
    if (!deletingMaterial) return
    const response = await deleteMaterialInventoryAPI(deletingMaterial.id)
    if (response.status !== 0) {
      handleError(response.error)
      return
    }
    setMaterials((prev) => prev.filter((material) => material.id !== deletingMaterial.id))
    setDeletingMaterial(null)
    showSuccess('材料已刪除')
  }

  const renderKeeperSelect = (value: string, onChange: (value: string) => void) => (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    >
      <option value="" disabled hidden />
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name || user.account}
        </option>
      ))}
    </select>
  )

  const renderOptionInput = (
    value: string,
    onChange: (value: string) => void,
    options: string[],
    isOpen: boolean,
    setIsOpen: (value: boolean | ((prev: boolean) => boolean)) => void
  ) => (
    <div className="relative">
      <Input
        value={value}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value)
          setIsOpen(true)
        }}
        className="h-9 pr-10"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="切換選單"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen ? (
        <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-md">
          {options.filter((option) => option.toLowerCase().includes(value.trim().toLowerCase())).length > 0 ? (
            options
              .filter((option) => option.toLowerCase().includes(value.trim().toLowerCase()))
              .map((option) => (
                <button
                  key={option}
                  type="button"
                  className="w-full rounded-sm px-3 py-2 text-left text-base font-medium text-gray-800 transition hover:bg-gray-100"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option)
                    setIsOpen(false)
                  }}
                >
                  {option}
                </button>
              ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">尚無既有選項，可直接輸入</div>
          )}
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 pb-2">
      <section className="rounded-md bg-white p-6 shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">材料清單</h1>
              <Link to="/material-inventory/transfer-records">
                <Button variant="outline" className="h-8 gap-1.5 text-sm font-medium">
                  <ClipboardList className="h-4 w-4" />
                  移管紀錄
                </Button>
              </Link>
            </div>
            <p className="mt-2 text-base text-gray-600">
              管理材料數量、保管人與存放位置，並記錄品牌、型號、序號、價格與保存期限。
            </p>
          </div>
          <div className="grid min-w-[220px] grid-cols-2 gap-3">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-500">材料項目</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{materials.length}</p>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-500">總數量</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{totalQuantity}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">新增材料</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-9">
          <div className="space-y-2">
            <Label>材料名稱</Label>
            {renderOptionInput(form.name, (name) => setForm((prev) => ({ ...prev, name })), materialNameOptions, isNameOpen, setIsNameOpen)}
          </div>
          <div className="space-y-2">
            <Label>數量</Label>
            <Input type="number" min="1" value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label>保管人</Label>
            {renderKeeperSelect(form.keeperUserId, (keeperUserId) => setForm((prev) => ({ ...prev, keeperUserId })))}
          </div>
          <div className="space-y-2">
            <Label>存放位置</Label>
            {renderOptionInput(form.location, (location) => setForm((prev) => ({ ...prev, location })), locationOptions, isLocationOpen, setIsLocationOpen)}
          </div>
          <div className="space-y-2">
            <Label>品牌</Label>
            <Input value={form.brand} onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label>型號</Label>
            <Input value={form.model} onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label>序號</Label>
            <Input value={form.serialNumber} onChange={(event) => setForm((prev) => ({ ...prev, serialNumber: event.target.value }))} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label>資產價格</Label>
            <Input type="number" min="0" value={form.assetPrice} onChange={(event) => setForm((prev) => ({ ...prev, assetPrice: event.target.value }))} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label>保存期限</Label>
            <Input type="date" value={form.expiryDate} onChange={(event) => setForm((prev) => ({ ...prev, expiryDate: event.target.value }))} className="h-9" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button className="h-9 min-w-40" onClick={handleCreate}>新增材料</Button>
        </div>
      </section>

      <section className="rounded-md bg-white p-6 shadow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800">材料列表</h2>
          <div className="relative w-full max-w-sm">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 rounded-full bg-white pl-10 pr-10 text-base font-medium text-gray-800 placeholder:text-gray-400"
              placeholder="搜尋材料"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            {search ? (
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600" onClick={() => setSearch('')} aria-label="清除搜尋">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] border border-gray-300 text-base text-gray-800">
            <thead>
              <tr className="bg-gray-50 text-gray-900">
                {['材料名稱', '數量', '保管人', '存放位置', '品牌', '型號', '序號', '資產價格', '保存期限', '更新日期', '操作'].map((header) => (
                  <th key={header} className="border border-gray-300 px-3 py-2 text-base font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td className="border border-gray-300 px-3 py-4 text-center text-gray-500" colSpan={11}>
                    {materials.length === 0 ? '尚未新增任何材料' : '查無符合條件的材料'}
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50/70">
                    <td className="border border-gray-300 px-3 py-2.5 font-medium">{material.name}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{material.quantity}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{material.keeper}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{material.location}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{material.brand}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{material.model}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{material.serialNumber}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{material.assetPrice}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{material.expiryDate}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{formatDateTime(material.updatedAt)}</td>
                    <td className="border border-gray-300 px-2 py-2">
                      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <Button variant="outline" className="h-8 justify-center gap-1 bg-white px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => { setEditingMaterial(material); setEditForm(formFromMaterial(material)) }}>
                          <Pencil className="h-4 w-4" />編輯
                        </Button>
                        <Button variant="outline" className="h-8 justify-center gap-1 bg-white px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => { setTransferringMaterial(material); setTransferQuantity('1'); setTransferUserId('') }}>
                          <Minus className="h-4 w-4" />移管
                        </Button>
                        {canManageMaterials ? (
                          <Button variant="outline" className="h-8 justify-center gap-1 bg-white px-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingMaterial(material)}>
                            <Trash2 className="h-4 w-4" />刪除
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && setEditingMaterial(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>編輯材料</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-3">
            <div className="space-y-2"><Label>材料名稱</Label>{renderOptionInput(editForm.name, (name) => setEditForm((prev) => ({ ...prev, name })), materialNameOptions, isEditNameOpen, setIsEditNameOpen)}</div>
            <div className="space-y-2"><Label>數量</Label><Input type="number" min="0" value={editForm.quantity} onChange={(event) => setEditForm((prev) => ({ ...prev, quantity: event.target.value }))} /></div>
            <div className="space-y-2"><Label>保管人</Label>{renderKeeperSelect(editForm.keeperUserId, (keeperUserId) => setEditForm((prev) => ({ ...prev, keeperUserId })))}</div>
            <div className="space-y-2"><Label>存放位置</Label>{renderOptionInput(editForm.location, (location) => setEditForm((prev) => ({ ...prev, location })), locationOptions, isEditLocationOpen, setIsEditLocationOpen)}</div>
            <div className="space-y-2"><Label>品牌</Label><Input value={editForm.brand} onChange={(event) => setEditForm((prev) => ({ ...prev, brand: event.target.value }))} /></div>
            <div className="space-y-2"><Label>型號</Label><Input value={editForm.model} onChange={(event) => setEditForm((prev) => ({ ...prev, model: event.target.value }))} /></div>
            <div className="space-y-2"><Label>序號</Label><Input value={editForm.serialNumber} onChange={(event) => setEditForm((prev) => ({ ...prev, serialNumber: event.target.value }))} /></div>
            <div className="space-y-2"><Label>資產價格</Label><Input type="number" min="0" value={editForm.assetPrice} onChange={(event) => setEditForm((prev) => ({ ...prev, assetPrice: event.target.value }))} /></div>
            <div className="space-y-2"><Label>保存期限</Label><Input type="date" value={editForm.expiryDate} onChange={(event) => setEditForm((prev) => ({ ...prev, expiryDate: event.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditingMaterial(null)}>取消</Button><Button onClick={handleUpdate}>儲存</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!transferringMaterial} onOpenChange={(open) => !open && setTransferringMaterial(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>移管材料</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-500">材料名稱</p>
              <p className="mt-1 text-base font-semibold text-gray-800">{transferringMaterial?.name}</p>
              <p className="mt-2 text-sm text-gray-500">目前數量：{transferringMaterial?.quantity ?? 0}</p>
            </div>
            <div className="space-y-2"><Label>移管數量</Label><Input type="number" min="1" max={String(transferringMaterial?.quantity ?? 1)} value={transferQuantity} onChange={(event) => setTransferQuantity(event.target.value)} /></div>
            <div className="space-y-2"><Label>移管人</Label>{renderKeeperSelect(transferUserId, setTransferUserId)}</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTransferringMaterial(null)}>取消</Button><Button onClick={handleTransfer}>確認移管</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingMaterial} onOpenChange={(open) => !open && setDeletingMaterial(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>確認刪除</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-base text-gray-700">
              確定要刪除材料「<span className="font-semibold">{deletingMaterial?.name}</span>」嗎？
            </p>
            <p className="mt-2 text-sm text-gray-500">刪除後也會移除相關移管紀錄。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMaterial(null)}>取消</Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MaterialInventoryPage
