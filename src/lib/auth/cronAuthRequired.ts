import { NextRequest, NextResponse } from "next/server";

interface CronHandler {
  (
    req: NextRequest,
    context: {
      params: Promise<Record<string, unknown>>;
    }
  ): Promise<NextResponse | Response>;
}

const cronAuthRequired = (handler: CronHandler) => {
  return async (
    req: NextRequest,
    context: {
      params: Promise<Record<string, unknown>>;
    }
  ) => {
    // Get credentials from environment variables
    const CRON_USERNAME = process.env.CRON_USERNAME;
    const CRON_PASSWORD = process.env.CRON_PASSWORD;

    // Skip authentication if credentials are not set in environment
    if (!CRON_USERNAME || !CRON_PASSWORD) {
      console.warn("CRON_USERNAME or CRON_PASSWORD not set - skipping authentication");
      return await handler(req, context);
    }

    // Authentication check
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
          error: "Missing or invalid Authorization header",
        },
        { status: 401, headers: { "WWW-Authenticate": "Basic" } }
      );
    }

    try {
      // Decode Basic Auth credentials
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
      const [username, password] = credentials.split(":");

      // Validate credentials
      if (username !== CRON_USERNAME || password !== CRON_PASSWORD) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid credentials",
            error: "Username or password is incorrect",
          },
          { status: 401, headers: { "WWW-Authenticate": "Basic" } }
        );
      }

      // Authentication successful, proceed to handler
      return await handler(req, context);
    } catch (error) {
      console.error("Error during cron authentication:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Authentication error",
          error: "Failed to process authentication",
        },
        { status: 401, headers: { "WWW-Authenticate": "Basic" } }
      );
    }
  };
};

export default cronAuthRequired;
