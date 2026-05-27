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

  const selected = options.find((opt) => opt.value === value)

  if (disabled) {
    if (!value) {
      return <span className="text-slate-400 text-sm p-1.5">—</span>
    }
    return (
      <WorkReportOptionPill
        label={value}
        color={selected?.color ?? 'slate'}
      />
    )
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-[120px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-2 py-1.5 text-left transition ${
          open ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {selected ? (
          <WorkReportOptionPill label={selected.value} color={selected.color} />
        ) : (
          <span className="flex-1" />
        )}
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`flex w-full items-center px-2 py-2 text-left hover:bg-slate-50 ${
                opt.value === value ? 'bg-blue-50/60' : ''
              }`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              <WorkReportOptionPill label={opt.value} color={opt.color} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
