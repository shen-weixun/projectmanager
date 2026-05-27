// 儲存Token
export function saveToken(token: string, rememberMe: boolean): void {
    if (rememberMe) {
        localStorage.setItem('token', token);
        sessionStorage.removeItem('token');
    } else {
        sessionStorage.setItem('token', token);
        localStorage.removeItem('token');
    }
}

// 儲存使用者角色
export function saveRoleKey(roleKey: string, rememberMe: boolean): void {
    if (rememberMe) {
        localStorage.setItem('roleKey', roleKey);
        sessionStorage.removeItem('roleKey');
    } else {
        sessionStorage.setItem('roleKey', roleKey);
        localStorage.removeItem('roleKey');
    }
}

// 儲存使用者帳號
export function saveAccount(account: string, rememberMe: boolean): void {
    if (rememberMe) {
        localStorage.setItem('account', account);
        sessionStorage.removeItem('account');
    } else {
        sessionStorage.setItem('account', account);
        localStorage.removeItem('account');
    }
}

// 取得使用者帳號
export function getAccount(): string {
    return localStorage.getItem('account') || sessionStorage.getItem('account') || '';
}

// 取得使用者角色
export function getRoleKey(): string | null {
    const token = getToken();
    const storedRoleKey = localStorage.getItem('roleKey') || sessionStorage.getItem('roleKey');
    if (!token) return storedRoleKey;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.roleKey ? String(payload.roleKey) : storedRoleKey;
    } catch {
        return storedRoleKey;
    }
}

export const PM_ROLE_KEYS = ['super', 'boss', 'pm_leader', 'pm_user'] as const;
export const RD_ROLE_KEYS = ['super', 'boss', 'rd_leader', 'rd_user'] as const;
export const WORK_REPORT_MANAGER_ROLES = ['super', 'boss'] as const;
export const LEAD_MANAGEMENT_ROLE_KEYS = ['super', 'boss', 'pm_leader', 'pm_user'] as const;
export const LEAD_MANAGEMENT_MANAGER_ROLES = ['super', 'boss'] as const;

// 取得Token
export function getToken(): string | null {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// 刪除Token
export function removeToken(): void {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('roleKey');
    sessionStorage.removeItem('roleKey');
    localStorage.removeItem('account');
    sessionStorage.removeItem('account');
}

// 檢查是否有Token
export function isAuthenticated(): boolean {
    return !!getToken();
}

// 檢查用戶是否有特定權限
export async function hasPermission(permission: string): Promise<boolean> {
    const token = getToken();
    if (!token) return false;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.permissions && payload.permissions.includes(permission);
    } catch {
        return false;
    }
}

// 取得Token的過期時間
export function getTokenExpiration(): Date | null {
    const token = getToken();
    if (!token) return null;

    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return null;

    return new Date(payload.exp * 1000);
}

// 檢查Token是否過期
export function isTokenExpired(): boolean {
    const expiration = getTokenExpiration();
    if (!expiration) return true;

    return new Date() > expiration;
}

// 檢查用戶是否已登入
export function isUserLoggedIn(): boolean {
    return isAuthenticated() && !isTokenExpired();
}
