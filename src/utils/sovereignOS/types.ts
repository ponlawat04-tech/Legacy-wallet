/**
 * Sovereign OS & Unified Control Matrix Architecture Types
 * Version 4.0.0 Next-Generation Sovereign Infrastructure
 */

export type SystemLifecycleState = 
  | 'INITIALIZING'
  | 'SUPERVISED_IDLE'
  | 'AIR_GAP_QUARANTINE'
  | 'ARMED_ACTIVE'
  | 'ZEROIZED_LOCKDOWN';

export type SubsystemType = 
  | 'OPERATING_SYSTEM'
  | 'CONTROL_PLANE'
  | 'INTER_SYSTEM_LINKAGE'
  | 'SECURITY_MATRIX';

export interface OSRuntimeTelemetry {
  environment: 'Browser PWA' | 'Standalone Sandbox' | 'Node Container' | 'Secure Context';
  hasWebCrypto: boolean;
  hasSubtleCrypto: boolean;
  hasWebAuthn: boolean;
  hasHardwareSecureEnclave: boolean;
  hasSecureZeroization: boolean;
  memoryQuotaEstimatedMB: number;
  uptimeSeconds: number;
  lifecycleState: SystemLifecycleState;
  healthScore: number; // 0 - 100
}

export interface ControlPlaneTelemetry {
  isOrchestratorActive: boolean;
  activeSecurityLevel: 'MAXIMUM_AIRGAP' | 'AUTHENTICATED_ONLINE' | 'PARANOID_ZERO_LEAK';
  policies: {
    strictAirGapEnforced: boolean;
    zeroMemoryLeakPolicy: boolean;
    antiReplayStrict: boolean;
    biometricGateActive: boolean;
    killSwitchArmed: boolean;
  };
  interlocksTriggeredCount: number;
  telemetryHeartbeatMs: number;
  lastOrchestrationCycle: number;
  healthScore: number;
}

export interface SystemEventPayload {
  eventId: string;
  timestamp: number;
  source: 'SPV_ENGINE' | 'KEY_DERIVATION' | 'VAULT_STORE' | 'AIRGAP_SIGNER' | 'CONTROL_BUS' | 'NETWORK_PEER' | 'HARDWARE_AUTH';
  target: 'ALL' | 'VAULT_STORE' | 'SPV_ENGINE' | 'UI_RENDERER' | 'SECURITY_MONITOR';
  eventType: 
    | 'OS_BOOT_COMPLETED'
    | 'SPV_HEADER_COMMITTED'
    | 'KEY_DERIVATION_SEALED'
    | 'AIRGAP_PSBT_VERIFIED'
    | 'SIGHASH_FORKID_ENFORCED'
    | 'MEMORY_BUFFER_ZEROIZED'
    | 'VAULT_AUTHENTICATED'
    | 'INTER_SYSTEM_HEARTBEAT'
    | 'SECURITY_INTERLOCK_TRIPPED';
  detailTh: string;
  detailEn: string;
  latencyMicroseconds: number;
  success: boolean;
}

export interface InterSystemLinkageTelemetry {
  busActive: boolean;
  registeredNodes: string[];
  totalEventsProcessed: number;
  averageDispatchLatencyUs: number;
  recentEvents: SystemEventPayload[];
  healthScore: number;
}

export interface SecurityMatrixTelemetry {
  biometricHardwareActive: boolean;
  cipherSuite: 'AES-256-GCM + PBKDF2 (100k rounds)';
  zeroizationStatus: 'ACTIVE_CLEAN' | 'SCRUB_IN_PROGRESS';
  replayProtection: 'SIGHASH_FORKID (BIP-143 commitment) 100% Active';
  airGapBarrier: 'OPTICAL_ONLY (Zero-socket, Zero-RPC in vault)';
  katSelfTestPassed: boolean;
  lastKatTimestamp: number;
  healthScore: number;
}

export interface UnifiedNextGenTelemetry {
  appVersion: string;
  generation: 'GEN-4 NEXT-GENERATION';
  timestamp: number;
  overallHealthScore: number;
  osRuntime: OSRuntimeTelemetry;
  controlPlane: ControlPlaneTelemetry;
  interSystemLinkage: InterSystemLinkageTelemetry;
  securityMatrix: SecurityMatrixTelemetry;
}

export interface IntegrationAuditStepResult {
  stepId: string;
  subsystem: SubsystemType;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  durationMs: number;
  passed: boolean;
  telemetryMetrics: Record<string, string | number | boolean>;
}

export interface ComprehensiveIntegrationAuditReport {
  auditId: string;
  auditTimestamp: number;
  overallPassed: boolean;
  totalDurationMs: number;
  subsystemScores: {
    operatingSystem: number;
    controlPlane: number;
    interSystemLinkage: number;
    securityMatrix: number;
  };
  steps: IntegrationAuditStepResult[];
  summaryTh: string;
  summaryEn: string;
}
