import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PROJECT_STAGE_LABEL,
  STAGE_BADGE_CLASS,
  type ProjectStage,
} from "@/types/api"

type ProjectStageSelectProps = {
  value: ProjectStage
  onChange: (value: ProjectStage) => void
}

// PM 專案階段選單的顯示順序。
const PROJECT_STAGES: ProjectStage[] = [
  "not_started",
  "in_progress",
  "pending",
  "paused",
  "closed",
  "cancelled",
]

const ProjectStageSelect = ({ value, onChange }: ProjectStageSelectProps) => {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as ProjectStage)}>
      <SelectTrigger
        className={`h-9 min-w-[8.5rem] border-0 shadow-none ${STAGE_BADGE_CLASS[value]}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PROJECT_STAGES.map((stage) => (
          <SelectItem key={stage} value={stage}>
            {PROJECT_STAGE_LABEL[stage]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default ProjectStageSelect
