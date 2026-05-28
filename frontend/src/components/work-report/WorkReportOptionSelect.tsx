import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import WorkReportOptionPill from '@/components/work-report/WorkReportOptionPill'
import type { WorkReportOptionItem } from '@/utils/workReportOptions'

type Props = {
  options: WorkReportOptionItem[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function WorkReportOptionSelect({
  options,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)

  // 計算 fixed 定位座標，讓下拉清單不被父層 overflow 裁切
  const updateDropdownPosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownHeight = Math.min(options.length * 44 + 8, 240)
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    // 空間不夠時向上展開
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top, top: 'auto' }
        : { top: rect.bottom + 2, bottom: 'auto' }),
    })
  }

  const handleOpen = () => {
    if (disabled) return
    updateDropdownPosition()
    setOpen((prev) => !prev)
  }

  // 點擊外部關閉
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  // 捲動或視窗大小改變時更新位置
  useEffect(() => {
    if (!open) return
    const update = () => updateDropdownPosition()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, options.length])

  if (disabled) {
    return (
      <div className="min-h-10 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
        {selected ? (
          <WorkReportOptionPill label={selected.value} color={selected.color} />
        ) : (
          <span className="px-1 text-sm text-slate-400">請選擇</span>
        )}
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-md border bg-white px-2 py-1.5 text-left transition ${
          open ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {selected ? (
          <WorkReportOptionPill label={selected.value} color={selected.color} />
        ) : (
          <span className="px-1 text-sm text-slate-400">請選擇</span>
        )}
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
        >
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
                <WorkReportOptionPill label={option.value} color={option.color} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}