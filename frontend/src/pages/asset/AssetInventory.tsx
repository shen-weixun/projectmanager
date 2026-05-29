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
import {
  createAssetInventoryAPI,
  createAssetNameOptionAPI,
  deleteAssetNameOptionAPI,
  deleteAssetInventoryAPI,
  getAssetInventoryAPI,
  getAssetNameOptionsAPI,
  getUsersListAPI,
  updateAssetInventoryAPI,
  withdrawAssetInventoryAPI,
} from '@/services/apis'
import type { AssetItem, AssetNameOption, AssetPayload, UserListItem } from '@/types/api'
import { getRoleKey } from '@/utils/auth'
import useAPIErrorHandler from '@/hooks/useAPIErrorHandler'
import { showError, showSuccess } from '@/utils/toastHelper'

type AssetForm = {
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

const emptyForm: AssetForm = {
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

const ASSET_MANAGER_ROLES = ['super', 'boss', 'pm_leader', 'rd_leader']

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

const toPayload = (form: AssetForm): { payload: AssetPayload | null; error?: string } => {
  const quantity = Number(form.quantity)
  const keeperUserId = Number(form.keeperUserId)
  const price = form.assetPrice.trim()

  if (!form.name.trim()) return { payload: null, error: '請選擇資產名稱' }
  if (!form.quantity.trim()) return { payload: null, error: '請輸入數量' }
  if (!Number.isInteger(quantity) || quantity < 0) return { payload: null, error: '數量必須是 0 以上的整數' }
  if (!Number.isInteger(keeperUserId) || keeperUserId <= 0) return { payload: null, error: '請選擇保管人' }
  if (!form.location.trim()) return { payload: null, error: '請輸入存放位置' }
  if (price && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
    return { payload: null, error: '資產價格必須是 0 以上的數字' }
  }

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

const formFromAsset = (asset: AssetItem): AssetForm => ({
  name: asset.name,
  quantity: String(asset.quantity),
  keeperUserId: asset.keeperUserId ? String(asset.keeperUserId) : '',
  location: asset.location,
  brand: asset.brand ?? '',
  model: asset.model ?? '',
  serialNumber: asset.serialNumber ?? '',
  assetPrice: asset.assetPrice ? String(asset.assetPrice) : '',
  expiryDate: asset.expiryDate ?? '',
})

const AssetInventoryPage = () => {
  const handleError = useAPIErrorHandler()
  const roleKey = getRoleKey()
  const canManageAssets = ASSET_MANAGER_ROLES.includes(roleKey ?? '')
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [assetNameOptions, setAssetNameOptions] = useState<AssetNameOption[]>([])
  const [users, setUsers] = useState<UserListItem[]>([])
  const [form, setForm] = useState<AssetForm>(emptyForm)
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null)
  const [editForm, setEditForm] = useState<AssetForm>(emptyForm)
  const [withdrawingAsset, setWithdrawingAsset] = useState<AssetItem | null>(null)
  const [withdrawQuantity, setWithdrawQuantity] = useState('1')
  const [transferUserId, setTransferUserId] = useState('')
  const [search, setSearch] = useState('')
  const [newAssetName, setNewAssetName] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCreateLocationOpen, setIsCreateLocationOpen] = useState(false)
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false)
  const [deletingAsset, setDeletingAsset] = useState<AssetItem | null>(null)

  const loadData = async () => {
    const [assetRes, nameRes, userRes] = await Promise.all([
      getAssetInventoryAPI(),
      getAssetNameOptionsAPI(),
      getUsersListAPI(),
    ])
    if (assetRes.status === 0) setAssets(assetRes.data)
    if (nameRes.status === 0) setAssetNameOptions(nameRes.data)
    if (userRes.status === 0) setUsers(userRes.data)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const totalQuantity = useMemo(
    () => assets.reduce((sum, asset) => sum + asset.quantity, 0),
    [assets]
  )

  const filteredAssets = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return assets
    return assets.filter((asset) =>
      [
        asset.name,
        asset.keeper,
        asset.location,
        asset.brand,
        asset.model,
        asset.serialNumber,
      ].some((value) => String(value ?? '').toLowerCase().includes(keyword))
    )
  }, [assets, search])

  const locationOptions = useMemo(
    () => Array.from(new Set(assets.map((asset) => asset.location.trim()).filter(Boolean))),
    [assets]
  )

  const handleCreateAssetName = async () => {
    const value = newAssetName.trim()
    if (!value) {
      showError('請輸入資產名稱', '欄位未填')
      return
    }
    const response = await createAssetNameOptionAPI(value)
    if (response.status !== 0) {
      handleError(response.error)
      return
    }
    setAssetNameOptions((prev) =>
      (prev.some((item) => item.id === response.data.id) ? prev : [...prev, response.data]).sort(
        (a, b) => a.value.localeCompare(b.value, 'zh-TW')
      )
    )
    setForm((prev) => ({ ...prev, name: response.data.value }))
    setNewAssetName('')
    showSuccess('資產名稱已新增')
  }

  const handleDeleteAssetName = async (option: AssetNameOption) => {
    const response = await deleteAssetNameOptionAPI(option.id)
    if (response.status !== 0) {
      handleError(response.error)
      return
    }

    setAssetNameOptions((prev) => prev.filter((item) => item.id !== option.id))
    setForm((prev) => (prev.name === option.value ? { ...prev, name: '' } : prev))
    setEditForm((prev) => (prev.name === option.value ? { ...prev, name: '' } : prev))
    showSuccess('資產名稱已刪除')
  }

  const handleCreate = async () => {
    const { payload, error } = toPayload(form)
    if (error) {
      showError(error, '欄位未填')
      return
    }
    if (!payload) return
    if (payload.quantity <= 0) {
      showError('新增資產數量必須大於 0', '欄位錯誤')
      return
    }

    const response = await createAssetInventoryAPI(payload)
    if (response.status !== 0) {
      handleError(response.error)
      return
    }
    setAssets((prev) => [response.data, ...prev])
    setForm(emptyForm)
    showSuccess('資產已新增')
  }

  const openEditDialog = (asset: AssetItem) => {
    setEditingAsset(asset)
    setEditForm(formFromAsset(asset))
  }

  const handleUpdate = async () => {
    if (!editingAsset) return
    const { payload, error } = toPayload(editForm)
    if (error) {
      showError(error, '欄位未填')
      return
    }
    if (!payload) return

    const response = await updateAssetInventoryAPI(editingAsset.id, payload)
    if (response.status !== 0) {
      handleError(response.error)
      return
    }
    setAssets((prev) =>
      prev.map((asset) => (asset.id === editingAsset.id ? response.data : asset))
    )
    setEditingAsset(null)
  }

  const openWithdrawDialog = (asset: AssetItem) => {
    setWithdrawingAsset(asset)
    setWithdrawQuantity('1')
    setTransferUserId('')
  }

  const handleWithdraw = async () => {
    if (!withdrawingAsset) return
    const quantity = Number(withdrawQuantity)
    const transferUserIdNumber = Number(transferUserId)
    if (!Number.isInteger(quantity) || quantity <= 0) return
    if (quantity > withdrawingAsset.quantity) return
    if (!Number.isInteger(transferUserIdNumber) || transferUserIdNumber <= 0) {
      showError('請選擇移管人', '欄位未填')
      return
    }

    const response = await withdrawAssetInventoryAPI({
      id: withdrawingAsset.id,
      quantity,
      transferUserId: transferUserIdNumber,
    })
    if (response.status !== 0) {
      handleError(response.error)
      return
    }
    setAssets((prev) =>
      prev.map((asset) => (asset.id === withdrawingAsset.id ? response.data : asset))
    )
    setWithdrawingAsset(null)
    setTransferUserId('')
  }

  const handleDelete = async () => {
    if (!deletingAsset) return
    const response = await deleteAssetInventoryAPI(deletingAsset.id)
    if (response.status !== 0) {
      handleError(response.error)
      return
    }
    setAssets((prev) => prev.filter((asset) => asset.id !== deletingAsset.id))
    setDeletingAsset(null)
  }

  const renderAssetNameSelect = (value: string, onChange: (value: string) => void) => (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    >
      <option value="" disabled hidden />
      {assetNameOptions.map((option) => (
        <option key={option.id} value={option.value}>
          {option.value}
        </option>
      ))}
    </select>
  )

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

  const renderLocationInput = (
    value: string,
    onChange: (value: string) => void,
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
        aria-label="切換存放位置選單"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen ? (
        <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-md">
          {locationOptions.length > 0 ? (
            locationOptions
              .filter((location) => location.toLowerCase().includes(value.trim().toLowerCase()))
              .map((location) => (
                <button
                  key={location}
                  type="button"
                  className="w-full rounded-sm px-3 py-2 text-left text-base font-medium text-gray-800 transition hover:bg-gray-100"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(location)
                    setIsOpen(false)
                  }}
                >
                  {location}
                </button>
              ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">尚未建立位置，可直接輸入</div>
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
              <h1 className="text-2xl font-bold text-gray-800">資財清單</h1>
              <Link to="/asset-inventory/withdraw-records">
                <Button variant="outline" className="h-8 gap-1.5 text-sm font-medium">
                  <ClipboardList className="h-4 w-4" />
                  移管記錄
                </Button>
              </Link>
            </div>
            <p className="mt-2 text-base text-gray-600">
              管理資財數量、保管人與存放位置，並記錄品牌、型號、序號、價格與保存期限。
            </p>
          </div>
          <div className="grid min-w-[220px] grid-cols-2 gap-3">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-500">資財項目</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{assets.length}</p>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-500">總數量</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{totalQuantity}</p>
            </div>
          </div>
        </div>
      </section>

      {canManageAssets ? (
        <section className="rounded-md bg-white p-6 shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">資產名稱管理</h2>
              <p className="mt-1 text-sm text-gray-500">
                新增資產時只能選擇這裡已建立的名稱。
              </p>
            </div>
            <div className="flex w-full max-w-xl flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  value={newAssetName}
                  onChange={(event) => setNewAssetName(event.target.value)}
                  className="h-9"
                  placeholder="輸入要開放選用的資產名稱"
                />
                <Button type="button" className="h-9 whitespace-nowrap" onClick={handleCreateAssetName}>
                  新增名稱
                </Button>
              </div>
              <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                {assetNameOptions.length > 0 ? (
                  assetNameOptions.map((option) => (
                    <span key={option.id} className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700">
                      {option.value}
                      <button
                        type="button"
                        className="text-gray-400 transition hover:text-red-600"
                        aria-label={`刪除${option.value}`}
                        onClick={() => void handleDeleteAssetName(option)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">尚未設定任何資產名稱</span>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-md bg-white p-6 shadow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800">新增資產</h2>
          {assetNameOptions.length === 0 ? (
            <p className="text-sm font-medium text-amber-700">請先由管理者設定資產名稱。</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-9">
          <div className="space-y-2">
            <Label>資產名稱</Label>
            {renderAssetNameSelect(form.name, (name) => setForm((prev) => ({ ...prev, name })))}
          </div>
          <div className="space-y-2">
            <Label>數量</Label>
            <Input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label>保管人</Label>
            {renderKeeperSelect(form.keeperUserId, (keeperUserId) =>
              setForm((prev) => ({ ...prev, keeperUserId }))
            )}
          </div>
          <div className="space-y-2">
            <Label>存放位置</Label>
            {renderLocationInput(
              form.location,
              (location) => setForm((prev) => ({ ...prev, location })),
              isCreateLocationOpen,
              setIsCreateLocationOpen
            )}
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
          <Button className="h-9 min-w-40" onClick={handleCreate}>
            新增資產
          </Button>
        </div>
      </section>

      <section className="rounded-md bg-white p-6 shadow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800">資產列表</h2>
          <div className="relative w-full max-w-sm">
            <Input
              value={search}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 120)}
              onChange={(event) => {
                setSearch(event.target.value)
                setIsSearchOpen(true)
              }}
              className="h-9 rounded-full bg-white pl-10 pr-20 text-base font-medium text-gray-800 placeholder:text-gray-400"
              placeholder="搜尋或選擇資產"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
              {search ? (
                <button
                  type="button"
                  className="text-gray-400 transition hover:text-gray-600"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setSearch('')}
                  aria-label="清除搜尋"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                className="text-gray-500 transition hover:text-gray-700"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setIsSearchOpen((prev) => !prev)}
                aria-label="切換資產搜尋選單"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${isSearchOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isSearchOpen ? (
              <div className="absolute right-0 z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-gray-100"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSearch(asset.name)
                        setIsSearchOpen(false)
                      }}
                    >
                      <span className="text-base font-medium text-gray-800">{asset.name}</span>
                      <span className="text-sm text-gray-500">{asset.quantity} 件</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">找不到符合的資產</div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] border border-gray-300 text-base text-gray-800">
            <thead>
              <tr className="bg-gray-50 text-gray-900">
                {['資產名稱', '數量', '保管人', '存放位置', '品牌', '型號', '序號', '資產價格', '保存期限', '更新日期', '操作'].map((header) => (
                  <th key={header} className="border border-gray-300 px-3 py-2 text-base font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td className="border border-gray-300 px-3 py-4 text-center text-gray-500" colSpan={11}>
                    {assets.length === 0 ? '尚未新增任何資產' : '查無符合條件的資產'}
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50/70">
                    <td className="border border-gray-300 px-3 py-2.5 font-medium">{asset.name}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{asset.quantity}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{asset.keeper}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{asset.location}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{asset.brand}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{asset.model}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{asset.serialNumber}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{asset.assetPrice}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{asset.expiryDate}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{formatDateTime(asset.updatedAt)}</td>
                    <td className="border border-gray-300 px-2 py-2">
                      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <Button variant="outline" className="h-8 justify-center gap-1 bg-white px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => openEditDialog(asset)}>
                          <Pencil className="h-4 w-4" />
                          編輯
                        </Button>
                        <Button variant="outline" className="h-8 justify-center gap-1 bg-white px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => openWithdrawDialog(asset)}>
                          <Minus className="h-4 w-4" />
                          移管
                        </Button>
                        {canManageAssets ? (
                          <Button variant="outline" className="h-8 justify-center gap-1 bg-white px-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingAsset(asset)}>
                            <Trash2 className="h-4 w-4" />
                            刪除
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

      <Dialog open={!!editingAsset} onOpenChange={(open) => !open && setEditingAsset(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>編輯資產</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label>資產名稱</Label>
              {renderAssetNameSelect(editForm.name, (name) => setEditForm((prev) => ({ ...prev, name })))}
            </div>
            <div className="space-y-2">
              <Label>數量</Label>
              <Input type="number" min="0" value={editForm.quantity} onChange={(event) => setEditForm((prev) => ({ ...prev, quantity: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>保管人</Label>
              {renderKeeperSelect(editForm.keeperUserId, (keeperUserId) => setEditForm((prev) => ({ ...prev, keeperUserId })))}
            </div>
            <div className="space-y-2">
              <Label>存放位置</Label>
              {renderLocationInput(editForm.location, (location) => setEditForm((prev) => ({ ...prev, location })), isEditLocationOpen, setIsEditLocationOpen)}
            </div>
            <div className="space-y-2">
              <Label>品牌</Label>
              <Input value={editForm.brand} onChange={(event) => setEditForm((prev) => ({ ...prev, brand: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>型號</Label>
              <Input value={editForm.model} onChange={(event) => setEditForm((prev) => ({ ...prev, model: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>序號</Label>
              <Input value={editForm.serialNumber} onChange={(event) => setEditForm((prev) => ({ ...prev, serialNumber: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>資產價格</Label>
              <Input type="number" min="0" value={editForm.assetPrice} onChange={(event) => setEditForm((prev) => ({ ...prev, assetPrice: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>保存期限</Label>
              <Input type="date" value={editForm.expiryDate} onChange={(event) => setEditForm((prev) => ({ ...prev, expiryDate: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAsset(null)}>
              取消
            </Button>
            <Button onClick={handleUpdate}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!withdrawingAsset} onOpenChange={(open) => !open && setWithdrawingAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>移管資產</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-500">資產名稱</p>
              <p className="mt-1 text-base font-semibold text-gray-800">{withdrawingAsset?.name}</p>
              <p className="mt-2 text-sm text-gray-500">目前數量：{withdrawingAsset?.quantity ?? 0}</p>
            </div>
            <div className="space-y-2">
              <Label>移管數量</Label>
              <Input type="number" min="1" max={String(withdrawingAsset?.quantity ?? 1)} value={withdrawQuantity} onChange={(event) => setWithdrawQuantity(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>移管人</Label>
              {renderKeeperSelect(transferUserId, setTransferUserId)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawingAsset(null)}>
              取消
            </Button>
            <Button onClick={handleWithdraw}>確認移管</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingAsset} onOpenChange={(open) => !open && setDeletingAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base text-gray-700">
              確定要刪除資產「<span className="font-semibold">{deletingAsset?.name}</span>」嗎？
            </p>
            <p className="mt-2 text-sm text-gray-500">刪除後也會移除相關移管記錄。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingAsset(null)}>
              取消
            </Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AssetInventoryPage
