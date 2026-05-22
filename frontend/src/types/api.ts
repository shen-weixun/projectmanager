// 登入成功或失敗後端回應。
export interface LoginResponse {
    status: number;
    token?: string;
    roleKey?: string;
    account?: string;
    name?: string;
    message?: string;
}

// 登入請求送出的帳號密碼。
export interface LoginPayload {
    username: string;
    password: string;
}

// 公司基本資訊與品牌識別資料。
export interface CompanyInfo {
    CompanyName?: string;
    CompanyNameEn?: string;
    logo?: string;
}

export interface UserProfile {
    id: number;
    name: string;
    phone: string;
    groupId: number | null;
    groupName: string;
    email: string;
    address: string;
}

export interface UserProfileUpdatePayload {
    groupId: number | null;
    groupName: string;
    email: string;
    address: string;
}

// 專案列表與甘特圖使用的專案基本資料。
export interface Project {
    id: number;
    customer?: string;
    name: string;
    category?: string;
    group: string;
    projectOwner: string;
    owner: string;
    status: string;
    startDate: string;
    preStartDate?: string;
    planStartDate?: string;
    dueDate: string;
    registeredAddress?: string;
    mailingAddress?: string;
    contact1?: string;
    contactPhone1?: string;
    contact2?: string;
    contactPhone2?: string;
    contact3?: string;
    contactPhone3?: string;
}

// 專案自訂欄位資料。
export interface ProjectCustomField {
    id: string;
    label: string;
    value: string;
}

export interface ProjectCustomTableColumn {
    id: string;
    label: string;
}

export interface ProjectCustomTable {
    id: string;
    title: string;
    columns: ProjectCustomTableColumn[];
    rows: Record<string, string>[];
}

// 專案排程項目。
export interface ProjectScheduleItem {
    id: number;
    name: string;
    assignee: string;
    startDate: string;
    endDate: string;
    status: string;
    sortOrder: number;
}

// 專案待辦項目。
export interface ProjectTodoItem {
    id: number;
    item: string;
    assignee: string;
    status: string;
    dueDate: string;
    note: string;
    sortOrder: number;
}

// 專案檢核點項目。
export interface ProjectCheckpointItem {
    id: number;
    checkpoint: string;
    reviewDate: string;
    assignee: string;
    status: string;
    note: string;
    description: string;
    sortOrder: number;
}

// 專案詳情，包含描述、自訂欄位與子項目清單。
export interface ProjectDetail extends Project {
    description?: string;
    customFields?: ProjectCustomField[];
    customTables?: ProjectCustomTable[];
    scheduleItems?: ProjectScheduleItem[];
    todoItems?: ProjectTodoItem[];
    checkpointItems?: ProjectCheckpointItem[];
}

// 新增或更新專案排程項目的請求資料。
export interface ProjectScheduleItemPayload {
    id?: number;
    name: string;
    assignee?: string;
    startDate: string;
    endDate: string;
    status: string;
}

// 新增或更新專案待辦項目的請求資料。
export interface ProjectTodoItemPayload {
    id?: number;
    item: string;
    assignee?: string;
    status: string;
    dueDate?: string;
    note?: string;
}

// 新增或更新專案檢核點項目的請求資料。
export interface ProjectCheckpointItemPayload {
    id?: number;
    checkpoint: string;
    reviewDate?: string;
    assignee?: string;
    status?: string;
    note?: string;
    description?: string;
}

// 建立專案時送出的主檔資料。
export interface ProjectCreatePayload {
    name: string;
    customer?: string;
    category?: string;
    group?: string;
    projectOwner?: string;
    owner?: string;
    status?: string;
    startDate?: string;
    preStartDate?: string;
    planStartDate?: string;
    dueDate?: string;
    registeredAddress?: string;
    mailingAddress?: string;
    contact1?: string;
    contactPhone1?: string;
    contact2?: string;
    contactPhone2?: string;
    contact3?: string;
    contactPhone3?: string;
    description?: string;
    customFields?: ProjectCustomField[];
    customTables?: ProjectCustomTable[];
    scheduleItems?: ProjectScheduleItemPayload[];
    todoItems?: ProjectTodoItemPayload[];
    checkpointItems?: ProjectCheckpointItemPayload[];
}

// 更新專案時可部分送出的主檔資料。
export type ProjectUpdatePayload = Partial<ProjectCreatePayload>;

// 專案下拉選項資料。
export interface ProjectOptions {
    statuses: string[];
    categories: string[];
    todoStatuses?: string[];
    scheduleStatuses?: string[];
    checkpointStatuses?: string[];
}

// 財產清單項目，包含數量、保管人、位置與最後取出資訊。
export interface AssetItem {
    id: number;
    name: string;
    category?: string;
    quantity: number;
    availableQuantity?: number;
    unit?: string;
    status?: string;
    keeper: string;
    location: string;
    lastWithdrawBy: string | null;
    note?: string;
    createdAt?: string;
    updatedAt: string;
    [key: string]: unknown;
}

// 財產取出紀錄。
export interface AssetWithdrawRecord {
    id: number;
    assetId: number;
    assetName: string;
    quantity: number;
    withdrawer: string;
    location: string;
    createdAt: string;
    [key: string]: unknown;
}

// 新增或更新財產清單項目的請求資料。
export interface AssetPayload {
    name: string;
    category?: string;
    quantity: number;
    availableQuantity?: number;
    unit?: string;
    status?: string;
    keeper?: string;
    location?: string;
    note?: string;
    [key: string]: unknown;
}

