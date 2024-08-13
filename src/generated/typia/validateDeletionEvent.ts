import type { DeletionEvent } from "@/types/nip9";
import typia from "typia";
export const validateDeletionEvent = (input: any): typia.IValidation<DeletionEvent> => {
    const errors = [] as any[];
    const __is = (input: any): input is DeletionEvent => {
        const $ip0 = (input: any) => {
            const array = input;
            const tuplePredicators = [
                [
                    (top: any[]): any => top.length === 3 && "a" === top[0] && ("string" === typeof top[1] && RegExp(/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?:(.*):(.*)/).test(top[1])) && "string" === typeof top[2],
                    (entire: any[]): any => entire.length === 3 && "a" === entire[0] && ("string" === typeof entire[1] && RegExp(/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?:(.*):(.*)/).test(entire[1])) && "string" === typeof entire[2]
                ] as const,
                [
                    (top: any[]): any => top.length === 3 && "e" === top[0] && "string" === typeof top[1] && "string" === typeof top[2],
                    (entire: any[]): any => entire.length === 3 && "e" === entire[0] && "string" === typeof entire[1] && "string" === typeof entire[2]
                ] as const,
                [
                    (top: any[]): any => top.length === 2 && "k" === top[0] && "number" === typeof top[1],
                    (entire: any[]): any => entire.length === 2 && "k" === entire[0] && "number" === typeof entire[1]
                ] as const,
                [
                    (top: any[]): any => top.length === 2 && "a" === top[0] && ("string" === typeof top[1] && RegExp(/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?:(.*):(.*)/).test(top[1])),
                    (entire: any[]): any => entire.length === 2 && "a" === entire[0] && ("string" === typeof entire[1] && RegExp(/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?:(.*):(.*)/).test(entire[1]))
                ] as const,
                [
                    (top: any[]): any => top.length === 2 && "e" === top[0] && "string" === typeof top[1],
                    (entire: any[]): any => entire.length === 2 && "e" === entire[0] && "string" === typeof entire[1]
                ] as const
            ];
            for (const pred of tuplePredicators)
                if (pred[0](array))
                    return pred[1](array);
            return false;
        };
        const $io0 = (input: any): boolean => 5 === input.kind && (Array.isArray(input.tags) && input.tags.every((elem: any) => Array.isArray(elem) && ($ip0(elem) || false))) && (undefined === input.content || "string" === typeof input.content) && "boolean" === typeof input.bubbles && "boolean" === typeof input.cancelBubble && "boolean" === typeof input.cancelable && "boolean" === typeof input.composed && (null === input.currentTarget || "object" === typeof input.currentTarget && null !== input.currentTarget && false === Array.isArray(input.currentTarget) && $io1(input.currentTarget)) && "boolean" === typeof input.defaultPrevented && "number" === typeof input.eventPhase && "boolean" === typeof input.isTrusted && "boolean" === typeof input.returnValue && (null === input.srcElement || "object" === typeof input.srcElement && null !== input.srcElement && false === Array.isArray(input.srcElement) && $io1(input.srcElement)) && (null === input.target || "object" === typeof input.target && null !== input.target && false === Array.isArray(input.target) && $io1(input.target)) && "number" === typeof input.timeStamp && "string" === typeof input.type && 0 === input.NONE && 1 === input.CAPTURING_PHASE && 2 === input.AT_TARGET && 3 === input.BUBBLING_PHASE;
        const $io1 = (input: any): boolean => true;
        return "object" === typeof input && null !== input && $io0(input);
    };
    if (false === __is(input)) {
        const $report = (typia.createValidate as any).report(errors);
        ((input: any, _path: string, _exceptionable: boolean = true): input is DeletionEvent => {
            const $vp0 = (input: any, _path: string, _exceptionable: boolean = true) => {
                const array = input;
                const tuplePredicators = [
                    [
                        (top: any[]): any => top.length === 3 && [
                            "a" === top[0],
                            "string" === typeof top[1] && RegExp(/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?:(.*):(.*)/).test(top[1]),
                            "string" === typeof top[2]
                        ].every((flag: boolean) => flag),
                        (entire: any[]): any => (entire.length === 3 || $report(_exceptionable, {
                            path: _path,
                            expected: "[\"a\", `${number}:${string}:${string}`, string]",
                            value: entire
                        })) && [
                            "a" === entire[0] || $report(_exceptionable, {
                                path: _path + "[0]",
                                expected: "\"a\"",
                                value: entire[0]
                            }),
                            "string" === typeof entire[1] && RegExp(/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?:(.*):(.*)/).test(entire[1]) || $report(_exceptionable, {
                                path: _path + "[1]",
                                expected: "`${number}:${string}:${string}`",
                                value: entire[1]
                            }),
                            "string" === typeof entire[2] || $report(_exceptionable, {
                                path: _path + "[2]",
                                expected: "string",
                                value: entire[2]
                            })
                        ].every((flag: boolean) => flag)
                    ] as const,
                    [
                        (top: any[]): any => top.length === 3 && [
                            "e" === top[0],
                            "string" === typeof top[1],
                            "string" === typeof top[2]
                        ].every((flag: boolean) => flag),
                        (entire: any[]): any => (entire.length === 3 || $report(_exceptionable, {
                            path: _path,
                            expected: "[\"e\", string, string]",
                            value: entire
                        })) && [
                            "e" === entire[0] || $report(_exceptionable, {
                                path: _path + "[0]",
                                expected: "\"e\"",
                                value: entire[0]
                            }),
                            "string" === typeof entire[1] || $report(_exceptionable, {
                                path: _path + "[1]",
                                expected: "string",
                                value: entire[1]
                            }),
                            "string" === typeof entire[2] || $report(_exceptionable, {
                                path: _path + "[2]",
                                expected: "string",
                                value: entire[2]
                            })
                        ].every((flag: boolean) => flag)
                    ] as const,
                    [
                        (top: any[]): any => top.length === 2 && [
                            "k" === top[0],
                            "number" === typeof top[1]
                        ].every((flag: boolean) => flag),
                        (entire: any[]): any => (entire.length === 2 || $report(_exceptionable, {
                            path: _path,
                            expected: "[\"k\", number]",
                            value: entire
                        })) && [
                            "k" === entire[0] || $report(_exceptionable, {
                                path: _path + "[0]",
                                expected: "\"k\"",
                                value: entire[0]
                            }),
                            "number" === typeof entire[1] || $report(_exceptionable, {
                                path: _path + "[1]",
                                expected: "number",
                                value: entire[1]
                            })
                        ].every((flag: boolean) => flag)
                    ] as const,
                    [
                        (top: any[]): any => top.length === 2 && [
                            "a" === top[0],
                            "string" === typeof top[1] && RegExp(/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?:(.*):(.*)/).test(top[1])
                        ].every((flag: boolean) => flag),
                        (entire: any[]): any => (entire.length === 2 || $report(_exceptionable, {
                            path: _path,
                            expected: "[\"a\", `${number}:${string}:${string}`]",
                            value: entire
                        })) && [
                            "a" === entire[0] || $report(_exceptionable, {
                                path: _path + "[0]",
                                expected: "\"a\"",
                                value: entire[0]
                            }),
                            "string" === typeof entire[1] && RegExp(/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?:(.*):(.*)/).test(entire[1]) || $report(_exceptionable, {
                                path: _path + "[1]",
                                expected: "`${number}:${string}:${string}`",
                                value: entire[1]
                            })
                        ].every((flag: boolean) => flag)
                    ] as const,
                    [
                        (top: any[]): any => top.length === 2 && [
                            "e" === top[0],
                            "string" === typeof top[1]
                        ].every((flag: boolean) => flag),
                        (entire: any[]): any => (entire.length === 2 || $report(_exceptionable, {
                            path: _path,
                            expected: "[\"e\", string]",
                            value: entire
                        })) && [
                            "e" === entire[0] || $report(_exceptionable, {
                                path: _path + "[0]",
                                expected: "\"e\"",
                                value: entire[0]
                            }),
                            "string" === typeof entire[1] || $report(_exceptionable, {
                                path: _path + "[1]",
                                expected: "string",
                                value: entire[1]
                            })
                        ].every((flag: boolean) => flag)
                    ] as const
                ];
                for (const pred of tuplePredicators)
                    if (pred[0](array))
                        return pred[1](array);
                return $report(_exceptionable, {
                    path: _path,
                    expected: "([\"a\", `${number}:${string}:${string}`, recommendedRelayUrl: string] | [\"e\", eventId: string, recommendedRelayUrl: string] | [\"k\", value: number] | [\"a\", `${number}:${string}:${string}`] | [\"e\", eventId: string])",
                    value: input
                });
            };
            const $vo0 = (input: any, _path: string, _exceptionable: boolean = true): boolean => [5 === input.kind || $report(_exceptionable, {
                    path: _path + ".kind",
                    expected: "5",
                    value: input.kind
                }), (Array.isArray(input.tags) || $report(_exceptionable, {
                    path: _path + ".tags",
                    expected: "Array<WithRecommendedRelayUrl<[\"e\", eventId: string]> | WithRecommendedRelayUrl<[\"a\", `${number}:${string}:${string}`]> | [\"k\", value: number]>",
                    value: input.tags
                })) && input.tags.map((elem: any, _index1: number) => (Array.isArray(elem) || $report(_exceptionable, {
                    path: _path + ".tags[" + _index1 + "]",
                    expected: "([\"a\", `${number}:${string}:${string}`, recommendedRelayUrl: string] | [\"a\", `${number}:${string}:${string}`] | [\"e\", eventId: string, recommendedRelayUrl: string] | [\"e\", eventId: string] | [\"k\", value: number])",
                    value: elem
                })) && ($vp0(elem, _path + ".tags[" + _index1 + "]", true && _exceptionable) || $report(_exceptionable, {
                    path: _path + ".tags[" + _index1 + "]",
                    expected: "[\"a\", `${number}:${string}:${string}`, recommendedRelayUrl: string] | [\"e\", eventId: string, recommendedRelayUrl: string] | [\"k\", value: number] | [\"a\", `${number}:${string}:${string}`] | [\"e\", eventId: string]",
                    value: elem
                })) || $report(_exceptionable, {
                    path: _path + ".tags[" + _index1 + "]",
                    expected: "([\"a\", `${number}:${string}:${string}`, recommendedRelayUrl: string] | [\"a\", `${number}:${string}:${string}`] | [\"e\", eventId: string, recommendedRelayUrl: string] | [\"e\", eventId: string] | [\"k\", value: number])",
                    value: elem
                })).every((flag: boolean) => flag) || $report(_exceptionable, {
                    path: _path + ".tags",
                    expected: "Array<WithRecommendedRelayUrl<[\"e\", eventId: string]> | WithRecommendedRelayUrl<[\"a\", `${number}:${string}:${string}`]> | [\"k\", value: number]>",
                    value: input.tags
                }), undefined === input.content || "string" === typeof input.content || $report(_exceptionable, {
                    path: _path + ".content",
                    expected: "(string | undefined)",
                    value: input.content
                }), "boolean" === typeof input.bubbles || $report(_exceptionable, {
                    path: _path + ".bubbles",
                    expected: "boolean",
                    value: input.bubbles
                }), "boolean" === typeof input.cancelBubble || $report(_exceptionable, {
                    path: _path + ".cancelBubble",
                    expected: "boolean",
                    value: input.cancelBubble
                }), "boolean" === typeof input.cancelable || $report(_exceptionable, {
                    path: _path + ".cancelable",
                    expected: "boolean",
                    value: input.cancelable
                }), "boolean" === typeof input.composed || $report(_exceptionable, {
                    path: _path + ".composed",
                    expected: "boolean",
                    value: input.composed
                }), null === input.currentTarget || ("object" === typeof input.currentTarget && null !== input.currentTarget && false === Array.isArray(input.currentTarget) || $report(_exceptionable, {
                    path: _path + ".currentTarget",
                    expected: "(EventTarget | null)",
                    value: input.currentTarget
                })) && $vo1(input.currentTarget, _path + ".currentTarget", true && _exceptionable) || $report(_exceptionable, {
                    path: _path + ".currentTarget",
                    expected: "(EventTarget | null)",
                    value: input.currentTarget
                }), "boolean" === typeof input.defaultPrevented || $report(_exceptionable, {
                    path: _path + ".defaultPrevented",
                    expected: "boolean",
                    value: input.defaultPrevented
                }), "number" === typeof input.eventPhase || $report(_exceptionable, {
                    path: _path + ".eventPhase",
                    expected: "number",
                    value: input.eventPhase
                }), "boolean" === typeof input.isTrusted || $report(_exceptionable, {
                    path: _path + ".isTrusted",
                    expected: "boolean",
                    value: input.isTrusted
                }), "boolean" === typeof input.returnValue || $report(_exceptionable, {
                    path: _path + ".returnValue",
                    expected: "boolean",
                    value: input.returnValue
                }), null === input.srcElement || ("object" === typeof input.srcElement && null !== input.srcElement && false === Array.isArray(input.srcElement) || $report(_exceptionable, {
                    path: _path + ".srcElement",
                    expected: "(EventTarget | null)",
                    value: input.srcElement
                })) && $vo1(input.srcElement, _path + ".srcElement", true && _exceptionable) || $report(_exceptionable, {
                    path: _path + ".srcElement",
                    expected: "(EventTarget | null)",
                    value: input.srcElement
                }), null === input.target || ("object" === typeof input.target && null !== input.target && false === Array.isArray(input.target) || $report(_exceptionable, {
                    path: _path + ".target",
                    expected: "(EventTarget | null)",
                    value: input.target
                })) && $vo1(input.target, _path + ".target", true && _exceptionable) || $report(_exceptionable, {
                    path: _path + ".target",
                    expected: "(EventTarget | null)",
                    value: input.target
                }), "number" === typeof input.timeStamp || $report(_exceptionable, {
                    path: _path + ".timeStamp",
                    expected: "number",
                    value: input.timeStamp
                }), "string" === typeof input.type || $report(_exceptionable, {
                    path: _path + ".type",
                    expected: "string",
                    value: input.type
                }), 0 === input.NONE || $report(_exceptionable, {
                    path: _path + ".NONE",
                    expected: "0",
                    value: input.NONE
                }), 1 === input.CAPTURING_PHASE || $report(_exceptionable, {
                    path: _path + ".CAPTURING_PHASE",
                    expected: "1",
                    value: input.CAPTURING_PHASE
                }), 2 === input.AT_TARGET || $report(_exceptionable, {
                    path: _path + ".AT_TARGET",
                    expected: "2",
                    value: input.AT_TARGET
                }), 3 === input.BUBBLING_PHASE || $report(_exceptionable, {
                    path: _path + ".BUBBLING_PHASE",
                    expected: "3",
                    value: input.BUBBLING_PHASE
                })].every((flag: boolean) => flag);
            const $vo1 = (input: any, _path: string, _exceptionable: boolean = true): boolean => true;
            return ("object" === typeof input && null !== input || $report(true, {
                path: _path + "",
                expected: "DeletionEvent",
                value: input
            })) && $vo0(input, _path + "", true) || $report(true, {
                path: _path + "",
                expected: "DeletionEvent",
                value: input
            });
        })(input, "$input", true);
    }
    const success = 0 === errors.length;
    return {
        success,
        errors,
        data: success ? input : undefined
    } as any;
};
