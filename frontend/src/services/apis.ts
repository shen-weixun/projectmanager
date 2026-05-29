import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { getToken, removeToken } from '../utils/auth';

// ---------- WebSocket Client ----------
let ws: WebSocket | null = null;

// 建立帶有登入 token 的 WebSocket 連線。
export const createWebSocket = (): WebSocket => {
    const token = getToken();
    if (!token) throw new Error('No authentication token found');

    const fullURL = `?token=${token}`;
    ws = new WebSocket(fullURL);

    ws.onopen = () => {
        // 連線建立
    };

    ws.onerror = (_error) => {
        // 連線錯誤，由呼叫端處理
    };

    ws.onclose = () => {
        // 連線關閉
    };

    return ws;
};

// 取得目前已建立的 WebSocket 連線。
export const getWebSocket = () => ws;

// ---------- Axios API Client ----------
// 建立共用 Axios client，統一設定 baseURL、JSON header 與 cookie。
const createAPI = (baseURL: string) => {
    const api = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json',
        },
        withCredentials: true, // Enable cookies for cross-origin requests
    });

    api.interceptors.request.use((config) => {
        const token = getToken();
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
        return config;
    }, Promise.reject);

    api.interceptors.response.use(
        (res) => res,
        (error) => Promise.reject(error)
    );

    return api;
};

const api = createAPI('/api');

// 專案內目前使用的 HTTP 方法。
type HTTPMethod = 'get' | 'post' | 'patch' | 'delete';

// 所有 API 呼叫統一回傳成功或失敗格式，避免呼叫端重複 try/catch。
type SafeResponse<T> = { status: 0; data: T } | { status: -1; error: unknown };
const safeRequest = async <T = unknown, D = unknown>(
    method: HTTPMethod,
    url: string,
    data?: D,
    config?: AxiosRequestConfig
): Promise<SafeResponse<T>> => {
    try {
        const response =
            data !== undefined ? await api[method]<T>(url, data, config) : await api[method]<T>(url, config);
        // return { status: 0, data: response.data }

        return response.data as SafeResponse<T>;
    } catch (error) {
        return { status: -1, error };
    }
};

import type { LoginResponse, LoginPayload } from '@/types/api';
import type {
    AssetWithdrawRecord,
    AssetItem,
    AssetNameOption,
    AssetPayload,
    MaterialItem,
    MaterialPayload,
    MaterialTransferRecord,
    PMHistoryRecord,
    PMProject,
    RDHistoryRecord,
    RDReport,
    WithdrawAssetPayload,
    TransferMaterialPayload,
} from '@/types/api';
import type { UserProfile, UserProfileUpdatePayload } from '@/types/api';
import type { UserListItem } from '@/types/api';
// 使用帳號密碼登入，取得 token 與使用者基本資訊。
export const loginAPI = (username: string, password: string) =>
    safeRequest<LoginResponse, LoginPayload>('post', '/login', {
        username,
        password,
    });

// 呼叫登出 API（後端會鎖定過往週次已填寫表格，本週不受影響），再清除 token 並導回登入頁。
export const logoutAPI = async () => {
    try {
        await api.post('/logout');
    } catch {
        // 登出請求失敗仍繼續清除本地 token
    } finally {
        removeToken();
        window.location.href = '/login';
    }
};

import type { CompanyInfo } from '@/types/api';
// 取得公司名稱、英文名稱與 logo。
export const getCompanyInfoAPI = () => safeRequest<CompanyInfo>('get', '/company/company-info');

// 取得使用者群組選項。
export const getGroupsAPI = () => safeRequest<{ id: number; groupName: string }[]>('get', '/user/groups');

export const getUserProfileAPI = () => safeRequest<UserProfile>('get', '/user/profile');

export const updateUserProfileAPI = (payload: UserProfileUpdatePayload) =>
    safeRequest<UserProfile, UserProfileUpdatePayload>('patch', '/user/profile', payload);

export const getUsersListAPI = () => safeRequest<UserListItem[]>('get', '/users/list');

