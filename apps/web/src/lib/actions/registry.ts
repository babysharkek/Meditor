import type {
	TAction,
	TActionFunc,
	TActionWithArgs,
	TActionWithOptionalArgs,
	TActionArgsMap,
	TArgOfAction,
	TInvocationTrigger,
	TBoundActionList,
} from "./types";

const boundActions: TBoundActionList = {};

export function bindAction<A extends TAction>(
	action: A,
	handler: TActionFunc<A>,
) {
	if (boundActions[action]) {
		boundActions[action]?.push(handler);
	} else {
		boundActions[action] = [handler] as any;
	}
}

export function unbindAction<A extends TAction>(
	action: A,
	handler: TActionFunc<A>,
) {
	boundActions[action] = boundActions[action]?.filter(
		(x) => x !== handler,
	) as any;

	if (boundActions[action]?.length === 0) {
		delete boundActions[action];
	}
}

type InvokeActionFunc = {
	(
		action: TActionWithOptionalArgs,
		args?: undefined,
		trigger?: TInvocationTrigger,
	): void;
	<A extends TActionWithArgs>(action: A, args: TActionArgsMap[A]): void;
};

export const invokeAction: InvokeActionFunc = <A extends TAction>(
	action: A,
	args?: TArgOfAction<A>,
	trigger?: TInvocationTrigger,
) => {
	boundActions[action]?.forEach((handler) => (handler as any)(args, trigger));
};
