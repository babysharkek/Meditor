import { useEffect, useRef, useCallback } from "react";
import {
  TAction,
  TActionFunc,
  TActionHandlerOptions,
  TInvocationTrigger,
  bindAction,
  unbindAction,
} from "@/lib/actions";

export function useActionHandler<A extends TAction>(
  action: A,
  handler: TActionFunc<A>,
  isActive: TActionHandlerOptions,
) {
  const handlerRef = useRef(handler);
  const isBoundRef = useRef(false);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const stableHandler = useCallback(
    (args: any, trigger?: TInvocationTrigger) => {
      (handlerRef.current as any)(args, trigger);
    },
    [],
  ) as TActionFunc<A>;

  useEffect(() => {
    const shouldBind =
      isActive === undefined ||
      (typeof isActive === "boolean" ? isActive : isActive.current);

    if (shouldBind && !isBoundRef.current) {
      bindAction(action, stableHandler);
      isBoundRef.current = true;
    } else if (!shouldBind && isBoundRef.current) {
      unbindAction(action, stableHandler);
      isBoundRef.current = false;
    }

    return () => {
      unbindAction(action, stableHandler);
      isBoundRef.current = false;
    };
  }, [action, stableHandler, isActive]);

  useEffect(() => {
    if (isActive && typeof isActive === "object" && "current" in isActive) {
      const interval = setInterval(() => {
        const shouldBind = isActive.current;
        if (shouldBind !== isBoundRef.current) {
          if (shouldBind) {
            bindAction(action, stableHandler);
          } else {
            unbindAction(action, stableHandler);
          }
          isBoundRef.current = shouldBind;
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [action, stableHandler, isActive]);
}