import type { Project } from '@/types/api';
import type {
    LeadCase,
    LeadCasePayload,
    LeadField,
    LeadFieldPayload,
    ProjectCheckpointItem,
    ProjectCheckpointItemPayload,
    ProjectCreatePayload,
    ProjectDetail,
    ProjectOptions,
    ProjectScheduleItem,
    ProjectScheduleItemPayload,
    ProjectTodoItem,
    ProjectTodoItemPayload,
    ProjectUpdatePayload,
} from '@/types/api';
// 取得專案列表，支援分頁與查詢參數。
export const getProjectsAPI = (params?: any) =>
    safeRequest<{
        items: Project[];
        total: number;
        page: number;
        pageSize: number;
    }>('get', '/project/list', undefined, { params });

const PROJECT_LIST_PAGE_SIZE = 100;

/** 分頁拉取全部專案（後端 pageSize 上限為 100）。 */
export const fetchAllProjects = async (
    params?: Record<string, unknown>
): Promise<SafeResponse<Project[]>> => {
    const items: Project[] = [];
    let page = 1;
    let total = 0;

    while (true) {
        const res = await getProjectsAPI({
            ...params,
            page,
            pageSize: PROJECT_LIST_PAGE_SIZE,
        });
        if (res.status !== 0) {
            return { status: -1, error: res.error };
        }

        items.push(...res.data.items);
        total = res.data.total;

        if (res.data.items.length === 0 || items.length >= total) {
            break;
        }
        page += 1;
    }

    return { status: 0, data: items };
};

// 取得甘特圖使用的專案資料。
export const getProjectGanttAPI = (params?: any) =>
    safeRequest<Project[]>('get', '/project/gantt', undefined, { params });

// 取得專案狀態與分類選項。
export const getProjectOptionsAPI = () => safeRequest<ProjectOptions>('get', '/project/options');

// 專案選項管理列表項目。
export type ProjectOptionItem = {
    id: number;
    optionType: 'status' | 'category';
    value: string;
    sortOrder: number;
    isActive: boolean;
};

// 取得後台可管理的專案狀態與分類選項。
export const getProjectOptionsManageAPI = () => safeRequest<ProjectOptionItem[]>('get', '/project/options/manage');

// 新增專案狀態或分類選項。
export const createProjectOptionAPI = (optionType: string, value: string) =>
    safeRequest<{ id: number }, { optionType: string; value: string }>('post', '/project/options', {
        optionType,
        value,
    });

// export const updateProjectOptionAPI = (id: number, payload: { value?: string; isActive?: boolean; sortOrder?: number }) => safeRequest<{ id: number }, typeof payload>(
//     'patch', `/project/options/${id}`, payload
// )

// 建立專案主檔。
export const createProjectAPI = (payload: ProjectCreatePayload) =>
    safeRequest<ProjectDetail, ProjectCreatePayload>('post', '/project/', payload);

// 取得單一專案詳情。
export const getProjectDetailAPI = (projectId: number) => safeRequest<ProjectDetail>('get', `/project/${projectId}`);

// 更新單一專案主檔。
export const updateProjectAPI = (projectId: number, payload: ProjectUpdatePayload) =>
    safeRequest<ProjectDetail, ProjectUpdatePayload>('patch', `/project/${projectId}`, payload);

// 刪除單一專案。
export const deleteProjectAPI = (projectId: number) => safeRequest<{ id: number }>('delete', `/project/${projectId}`);

// 取得專案排程項目。
export const getProjectScheduleAPI = (projectId: number) =>
    safeRequest<ProjectScheduleItem[]>('get', `/project/${projectId}/schedule`);

// 新增專案排程項目。
export const createProjectScheduleAPI = (projectId: number, payload: ProjectScheduleItemPayload) =>
    safeRequest<ProjectScheduleItem, ProjectScheduleItemPayload>('post', `/project/${projectId}/schedule`, payload);

// 更新專案排程項目。
export const updateProjectScheduleAPI = (
    projectId: number,
    itemId: number,
    payload: Partial<ProjectScheduleItemPayload>
) =>
    safeRequest<ProjectScheduleItem, Partial<ProjectScheduleItemPayload>>(
        'patch',
        `/project/${projectId}/schedule/${itemId}`,
        payload
    );

// 刪除專案排程項目。
export const deleteProjectScheduleAPI = (projectId: number, itemId: number) =>
    safeRequest<{ id: number }>('delete', `/project/${projectId}/schedule/${itemId}`);

