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

  if (disabled) {
    if (!selected) {
      return (
        <div className="min-h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
          請選擇
        </div>
      )
    }
    return (
      <div className="min-h-10 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
        <WorkReportOptionPill label={selected.value} color={selected.color} />
      </div>
    )
  }

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
                <WorkReportOptionPill label={option.value} color={option.color} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
