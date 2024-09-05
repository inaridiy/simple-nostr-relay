import { BaselimeSDK } from "@baselime/node-opentelemetry";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const sdk = new BaselimeSDK({
  service: process.env.SERVICE_NAME,
  instrumentations: [getNodeAutoInstrumentations({ "@opentelemetry/instrumentation-fs": { enabled: false } })],
});

sdk.start();
