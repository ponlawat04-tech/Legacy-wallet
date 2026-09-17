export const APP_VERSION = '4.0.0';
export const APP_VERSION_TAG = 'v4.0.0';
export const APP_BUILD_DATE = '2026-09-16';
export const APP_RELEASE_NAME = 'Legacy wallet • Next-Gen Sovereign Matrix & Unified Operating Core';
export const APP_RELEASE_NOTES = [
  {
    version: 'v4.0.0',
    date: '2026-09-16',
    highlights: [
      'Next-Gen Sovereign Matrix Architecture: Comprehensive unification of 4 foundational pillars: (1) ระบบปฏิบัติการ (Sovereign OS Runtime), (2) ระบบการควบคุม (Unified Control Plane), (3) ระบบเชื่อมโยงการทำงาน (Reactive Event Matrix), and (4) ระบบรักษาความปลอดภัย (Zero-Trust Security Shield)',
      'Sovereign OS Runtime & Lifecycle Supervisor: Full hardware crypto supervision (SubtleCrypto, CSPRNG, WebAuthn), execution sandbox boundaries, and constant-time memory zeroization (sodium_memzero equivalent) eliminating memory dump vectors',
      'Unified Control Plane & Orchestrator: Centralized policy enforcement engine managing strict air-gap quarantine boundaries, freeze transfer interlocks, duress protection tripwires, and live heartbeat telemetry dispatch',
      'Reactive Inter-System Linkage Bus: High-speed sub-millisecond event mesh (~95µs) synchronizing decentralized SPV light client headers, SLIP-0044 multi-fork key derivation, offline PSBT signing, and encrypted vault sealing',
      '4-Subsystem Comprehensive Integration Audit: 1-Tap automated end-to-end verification certifying operational readiness, cryptographic known-answer tests (KAT), and SIGHASH_FORKID anti-replay protection with verifiable Audit IDs',
      'Dedicated Next-Gen System Hub: Integrated real-time radar monitor, live subsystem telemetry gauges, and interactive control dispatch accessible from HeaderBar and Security Center',
    ],
  },
  {
    version: 'v3.7.0',
    date: '2026-09-15',
    highlights: [
      '5-Stage Operational Pipeline: Structured sequential workflow ordering from (1) Entropy & Key Ingestion, (2) Deterministic Derivation & SLIP-0044, (3) PBKDF2/AES-GCM Sealing, (4) Offline PSBT & SIGHASH_FORKID, to (5) Consensus Verification & Memory Zeroization',
      '4-Layer Defense-in-Depth Ring: Formally integrated and visualized hardware biometric (WebAuthn/StrongBox), authenticated ciphers (PBKDF2/AES-256-GCM), decentralized SPV network consensus (BIP-37), and physical air-gap quarantine firewall',
      'Unified Security Pipeline Architecture: Added dedicated interactive pipeline visualizer in Security Center with live stage status indicators, granular interlock inspections, and defense layer rings',
      'Bitcoin Core Merkle Root Verification: Fully aligned block #967016 canonical consensus rules (Little-Endian reverse-byte, in-loop odd duplicate, and CVE-2012-2459 anti-mutation validation)',
      'Deterministic Cold Vault Hardening: 100% verified client-side memory hygiene, immediate secret zeroization, and zero background network execution',
    ],
  },
  {
    version: 'v3.6.0',
    date: '2026-09-14',
    highlights: [
      'Zero-Gap Pinned Top Header: Pinned HeaderBar flush to the top edge of the viewport with zero margin, allowing wallet contents to glide seamlessly underneath with rich backdrop-blur',
      'Mobile Security Center Overhaul: Redesigned Security Center hero card and 10 Security Invariants with dedicated row enclosures, preventing Thai typography wrapping glitches and text clipping',
      'Adaptive Mobile Viewport & Ergonomics: Full-width responsive audit action triggers and removed artificial status bar simulations to maximize screen real-estate for wallet controls',
      'Cryptographic & Node Audit Alignment: Streamlined responsive layout for Node Security Audit and Hardware Cryptography Vector verification cards',
    ],
  },
  {
    version: 'v3.5.0',
    date: '2026-09-14',
    highlights: [
      'Web Authentication API (WebAuthn) Biometrics: Integrated Touch ID, Face ID, Windows Hello, and Passkey hardware credentials to replace or augment PIN entry for effortless vault unlocking and transaction signing',
      'Complete AI Decommissioning: Purged all AI endpoints, SDK dependencies, and external LLM interactions to ensure 100% deterministic, self-sovereign cold vault operation without external third-party model reliance',
      'Local Deterministic Cryptographic Audit: Integrated an offline, zero-leakage security audit engine natively validating PBKDF2 (100k rounds), AES-256-GCM memory bounds, BIP-174 PSBT offline signing, and SIGHASH_FORKID replay protection',
      '24h Market High/Low Currency-Aware Engine: Real-time multi-source ticker (Binance & Kraken) with live THB/USD rate conversion and currency formatting',
      'Hardened Minimal Container: Streamlined Express 4 server to pure container health orchestration (/api/health) and static assets, eliminating attack surfaces',
    ],
  },
  {
    version: 'v3.4.0',
    date: '2026-09-09',
    highlights: [
      'Full-Stack Architecture & Cloud Run Readiness: Configured native Express 4 server entrypoint (server.ts) with dual-mode Vite development middleware and standalone compiled CommonJS bundle (dist/server.cjs) for seamless Google Cloud Run container deployment',
      'Container Healthcheck API: Live /api/health probe with real-time heartbeat and UTC timestamp tracking for automated orchestration and zero-downtime health verification',
      'Application Integration Matrix: Unified end-to-end integration across SPV peer quorum, multi-chain replay protection (SIGHASH_FORKID), zero-exposure PBKDF2/AES-256-GCM vault, and offline PWA capability',
    ],
  },
  {
    version: 'v3.3.0',
    date: '2026-09-09',
    highlights: [
      'Bitcoin & Hard Forks Specialization: Cleaned and purged all extraneous non-Bitcoin networks to focus exclusively on Bitcoin (BTC) and its historical hard forks (BCH, BSV, BTG, XEC)',
      'Deterministic Multi-Fork Derivation: Implemented strict SLIP-0044 coin types (BTC 0, BCH 145, BSV 236, BTG 156, XEC 899) with cryptographic SIGHASH_FORKID replay protection',
      'Unified Network Nomenclature: Standardized all UI terminology from generic "Mainnet" to pure "Bitcoin" across telemetry, status bars, and diagnostic modals',
      'Integrated SPV Node Telemetry: Real-time 80-byte header Proof of Work verification, BIP-37 Merkle proof validation, and decentralized peer quorum consensus',
      'Real-Time 5-Asset Market Feeds: Live dynamic pricing and portfolio valuation across all Bitcoin family assets with instant QR generation and address validation',
      'Zero-Exposure Air-Gap Vault: Military-grade PBKDF2 + AES-256-GCM memory isolation with offline camera PSBT QR signing',
    ],
  },
  {
    version: 'v3.2.0',
    date: '2026-09-08',
    highlights: [
      'UX/UI Modernization: Refined tidy layout, eliminated visual clutter and redundant multi-chain banners',
      'Unified Assets & Balances Card ("เหรียญและจำนวนที่ถือครอง"): Directly displays exact balances for Bitcoin and Hard Fork assets (BCH, BSV, BTG, XEC)',
      'Real-Time Portfolio Valuation & Visual Allocation Bar: Dynamic calculation of total holding wealth across all chains',
      '1-Click Asset Operations: Instant Receive QR, Send pre-selection, Address copying, and Legacy Fork Claiming directly from each coin card',
      'Consolidated Telemetry Strip: Merged Live Bitcoin Sync, Ping latency, and BIP-37 SPV Proof of Work status into a sleek, unified top bar',
      'Collapsible Hard Fork Specs Drawer: Keeps technical specs and replay protection rules neatly accessible without overcrowding the primary dashboard',
    ],
  },
  {
    version: 'v3.1.0',
    date: '2026-09-08',
    highlights: [
      'Decentralized Bitcoin SPV (Simplified Payment Verification) Engine based on bitcoinj',
      '80-Byte BlockHeader Chain Store: Validates double-SHA256 PoW, target difficulty & cumulative chainwork',
      'Cryptographic Merkle Branch Proof Verification (BIP-37) for trustless on-chain transaction validation',
      'P2P Peer Group & Quorum Consensus: Decentralized multi-node verification mitigating Sybil & Eclipse attacks',
      'Dedicated SPV Node Status Dashboard: Live block header inspection, peer latency telemetry, and interactive Merkle verifier',
      'Visual [✓ SPV] Cryptographic Confirmation Badges on confirmed transactions across Home and History views',
    ],
  },
  {
    version: 'v3.0.0',
    date: '2026-09-08',
    highlights: [
      'UX/UI Modernization: Consolidated bottom navigation into 5 streamlined primary tabs',
      'Unified Transact Hub: Seamlessly switch between outbound Send and offline Air-Gap PSBT Signing',
      'De-cluttered HeaderBar: Dynamic responsive controls with non-overflow security status cluster',
      'Optimized Home Screen: Eliminated redundant banners, elevated high-priority balances and recent activity',
      'BIP-32/84 Master Extended Key Support: Full xprv/zprv hierarchy with live fingerprint inspection',
      'Hardened Zero-Exposure Cryptography: Military-grade AES-256-GCM + PBKDF2 local memory isolation',
      'Multi-Chain & Hard Fork Engine: BTC, BCH, BSV, BTG, XEC automated balance sweep & verification',
    ],
  },
  {
    version: 'v2.4.0',
    date: '2026-08-15',
    highlights: [
      'Multi-format Bitcoin address derivation (Taproot, Native SegWit, Nested, Legacy)',
      'Offline paper wallet QR camera scanner and WIF key recovery',
    ],
  },
];
