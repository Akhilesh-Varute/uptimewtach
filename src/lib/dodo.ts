import DodoPayments from "dodopayments";

export const dodo = () =>
  new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
  });

export const PRODUCT_BY_PLAN: Record<string, string | undefined> = {
  starter: process.env.DODO_STARTER_PRODUCT_ID,
  pro: process.env.DODO_PRO_PRODUCT_ID,
  business: process.env.DODO_BUSINESS_PRODUCT_ID,
};

export const planForProduct = (productId: string): string | undefined =>
  Object.entries(PRODUCT_BY_PLAN).find(([, id]) => id === productId)?.[0];
