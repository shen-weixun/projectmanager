import { Archive } from "lucide-react"
import { Button } from "@/components/ui/button"

type ArchiveWeekButtonProps = {
  onClick: () => void
  disabled?: boolean
}

const ArchiveWeekButton = ({ onClick, disabled }: ArchiveWeekButtonProps) => {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    >
      <Archive className="size-4" />
      封存本週資料
    </Button>
  )
}

export default ArchiveWeekButton
