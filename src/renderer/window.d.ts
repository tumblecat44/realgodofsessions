import type { HostApi } from "../shared/protocol";

declare global {
  interface Window {
    host: HostApi;
  }
}

export {};
