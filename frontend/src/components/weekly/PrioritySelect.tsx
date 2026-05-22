import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PRIORITY_BADGE_CLASS,
  PRIORITY_LABEL,
  type Priority,
} from "@/types/api"

type PrioritySelectProps = {
  value: Priority
  onChange: (value: Priority) => void
}

// PM 優先度選單的顯示順序。
const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"]

const PrioritySelect = ({ value, onChange }: PrioritySelectProps) => {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as Priority)}>
      <SelectTrigger
        className={`h-9 min-w-[6rem] border-0 shadow-none ${PRIORITY_BADGE_CLASS[value]}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRIORITIES.map((priority) => (
          <SelectItem key={priority} value={priority}>
            {PRIORITY_LABEL[priority]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default PrioritySelect
