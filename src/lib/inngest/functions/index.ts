import { helloWorld } from "./hello-world";
import { expireCredits } from "./expire-credits";

// TIP: Colocate `eventType(...)` in each function module; use `triggers: [yourEvent]` or `triggers: { cron }`
// TIP: Add your functions here, failing this will result in function not being registered
export const functions = [helloWorld, expireCredits];
