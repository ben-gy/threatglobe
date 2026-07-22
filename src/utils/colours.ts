// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { CategoryGroup } from '../types';

export const GROUP_COLOURS: Record<CategoryGroup, string> = {
  brute: '#f59e0b',  // amber (status-live)
  ddos: '#ef4444',   // red
  malware: '#a78bfa',// violet
  scan: '#22d3ee',   // cyan
  web: '#10b981',    // emerald
};

export const GROUP_LABELS: Record<CategoryGroup, string> = {
  brute: 'Brute-Force',
  ddos: 'DDoS',
  malware: 'Malware / C2',
  scan: 'Port Scan',
  web: 'Web Attacks',
};

export const GROUP_DESCRIPTIONS: Record<CategoryGroup, string> = {
  brute: 'Rapid password guessing against SSH, FTP, RDP and similar services, hoping to find a weak credential.',
  ddos: 'Denial of service attacks that try to overwhelm a target with traffic. Public feeds mostly see the symptoms; true volumetric DDoS is underrepresented.',
  malware: 'Command-and-control infrastructure, phishing hosts, malware delivery, spam and fraud.',
  scan: 'Reconnaissance — probing ports, services, banners, credentials — often an early phase before an exploit attempt.',
  web: 'Application-layer attacks: SQL injection, cross-site scripting, path traversal and bad bots.',
};

export const CATEGORY_LABELS: Record<number, string> = {
  1: 'DNS Compromise', 2: 'DNS Poisoning', 3: 'Fraud Orders', 4: 'DDoS Attack',
  5: 'FTP Brute-Force', 6: 'Ping of Death', 7: 'Phishing', 8: 'Fraud VoIP',
  9: 'Open Proxy', 10: 'Web Spam', 11: 'Email Spam', 12: 'Blog Spam',
  14: 'Port Scan', 15: 'Hacking', 16: 'SQL Injection', 17: 'Spoofing',
  18: 'Brute-Force', 19: 'Bad Web Bot', 20: 'Exploited Host', 21: 'Web App Attack',
  22: 'SSH', 23: 'IoT Targeted',
};

export const CATEGORY_TO_GROUP: Record<number, CategoryGroup> = {
  5: 'brute', 18: 'brute', 22: 'brute',
  4: 'ddos', 6: 'ddos',
  1: 'malware', 2: 'malware', 3: 'malware', 7: 'malware', 8: 'malware', 9: 'malware',
  11: 'malware', 12: 'malware', 17: 'malware', 20: 'malware', 23: 'malware',
  14: 'scan', 15: 'scan', 19: 'scan',
  10: 'web', 16: 'web', 21: 'web',
};
