// tests/global-setup.ts
import { resetE2EData } from "./db/reset-e2e";

export default async function globalSetup() {
  await resetE2EData();
}
