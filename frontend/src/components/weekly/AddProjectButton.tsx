import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type AddProjectButtonProps = {
  onClick: () => void
}

const AddProjectButton = ({ onClick }: AddProjectButtonProps) => {
  return (
    <Button onClick={onClick} className="bg-slate-900 text-white hover:bg-slate-800">
      <Plus className="size-4" />
      新增專案
    </Button>
  )
}

export default AddProjectButton
