import type { Config } from "@/types/config";
import typia from "typia";

export const validateConfig = typia.createValidate<Config>();
