import { Save, UserRound } from 'lucide-react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useAPIErrorHandler from '@/hooks/useAPIErrorHandler';
import { getUserProfileAPI, updateUserProfileAPI } from '@/services/apis';
import type { UserProfile, UserProfileUpdatePayload } from '@/types/api';
import { showSuccess, showWarning } from '@/utils/toastHelper';


type ProfileForm = {
    groupName: string;
    email: string;
    address: string;
};

const emptyForm: ProfileForm = {
    groupName: '',
    email: '',
    address: '',
};
const UserProfileSetting = () => {
    const handleError = useAPIErrorHandler();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [form, setForm] = useState<ProfileForm>(emptyForm);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        const profileRes = await getUserProfileAPI();

        if (profileRes.status === -1) {
            handleError(profileRes.error);
            setIsLoading(false);
            return;
        }

        setProfile(profileRes.data);
        setForm({
            groupName: profileRes.data.groupName ?? '',
            email: profileRes.data.email ?? '',
            address: profileRes.data.address ?? '',
        });
        setIsLoading(false);
    }, [handleError]);
    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const hasChanges = useMemo(() => {
     if (!profile) return false;
     return (
        form.groupName !== (profile.groupName ?? '') ||
        form.email !== (profile.email ?? '') ||
        form.address !== (profile.address ?? '')
    );
    }, [form, profile]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!profile) return;

        if (!hasChanges) {
            showWarning('資料沒有變更', '個人資料管理', 'top-right');
            return;
        }

        setIsSaving(true);
        const payload: UserProfileUpdatePayload = {
            groupId: null,
            groupName: form.groupName.trim(),
            email: form.email.trim(),
            address: form.address.trim(),
        };

        const res = await updateUserProfileAPI(payload);
        setIsSaving(false);

        if (res.status === -1) {
            handleError(res.error);
            return;
        }

        setProfile(res.data);
        setForm({
         groupName: res.data.groupName ?? '',
         email: res.data.email ?? '',
         address: res.data.address ?? '',
        });
        showSuccess('個人資料已更新', '個人資料管理', 'top-right');
    };

    const readonlyInputClass = 'w-full rounded border border-gray-200 bg-gray-100 px-3 py-2 text-gray-600';
    const inputClass =
        'w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

    if (isLoading) {
        return <div className="flex h-full items-center justify-center text-gray-600">載入個人資料中...</div>;
    }

    return (
        <div className="mx-auto w-full max-w-4xl p-6">
            <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded bg-blue-50 text-blue-600">
                    <UserRound size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">個人資料管理</h1>
                    <p className="text-sm text-gray-500">姓名與電話僅供查看，組別、Email、地址可自行更新。</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded bg-white p-6 shadow">
                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">姓名</label>
                        <input value={profile?.name ?? ''} readOnly className={readonlyInputClass} />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">電話</label>
                        <input value={profile?.phone || '尚未設定'} readOnly className={readonlyInputClass} />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">組別</label>
                        <input
                            value={form.groupName}
                            onChange={(e) => setForm((prev) => ({ ...prev, groupName: e.target.value }))}
                            className={inputClass}
                            placeholder="請輸入組別名稱"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                            className={inputClass}
                            placeholder="name@example.com"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">地址</label>
                        <input
                            value={form.address}
                            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                            className={inputClass}
                            placeholder="請輸入地址"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving || !hasChanges}
                        className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                        <Save size={18} />
                        {isSaving ? '儲存中...' : '儲存變更'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UserProfileSetting;
