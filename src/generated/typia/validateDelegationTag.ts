import * as __typia_transform__validateReport from "typia/lib/internal/_validateReport.js";
import type { DelegationTag } from "@/types/nip26";
import typia from "typia";
export const validateDelegationTag = (() => { const __is = (input: any): input is DelegationTag => Array.isArray(input) && (input.length === 4 && "delegation" === input[0] && "string" === typeof input[1] && "string" === typeof input[2] && "string" === typeof input[3]); let errors: any; let _report: any; return (input: any): import("typia").IValidation<DelegationTag> => {
    if (false === __is(input)) {
        errors = [];
        _report = (__typia_transform__validateReport._validateReport as any)(errors);
        ((input: any, _path: string, _exceptionable: boolean = true) => (Array.isArray(input) || _report(true, {
            path: _path + "",
            expected: "DelegationTag",
            value: input
        })) && ((input.length === 4 || _report(true, {
            path: _path + "",
            expected: "[\"delegation\", string, string, string]",
            value: input
        })) && [
            "delegation" === input[0] || _report(true, {
                path: _path + "[0]",
                expected: "\"delegation\"",
                value: input[0]
            }),
            "string" === typeof input[1] || _report(true, {
                path: _path + "[1]",
                expected: "string",
                value: input[1]
            }),
            "string" === typeof input[2] || _report(true, {
                path: _path + "[2]",
                expected: "string",
                value: input[2]
            }),
            "string" === typeof input[3] || _report(true, {
                path: _path + "[3]",
                expected: "string",
                value: input[3]
            })
        ].every((flag: boolean) => flag)) || _report(true, {
            path: _path + "",
            expected: "DelegationTag",
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
