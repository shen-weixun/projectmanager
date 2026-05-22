import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RD_STATUS_BADGE_CLASS,
  RD_STATUS_LABEL,
  type RDItemStatus,
} from "@/types/api"

type RDStatusSelectProps = {
  value: RDItemStatus
  onChange: (value: RDItemStatus) => void
}

// RD 工項狀態選單的顯示順序。
const statuses: RDItemStatus[] = [
  "planning",
  "executing",
  "tracking",
  "confirmed_done",
]

const RDStatusSelect = ({ value, onChange }: RDStatusSelectProps) => {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as RDItemStatus)}>
      <SelectTrigger
        className={`h-9 min-w-[8.5rem] border-0 shadow-none ${RD_STATUS_BADGE_CLASS[value]}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {RD_STATUS_LABEL[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default RDStatusSelect
