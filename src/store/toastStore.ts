/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { create } from 'zustand';
import { MAX_TOASTS, generateToastId } from '@/constants';

export type ToastType = 'info' | 'success' | 'warning' | 'danger';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => set((state) => {
    const id = generateToastId();
    const next = [...state.toasts, { ...toast, id }];
    if (next.length > MAX_TOASTS) {
      next.splice(0, next.length - MAX_TOASTS);
    }
    return { toasts: next };
  }),

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));