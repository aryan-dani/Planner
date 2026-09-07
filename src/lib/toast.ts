import { toast, type ExternalToast } from "sonner";
import { createElement } from "react";
import { describeError } from "@/lib/errors";
import { AppToast, type AppToastKind } from "@/components/ui/AppToast";

type Options = ExternalToast & {
  id?: string | number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

const ERROR_DURATION_MS = 6000;

function isOptions(value: unknown): value is Options {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function show(
  kind: AppToastKind,
  title: string,
  options?: Options,
) {
  const duration =
    options?.duration ?? (kind === "error" ? ERROR_DURATION_MS : 4000);

  return toast.custom(
    (id) =>
      createElement(AppToast, {
        kind,
        title,
        description: options?.description,
        action: options?.action
          ? {
              label: options.action.label,
              onClick: () => {
                options.action?.onClick();
                toast.dismiss(id);
              },
            }
          : undefined,
      }),
    {
      id: options?.id,
      duration,
      className: "!bg-transparent !border-0 !shadow-none !p-0",
      unstyled: true,
    },
  );
}

export const notify = {
  success(message: string, options?: Options) {
    return show("success", message, options);
  },

  info(message: string, options?: Options) {
    return show("info", message, options);
  },

  message(message: string, options?: Options) {
    return show("info", message, options);
  },

  star(fileTitle: string, options?: Options) {
    return show("star", "Starred", {
      description: fileTitle,
      id: options?.id ?? "resource-favorite",
      ...options,
    });
  },

  unstar(
    fileTitle: string,
    options?: Options & { onUndo?: () => void },
  ) {
    const { onUndo, action, ...rest } = options || {};
    return show("unstar", "Removed from Favorites", {
      ...rest,
      description: fileTitle,
      id: rest.id ?? "resource-favorite",
      action: onUndo
        ? {
            label: "Undo",
            onClick: onUndo,
          }
        : action,
    });
  },

  favorite(opts: {
    added: boolean;
    title: string;
    onUndo?: () => void;
    id?: string | number;
  }) {
    if (opts.added) {
      return notify.star(opts.title, { id: opts.id });
    }
    return notify.unstar(opts.title, { id: opts.id, onUndo: opts.onUndo });
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
      return show("error", messageOrErr, {
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
    return show("error", describeError(messageOrErr, fallback), {
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
      successDescription?: string;
    },
  ) {
    const id = messages.id ?? `promise-${Date.now()}`;
    show("loading", messages.loading, { id, duration: Infinity });

    return promise
      .then((data) => {
        const title =
          typeof messages.success === "function"
            ? messages.success(data)
            : messages.success;
        show("success", title, {
          id,
          description: messages.successDescription,
        });
        return data;
      })
      .catch((err: unknown) => {
        console.error(err);
        show("error", describeError(err, messages.error), {
          id,
          duration: ERROR_DURATION_MS,
        });
        throw err;
      });
  },

  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
