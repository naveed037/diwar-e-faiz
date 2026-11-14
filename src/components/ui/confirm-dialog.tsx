"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";

type ConfirmOptions = {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger";
};

/**
 * Promise-based confirmation using the native <dialog> element (focus trap, Esc to close, inert background).
 * Usage: const { confirm, dialog } = useConfirm();  if (await confirm({...})) doIt();  render {dialog}.
 */
export function useConfirm() {
  const ref = useRef<HTMLDialogElement>(null);
  const resolver = useRef<(value: boolean) => void>(undefined);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    requestAnimationFrame(() => ref.current?.showModal());
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    ref.current?.close();
    resolver.current?.(value);
    resolver.current = undefined;
  };

  const dialog = (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={() => close(false)}
      onClick={(e) => e.target === ref.current && close(false)}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-4xl bg-cream-50 p-0 text-ink-800 shadow-lift backdrop:bg-ink-900/50 backdrop:backdrop-blur-sm open:animate-fade-up"
    >
      {options && (
        <div className="p-6 sm:p-8">
          <h2 id="confirm-title" className="font-display text-2xl font-semibold text-ink-900">
            {options.title}
          </h2>
          <div className="mt-3 text-sm leading-relaxed text-sand-600">{options.body}</div>
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => close(true)}
              className={options.tone === "danger" ? "bg-red-600 shadow-none hover:bg-red-700 focus-visible:outline-red-600" : undefined}
            >
              {options.confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );

  return { confirm, dialog };
}
