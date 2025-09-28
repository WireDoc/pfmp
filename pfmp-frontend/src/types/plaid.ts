/**
 * Minimal Plaid domain types (transition layer).
 * Keep fields optional; add detail only when actually consumed by UI logic.
 */

// Base loose object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface LoosePlaidObject { [key: string]: any }

export interface PlaidAccountBalance extends LoosePlaidObject {
  available?: number | null;
  current?: number | null;
  iso_currency_code?: string | null;
}

export interface PlaidAccount extends LoosePlaidObject {
  account_id?: string;
  name?: string;
  official_name?: string;
  type?: string;
  subtype?: string;
  balances?: PlaidAccountBalance;
  mask?: string;
}

export interface PlaidTransactionLocation extends LoosePlaidObject {
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
}

export interface PlaidTransaction extends LoosePlaidObject {
  transaction_id?: string;
  account_id?: string;
  amount?: number;
  date?: string;
  name?: string;
  merchant_name?: string;
  category?: string[];
  pending?: boolean;
  payment_channel?: string;
  location?: PlaidTransactionLocation;
}

export interface PlaidLinkTokenResponse extends LoosePlaidObject {
  link_token?: string;
  expiration?: string;
}

export interface PlaidItemStatus extends LoosePlaidObject {
  item_id?: string;
  institution_id?: string;
  webhook?: string;
}