// 取得專案待辦項目。
export const getProjectTodoAPI = (projectId: number) =>
    safeRequest<ProjectTodoItem[]>('get', `/project/${projectId}/todo`);

// 新增專案待辦項目。
export const createProjectTodoAPI = (projectId: number, payload: ProjectTodoItemPayload) =>
    safeRequest<ProjectTodoItem, ProjectTodoItemPayload>('post', `/project/${projectId}/todo`, payload);

// 更新專案待辦項目。
export const updateProjectTodoAPI = (projectId: number, itemId: number, payload: Partial<ProjectTodoItemPayload>) =>
    safeRequest<ProjectTodoItem, Partial<ProjectTodoItemPayload>>(
        'patch',
        `/project/${projectId}/todo/${itemId}`,
        payload
    );

// 刪除專案待辦項目。
export const deleteProjectTodoAPI = (projectId: number, itemId: number) =>
    safeRequest<{ id: number }>('delete', `/project/${projectId}/todo/${itemId}`);

// 取得專案檢核點項目。
export const getProjectCheckpointAPI = (projectId: number) =>
    safeRequest<ProjectCheckpointItem[]>('get', `/project/${projectId}/checkpoint`);

// 新增專案檢核點項目。
export const createProjectCheckpointAPI = (projectId: number, payload: ProjectCheckpointItemPayload) =>
    safeRequest<ProjectCheckpointItem, ProjectCheckpointItemPayload>(
        'post',
        `/project/${projectId}/checkpoint`,
        payload
    );

// 更新專案檢核點項目。
export const updateProjectCheckpointAPI = (
    projectId: number,
    itemId: number,
    payload: Partial<ProjectCheckpointItemPayload>
) =>
    safeRequest<ProjectCheckpointItem, Partial<ProjectCheckpointItemPayload>>(
        'patch',
        `/project/${projectId}/checkpoint/${itemId}`,
        payload
    );

// 刪除專案檢核點項目。
export const deleteProjectCheckpointAPI = (projectId: number, itemId: number) =>
    safeRequest<{ id: number }>('delete', `/project/${projectId}/checkpoint/${itemId}`);

// ---------- Lead Management API ----------
export const getLeadFieldsAPI = () =>
    safeRequest<{ fields: LeadField[]; canEditFields: boolean }>('get', '/lead-management/fields');

export const createLeadFieldAPI = (payload: LeadFieldPayload) =>
    safeRequest<LeadField, LeadFieldPayload>('post', '/lead-management/fields', payload);

export const updateLeadFieldAPI = (fieldId: number, payload: LeadFieldPayload) =>
    safeRequest<LeadField, LeadFieldPayload>('patch', `/lead-management/fields/${fieldId}`, payload);

export const deleteLeadFieldAPI = (fieldId: number) =>
    safeRequest<{ id: number }>('delete', `/lead-management/fields/${fieldId}`);

export const getLeadCasesAPI = () =>
    safeRequest<LeadCase[]>('get', '/lead-management/cases');

export const createLeadCaseAPI = (payload: LeadCasePayload) =>
    safeRequest<LeadCase, LeadCasePayload>('post', '/lead-management/cases', payload);

export const importLeadCasesAPI = (items: LeadCasePayload[]) =>
    safeRequest<{ createdCount: number; items: LeadCase[] }, { items: LeadCasePayload[] }>(
        'post',
        '/lead-management/cases/import',
        { items }
    );

export const importLeadCasesFromXlsxAPI = (payload: { filename?: string; contentBase64: string }) =>
    safeRequest<{ createdCount: number; items: LeadCase[] }, { filename?: string; contentBase64: string }>(
        'post',
        '/lead-management/cases/import-xlsx',
        payload
    );

export const exportLeadCasesXlsxAPI = async (): Promise<SafeResponse<Blob>> => {
    try {
        const response = await api.get<Blob>('/lead-management/cases/export-xlsx', {
            responseType: 'blob',
        });
        return { status: 0, data: response.data };
    } catch (error) {
        return { status: -1, error };
    }
};

export const updateLeadCaseAPI = (caseId: number, payload: LeadCasePayload) =>
    safeRequest<LeadCase, LeadCasePayload>('patch', `/lead-management/cases/${caseId}`, payload);

