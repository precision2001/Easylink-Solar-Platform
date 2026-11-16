// Streams ships a global `connect` namespace, not a module. This brings the
// namespace into scope and lets the bundle be imported for its side effect.
/// <reference path="../../node_modules/amazon-connect-streams/src/index.d.ts" />
declare module "amazon-connect-streams/release/connect-streams.js";