// 財產取出請求資料。
export interface WithdrawAssetPayload {
    id: number;
    quantity: number;
    withdrawer: string;
}

// 部門管理列表資料。
export type DepartmentRecord = {
    id: number;
    name: string;
    description: string;
    memberCount: number;
    createdAt?: string;
    updatedAt?: string;
};

// 人員管理使用者資料。
export type PeopleManagementUser = {
    id: number;
    name: string;
    account: string;
    department: string;
    role: string;
    status: '啟用' | '停用';
    createdAt?: string;
    updatedAt?: string;
};

// 權限角色選項。
export type RoleOption = {
    id: number;
    roleKey: string;
    roleName: string;
    scopeType: string;
    canDefinePermissions: boolean;
};

// PM 週報專案階段代碼。
export type ProjectStage = 'not_started' | 'in_progress' | 'pending' | 'paused' | 'closed' | 'cancelled';

// PM 週報優先級代碼。
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// PM 週報專案資料。
export type PMProject = {
    id: number;
    projectName: string;
    vendor: string;
    executionTime: string;
    manager: string;
    assistants: string;
    stage: ProjectStage;
    priority: Priority;
    summary: string;
    plannedExecution: string;
    actualExecution: string;
    lastWeekProgress: string;
    thisWeekTodo: string;
    notes: string;
    customFields?: Record<string, string>;
    closedAt?: string | null;
    cancelledAt?: string | null;
    createdAt: string;
    updatedAt: string;
};

// PM 週報封存歷史資料。
export type PMHistoryRecord = {
    id: number;
    projectId: number;
    projectName: string;
    vendor: string;
    manager: string;
    weekStartDate: string;
    weekEndDate: string;
    lastWeekProgress: string;
    thisWeekTodo: string;
    notes: string;
    stageSnapshot: ProjectStage;
    prioritySnapshot: Priority;
    summarySnapshot: string;
    plannedExecutionSnapshot: string;
    actualExecutionSnapshot: string;
    createdAt: string;
};

// PM 週報頁籤代碼。
export type PMTabKey = 'ongoing' | 'closed' | 'history';

// PM 週報仍需追蹤的階段。
export const ACTIVE_STAGES: ProjectStage[] = ['not_started', 'in_progress', 'pending', 'paused'];

// PM 週報已結束的階段。
export const CLOSED_STAGES: ProjectStage[] = ['closed', 'cancelled'];

// PM 週報階段顯示文字。
export const PROJECT_STAGE_LABEL: Record<ProjectStage, string> = {
    not_started: '未開始',
    in_progress: '進行中',
    pending: '待確認',
    paused: '暫停中',
    closed: '已結案',
    cancelled: '已撤案',
};

// PM 週報優先級顯示文字。
export const PRIORITY_LABEL: Record<Priority, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '緊急',
};

// PM 週報階段徽章樣式。
export const STAGE_BADGE_CLASS: Record<ProjectStage, string> = {
    not_started: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-amber-100 text-amber-800',
    pending: 'bg-sky-100 text-sky-800',
    paused: 'bg-stone-200 text-stone-700',
    closed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-rose-100 text-rose-800',
};

// PM 週報優先級徽章樣式。
export const PRIORITY_BADGE_CLASS: Record<Priority, string> = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
};

// RD 週報項目狀態代碼。
export type RDItemStatus = 'planning' | 'executing' | 'tracking' | 'confirmed_done';

// RD 週報項目資料。
export type RDReport = {
    id: number;
    vendor: string;
    projectName: string;
    executor: string;
    itemStatus: RDItemStatus;
    taskName: string;
    itemContent: string;
    plannedStart: string;
    plannedEnd: string;
    actualCompleted: string;
    notes: string;
    closedAt?: string | null;
    cancelledAt?: string | null;
    createdAt: string;
    updatedAt: string;
};

// RD 週報封存歷史資料。
export type RDHistoryRecord = {
    id: number;
    reportId: number;
    vendor: string;
    projectName: string;
    executor: string;
    weekStartDate: string;
    weekEndDate: string;
    itemStatusSnapshot: RDItemStatus;
    taskNameSnapshot: string;
    itemContentSnapshot: string;
    plannedStartSnapshot: string;
    plannedEndSnapshot: string;
    actualCompletedSnapshot: string;
    notesSnapshot: string;
    createdAt: string;
};

// RD 週報仍需追蹤的狀態。
export const RD_ACTIVE_STATUSES: RDItemStatus[] = ['planning', 'executing', 'tracking'];

// RD 週報已完成的狀態。
export const RD_CLOSED_STATUSES: RDItemStatus[] = ['confirmed_done'];

// RD 週報狀態顯示文字。
export const RD_STATUS_LABEL: Record<RDItemStatus, string> = {
    planning: '規劃',
    executing: '執行',
    tracking: '追蹤',
    confirmed_done: '已確認完成',
};

// RD 週報狀態徽章樣式。
export const RD_STATUS_BADGE_CLASS: Record<RDItemStatus, string> = {
    planning: 'bg-slate-100 text-slate-700',
    executing: 'bg-amber-100 text-amber-800',
    tracking: 'bg-sky-100 text-sky-800',
    confirmed_done: 'bg-emerald-100 text-emerald-800',
};