export const deleteLeadCaseAPI = (caseId: number) =>
    safeRequest<{ id: number }>('delete', `/lead-management/cases/${caseId}`);

// 取得公司部門與部門底下群組資料。
export const getDepartmentAPI = () =>
    safeRequest<
        {
            id: number;
            name: string;
            description: string;
            groups: { id: number; name: string }[];
        }[]
    >('get', '/company/department');

// 新增公司部門。
export const addDepartmentAPI = (name: string, description: string) =>
    safeRequest('post', '/company/department', { name, description });

// 更新公司部門。
export const updateDepartmentAPI = (id: number, name: string, description: string) =>
    safeRequest('patch', `/company/department/${id}`, { name, description });

// 刪除公司部門。
export const deleteDepartmentAPI = (id: number) => safeRequest('delete', `/company/department/${id}`);

// 新增部門底下的群組。
export const addDepartmentGroupAPI = (departmentId: number, groupName: string) =>
    safeRequest<{ id: number; name: string }>('post', `/company/department/${departmentId}/group`, { groupName });

// 刪除部門底下的群組。
export const deleteDepartmentGroupAPI = (departmentId: number, groupId: number) =>
    safeRequest('delete', `/company/department/${departmentId}/group/${groupId}`);

// ---------- Asset Inventory API ----------
// 取得財產清單。
export const getAssetInventoryAPI = () => safeRequest<AssetItem[]>('get', '/asset-inventory');

export const getAssetNameOptionsAPI = () => safeRequest<AssetNameOption[]>('get', '/asset-inventory/name-options');

export const createAssetNameOptionAPI = (value: string) =>
    safeRequest<AssetNameOption, { value: string }>('post', '/asset-inventory/name-options', { value });

export const deleteAssetNameOptionAPI = (id: number) =>
    safeRequest<{ id: number }>('delete', `/asset-inventory/name-options/${id}`);

// 取得財產移管紀錄。
export const getAssetWithdrawRecordsAPI = () =>
    safeRequest<AssetWithdrawRecord[]>('get', '/asset-inventory/withdraw-records');

// 新增財產清單項目。
export const createAssetInventoryAPI = (payload: AssetPayload) =>
    safeRequest<AssetItem, AssetPayload>('post', '/asset-inventory', payload);

// 更新財產清單項目。
export const updateAssetInventoryAPI = (id: number, payload: AssetPayload) =>
    safeRequest<AssetItem, AssetPayload>('patch', `/asset-inventory/${id}`, payload);

// 移管指定數量的財產，後端會回傳更新後的財產項目。
export const withdrawAssetInventoryAPI = ({ id, quantity, transferUserId }: WithdrawAssetPayload) =>
    safeRequest<AssetItem, { quantity: number; transferUserId: number }>('patch', `/asset-inventory/${id}/withdraw`, {
        quantity,
        transferUserId,
    });

// 刪除財產清單項目。
export const deleteAssetInventoryAPI = (id: number) => safeRequest('delete', `/asset-inventory/${id}`);

// ---------- Material Inventory API ----------
export const getMaterialInventoryAPI = () => safeRequest<MaterialItem[]>('get', '/material-inventory');

export const getMaterialTransferRecordsAPI = () =>
    safeRequest<MaterialTransferRecord[]>('get', '/material-inventory/transfer-records');

export const createMaterialInventoryAPI = (payload: MaterialPayload) =>
    safeRequest<MaterialItem, MaterialPayload>('post', '/material-inventory', payload);

export const updateMaterialInventoryAPI = (id: number, payload: MaterialPayload) =>
    safeRequest<MaterialItem, MaterialPayload>('patch', `/material-inventory/${id}`, payload);

export const transferMaterialInventoryAPI = ({ id, quantity, transferUserId }: TransferMaterialPayload) =>
    safeRequest<MaterialItem, { quantity: number; transferUserId: number }>('patch', `/material-inventory/${id}/transfer`, {
        quantity,
        transferUserId,
    });

export const deleteMaterialInventoryAPI = (id: number) => safeRequest('delete', `/material-inventory/${id}`);

// ---------- PM Weekly Report API ----------
// 取得 PM 週報專案列表。
export const getPMProjectsAPI = () => safeRequest<PMProject[]>('get', '/pm/projects');

