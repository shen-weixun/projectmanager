import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ChevronDown, Download, Edit3, GripVertical, Plus, Save, Trash2, X } from 'lucide-react'
import { toast } from 'react-toastify'

import {
  createLeadCaseAPI,
  createLeadFieldAPI,
  deleteLeadCaseAPI,
  deleteLeadFieldAPI,
  exportLeadCasesXlsxAPI,
  fetchAllProjects,
  getLeadCasesAPI,
  getLeadFieldsAPI,
  getUsersListAPI,
  importLeadCasesFromXlsxAPI,
  updateLeadCaseAPI,
  updateLeadFieldAPI,
} from '@/services/apis'
import type {
  LeadCase,
  LeadField,
  LeadFieldOption,
  LeadFieldPayload,
  LeadFieldType,
  LeadOptionColor,
  Project,
  UserListItem,
} from '@/types/api'
import {
  getRoleKey,
  LEAD_MANAGEMENT_MANAGER_ROLES,
  LEAD_MANAGEMENT_ROLE_KEYS,
} from '@/utils/auth'

type FieldDraft = {
  id?: number
  label: string
  fieldType: LeadFieldType
  options: LeadFieldOption[]
  isRequired: boolean
  isManagerOnly: boolean
  isRepeatable: boolean
  isActive: boolean
}

const colorOptions: { value: LeadOptionColor; label: string; className: string }[] = [
  { value: 'slate', label: '灰', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'red', label: '紅', className: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'orange', label: '橘', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'yellow', label: '黃', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'green', label: '綠', className: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'blue', label: '藍', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'purple', label: '紫', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'rose', label: '粉', className: 'bg-rose-100 text-rose-700 border-rose-200' },
]

const emptyFieldDraft: FieldDraft = {
  label: '',
  fieldType: 'text',
  options: [{ value: '', color: 'slate' }],
  isRequired: false,
  isManagerOnly: false,
  isRepeatable: false,
  isActive: true,
}

const fieldTypeLabels: Record<LeadFieldType, string> = {
  text: '文字',
  select: '下拉選單',
  cascade_select: '2層下拉選單',
  date: '日期',
  textarea: '多行文字',
}

const relationFieldLabels = {
  company: ['公司名稱', '客戶名稱'],
  project: ['計畫名稱', '專案名稱'],
  owner: ['專案負責人', '計畫負責人'],
  member: ['專案成員', '計畫成員'],
}

const isFieldLabel = (label: string, targets: string[]) => targets.includes(label.trim())

const uniqueValues = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))

const userDisplayName = (user: UserListItem) => user.name || user.account

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const extractErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: { message?: string } } } }).response
    return response?.data?.detail?.message || '操作失敗，請稍後再試'
  }
  return '操作失敗，請稍後再試'
}

const colorClass = (color?: string) =>
  colorOptions.find((item) => item.value === color)?.className || colorOptions[0].className

type LeadSelectOption = {
  value: string
  color?: LeadOptionColor
}

type LeadOptionSelectProps = {
  value: string
  options: LeadSelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
}

const LeadOptionPill = ({ value, color = 'slate' }: { value: string; color?: LeadOptionColor }) => (
  <span className={`inline-flex max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-bold ${colorClass(color)}`}>
    <span className="truncate">{value}</span>
  </span>
)

