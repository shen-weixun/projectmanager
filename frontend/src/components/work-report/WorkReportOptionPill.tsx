import type { WorkReportOptionColor } from '@/utils/workReportOptions'
import { OPTION_COLOR_STYLES } from '@/utils/workReportOptions'

type Props = {
  label: string
  color?: WorkReportOptionColor
  className?: string
}

export default function WorkReportOptionPill({ label, color = 'slate', className = '' }: Props) {
  const style = OPTION_COLOR_STYLES[color]
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${style.bg} ${style.text} ${className}`}
    >
      {label}
    </span>
  )
}
