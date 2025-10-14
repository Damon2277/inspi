declare module '@/shared/components/ErrorToast' {
  export interface ErrorToastOptions {
    title?: string;
    description?: string;
  }

  export interface ErrorToastApi {
    showError: (error: unknown, options?: ErrorToastOptions) => void;
    showNetworkError: () => void;
    showValidationError: (message: string) => void;
    dismiss?: () => void;
  }

  export function useErrorToast(): ErrorToastApi;
}
