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
  deleteAssetInventoryAPI,
  getAssetInventoryAPI,
  updateAssetInventoryAPI,
  withdrawAssetInventoryAPI,
} from '@/services/apis'
import type { AssetItem } from '@/types/api'

type AssetForm = {
  name: string
  quantity: string
  keeper: string
  location: string
}

// 新增與編輯表單的預設值。
const emptyForm: AssetForm = {
  name: '',
  quantity: '1',
  keeper: '',
  location: '',
}

// 將後端時間字串轉成台灣使用者可讀的日期時間格式。
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

const AssetInventoryPage = () => {
  // 管理資產清單、表單、搜尋與各種確認視窗狀態。
  const [asset, setasset] = useState<AssetItem[]>([])
  const [form, setForm] = useState<AssetForm>(emptyForm)
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null)
  const [editForm, setEditForm] = useState<AssetForm>(emptyForm)
  const [withdrawingAsset, setWithdrawingAsset] = useState<AssetItem | null>(null)
  const [withdrawQuantity, setWithdrawQuantity] = useState('1')
  const [withdrawer, setWithdrawer] = useState('')
  const [assetearch, setassetearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCreateLocationOpen, setIsCreateLocationOpen] = useState(false)
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false)
  const [deletingAsset, setDeletingAsset] = useState<AssetItem | null>(null)

  useEffect(() => {
    // 初次載入只向資料層取一次清單。
    const loadasset = async () => {
      const response = await getAssetInventoryAPI()
      if (response.status === 0) {
        setasset(response.data)
      }
    }
    loadasset()
  }, [])

  // 統計目前清單中所有資產的總數量。
  const totalQuantity = useMemo(
    () => asset.reduce((sum, asset) => sum + asset.quantity, 0),
    [asset]
  )

  // 依搜尋關鍵字過濾物品名稱、保管人與存放位置。
  const filteredasset = useMemo(() => {
    const keyword = assetearch.trim().toLowerCase()
    if (!keyword) return asset
    return asset.filter((asset) =>
      [asset.name, asset.keeper, asset.location].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    )
  }, [asset, assetearch])

  // 從既有資產整理出可重複選用的存放位置。
  const locationOptions = useMemo(
    () => Array.from(new Set(asset.map((asset) => asset.location.trim()).filter(Boolean))),
    [asset]
  )

  const handleCreate = async () => {
    // 新增資產
    const quantity = Number(form.quantity)
    if (!form.name.trim() || !form.keeper.trim() || !form.location.trim()) return
    if (!Number.isInteger(quantity) || quantity <= 0) return

    const response = await createAssetInventoryAPI({
      name: form.name.trim(),
      quantity,
      keeper: form.keeper.trim(),
      location: form.location.trim(),
    })
    if (response.status !== 0) return
    setasset((prev) => [response.data, ...prev])
    setForm(emptyForm)
  }

  // 開啟編輯視窗並把目前資產資料帶入編輯表單。
  const openEditDialog = (asset: AssetItem) => {
    setEditingAsset(asset)
    setEditForm({
      name: asset.name,
      quantity: String(asset.quantity),
      keeper: asset.keeper,
      location: asset.location,
    })
  }

  const handleUpdate = async () => {
    // 編輯資產
    if (!editingAsset) return
    const quantity = Number(editForm.quantity)
    if (!editForm.name.trim() || !editForm.keeper.trim() || !editForm.location.trim()) {
      return
    }
    if (!Number.isInteger(quantity) || quantity < 0) return

    const response = await updateAssetInventoryAPI(editingAsset.id, {
      name: editForm.name.trim(),
      quantity,
      keeper: editForm.keeper.trim(),
      location: editForm.location.trim(),
    })
    if (response.status !== 0) return

    setasset((prev) =>
      prev.map((asset) => (asset.id === editingAsset.id ? response.data : asset))
    )
    setEditingAsset(null)
  }

  // 開啟取出視窗並重置取出數量與取出人欄位。
  const openWithdrawDialog = (asset: AssetItem) => {
    setWithdrawingAsset(asset)
    setWithdrawQuantity('1')
    setWithdrawer('')
  }

  const handleWithdraw = async () => {
    // 取出資產
    if (!withdrawingAsset) return
    const quantity = Number(withdrawQuantity)
    const withdrawerName = withdrawer.trim()
    if (!Number.isInteger(quantity) || quantity <= 0) return
    if (quantity > withdrawingAsset.quantity) return
    if (!withdrawerName) return

    const response = await withdrawAssetInventoryAPI({
      id: withdrawingAsset.id,
      quantity,
      withdrawer: withdrawerName,
    })
    if (response.status !== 0) return
    // 保留數量為 0 的資產（不再過濾掉）
    setasset((prev) =>
      prev.map((asset) => (asset.id === withdrawingAsset.id ? response.data : asset))
    )
    setWithdrawingAsset(null)
    setWithdrawer('')
  }

  const handleDelete = async () => {
    // 刪除資產
    if (!deletingAsset) return
    const response = await deleteAssetInventoryAPI(deletingAsset.id)
    if (response.status !== 0) return
    setasset((prev) => prev.filter((asset) => asset.id !== deletingAsset.id))
    setDeletingAsset(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 pb-2">
      <section className="rounded-md bg-white p-6 shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">財產清單</h1>
              <Link to="/asset-inventory/withdraw-records">
                <Button
                  variant="outline"
                  className="h-8 gap-1.5 text-sm font-medium"
                >
                  <ClipboardList className="h-4 w-4" />
                  取出紀錄
                </Button>
              </Link>
            </div>
            <p className="mt-2 text-base text-gray-600">
              管理資產數量、保管人與存放位置，並可直接新增或取出資產。
            </p>
          </div>
          <div className="grid min-w-[220px] grid-cols-2 gap-3">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-500">資產項目</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{asset.length}</p>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-500">總數量</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{totalQuantity}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md bg-white p-6 shadow">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">新增資產</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">物品名稱</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="請輸入物品名稱"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">物品數量</Label>
            <Input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="請輸入數量"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">保管人</Label>
            <Input
              value={form.keeper}
              onChange={(e) => setForm({ ...form, keeper: e.target.value })}
              placeholder="請輸入保管人"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">存放位置</Label>
            <div className="relative">
              <Input
                value={form.location}
                onFocus={() => setIsCreateLocationOpen(true)}
                onBlur={() =>
                  window.setTimeout(() => setIsCreateLocationOpen(false), 120)
                }
                onChange={(e) => {
                  setForm({ ...form, location: e.target.value })
                  setIsCreateLocationOpen(true)
                }}
                className="pr-10"
                placeholder="請選擇或輸入存放位置"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsCreateLocationOpen((prev) => !prev)}
                aria-label="切換存放位置選單"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isCreateLocationOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isCreateLocationOpen ? (
                <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-md">
                  {locationOptions.length > 0 ? (
                    locationOptions
                      .filter((location) =>
                        location.toLowerCase().includes(form.location.trim().toLowerCase())
                      )
                      .map((location) => (
                        <button
                          key={location}
                          type="button"
                          className="w-full rounded-sm px-3 py-2 text-left text-base font-medium text-gray-800 transition hover:bg-gray-100"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setForm({ ...form, location })
                            setIsCreateLocationOpen(false)
                          }}
                        >
                          {location}
                        </button>
                      ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      尚無既有位置，可直接輸入新位置
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-end">
            <Button className="h-9 w-full" onClick={handleCreate}>
              新增資產
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-md bg-white p-6 shadow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800">資產列表</h2>
          <div className="relative w-full max-w-sm">
            <div className="relative">
              <Input
                value={assetearch}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 120)}
                onChange={(e) => {
                  setassetearch(e.target.value)
                  setIsSearchOpen(true)
                }}
                className="h-9 rounded-full bg-white pl-10 pr-20 text-base font-medium text-gray-800 placeholder:text-gray-400"
                placeholder="搜尋或選擇資產"
              />
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
                {assetearch ? (
                  <button
                    type="button"
                    className="text-gray-400 transition hover:text-gray-600"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setassetearch('')}
                    aria-label="清除搜尋"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-gray-500 transition hover:text-gray-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  aria-label="切換資產搜尋選單"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isSearchOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>

            {isSearchOpen ? (
              <div className="absolute right-0 z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                {filteredasset.length > 0 ? (
                  filteredasset.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-gray-100"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setassetearch(asset.name)
                        setIsSearchOpen(false)
                      }}
                    >
                      <span className="text-base font-medium text-gray-800">
                        {asset.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {asset.quantity} 件
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    找不到符合的資產
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 text-base text-gray-800">
            <thead>
              <tr className="bg-gray-50 text-gray-900">
                <th className="w-[14%] border border-gray-300 px-3 py-2 text-base font-semibold">物品名稱</th>
                <th className="w-[7%] border border-gray-300 px-3 py-2 text-base font-semibold">物品數量</th>
                <th className="w-[18%] border border-gray-300 px-3 py-2 text-base font-semibold">保管人</th>
                <th className="w-[23%] border border-gray-300 px-3 py-2 text-base font-semibold">存放位置</th>
                <th className="w-[14%] border border-gray-300 px-3 py-2 text-base font-semibold">更新日期</th>
                <th className="w-[24%] border border-gray-300 px-3 py-2 text-base font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredasset.length === 0 ? (
                <tr>
                  <td
                    className="border border-gray-300 px-3 py-4 text-center text-gray-500"
                    colSpan={6}
                  >
                    {asset.length === 0 ? '尚未新增任何資產' : '查無符合條件的資產'}
                  </td>
                </tr>
              ) : (
                filteredasset.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50/70">
                    <td className="border border-gray-300 px-3 py-2.5 font-medium">
                      {asset.name}
                    </td>
                    <td className="border border-gray-300 px-3 py-2.5">{asset.quantity}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{asset.keeper}</td>
                    <td className="border border-gray-300 px-3 py-2.5">{asset.location}</td>
                    <td className="border border-gray-300 px-3 py-2.5">
                      <div className="space-y-1">
                        <div>{formatDateTime(asset.updatedAt)}</div>
                        {asset.lastWithdrawBy ? (
                          <div className="text-sm text-gray-500">
                            最近取出：{asset.lastWithdrawBy}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <Button
                          variant="outline"
                          className="h-8 justify-center gap-1 bg-white px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          onClick={() => openEditDialog(asset)}
                        >
                          <Pencil className="h-4 w-4" />
                          編輯
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 justify-center gap-1 bg-white px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          onClick={() => openWithdrawDialog(asset)}
                        >
                          <Minus className="h-4 w-4" />
                          取出
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 justify-center gap-1 bg-white px-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeletingAsset(asset)}
                        >
                          <Trash2 className="h-4 w-4" />
                          刪除
                        </Button>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>編輯資產</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>物品名稱</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>物品數量</Label>
              <Input
                type="number"
                min="0"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>保管人</Label>
              <Input
                value={editForm.keeper}
                onChange={(e) => setEditForm({ ...editForm, keeper: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>存放位置</Label>
              <div className="relative">
                <Input
                  value={editForm.location}
                  onFocus={() => setIsEditLocationOpen(true)}
                  onBlur={() =>
                    window.setTimeout(() => setIsEditLocationOpen(false), 120)
                  }
                  onChange={(e) => {
                    setEditForm({ ...editForm, location: e.target.value })
                    setIsEditLocationOpen(true)
                  }}
                  className="pr-10"
                  placeholder="請選擇或輸入存放位置"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsEditLocationOpen((prev) => !prev)}
                  aria-label="切換編輯存放位置選單"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isEditLocationOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isEditLocationOpen ? (
                  <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-md">
                    {locationOptions.length > 0 ? (
                      locationOptions
                        .filter((location) =>
                          location
                            .toLowerCase()
                            .includes(editForm.location.trim().toLowerCase())
                        )
                        .map((location) => (
                          <button
                            key={location}
                            type="button"
                            className="w-full rounded-sm px-3 py-2 text-left text-base font-medium text-gray-800 transition hover:bg-gray-100"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setEditForm({ ...editForm, location })
                              setIsEditLocationOpen(false)
                            }}
                          >
                            {location}
                          </button>
                        ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        尚無既有位置，可直接輸入新位置
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
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

      <Dialog
        open={!!withdrawingAsset}
        onOpenChange={(open) => !open && setWithdrawingAsset(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>取出</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-500">物品名稱</p>
              <p className="mt-1 text-base font-semibold text-gray-800">
                {withdrawingAsset?.name}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                現有數量：{withdrawingAsset?.quantity ?? 0}
              </p>
            </div>

            <div className="space-y-2">
              <Label>取出數量</Label>
              <Input
                type="number"
                min="1"
                max={String(withdrawingAsset?.quantity ?? 1)}
                value={withdrawQuantity}
                onChange={(e) => setWithdrawQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>取出人</Label>
              <Input
                value={withdrawer}
                onChange={(e) => setWithdrawer(e.target.value)}
                placeholder="請輸入取出人"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawingAsset(null)}>
              取消
            </Button>
            <Button onClick={handleWithdraw}>確認取出</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingAsset}
        onOpenChange={(open) => !open && setDeletingAsset(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-base text-gray-700">
              確定要刪除資產「<span className="font-semibold">{deletingAsset?.name}</span>」嗎？
            </p>
            <p className="mt-2 text-sm text-gray-500">
              此操作無法復原，相關的取出紀錄也會一併刪除。
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingAsset(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default AssetInventoryPage
