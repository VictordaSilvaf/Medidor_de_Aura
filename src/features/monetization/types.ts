export type Entitlement = 'premium_scan' | 'premium_insights';

export type PurchaseChannel = 'revenuecat' | 'stripe';

export type ProductId = string;

export interface MonetizationPort {
  readonly channel: PurchaseChannel;
  getEntitlements(): Promise<Entitlement[]>;
  purchase(productId: ProductId): Promise<void>;
  restore(): Promise<void>;
}

export class MonetizationNotConfiguredError extends Error {
  constructor(channel: PurchaseChannel) {
    super(
      `[monetization] ${channel} adapter is not configured yet. Wire the SDK when ready.`,
    );
    this.name = 'MonetizationNotConfiguredError';
  }
}
