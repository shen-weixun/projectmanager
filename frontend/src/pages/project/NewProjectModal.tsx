'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import useAPIErrorHandler from '@/hooks/useAPIErrorHandler'
import { createProjectAPI, createProjectOptionAPI, getGroupsAPI, getProjectOptionsAPI } from '@/services/apis'
import type { ProjectCreatePayload, ProjectDetail } from '@/types/api'

type CustomTableDraft = {
  id: string
  title: string
  columns: string[]
  rows: string[][]
}

const createCustomTableId = () =>
  `table-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const emptyCustomTable = (): CustomTableDraft => ({
  id: createCustomTableId(),
  title: '',
  columns: ['', ''],
  rows: [['', '']],
})

const customTableHasContent = (table: CustomTableDraft) =>
  table.title.trim() ||
  table.columns.some((column) => column.trim()) ||
  table.rows.some((row) => row.some((cell) => cell.trim()))

const normalizeCustomTables = (tables: CustomTableDraft[]) =>
  tables.filter(customTableHasContent).map((table, tableIndex) => {
    const columns = table.columns.map((column, columnIndex) => ({
      id: `col-${columnIndex + 1}`,
      label: column.trim() || `欄位 ${columnIndex + 1}`,
    }))

    return {
      id: table.id,
      title: table.title.trim() || `自訂表格 ${tableIndex + 1}`,
      columns,
      rows: table.rows
        .filter((row) => row.some((cell) => cell.trim()))
        .map((row) =>
          columns.reduce<Record<string, string>>((record, column, columnIndex) => {
            record[column.id] = row[columnIndex]?.trim() || ''
            return record
          }, {})
        ),
    }
  })

// 檢查使用者輸入的狀態或類別是否已存在於後端選項。
const hasOption = (options: string[], value: string) =>
  options.some((option) => option.trim() === value)

const NewProjectModal = ({
  onCreate,
}: {
  onCreate: (project: ProjectDetail) => void
}) => {
  // 統一處理新增專案流程中的 API 錯誤。
  const handleError = useAPIErrorHandler()

  // 管理新增專案表單、選項資料與自訂下拉選單開關狀態。
  const [categories, setCategories] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [groups, setGroups] = useState<{ id: number; groupName: string }[]>([])
  const [open, setOpen] = useState(false)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [customTables, setCustomTables] = useState<CustomTableDraft[]>([])
  const [form, setForm] = useState({
    customer: '',
    name: '',
    category: '',
    group: '',
    projectOwner: '',
    status: '尚未開始',
    preStartDate: '',
    planStartDate: '',
    dueDate: '',
    registeredAddress: '',
    mailingAddress: '',
    contact1: '',
    contactPhone1: '',
    contact2: '',
    contactPhone2: '',
    contact3: '',
    contactPhone3: '',
  })
  // 至少填寫客戶與專案名稱後才允許送出。
  const canSubmit = form.customer.trim() !== '' && form.name.trim() !== ''

  // 依目前輸入文字篩選專案類別候選值。
  const filteredCategories = useMemo(() => {
    const keyword = form.category.trim().toLowerCase()
    if (!keyword) return categories
    return categories.filter((category) =>
      category.toLowerCase().includes(keyword)
    )
  }, [categories, form.category])

  // 依目前輸入文字篩選專案狀態候選值。
  const filteredStatuses = useMemo(() => {
    const keyword = form.status.trim().toLowerCase()
    if (!keyword) return statusOptions
    return statusOptions.filter((status) =>
      status.toLowerCase().includes(keyword)
    )
  }, [statusOptions, form.status])

  // 載入新增專案需要的組別、類別與狀態選項。
  const fetchInitData = useCallback(async () => {
    try {
      const [groupsRes, optionsRes] = await Promise.all([
        getGroupsAPI(),
        getProjectOptionsAPI(),
      ])
      if (groupsRes.status === -1) {
        handleError(groupsRes.error)
        return
      }
      if (optionsRes.status === -1) {
        handleError(optionsRes.error)
        return
      }
      setGroups(groupsRes.data || [])
      setCategories(optionsRes.data?.categories || [])
      setStatusOptions(optionsRes.data?.statuses || [])
    } catch (error) {
      handleError(error)
    }
  }, [handleError])

  useEffect(() => {
    // 初次開啟元件時準備新增專案表單選項。
    void fetchInitData()
  }, [fetchInitData])

  // 送出新增專案，必要時先建立新的類別或狀態選項。
  const handleSubmit = async () => {
    const nextStatus = form.status.trim()
    const nextCategory = form.category.trim()

    if (nextStatus && !hasOption(statusOptions, nextStatus)) {
      const statusRes = await createProjectOptionAPI('status', nextStatus)
      if (statusRes.status === -1) {
        handleError(statusRes.error)
        return
      }
    }

    if (nextCategory && !hasOption(categories, nextCategory)) {
      const categoryRes = await createProjectOptionAPI('category', nextCategory)
      if (categoryRes.status === -1) {
        handleError(categoryRes.error)
        return
      }
    }

    const payload: ProjectCreatePayload = {
      ...form,
      category: nextCategory,
      status: nextStatus || '尚未開始',
      startDate: form.planStartDate || '',
      customTables: normalizeCustomTables(customTables),
    }
    const res = await createProjectAPI(payload)
    if (res.status === -1) {
      handleError(res.error)
      return
    }
    await fetchInitData()
    onCreate(res.data)
    setOpen(false)
    setForm({
      customer: '',
      name: '',
      category: '',
      group: '',
      projectOwner: '',
      status: '尚未開始',
      preStartDate: '',
      planStartDate: '',
      dueDate: '',
      registeredAddress: '',
      mailingAddress: '',
      contact1: '',
      contactPhone1: '',
      contact2: '',
      contactPhone2: '',
      contact3: '',
      contactPhone3: '',
    })
    setCustomTables([])
    setIsCategoryOpen(false)
    setIsStatusOpen(false)
  }

  // 延遲關閉類別選單，保留滑鼠點選選項的時間。
  const closeCategoryPickerSoon = () => {
    window.setTimeout(() => setIsCategoryOpen(false), 120)
  }

  // 延遲關閉狀態選單，保留滑鼠點選選項的時間。
  const closeStatusPickerSoon = () => {
    window.setTimeout(() => setIsStatusOpen(false), 120)
  }

  const updateCustomTable = (tableId: string, value: Partial<CustomTableDraft>) => {
    setCustomTables((tables) =>
      tables.map((table) => (table.id === tableId ? { ...table, ...value } : table))
    )
  }

  const updateCustomTableColumn = (tableId: string, columnIndex: number, value: string) => {
    setCustomTables((tables) =>
      tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              columns: table.columns.map((column, index) =>
                index === columnIndex ? value : column
              ),
            }
          : table
      )
    )
  }

  const updateCustomTableCell = (
    tableId: string,
    rowIndex: number,
    columnIndex: number,
    value: string
  ) => {
    setCustomTables((tables) =>
      tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              rows: table.rows.map((row, currentRowIndex) =>
                currentRowIndex === rowIndex
                  ? row.map((cell, currentColumnIndex) =>
                      currentColumnIndex === columnIndex ? value : cell
                    )
                  : row
              ),
            }
          : table
      )
    )
  }

  const addCustomTableColumn = (tableId: string) => {
    setCustomTables((tables) =>
      tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              columns: [...table.columns, ''],
              rows: table.rows.map((row) => [...row, '']),
            }
          : table
      )
    )
  }

  const removeCustomTableColumn = (tableId: string, columnIndex: number) => {
    setCustomTables((tables) =>
      tables.map((table) =>
        table.id === tableId && table.columns.length > 1
          ? {
              ...table,
              columns: table.columns.filter((_, index) => index !== columnIndex),
              rows: table.rows.map((row) => row.filter((_, index) => index !== columnIndex)),
            }
          : table
      )
    )
  }

  const addCustomTableRow = (tableId: string) => {
    setCustomTables((tables) =>
      tables.map((table) =>
        table.id === tableId
          ? { ...table, rows: [...table.rows, table.columns.map(() => '')] }
          : table
      )
    )
  }

  const removeCustomTableRow = (tableId: string, rowIndex: number) => {
    setCustomTables((tables) =>
      tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              rows:
                table.rows.length === 1
                  ? [table.columns.map(() => '')]
                  : table.rows.filter((_, index) => index !== rowIndex),
            }
          : table
      )
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          新增專案
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl p-0 overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <div className="border-b px-6 py-4">
            <DialogTitle className="text-xl">新增專案</DialogTitle>
            <DialogDescription className="mt-1">
              請填寫必要資訊後建立專案
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="max-h-[72vh] space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">客戶</Label>
              <Input
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                placeholder="請輸入客戶名稱"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">專案名稱</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="請輸入專案名稱"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">專案類別</Label>
              <div className="relative">
                <Input
                  className="pr-8 text-base font-semibold text-slate-800"
                  value={form.category}
                  onFocus={() => setIsCategoryOpen(true)}
                  onBlur={closeCategoryPickerSoon}
                  onChange={(e) => {
                    setForm({ ...form, category: e.target.value })
                    setIsCategoryOpen(true)
                  }}
                  placeholder="請選擇或輸入專案類別"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsCategoryOpen((prev) => !prev)}
                  aria-label="切換專案類別選單"
                >
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isCategoryOpen ? (
                  <div className="absolute z-50 mt-2 max-h-56 w-full overflow-y-auto overflow-x-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-base font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setForm({ ...form, category })
                            setIsCategoryOpen(false)
                          }}
                        >
                          {category}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-base font-semibold text-slate-500">
                        無符合項目，可直接輸入新類別
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">營登地址</Label>
              <Input
                value={form.registeredAddress}
                onChange={(e) =>
                  setForm({ ...form, registeredAddress: e.target.value })
                }
                placeholder="請輸入營登地址"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">通訊地址</Label>
              <Input
                value={form.mailingAddress}
                onChange={(e) =>
                  setForm({ ...form, mailingAddress: e.target.value })
                }
                placeholder="請輸入通訊地址"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">聯絡人 1</Label>
              <Input
                value={form.contact1}
                onChange={(e) => setForm({ ...form, contact1: e.target.value })}
                placeholder="請輸入聯絡人 1"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">聯絡電話 1</Label>
              <Input
                value={form.contactPhone1}
                onChange={(e) => setForm({ ...form, contactPhone1: e.target.value })}
                placeholder="請輸入聯絡電話 1"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">聯絡人 2</Label>
              <Input
                value={form.contact2}
                onChange={(e) => setForm({ ...form, contact2: e.target.value })}
                placeholder="請輸入聯絡人 2"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">聯絡電話 2</Label>
              <Input
                value={form.contactPhone2}
                onChange={(e) => setForm({ ...form, contactPhone2: e.target.value })}
                placeholder="請輸入聯絡電話 2"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">聯絡人 3</Label>
              <Input
                value={form.contact3}
                onChange={(e) => setForm({ ...form, contact3: e.target.value })}
                placeholder="請輸入聯絡人 3"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">聯絡電話 3</Label>
              <Input
                value={form.contactPhone3}
                onChange={(e) => setForm({ ...form, contactPhone3: e.target.value })}
                placeholder="請輸入聯絡電話 3"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">負責組別</Label>
              <Input
                list="new-project-groups"
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                placeholder="請選擇或輸入組別"
              />
              <datalist id="new-project-groups">
                {groups.map((group) => (
                  <option key={group.id} value={group.groupName} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">專案負責人</Label>
              <Input
                value={form.projectOwner}
                onChange={(e) => setForm({ ...form, projectOwner: e.target.value })}
                placeholder="請輸入專案負責人名稱"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">狀態</Label>
              <div className="relative">
                <Input
                  className="pr-8 text-base font-semibold text-slate-800"
                  value={form.status}
                  onFocus={() => setIsStatusOpen(true)}
                  onBlur={closeStatusPickerSoon}
                  onChange={(e) => {
                    setForm({ ...form, status: e.target.value })
                    setIsStatusOpen(true)
                  }}
                  placeholder="請選擇或輸入狀態"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsStatusOpen((prev) => !prev)}
                  aria-label="切換專案狀態選單"
                >
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isStatusOpen ? (
                  <div className="absolute z-50 mt-2 max-h-56 w-full overflow-y-auto overflow-x-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                    {filteredStatuses.length > 0 ? (
                      filteredStatuses.map((status) => (
                        <button
                          key={status}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-base font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setForm({ ...form, status })
                            setIsStatusOpen(false)
                          }}
                        >
                          {status}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-base font-semibold text-slate-500">
                        無符合項目，可直接輸入新狀態
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">專案開始時間</Label>
              <Input
                type="date"
                value={form.preStartDate}
                onChange={(e) =>
                  setForm({ ...form, preStartDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">計劃開始時間</Label>
              <Input
                type="date"
                value={form.planStartDate}
                onChange={(e) =>
                  setForm({ ...form, planStartDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">結束日</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-md border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">自訂表格</h3>
                <p className="text-sm text-slate-500">可建立任意欄位與列，送出後會保存到後端</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => setCustomTables((tables) => [...tables, emptyCustomTable()])}
              >
                <Plus className="h-4 w-4" />
                新增表格
              </Button>
            </div>

            {customTables.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 py-8 text-center text-sm font-medium text-slate-500">
                尚未新增自訂表格
              </div>
            ) : (
              <div className="space-y-4">
                {customTables.map((table) => (
                  <div key={table.id} className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        className="min-w-[220px] flex-1"
                        value={table.title}
                        onChange={(e) => updateCustomTable(table.id, { title: e.target.value })}
                        placeholder="表格名稱"
                      />
                      <Button type="button" variant="outline" className="gap-2" onClick={() => addCustomTableColumn(table.id)}>
                        <Plus className="h-4 w-4" />
                        欄位
                      </Button>
                      <Button type="button" variant="outline" className="gap-2" onClick={() => addCustomTableRow(table.id)}>
                        <Plus className="h-4 w-4" />
                        資料列
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setCustomTables((tables) => tables.filter((item) => item.id !== table.id))}
                        aria-label="移除表格"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-[720px] w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b text-left text-slate-600">
                            {table.columns.map((column, columnIndex) => (
                              <th key={columnIndex} className="min-w-[160px] px-2 py-2 font-medium">
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={column}
                                    onChange={(e) => updateCustomTableColumn(table.id, columnIndex, e.target.value)}
                                    placeholder={`欄位 ${columnIndex + 1}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeCustomTableColumn(table.id, columnIndex)}
                                    disabled={table.columns.length === 1}
                                    aria-label="移除欄位"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </th>
                            ))}
                            <th className="w-10 px-2 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b last:border-b-0">
                              {table.columns.map((_, columnIndex) => (
                                <td key={columnIndex} className="px-2 py-2 align-top">
                                  <Input
                                    value={row[columnIndex] || ''}
                                    onChange={(e) =>
                                      updateCustomTableCell(table.id, rowIndex, columnIndex, e.target.value)
                                    }
                                    placeholder="輸入資料"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-2 align-top">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeCustomTableRow(table.id, rowIndex)}
                                  aria-label="移除資料列"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t bg-gray-50 px-6 py-4 sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            新增
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default NewProjectModal
