import type { Config } from "@/types/config";
import typia from "typia";
export const validateConfig = (input: any): typia.IValidation<Config> => {
    const errors = [] as any[];
    const __is = (input: any): input is Config => {
        return "object" === typeof input && null !== input && ("number" === typeof (input as any).port && (Math.floor((input as any).port) === (input as any).port && 0 <= (input as any).port && (input as any).port <= 4294967295 && 1 <= (input as any).port && (input as any).port <= 65535) && ("string" === typeof (input as any).databasePath && 1 <= (input as any).databasePath.length) && "boolean" === typeof (input as any).enableNIP26 && ("object" === typeof (input as any).relay && null !== (input as any).relay && ("string" === typeof ((input as any).relay as any).name && "string" === typeof ((input as any).relay as any).description && ("string" === typeof ((input as any).relay as any).pubkey && RegExp(/^[0-9a-f]{64}$/).test(((input as any).relay as any).pubkey)) && "string" === typeof ((input as any).relay as any).contact)) && ("object" === typeof (input as any).limits && null !== (input as any).limits && ("number" === typeof ((input as any).limits as any).maxMessageBytes && (Math.floor(((input as any).limits as any).maxMessageBytes) === ((input as any).limits as any).maxMessageBytes && 0 <= ((input as any).limits as any).maxMessageBytes && ((input as any).limits as any).maxMessageBytes <= 4294967295 && 1 <= ((input as any).limits as any).maxMessageBytes) && ("number" === typeof ((input as any).limits as any).maxSubscriptionsPerConnection && (Math.floor(((input as any).limits as any).maxSubscriptionsPerConnection) === ((input as any).limits as any).maxSubscriptionsPerConnection && 0 <= ((input as any).limits as any).maxSubscriptionsPerConnection && ((input as any).limits as any).maxSubscriptionsPerConnection <= 4294967295 && 1 <= ((input as any).limits as any).maxSubscriptionsPerConnection)) && ("number" === typeof ((input as any).limits as any).maxFiltersPerRequest && (Math.floor(((input as any).limits as any).maxFiltersPerRequest) === ((input as any).limits as any).maxFiltersPerRequest && 0 <= ((input as any).limits as any).maxFiltersPerRequest && ((input as any).limits as any).maxFiltersPerRequest <= 4294967295 && 1 <= ((input as any).limits as any).maxFiltersPerRequest)) && ("number" === typeof ((input as any).limits as any).maxMessagesPerMinute && (Math.floor(((input as any).limits as any).maxMessagesPerMinute) === ((input as any).limits as any).maxMessagesPerMinute && 0 <= ((input as any).limits as any).maxMessagesPerMinute && ((input as any).limits as any).maxMessagesPerMinute <= 4294967295 && 1 <= ((input as any).limits as any).maxMessagesPerMinute)) && ("number" === typeof ((input as any).limits as any).maxQueryLimit && (Math.floor(((input as any).limits as any).maxQueryLimit) === ((input as any).limits as any).maxQueryLimit && 0 <= ((input as any).limits as any).maxQueryLimit && ((input as any).limits as any).maxQueryLimit <= 4294967295 && 1 <= ((input as any).limits as any).maxQueryLimit)))));
    };
    if (false === __is(input)) {
        const $report = (typia.createValidate as any).report(errors);
        ((input: any, _path: string, _exceptionable: boolean = true): input is Config => {
            const $vo0 = (input: any, _path: string, _exceptionable: boolean = true): boolean => ["number" === typeof input.port && (Math.floor(input.port) === input.port && 0 <= input.port && input.port <= 4294967295 || $report(_exceptionable, {
                    path: _path + ".port",
                    expected: "number & Type<\"uint32\">",
                    value: input.port
                })) && (1 <= input.port || $report(_exceptionable, {
                    path: _path + ".port",
                    expected: "number & Minimum<1>",
                    value: input.port
                })) && (input.port <= 65535 || $report(_exceptionable, {
                    path: _path + ".port",
                    expected: "number & Maximum<65535>",
                    value: input.port
                })) || $report(_exceptionable, {
                    path: _path + ".port",
                    expected: "(number & Type<\"uint32\"> & Minimum<1> & Maximum<65535>)",
                    value: input.port
                }), "string" === typeof input.databasePath && (1 <= input.databasePath.length || $report(_exceptionable, {
                    path: _path + ".databasePath",
                    expected: "string & MinLength<1>",
                    value: input.databasePath
                })) || $report(_exceptionable, {
                    path: _path + ".databasePath",
                    expected: "(string & MinLength<1>)",
                    value: input.databasePath
                }), "boolean" === typeof input.enableNIP26 || $report(_exceptionable, {
                    path: _path + ".enableNIP26",
                    expected: "boolean",
                    value: input.enableNIP26
                }), ("object" === typeof input.relay && null !== input.relay || $report(_exceptionable, {
                    path: _path + ".relay",
                    expected: "__type",
                    value: input.relay
                })) && $vo1(input.relay, _path + ".relay", true && _exceptionable) || $report(_exceptionable, {
                    path: _path + ".relay",
                    expected: "__type",
                    value: input.relay
                }), ("object" === typeof input.limits && null !== input.limits || $report(_exceptionable, {
                    path: _path + ".limits",
                    expected: "__type.o1",
                    value: input.limits
                })) && $vo2(input.limits, _path + ".limits", true && _exceptionable) || $report(_exceptionable, {
                    path: _path + ".limits",
                    expected: "__type.o1",
                    value: input.limits
                })].every((flag: boolean) => flag);
            const $vo1 = (input: any, _path: string, _exceptionable: boolean = true): boolean => ["string" === typeof input.name || $report(_exceptionable, {
                    path: _path + ".name",
                    expected: "string",
                    value: input.name
                }), "string" === typeof input.description || $report(_exceptionable, {
                    path: _path + ".description",
                    expected: "string",
                    value: input.description
                }), "string" === typeof input.pubkey && (RegExp(/^[0-9a-f]{64}$/).test(input.pubkey) || $report(_exceptionable, {
                    path: _path + ".pubkey",
                    expected: "string & Pattern<\"^[0-9a-f]{64}$\">",
                    value: input.pubkey
                })) || $report(_exceptionable, {
                    path: _path + ".pubkey",
                    expected: "(string & Pattern<\"^[0-9a-f]{64}$\">)",
                    value: input.pubkey
                }), "string" === typeof input.contact || $report(_exceptionable, {
                    path: _path + ".contact",
                    expected: "string",
                    value: input.contact
                })].every((flag: boolean) => flag);
            const $vo2 = (input: any, _path: string, _exceptionable: boolean = true): boolean => ["number" === typeof input.maxMessageBytes && (Math.floor(input.maxMessageBytes) === input.maxMessageBytes && 0 <= input.maxMessageBytes && input.maxMessageBytes <= 4294967295 || $report(_exceptionable, {
                    path: _path + ".maxMessageBytes",
                    expected: "number & Type<\"uint32\">",
                    value: input.maxMessageBytes
                })) && (1 <= input.maxMessageBytes || $report(_exceptionable, {
                    path: _path + ".maxMessageBytes",
                    expected: "number & Minimum<1>",
                    value: input.maxMessageBytes
                })) || $report(_exceptionable, {
                    path: _path + ".maxMessageBytes",
                    expected: "(number & Type<\"uint32\"> & Minimum<1>)",
                    value: input.maxMessageBytes
                }), "number" === typeof input.maxSubscriptionsPerConnection && (Math.floor(input.maxSubscriptionsPerConnection) === input.maxSubscriptionsPerConnection && 0 <= input.maxSubscriptionsPerConnection && input.maxSubscriptionsPerConnection <= 4294967295 || $report(_exceptionable, {
                    path: _path + ".maxSubscriptionsPerConnection",
                    expected: "number & Type<\"uint32\">",
                    value: input.maxSubscriptionsPerConnection
                })) && (1 <= input.maxSubscriptionsPerConnection || $report(_exceptionable, {
                    path: _path + ".maxSubscriptionsPerConnection",
                    expected: "number & Minimum<1>",
                    value: input.maxSubscriptionsPerConnection
                })) || $report(_exceptionable, {
                    path: _path + ".maxSubscriptionsPerConnection",
                    expected: "(number & Type<\"uint32\"> & Minimum<1>)",
                    value: input.maxSubscriptionsPerConnection
                }), "number" === typeof input.maxFiltersPerRequest && (Math.floor(input.maxFiltersPerRequest) === input.maxFiltersPerRequest && 0 <= input.maxFiltersPerRequest && input.maxFiltersPerRequest <= 4294967295 || $report(_exceptionable, {
                    path: _path + ".maxFiltersPerRequest",
                    expected: "number & Type<\"uint32\">",
                    value: input.maxFiltersPerRequest
                })) && (1 <= input.maxFiltersPerRequest || $report(_exceptionable, {
                    path: _path + ".maxFiltersPerRequest",
                    expected: "number & Minimum<1>",
                    value: input.maxFiltersPerRequest
                })) || $report(_exceptionable, {
                    path: _path + ".maxFiltersPerRequest",
                    expected: "(number & Type<\"uint32\"> & Minimum<1>)",
                    value: input.maxFiltersPerRequest
                }), "number" === typeof input.maxMessagesPerMinute && (Math.floor(input.maxMessagesPerMinute) === input.maxMessagesPerMinute && 0 <= input.maxMessagesPerMinute && input.maxMessagesPerMinute <= 4294967295 || $report(_exceptionable, {
                    path: _path + ".maxMessagesPerMinute",
                    expected: "number & Type<\"uint32\">",
                    value: input.maxMessagesPerMinute
                })) && (1 <= input.maxMessagesPerMinute || $report(_exceptionable, {
                    path: _path + ".maxMessagesPerMinute",
                    expected: "number & Minimum<1>",
                    value: input.maxMessagesPerMinute
                })) || $report(_exceptionable, {
                    path: _path + ".maxMessagesPerMinute",
                    expected: "(number & Type<\"uint32\"> & Minimum<1>)",
                    value: input.maxMessagesPerMinute
                }), "number" === typeof input.maxQueryLimit && (Math.floor(input.maxQueryLimit) === input.maxQueryLimit && 0 <= input.maxQueryLimit && input.maxQueryLimit <= 4294967295 || $report(_exceptionable, {
                    path: _path + ".maxQueryLimit",
                    expected: "number & Type<\"uint32\">",
                    value: input.maxQueryLimit
                })) && (1 <= input.maxQueryLimit || $report(_exceptionable, {
                    path: _path + ".maxQueryLimit",
                    expected: "number & Minimum<1>",
                    value: input.maxQueryLimit
                })) || $report(_exceptionable, {
                    path: _path + ".maxQueryLimit",
                    expected: "(number & Type<\"uint32\"> & Minimum<1>)",
                    value: input.maxQueryLimit
                })].every((flag: boolean) => flag);
            return ("object" === typeof input && null !== input || $report(true, {
                path: _path + "",
                expected: "Config",
                value: input
            })) && $vo0(input, _path + "", true) || $report(true, {
                path: _path + "",
                expected: "Config",
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
