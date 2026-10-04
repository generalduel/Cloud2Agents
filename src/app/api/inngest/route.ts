import { inngest } from "@/lib/inngest/client";
import { serve } from "inngest/next";
import { functions } from "@/lib/inngest/functions";

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
