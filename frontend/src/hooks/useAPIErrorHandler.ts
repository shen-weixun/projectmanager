import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { removeToken } from '../utils/auth';
import { showError } from '@/utils/toastHelper';

interface APIErrorResponse {
    message?: string;
    detail?: {
        message?: string;
    };
}

const getAPIErrorMessage = (data: APIErrorResponse, fallback: string) =>
    data.detail?.message || data.message || fallback;

export default function useAPIErrorHandler() { 
    const navigate = useNavigate();

    const handleAPIError = useCallback((error: unknown) => {
        if (isAxiosError(error)) {
            const { response, request } = error;

            if (response) {
                const { status, data } = response;
                const errorData = data as APIErrorResponse;

                if (status === 401) {
                    removeToken();
                    showError(getAPIErrorMessage(errorData, "登入驗證過期，請重新登入"), "登入錯誤", "top-center");
                    setTimeout(() => {
                        navigate('/login');
                    }, 1000);
                } else if (status === 403) {
                    showError(getAPIErrorMessage(errorData, "您沒有權限執行此操作"), "權限錯誤", "top-right");
                } else if (status === 404) {
                    showError(getAPIErrorMessage(errorData, "資源未找到"), "資源錯誤", "top-right");
                } else if (status >= 500) {
                    showError(getAPIErrorMessage(errorData, "伺服器錯誤，請稍後再試"), "伺服器錯誤", "top-right");
                } else {
                    showError(getAPIErrorMessage(errorData, "發生未知錯誤"), "錯誤", "top-right");
                }
            } else if (request) {
                showError("請求已發送，但沒有收到回應", "網絡錯誤", "top-right");
            } else {
                showError("發生未知錯誤", "未知錯誤", "top-right");
            }
        } else {
            showError("非預期的錯誤", "錯誤", "top-right");
        }
    }, [navigate]);

    return handleAPIError;
}

function isAxiosError(error: unknown): error is AxiosError {
    return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}
