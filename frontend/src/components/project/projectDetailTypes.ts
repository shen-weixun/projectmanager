import type { ProjectCustomField, ProjectCustomTable } from "@/types/api"

export type ProjectStatus = string

export type EditableCustomField = ProjectCustomField

export type EditableCustomTable = ProjectCustomTable

export type EditableTodoItem = {
  id: number
  item: string
  assignee: string
  status: string
  dueDate: string
  note: string
}

export type EditableScheduleItem = {
  id: number
  name: string
  assignee: string
  startDate: string
  endDate: string
  status: ProjectStatus
}

export type EditableCheckpointItem = {
  id: number
  checkpoint: string
  reviewDate: string
  assignee: string
  status: ProjectStatus
  note: string
  description: string
}

export type ProjectDetailForm = {
  id: number
  customer: string
  name: string
  group: string
  projectOwner: string
  status: ProjectStatus
  startDate: string
  preStartDate: string
  planStartDate: string
  dueDate: string
  category: string
  description: string
  registeredAddress: string
  mailingAddress: string
  contact1: string
  contactPhone1: string
  contact2: string
  contactPhone2: string
  contact3: string
  contactPhone3: string
  customFields: EditableCustomField[]
  customTables: EditableCustomTable[]
}

export type ProjectDetailSnapshot = {
  form: ProjectDetailForm
  scheduleItems: EditableScheduleItem[]
  todoItems: EditableTodoItem[]
  checkpointItems: EditableCheckpointItem[]
}
