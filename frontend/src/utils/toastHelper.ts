import { toast, type ToastPosition } from 'react-toastify';

type ShowToastParams = {
    message: string;
    title?: string;
    position?: ToastPosition;
}

/**
 * Displays a success toast notification with the given message.
 * @param {string} [title] - The title of the toast.
 * @param {string} message - The message to display in the toast.
 * @param {string} position - The position of the toast on the screen.
 * @return {void}
 */
export function showSuccess(message: string, title?: string, position?: ToastPosition): void;
export function showSuccess(params: ShowToastParams): void;
export function showSuccess(arg1: string | ShowToastParams, arg2?: string, arg3?: ToastPosition): void {
    let message: string;
    let title: string | undefined;
    let position: ToastPosition = 'top-right';

    if (typeof arg1 === 'string') {
        // use the string overload
        message = arg1;
        title = arg2;
        position = arg3 ?? 'top-right';
    } else {
        // use the object overload
        message = arg1.message;
        title = arg1.title;
        position = arg1.position ?? 'top-right';
    }

    toast.success(message, {
        position,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'light',
        toastId: title || message
    });
}

/**
 * Displays an error toast notification with the given message.
 * @param {string} [title] - The title of the toast.
 * @param {string} message - The message to display in the toast.
 * @param {string} position - The position of the toast on the screen.
 * @return {void}
 */
export function showError(message: string, title?: string, position?: ToastPosition): void;
export function showError(params: ShowToastParams): void;
export function showError(arg1: string | ShowToastParams, arg2?: string, arg3?: ToastPosition): void {
    let message: string;
    let title: string | undefined;
    let position: ToastPosition = 'top-right';
    
    if (typeof arg1 === 'string') {
        // use the string overload
        message = arg1;
        title = arg2;
        position = arg3 ?? 'top-right';
    } else {
        // use the object overload
        message = arg1.message;
        title = arg1.title;
        position = arg1.position ?? 'top-right';
    }
    
    toast.error(message, {
        position,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'light',
        toastId: title || message
    });
}

/**
 * Displays an info toast notification with the given message.
 * @param {string} [title] - The title of the toast.
 * @param {string} message - The message to display in the toast.
 * @param {string} position - The position of the toast on the screen.
 * @return {void}
 */
export function showInfo(message: string, title?: string, position?: ToastPosition): void;
export function showInfo(params: ShowToastParams): void;
export function showInfo(arg1: string | ShowToastParams, arg2?: string, arg3?: ToastPosition): void {
    let message: string;
    let title: string | undefined;
    let position: ToastPosition = 'top-right';
    
    if (typeof arg1 === 'string') {
        // use the string overload
        message = arg1;
        title = arg2;
        position = arg3 ?? 'top-right';
    } else {
        // use the object overload
        message = arg1.message;
        title = arg1.title;
        position = arg1.position ?? 'top-right';
    }

    toast.info(message, {
        position,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'light',
        toastId: title || message
    });
}

/**
 * Displays an info toast notification with the given message.
 * @param {string} [title] - The title of the toast.
 * @param {string} message - The message to display in the toast.
 * @param {string} position - The position of the toast on the screen.
 * @return {void}
 */
export function showWarning(message: string, title?: string, position?: ToastPosition): void;
export function showWarning(params: ShowToastParams): void;
export function showWarning(arg1: string | ShowToastParams, arg2?: string, arg3?: ToastPosition): void {
    let message: string;
    let title: string | undefined;
    let position: ToastPosition = 'top-right';
    
    if (typeof arg1 === 'string') {
        // use the string overload
        message = arg1;
        title = arg2;
        position = arg3 ?? 'top-right';
    } else {
        // use the object overload
        message = arg1.message;
        title = arg1.title;
        position = arg1.position ?? 'top-right';
    }

    toast.warn(message, {
        position,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'light',
        toastId: title || message
    });
}