const LeadOptionSelect = ({ value, options, onChange, disabled = false }: LeadOptionSelectProps) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-md border bg-white px-2 py-1.5 text-left transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-80 ${
          open ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {selected ? (
          <LeadOptionPill value={selected.value} color={selected.color} />
        ) : (
          <span className="px-1 text-sm text-slate-400">請選擇</span>
        )}
        {!disabled && (
          <ChevronDown
            size={16}
            className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">沒有可選項目</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`flex w-full items-center px-2 py-2 text-left hover:bg-slate-50 ${
                  option.value === value ? 'bg-blue-50/70' : ''
                }`}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <LeadOptionPill value={option.value} color={option.color} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const cleanDraftOptions = (options: LeadFieldOption[]) => {
  const seen = new Set<string>()
  return options
    .map((option) => ({
      value: option.value.trim(),
      color: option.color || 'slate',
      children: cleanDraftOptions(option.children || []),
    }))
    .filter((option) => {
      if (!option.value || seen.has(option.value)) return false
      seen.add(option.value)
      return true
    })
}

const LeadManagementPage = () => {
  const roleKey = getRoleKey()
  const canAccess = roleKey ? LEAD_MANAGEMENT_ROLE_KEYS.includes(roleKey as never) : false
  const isManager = roleKey ? LEAD_MANAGEMENT_MANAGER_ROLES.includes(roleKey as never) : false

  const [fields, setFields] = useState<LeadField[]>([])
  const [cases, setCases] = useState<LeadCase[]>([])
  const [caseDraft, setCaseDraft] = useState<Record<string, string | string[]>>({})
  const [editingCaseId, setEditingCaseId] = useState<number | null>(null)
  const [fieldDraft, setFieldDraft] = useState<FieldDraft>(emptyFieldDraft)
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [draggingFieldId, setDraggingFieldId] = useState<number | null>(null)
  const xlsxInputRef = useRef<HTMLInputElement>(null)

  const activeFields = useMemo(
    () => fields.filter((field) => field.isActive).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    [fields]
  )
  const orderedFields = useMemo(
    () => [...fields].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    [fields]
  )

  const companyOptions = useMemo(
    () => uniqueValues(projects.map((project) => project.customer || '')),
    [projects]
  )

  const projectOptions = useMemo(() => {
    const rawCompany = caseDraft['公司名稱'] || caseDraft['客戶名稱'] || ''
    const selectedCompany = Array.isArray(rawCompany) ? rawCompany[0] || '' : rawCompany
    const scopedProjects = selectedCompany
      ? projects.filter((project) => project.customer === selectedCompany)
      : projects
    return uniqueValues(scopedProjects.map((project) => project.name || ''))
  }, [caseDraft, projects])

  const userOptions = useMemo(
    () => uniqueValues(users.map((user) => userDisplayName(user))),
    [users]
  )

  const resetCaseDraft = () => {
    setEditingCaseId(null)
    setCaseDraft(Object.fromEntries(activeFields.map((field) => [field.label, ''])))
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [fieldsRes, casesRes, projectsRes, usersRes] = await Promise.all([
        getLeadFieldsAPI(),
        getLeadCasesAPI(),
        fetchAllProjects(),
        getUsersListAPI(),
      ])
      if (fieldsRes.status === 0) setFields(fieldsRes.data.fields)
      else toast.error(extractErrorMessage(fieldsRes.error))

      if (casesRes.status === 0) setCases(casesRes.data)
      else toast.error(extractErrorMessage(casesRes.error))

      if (projectsRes.status === 0) setProjects(projectsRes.data)
      else toast.error(extractErrorMessage(projectsRes.error))

      if (usersRes.status === 0) setUsers(usersRes.data)
      else toast.error(extractErrorMessage(usersRes.error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canAccess) fetchData()
  }, [canAccess])

  useEffect(() => {
    if (!editingCaseId) {
      setCaseDraft((prev) => ({
        ...Object.fromEntries(activeFields.map((field) => [field.label, ''])),
        ...prev,
      }))
    }
  }, [activeFields, editingCaseId])

  if (!canAccess) return <Navigate to="/" replace />

  const submitCase = async () => {
    const payload = { data: caseDraft }
    const res = editingCaseId
      ? await updateLeadCaseAPI(editingCaseId, payload)
      : await createLeadCaseAPI(payload)
    if (res.status !== 0) {
      toast.error(extractErrorMessage(res.error))
      return
    }
    toast.success(editingCaseId ? '洽案已更新' : '洽案已新增')
    resetCaseDraft()
    fetchData()
  }

  const editCase = (leadCase: LeadCase) => {
    setEditingCaseId(leadCase.id)
    setCaseDraft(Object.fromEntries(activeFields.map((field) => [field.label, leadCase.data[field.label] || ''])))
  }

  const removeCase = async (caseId: number) => {
    const res = await deleteLeadCaseAPI(caseId)
    if (res.status !== 0) {
      toast.error(extractErrorMessage(res.error))
      return
    }
    toast.success('洽案已刪除')
    if (editingCaseId === caseId) resetCaseDraft()
    fetchData()
  }

  const handleXlsxImport = async (file: File) => {
    const contentBase64 = arrayBufferToBase64(await file.arrayBuffer())
    const res = await importLeadCasesFromXlsxAPI({
      filename: file.name,
      contentBase64,
    })
    if (res.status !== 0) {
      toast.error(extractErrorMessage(res.error))
      return
    }
    toast.success(`匯入成功：${res.data.createdCount} 筆洽案`)
    fetchData()
  }

  const handleXlsxFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    handleXlsxImport(file)
  }

  const handleXlsxExport = async () => {
    const res = await exportLeadCasesXlsxAPI()
    if (res.status !== 0) {
      toast.error(extractErrorMessage(res.error))
      return
    }
    const dateKey = new Date().toISOString().slice(0, 10)
    downloadBlob(`lead-management-${dateKey}.xlsx`, res.data)
  }

  const submitField = async () => {
    const payload: LeadFieldPayload = {
      label: fieldDraft.label.trim(),
      fieldType: fieldDraft.fieldType,
      options: ['select', 'cascade_select'].includes(fieldDraft.fieldType) ? cleanDraftOptions(fieldDraft.options) : [],
      isRequired: fieldDraft.isRequired,
      isManagerOnly: fieldDraft.isManagerOnly,
      isRepeatable: fieldDraft.isRepeatable,
      isActive: fieldDraft.isActive,
    }
    const res = fieldDraft.id
      ? await updateLeadFieldAPI(fieldDraft.id, payload)
      : await createLeadFieldAPI(payload)
    if (res.status !== 0) {
      toast.error(extractErrorMessage(res.error))
      return
    }
    toast.success(fieldDraft.id ? '欄位已更新' : '欄位已新增')
    setFieldDraft(emptyFieldDraft)
    fetchData()
  }

  const payloadFromField = (field: LeadField, overrides: Partial<LeadFieldPayload> = {}): LeadFieldPayload => ({
    label: field.label,
    fieldType: field.fieldType,
    options: ['select', 'cascade_select'].includes(field.fieldType) ? field.options : [],
    isRequired: Boolean(field.isRequired),
    isManagerOnly: Boolean(field.isManagerOnly),
    isRepeatable: Boolean(field.isRepeatable),
    isActive: field.isActive !== false,
    ...overrides,
  })

  const persistFieldOrder = async (nextOrderedFields: LeadField[]) => {
    const normalizedFields = nextOrderedFields.map((field, index) => ({ ...field, sortOrder: index }))
    setFields((prev) => prev.map((field) => normalizedFields.find((item) => item.id === field.id) || field))

    const updates = normalizedFields
      .filter((field) => orderedFields.find((item) => item.id === field.id)?.sortOrder !== field.sortOrder)
      .map((field) => updateLeadFieldAPI(field.id, payloadFromField(field, { sortOrder: field.sortOrder })))

    const results = await Promise.all(updates)
    const failed = results.find((res) => res.status !== 0)
    if (failed) {
      toast.error(extractErrorMessage(failed.error))
      fetchData()
      return
    }

    toast.success('欄位順序已更新')
  }

  const handleFieldDragStart = (event: DragEvent<HTMLDivElement>, fieldId: number) => {
    setDraggingFieldId(fieldId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(fieldId))
  }

  const handleFieldDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const handleFieldDrop = (event: DragEvent<HTMLDivElement>, targetFieldId: number) => {
    event.preventDefault()
    const sourceFieldId = draggingFieldId ?? Number(event.dataTransfer.getData('text/plain'))
    setDraggingFieldId(null)
    if (!sourceFieldId || sourceFieldId === targetFieldId) return

    const sourceIndex = orderedFields.findIndex((field) => field.id === sourceFieldId)
    const targetOriginalIndex = orderedFields.findIndex((field) => field.id === targetFieldId)
    const sourceField = orderedFields[sourceIndex]
    if (!sourceField) return

    const nextOrderedFields = orderedFields.filter((field) => field.id !== sourceFieldId)
    const targetIndex = nextOrderedFields.findIndex((field) => field.id === targetFieldId)
    if (targetIndex < 0) return

    const isMovingDown = sourceIndex < targetOriginalIndex
    nextOrderedFields.splice(targetIndex + (isMovingDown ? 1 : 0), 0, sourceField)
    persistFieldOrder(nextOrderedFields)
  }

  const toggleManagerOnly = async (field: LeadField) => {
    const res = await updateLeadFieldAPI(field.id, payloadFromField(field, {
      isManagerOnly: !field.isManagerOnly,
    }))
    if (res.status !== 0) {
      toast.error(extractErrorMessage(res.error))
      return
    }
    toast.success(!field.isManagerOnly ? '已設為僅管理者可編輯' : '已開放 PM 編輯')
    fetchData()
  }

  const editField = (field: LeadField) => {
    setFieldDraft({
      id: field.id,
      label: field.label,
      fieldType: field.fieldType,
      options: field.options.length > 0 ? field.options : [{ value: '', color: 'slate' }],
      isRequired: Boolean(field.isRequired),
      isManagerOnly: Boolean(field.isManagerOnly),
      isRepeatable: Boolean(field.isRepeatable),
      isActive: field.isActive !== false,
    })
  }

  const removeField = async (fieldId: number) => {
    const res = await deleteLeadFieldAPI(fieldId)
    if (res.status !== 0) {
      toast.error(extractErrorMessage(res.error))
      return
    }
    toast.success('欄位已刪除')
    fetchData()
  }

  const updateDraftOption = (index: number, patch: Partial<LeadFieldOption>) => {
    setFieldDraft((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option
      ),
    }))
  }

  const updateDraftChildOption = (parentIndex: number, childIndex: number, patch: Partial<LeadFieldOption>) => {
    setFieldDraft((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) => {
        if (optionIndex !== parentIndex) return option
        const children = option.children || []
        return {
          ...option,
          children: children.map((child, index) => index === childIndex ? { ...child, ...patch } : child),
        }
      }),
    }))
  }

  const addDraftChildOption = (parentIndex: number) => {
    setFieldDraft((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) => {
        if (optionIndex !== parentIndex) return option
        return {
          ...option,
          children: [...(option.children || []), { value: '', color: 'slate' }],
        }
      }),
    }))
  }

  const removeDraftChildOption = (parentIndex: number, childIndex: number) => {
    setFieldDraft((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) => {
        if (optionIndex !== parentIndex) return option
        return {
          ...option,
          children: (option.children || []).filter((_, index) => index !== childIndex),
        }
      }),
    }))
  }

  const optionForValue = (field: LeadField, value: string) =>
    field.options.find((option) => option.value === value)

  const canEditCaseField = (field: LeadField) => isManager || !field.isManagerOnly

  const renderValue = (field: LeadField, value: string) => {
    if (!value) return '-'
    const option = optionForValue(field, value)
    if (!option) return value
    return (
      <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-bold ${colorClass(option.color)}`}>
        <span className="truncate">{value}</span>
      </span>
    )
  }

  const renderCaseDisplayValue = (field: LeadField, rawValue: string | string[] | undefined) => {
    const values = Array.isArray(rawValue) ? rawValue.filter(Boolean) : rawValue ? [rawValue] : []
    if (values.length === 0) return '-'
    return (
      <div className="flex flex-wrap gap-1.5">
        {values.map((value, index) => (
          <span key={`${value}-${index}`}>{renderValue(field, value)}</span>
        ))}
      </div>
    )
  }

  const valuesForField = (field: LeadField) => {
    const rawValue = caseDraft[field.label]
    if (field.isRepeatable) {
      return Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : ['']
    }
    return [typeof rawValue === 'string' ? rawValue : rawValue?.[0] || '']
  }

  const setFieldValue = (field: LeadField, value: string, index = 0) => {
    setCaseDraft((prev) => {
      if (!field.isRepeatable) {
        return { ...prev, [field.label]: value }
      }
      const current = Array.isArray(prev[field.label])
        ? [...(prev[field.label] as string[])]
        : prev[field.label]
          ? [String(prev[field.label])]
          : ['']
      current[index] = value
      return { ...prev, [field.label]: current }
    })
  }

  const addFieldValue = (field: LeadField) => {
    setCaseDraft((prev) => {
      const current = Array.isArray(prev[field.label])
        ? [...(prev[field.label] as string[])]
        : prev[field.label]
          ? [String(prev[field.label])]
          : []
      return { ...prev, [field.label]: [...current, ''] }
    })
  }

  const removeFieldValue = (field: LeadField, index: number) => {
    setCaseDraft((prev) => {
      const current = Array.isArray(prev[field.label])
        ? [...(prev[field.label] as string[])]
        : prev[field.label]
          ? [String(prev[field.label])]
          : ['']
      const next = current.filter((_, valueIndex) => valueIndex !== index)
      return { ...prev, [field.label]: next.length > 0 ? next : [''] }
    })
  }

  const relatedOptionsForField = (field: LeadField) => {
    if (isFieldLabel(field.label, relationFieldLabels.company)) return companyOptions
    if (isFieldLabel(field.label, relationFieldLabels.project)) return projectOptions
    if (isFieldLabel(field.label, relationFieldLabels.owner)) return userOptions
    if (isFieldLabel(field.label, relationFieldLabels.member)) return userOptions
    return null
  }

  const renderRelatedSelect = (field: LeadField, options: string[], value: string, index: number, disabled: boolean) => {
    return (
      <LeadOptionSelect
        value={value}
        options={options.map((option) => ({ value: option, color: 'slate' }))}
        onChange={(nextValue) => setFieldValue(field, nextValue, index)}
        disabled={disabled}
      />
    )
  }

  const splitCascadeValue = (value: string) => {
    const [parent = '', child = ''] = value.split(' / ')
    return { parent, child }
  }

  const renderCascadeSelect = (field: LeadField, value: string, index: number, disabled: boolean) => {
    const { parent, child } = splitCascadeValue(value)
    const parentOption = field.options.find((option) => option.value === parent)
    const childOptions = parentOption?.children || []
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <LeadOptionSelect
          value={parent}
          options={field.options}
          onChange={(nextParent) => setFieldValue(field, nextParent, index)}
          disabled={disabled}
        />
        <LeadOptionSelect
          value={child}
          options={childOptions}
          onChange={(nextChild) => setFieldValue(field, parent ? `${parent} / ${nextChild}` : nextChild, index)}
          disabled={disabled || !parent}
        />
      </div>
    )
  }

  const renderSingleCaseInput = (field: LeadField, value: string, index: number, disabled: boolean) => {
    const commonClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'
    const relatedOptions = relatedOptionsForField(field)
    if (relatedOptions) {
      return renderRelatedSelect(field, relatedOptions, value, index, disabled)
    }
    if (field.fieldType === 'select') {
      return (
        <LeadOptionSelect
          value={value}
          options={field.options}
          onChange={(nextValue) => setFieldValue(field, nextValue, index)}
          disabled={disabled}
        />
      )
    }
    if (field.fieldType === 'cascade_select') {
      return renderCascadeSelect(field, value, index, disabled)
    }
    if (field.fieldType === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(event) => setFieldValue(field, event.target.value, index)}
          rows={3}
          disabled={disabled}
          className={commonClass}
        />
      )
    }
    return (
      <input
        type={field.fieldType === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(event) => setFieldValue(field, event.target.value, index)}
        disabled={disabled}
        className={commonClass}
      />
    )
  }

  const renderCaseInput = (field: LeadField) => {
    const values = valuesForField(field)
    const disabled = !canEditCaseField(field)
    return (
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={`${field.id}-${index}`} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {renderSingleCaseInput(field, value, index, disabled)}
            </div>
            {field.isRepeatable && !disabled && (
              <button
                type="button"
                onClick={() => removeFieldValue(field, index)}
                className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-slate-500 hover:bg-slate-50"
                aria-label="移除此筆"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {field.isRepeatable && !disabled && (
          <button
            type="button"
            onClick={() => addFieldValue(field)}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            新增一筆
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">洽案管理</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">整理洽談中的客戶與需求，管理者可自訂欄位與下拉選項色彩。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={xlsxInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleXlsxFileChange}
          />
          <button
            type="button"
            onClick={() => xlsxInputRef.current?.click()}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            匯入 XLSX
          </button>
          <button
            type="button"
            onClick={handleXlsxExport}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            匯出 XLSX
          </button>
        <div className="rounded-md bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">
          共 {cases.length} 筆洽案
        </div>
      </div>

      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">{editingCaseId ? '編輯洽案' : '新增洽案'}</h2>
            {editingCaseId && (
              <button type="button" onClick={resetCaseDraft} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                <X className="h-4 w-4" />
                取消編輯
              </button>
            )}
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {activeFields.map((field) => (
              <label key={field.id} className={field.fieldType === 'textarea' ? 'md:col-span-2' : ''}>
                <span className="mb-1 block text-sm font-bold text-slate-700">
                  {field.label}
                  {field.isRequired && <span className="ml-1 text-red-500">*</span>}
                  {field.isRepeatable && (
                    <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">可多筆</span>
                  )}
                  {field.isManagerOnly && !isManager && (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">僅管理者可編輯</span>
                  )}
                </span>
                {renderCaseInput(field)}
              </label>
            ))}
          </div>
          <div className="flex justify-end border-t border-slate-200 px-5 py-4">
            <button type="button" onClick={submitCase} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
              <Save className="h-4 w-4" />
              {editingCaseId ? '儲存洽案' : '新增洽案'}
            </button>
          </div>
        </section>

        {isManager && (
          <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">欄位設定</h2>
            </div>
            <div className="space-y-4 p-5">
              <label>
                <span className="mb-1 block text-sm font-bold text-slate-700">欄位名稱</span>
                <input value={fieldDraft.label ?? ''} onChange={(event) => setFieldDraft((prev) => ({ ...prev, label: event.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-bold text-slate-700">欄位型態</span>
                <select value={fieldDraft.fieldType} onChange={(event) => setFieldDraft((prev) => ({ ...prev, fieldType: event.target.value as LeadFieldType }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  {Object.entries(fieldTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              {['select', 'cascade_select'].includes(fieldDraft.fieldType) && (
                <div>
                  <span className="mb-2 block text-sm font-bold text-slate-700">下拉選項與色彩</span>
                  <div className="space-y-2">
                    {fieldDraft.options.map((option, index) => (
                      <div key={index} className="grid grid-cols-[1fr_96px_36px] gap-2">
                        <input
                          value={option.value ?? ''}
                          onChange={(event) => updateDraftOption(index, { value: event.target.value })}
                          placeholder="選項名稱"
                          className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                        <select
                          value={option.color ?? 'slate'}
                          onChange={(event) => updateDraftOption(index, { color: event.target.value as LeadOptionColor })}
                          className={`rounded-md border px-2 py-2 text-sm font-bold outline-none ${colorClass(option.color)}`}
                        >
                          {colorOptions.map((color) => (
                            <option key={color.value} value={color.value}>{color.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setFieldDraft((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }))}
                          className="inline-flex items-center justify-center rounded-md border text-slate-500 hover:bg-slate-50"
                          aria-label="刪除選項"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {fieldDraft.fieldType === 'cascade_select' && (
                          <div className="col-span-3 space-y-2 rounded-md bg-slate-50 p-2">
                            {(option.children || []).map((child, childIndex) => (
                              <div key={childIndex} className="grid grid-cols-[1fr_96px_36px] gap-2">
                                <input
                                  value={child.value ?? ''}
                                  onChange={(event) => updateDraftChildOption(index, childIndex, { value: event.target.value })}
                                  placeholder="第二層名稱"
                                  className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                                <select
                                  value={child.color ?? 'slate'}
                                  onChange={(event) => updateDraftChildOption(index, childIndex, { color: event.target.value as LeadOptionColor })}
                                  className={`rounded-md border px-2 py-2 text-sm font-bold outline-none ${colorClass(child.color)}`}
                                >
                                  {colorOptions.map((color) => (
                                    <option key={color.value} value={color.value}>{color.label}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeDraftChildOption(index, childIndex)}
                                  className="inline-flex items-center justify-center rounded-md border text-slate-500 hover:bg-slate-50"
                                  aria-label="刪除第二層"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addDraftChildOption(index)}
                              className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              新增第二層
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFieldDraft((prev) => ({ ...prev, options: [...prev.options, { value: '', color: 'slate' }] }))}
                    className="mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    新增選項
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-700">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(fieldDraft.isRequired)} onChange={(event) => setFieldDraft((prev) => ({ ...prev, isRequired: event.target.checked }))} />
                  必填
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(fieldDraft.isManagerOnly)} onChange={(event) => setFieldDraft((prev) => ({ ...prev, isManagerOnly: event.target.checked }))} />
                  僅管理者可編輯
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(fieldDraft.isRepeatable)} onChange={(event) => setFieldDraft((prev) => ({ ...prev, isRepeatable: event.target.checked }))} />
                  可新增多筆
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={fieldDraft.isActive !== false} onChange={(event) => setFieldDraft((prev) => ({ ...prev, isActive: event.target.checked }))} />
                  顯示欄位
                </label>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={submitField} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800">
                  <Plus className="h-4 w-4" />
                  {fieldDraft.id ? '更新欄位' : '新增欄位'}
                </button>
                {fieldDraft.id && (
                  <button type="button" onClick={() => setFieldDraft(emptyFieldDraft)} className="rounded-md border px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                    取消
                  </button>
                )}
              </div>
              <div className="space-y-2 border-t border-slate-200 pt-4">
                {orderedFields.map((field) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={(event) => handleFieldDragStart(event, field.id)}
                    onDragOver={handleFieldDragOver}
                    onDrop={(event) => handleFieldDrop(event, field.id)}
                    onDragEnd={() => setDraggingFieldId(null)}
                    className={`flex cursor-grab items-center justify-between gap-3 rounded-md border px-3 py-2 active:cursor-grabbing ${
                      draggingFieldId === field.id
                        ? 'border-blue-300 bg-blue-50 opacity-70'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{field.label}</p>
                      <p className="text-xs text-slate-500">
                        {fieldTypeLabels[field.fieldType]}
                        {field.isManagerOnly ? ' / 僅管理者可編輯' : ''}
                        {field.isRepeatable ? ' / 可新增多筆' : ''}
                        {!field.isActive ? ' / 已隱藏' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={Boolean(field.isManagerOnly)}
                          onChange={() => toggleManagerOnly(field)}
                        />
                        管理者
                      </label>
                      <button type="button" onClick={() => editField(field)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="編輯欄位">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => removeField(field.id)} className="rounded-md p-2 text-red-500 hover:bg-red-50" aria-label="刪除欄位">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">洽案列表</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                {activeFields.map((field) => <th key={field.id} className="px-4 py-3">{field.label}</th>)}
                <th className="w-28 px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={activeFields.length + 1} className="px-4 py-10 text-center font-semibold text-slate-500">載入中...</td></tr>
              ) : cases.length === 0 ? (
                <tr><td colSpan={activeFields.length + 1} className="px-4 py-10 text-center font-semibold text-slate-500">尚無洽案資料</td></tr>
              ) : cases.map((leadCase) => (
                <tr key={leadCase.id} className="hover:bg-slate-50">
                  {activeFields.map((field) => (
                    <td key={field.id} className="max-w-[220px] truncate px-4 py-3 text-slate-700">
                      {renderCaseDisplayValue(field, leadCase.data[field.label])}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => editCase(leadCase)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="編輯洽案">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => removeCase(leadCase.id)} className="rounded-md p-2 text-red-500 hover:bg-red-50" aria-label="刪除洽案">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default LeadManagementPage