// 新增 PM 週報專案。
export const createPMProjectAPI = (payload: Partial<PMProject>) =>
    safeRequest<PMProject, Partial<PMProject>>('post', '/pm/projects', payload);

// 更新 PM 週報專案。
export const updatePMProjectAPI = (id: number, payload: Partial<PMProject> & { editedByName?: string }) =>
    safeRequest<PMProject, Partial<PMProject> & { editedByName?: string }>('patch', `/pm/projects/${id}`, payload);

// 刪除 PM 週報專案。
export const deletePMProjectAPI = (id: number) => safeRequest<{ id: number }>('delete', `/pm/projects/${id}`);

// 封存本週 PM 週報。
export const archivePMWeekAPI = (archivedByName: string) =>
    safeRequest<{ archivedCount: number; weekStartDate: string; weekEndDate: string }, { archivedByName: string }>(
        'post',
        '/pm/archive',
        { archivedByName }
    );

// 取得 PM 週報封存歷史。
export const getPMHistoryAPI = () => safeRequest<PMHistoryRecord[]>('get', '/pm/history');

// 取得 PM 週報編輯紀錄。
export const getPMEditLogsAPI = () => safeRequest<unknown[]>('get', '/pm/edit-logs');

// 取得 PM 週報封存紀錄。
export const getPMArchiveLogsAPI = () => safeRequest<unknown[]>('get', '/pm/archive-logs');

// ---------- RD Weekly Report API ----------
// 取得 RD 週報項目列表。
export const getRDReportsAPI = () => safeRequest<RDReport[]>('get', '/rd/reports');

// 新增 RD 週報項目。
export const createRDReportAPI = (payload: Partial<RDReport>) =>
    safeRequest<RDReport, Partial<RDReport>>('post', '/rd/reports', payload);

// 更新 RD 週報項目。
export const updateRDReportAPI = (id: number, payload: Partial<RDReport> & { editedByName?: string }) =>
    safeRequest<RDReport, Partial<RDReport> & { editedByName?: string }>('patch', `/rd/reports/${id}`, payload);

// 刪除 RD 週報項目。
export const deleteRDReportAPI = (id: number) => safeRequest<{ id: number }>('delete', `/rd/reports/${id}`);

// 封存本週 RD 週報。
export const archiveRDWeekAPI = (archivedByName: string) =>
    safeRequest<{ archivedCount: number; weekStartDate: string; weekEndDate: string }, { archivedByName: string }>(
        'post',
        '/rd/archive',
        { archivedByName }
    );

// 取得 RD 週報封存歷史。
export const getRDHistoryAPI = () => safeRequest<RDHistoryRecord[]>('get', '/rd/history');

// 取得 RD 週報編輯紀錄。
export const getRDEditLogsAPI = () => safeRequest<unknown[]>('get', '/rd/edit-logs');

// 取得 RD 週報封存紀錄。
export const getRDArchiveLogsAPI = () => safeRequest<unknown[]>('get', '/rd/archive-logs');

export type CompanyFullInfo = {
    id: number;
    name: string;
    nameEn: string;
    logo: string;
    phone: string;
    email: string;
    address: string;
};

// 💡 這裡手動新增：將專案初始化好、會自動在 request 攔截器補上 Token 的 axios 實例導出給自訂頁面使用
export const apiClient = api;
export const getCompanyFullInfoAPI = () =>
    safeRequest<CompanyFullInfo>('get', '/company/info');

export const updateCompanyFullInfoAPI = (payload: Partial<Omit<CompanyFullInfo, 'id'>>) =>
    safeRequest<CompanyFullInfo, typeof payload>('patch', '/company/info', payload);
// ---------- PM 自訂動態週報表格 API ----------
export const getPMGroupedTablesAPI = (weekStart: string) => 
    safeRequest<any>('get', `/pm/tables/grouped?week_start=${weekStart}`);

export const createPMTableAPI = (payload: { week_start: string; table_name: string }) =>
    safeRequest<any, typeof payload>('post', '/pm/tables', payload);

export const updatePMTableAPI = (tableId: number, payload: { table_name?: string; table_data?: any }) =>
    safeRequest<any, typeof payload>('patch', `/pm/tables/${tableId}`, payload);

export const deletePMTableAPI = (tableId: number) =>
    safeRequest<any>('delete', `/pm/tables/${tableId}`);
