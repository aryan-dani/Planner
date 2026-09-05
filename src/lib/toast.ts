import { toast, type ExternalToast } from "sonner";
import { describeError } from "@/lib/errors";

type Options = ExternalToast & { id?: string | number };

const ERROR_DURATION_MS = 6000;

function isOptions(value: unknown): value is Options {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export const notify = {
  success(message: string, options?: Options) {
    return toast.success(message, options);
  },

  info(message: string, options?: Options) {
    return toast.info(message, options);
  },

  message(message: string, options?: Options) {
    return toast.message(message, options);
  },

  /** Known copy, or unknown error → describeError (never raw SDK messages). */
  error(
    messageOrErr: unknown,
    fallbackOrOptions?: string | Options,
    maybeOptions?: Options,
  ) {
    if (typeof messageOrErr === "string") {
      const options = isOptions(fallbackOrOptions)
        ? fallbackOrOptions
        : maybeOptions;
      return toast.error(messageOrErr, {
        duration: ERROR_DURATION_MS,
        ...options,
      });
    }

    console.error(messageOrErr);
    const fallback =
      typeof fallbackOrOptions === "string" ? fallbackOrOptions : undefined;
    const options = isOptions(fallbackOrOptions)
      ? fallbackOrOptions
      : maybeOptions;
    return toast.error(describeError(messageOrErr, fallback), {
      duration: ERROR_DURATION_MS,
      ...options,
    });
  },

  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error?: string;
      id?: string | number;
    },
  ) {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: (err: unknown) => {
        console.error(err);
        return describeError(err, messages.error);
      },
      id: messages.id,
    });
  },

  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
