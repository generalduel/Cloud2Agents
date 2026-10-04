export type AnalyticsProvider = "posthog";

export interface TrackEventParams {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}

export interface PlanUpdatedProperties extends Record<string, unknown> {
  plan_id: string;
  plan_name: string;
  organization_id?: string;
}

export interface SubscriptionEventProperties extends Record<string, unknown> {
  provider: string;
  subscription_id: string;
  plan_id?: string;
  status?: string;
  organization_id?: string;
}

export interface CreditsPurchasedProperties extends Record<string, unknown> {
  provider: string;
  credit_type: string;
  amount: number;
  organization_id?: string;
  checkout_session_id?: string;
  order_id?: string;
  transaction_id?: string;
  payment_id?: string;
}
