import {
  MonetizationNotConfiguredError,
  type Entitlement,
  type MonetizationPort,
  type ProductId,
} from '@/src/features/monetization/types';

export class RevenueCatMonetization implements MonetizationPort {
  readonly channel = 'revenuecat' as const;

  async getEntitlements(): Promise<Entitlement[]> {
    throw new MonetizationNotConfiguredError(this.channel);
  }

  async purchase(_productId: ProductId): Promise<void> {
    throw new MonetizationNotConfiguredError(this.channel);
  }

  async restore(): Promise<void> {
    throw new MonetizationNotConfiguredError(this.channel);
  }
}
