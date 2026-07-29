import * as __typia_transform__validateReport from "typia/lib/internal/_validateReport.js";
import type { Config } from "@/types/config";
import typia from "typia";
export const validateConfig = (() => { const _io0 = (input: any): boolean => "number" === typeof input.port && (Math.floor(input.port) === input.port && 0 <= input.port && input.port <= 4294967295 && 1 <= input.port && input.port <= 65535) && ("string" === typeof input.databasePath && 1 <= input.databasePath.length) && "boolean" === typeof input.enableNIP26 && ("object" === typeof input.relay && null !== input.relay && _io1(input.relay)) && ("object" === typeof input.limits && null !== input.limits && _io2(input.limits)); const _io1 = (input: any): boolean => "string" === typeof input.name && "string" === typeof input.description && ("string" === typeof input.pubkey && RegExp("^[0-9a-f]{64}$").test(input.pubkey)) && "string" === typeof input.contact; const _io2 = (input: any): boolean => "number" === typeof input.maxMessageBytes && (Math.floor(input.maxMessageBytes) === input.maxMessageBytes && 0 <= input.maxMessageBytes && input.maxMessageBytes <= 4294967295 && 1 <= input.maxMessageBytes) && ("number" === typeof input.maxSubscriptionsPerConnection && (Math.floor(input.maxSubscriptionsPerConnection) === input.maxSubscriptionsPerConnection && 0 <= input.maxSubscriptionsPerConnection && input.maxSubscriptionsPerConnection <= 4294967295 && 1 <= input.maxSubscriptionsPerConnection)) && ("number" === typeof input.maxFiltersPerRequest && (Math.floor(input.maxFiltersPerRequest) === input.maxFiltersPerRequest && 0 <= input.maxFiltersPerRequest && input.maxFiltersPerRequest <= 4294967295 && 1 <= input.maxFiltersPerRequest)) && ("number" === typeof input.maxMessagesPerMinute && (Math.floor(input.maxMessagesPerMinute) === input.maxMessagesPerMinute && 0 <= input.maxMessagesPerMinute && input.maxMessagesPerMinute <= 4294967295 && 1 <= input.maxMessagesPerMinute)) && ("number" === typeof input.maxQueryLimit && (Math.floor(input.maxQueryLimit) === input.maxQueryLimit && 0 <= input.maxQueryLimit && input.maxQueryLimit <= 4294967295 && 1 <= input.maxQueryLimit)); const _vo0 = (input: any, _path: string, _exceptionable: boolean = true): boolean => ["number" === typeof input.port && (Math.floor(input.port) === input.port && 0 <= input.port && input.port <= 4294967295 || _report(_exceptionable, {
        path: _path + ".port",
        expected: "number & Type<\"uint32\">",
        value: input.port
    })) && (1 <= input.port || _report(_exceptionable, {
        path: _path + ".port",
        expected: "number & Minimum<1>",
        value: input.port
    })) && (input.port <= 65535 || _report(_exceptionable, {
        path: _path + ".port",
        expected: "number & Maximum<65535>",
        value: input.port
    })) || _report(_exceptionable, {
        path: _path + ".port",
        expected: "(number & Type<\"uint32\"> & Minimum<1> & Maximum<65535>)",
        value: input.port
    }), "string" === typeof input.databasePath && (1 <= input.databasePath.length || _report(_exceptionable, {
        path: _path + ".databasePath",
        expected: "string & MinLength<1>",
        value: input.databasePath
    })) || _report(_exceptionable, {
        path: _path + ".databasePath",
        expected: "(string & MinLength<1>)",
        value: input.databasePath
    }), "boolean" === typeof input.enableNIP26 || _report(_exceptionable, {
        path: _path + ".enableNIP26",
        expected: "boolean",
        value: input.enableNIP26
    }), ("object" === typeof input.relay && null !== input.relay || _report(_exceptionable, {
        path: _path + ".relay",
        expected: "__type",
        value: input.relay
    })) && _vo1(input.relay, _path + ".relay", true && _exceptionable) || _report(_exceptionable, {
        path: _path + ".relay",
        expected: "__type",
        value: input.relay
    }), ("object" === typeof input.limits && null !== input.limits || _report(_exceptionable, {
        path: _path + ".limits",
        expected: "__type.o1",
        value: input.limits
    })) && _vo2(input.limits, _path + ".limits", true && _exceptionable) || _report(_exceptionable, {
        path: _path + ".limits",
        expected: "__type.o1",
        value: input.limits
    })].every((flag: boolean) => flag); const _vo1 = (input: any, _path: string, _exceptionable: boolean = true): boolean => ["string" === typeof input.name || _report(_exceptionable, {
        path: _path + ".name",
        expected: "string",
        value: input.name
    }), "string" === typeof input.description || _report(_exceptionable, {
        path: _path + ".description",
        expected: "string",
        value: input.description
    }), "string" === typeof input.pubkey && (RegExp("^[0-9a-f]{64}$").test(input.pubkey) || _report(_exceptionable, {
        path: _path + ".pubkey",
        expected: "string & Pattern<\"^[0-9a-f]{64}$\">",
        value: input.pubkey
    })) || _report(_exceptionable, {
        path: _path + ".pubkey",
        expected: "(string & Pattern<\"^[0-9a-f]{64}$\">)",
        value: input.pubkey
    }), "string" === typeof input.contact || _report(_exceptionable, {
        path: _path + ".contact",
        expected: "string",
        value: input.contact
    })].every((flag: boolean) => flag); const _vo2 = (input: any, _path: string, _exceptionable: boolean = true): boolean => ["number" === typeof input.maxMessageBytes && (Math.floor(input.maxMessageBytes) === input.maxMessageBytes && 0 <= input.maxMessageBytes && input.maxMessageBytes <= 4294967295 || _report(_exceptionable, {
        path: _path + ".maxMessageBytes",
        expected: "number & Type<\"uint32\">",
        value: input.maxMessageBytes
    })) && (1 <= input.maxMessageBytes || _report(_exceptionable, {
        path: _path + ".maxMessageBytes",
        expected: "number & Minimum<1>",
        value: input.maxMessageBytes
    })) || _report(_exceptionable, {
        path: _path + ".maxMessageBytes",
        expected: "(number & Type<\"uint32\"> & Minimum<1>)",
        value: input.maxMessageBytes
    }), "number" === typeof input.maxSubscriptionsPerConnection && (Math.floor(input.maxSubscriptionsPerConnection) === input.maxSubscriptionsPerConnection && 0 <= input.maxSubscriptionsPerConnection && input.maxSubscriptionsPerConnection <= 4294967295 || _report(_exceptionable, {
        path: _path + ".maxSubscriptionsPerConnection",
        expected: "number & Type<\"uint32\">",
        value: input.maxSubscriptionsPerConnection
    })) && (1 <= input.maxSubscriptionsPerConnection || _report(_exceptionable, {
        path: _path + ".maxSubscriptionsPerConnection",
        expected: "number & Minimum<1>",
        value: input.maxSubscriptionsPerConnection
    })) || _report(_exceptionable, {
        path: _path + ".maxSubscriptionsPerConnection",
        expected: "(number & Type<\"uint32\"> & Minimum<1>)",
        value: input.maxSubscriptionsPerConnection
    }), "number" === typeof input.maxFiltersPerRequest && (Math.floor(input.maxFiltersPerRequest) === input.maxFiltersPerRequest && 0 <= input.maxFiltersPerRequest && input.maxFiltersPerRequest <= 4294967295 || _report(_exceptionable, {
        path: _path + ".maxFiltersPerRequest",
        expected: "number & Type<\"uint32\">",
        value: input.maxFiltersPerRequest
    })) && (1 <= input.maxFiltersPerRequest || _report(_exceptionable, {
        path: _path + ".maxFiltersPerRequest",
        expected: "number & Minimum<1>",
        value: input.maxFiltersPerRequest
    })) || _report(_exceptionable, {
        path: _path + ".maxFiltersPerRequest",
        expected: "(number & Type<\"uint32\"> & Minimum<1>)",
        value: input.maxFiltersPerRequest
    }), "number" === typeof input.maxMessagesPerMinute && (Math.floor(input.maxMessagesPerMinute) === input.maxMessagesPerMinute && 0 <= input.maxMessagesPerMinute && input.maxMessagesPerMinute <= 4294967295 || _report(_exceptionable, {
        path: _path + ".maxMessagesPerMinute",
        expected: "number & Type<\"uint32\">",
        value: input.maxMessagesPerMinute
    })) && (1 <= input.maxMessagesPerMinute || _report(_exceptionable, {
        path: _path + ".maxMessagesPerMinute",
        expected: "number & Minimum<1>",
        value: input.maxMessagesPerMinute
    })) || _report(_exceptionable, {
        path: _path + ".maxMessagesPerMinute",
        expected: "(number & Type<\"uint32\"> & Minimum<1>)",
        value: input.maxMessagesPerMinute
    }), "number" === typeof input.maxQueryLimit && (Math.floor(input.maxQueryLimit) === input.maxQueryLimit && 0 <= input.maxQueryLimit && input.maxQueryLimit <= 4294967295 || _report(_exceptionable, {
        path: _path + ".maxQueryLimit",
        expected: "number & Type<\"uint32\">",
        value: input.maxQueryLimit
    })) && (1 <= input.maxQueryLimit || _report(_exceptionable, {
        path: _path + ".maxQueryLimit",
        expected: "number & Minimum<1>",
        value: input.maxQueryLimit
    })) || _report(_exceptionable, {
        path: _path + ".maxQueryLimit",
        expected: "(number & Type<\"uint32\"> & Minimum<1>)",
        value: input.maxQueryLimit
    })].every((flag: boolean) => flag); const __is = (input: any): input is Config => "object" === typeof input && null !== input && _io0(input); let errors: any; let _report: any; return (input: any): import("typia").IValidation<Config> => {
    if (false === __is(input)) {
        errors = [];
        _report = (__typia_transform__validateReport._validateReport as any)(errors);
        ((input: any, _path: string, _exceptionable: boolean = true) => ("object" === typeof input && null !== input || _report(true, {
            path: _path + "",
            expected: "Config",
            value: input
        })) && _vo0(input, _path + "", true) || _report(true, {
            path: _path + "",
            expected: "Config",
            value: input
        }))(input, "$input", true);
        const success = 0 === errors.length;
        return success ? {
            success,
            data: input
        } : {
            success,
            errors,
            data: input
        } as any;
    }
    return {
        success: true,
        data: input
    } as any;
}; })();
