// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
export type CategoryGroup = 'brute' | 'ddos' | 'malware' | 'scan' | 'web';

export interface Pair {
  src: string;
  tgt: string;
  category: number;
  count: number;
  confidence: number;
  group: CategoryGroup;
}

export interface LatestData {
  hour: string;
  generatedAt: string;
  totalAttacks: number;
  topSource: string | null;
  topTarget: string | null;
  topPort: number | null;
  categoryCounts: Record<string, number>;
  pairs: Pair[];
  inboundByCountry: Record<string, number>;
  outboundByCountry: Record<string, number>;
}

export interface CountryProfile {
  country: string;
  outboundTotal: number;
  inboundTotal: number;
  topOutboundTargets: { country: string; count: number }[];
  topInboundSources: { country: string; count: number }[];
  categoryCountsOut: Record<string, number>;
  categoryCountsIn: Record<string, number>;
  topAsn: { name: string; count: number }[];
  topSourceIps: {
    ip: string;
    count: number;
    confidence: number;
    asnOrg?: string | null;
    greynoise?: {
      classification: string;
      name: string | null;
    } | null;
  }[];
  hourly: Record<string, number>;
}

export interface BilateralData {
  src: string;
  tgt: string;
  total: number;
  categoryCounts: Record<string, number>;
  hourly: Record<string, number>;
  topIps: { ip: string; count: number; confidence: number }[];
}

export interface GlobalSummary {
  generatedAt: string;
  hoursIncluded: number;
  categoryCounts: Record<string, number>;
  topSources: { country: string; count: number }[];
  topTargets: { country: string; count: number }[];
  hourSeries: {
    hour: string;
    total: number;
    byCategory: Record<string, number>;
  }[];
}

export interface PortData {
  generatedAt: string;
  ports: {
    port: number;
    rank?: number;
    service: string | null;
    records: number;
    targets: number;
    sources: number;
  }[];
}

export interface SourceStatus {
  ok: boolean;
  at: string;
  count?: number;
  error?: string;
  /** Source needs a secret API key and is switched off in the pipeline. */
  disabled?: boolean;
  reason?: string;
}

export interface PipelineStatus {
  lastRun?: string;
  hour?: string;
  abuseipdb?: SourceStatus;
  dshield_topips?: SourceStatus;
  dshield_topports?: SourceStatus;
  dshield_ssh?: SourceStatus;
  otx?: SourceStatus;
  greynoise?: SourceStatus & { enriched?: number; failed?: number };
  blocklist_de?: SourceStatus;
  feodo?: SourceStatus;
  ipsum?: SourceStatus;
}

export interface OtxPulses {
  generatedAt: string;
  pulses: {
    id: string;
    name: string;
    description: string;
    created: string;
    modified: string;
    tags: string[];
    adversary?: string | null;
    malware_families: string[];
    targeted_countries: string[];
    industries: string[];
    indicator_count: number;
    references: string[];
  }[];
}

export interface SshCredentials {
  generatedAt: string;
  usernames: Array<{ username?: string; count?: number } | any>;
}
