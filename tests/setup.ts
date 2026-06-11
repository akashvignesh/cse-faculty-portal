import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL's automatic cleanup only hooks in with vitest globals enabled; we keep
// globals off, so unmount rendered trees between tests explicitly.
afterEach(() => {
  cleanup();
});
