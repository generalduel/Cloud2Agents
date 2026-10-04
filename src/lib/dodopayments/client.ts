import DodoPayments from "dodopayments";

let client: DodoPayments | null = null;

export function getDodoClient(): DodoPayments {
  if (!client) {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const baseURL = process.env.DODO_PAYMENTS_API_URL;
    if (!apiKey || !baseURL) {
      throw new Error(
        "DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_API_URL must be configured"
      );
    }
    client = new DodoPayments({ baseURL, bearerToken: apiKey });
  }
  return client;
}

export default getDodoClient;
