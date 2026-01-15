import { useEffect, useRef, useState, useCallback } from "react";
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
  const [isBound, setIsBound] = useState(false);

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

    if (shouldBind && !isBound) {
      bindAction(action, stableHandler);
      setIsBound(true);
    } else if (!shouldBind && isBound) {
      unbindAction(action, stableHandler);
      setIsBound(false);
    }

    return () => {
      if (isBound) {
        unbindAction(action, stableHandler);
        setIsBound(false);
      }
    };
  }, [action, stableHandler, isActive, isBound]);

  useEffect(() => {
    if (isActive && typeof isActive === "object" && "current" in isActive) {
      const interval = setInterval(() => {
        const shouldBind = isActive.current;
        if (shouldBind !== isBound) {
          if (shouldBind) {
            bindAction(action, stableHandler);
          } else {
            unbindAction(action, stableHandler);
          }
          setIsBound(shouldBind);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [action, stableHandler, isActive, isBound]);
}
