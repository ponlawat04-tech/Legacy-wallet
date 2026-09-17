/**
 * Security & Functional Execution Pipeline Architecture
 * 
 * Maps the 5-Stage Operational Pipeline and 4-Layer Security Ring Architecture
 * for sovereign cold storage operations, cryptographic isolation, and key hygiene.
 */

export interface PipelineStage {
  stageNumber: number;
  id: string;
  nameTh: string;
  nameEn: string;
  descriptionTh: string;
  descriptionEn: string;
  securityInterlocks: string[];
  status: 'ACTIVE' | 'ENFORCED' | 'HARDENED';
  iconType: 'key' | 'shield' | 'terminal' | 'wifi' | 'check';
}

export interface SecurityLayerLink {
  layerNumber: number;
  id: string;
  titleTh: string;
  titleEn: string;
  technology: string;
  isolationLevel: string;
  descriptionTh: string;
  descriptionEn: string;
  verifiedInvariants: string[];
}

export const SOVEREIGN_EXECUTION_PIPELINE: PipelineStage[] = [
  {
    stageNumber: 1,
    id: 'stage-ingest-entropy',
    nameTh: '1. การสร้างและนำเข้าเอนโทรปี (Key & Entropy Ingestion)',
    nameEn: '1. Key & Entropy Ingestion',
    descriptionTh: 'นำเข้า BIP-39 Mnemonic (12/24 คำ), WIF Private Key, หรือสร้างจาก CSPRNG (Web Crypto API) ภายในเครื่องโดยสมบูรณ์',
    descriptionEn: 'Local BIP-39 mnemonic (12/24 words), WIF key, or CSPRNG entropy generation in pure client-side environment.',
    securityInterlocks: [
      'Zero-Exposure: กุญแจถูกประมวลผลในหน่วยความจำชั่วคราวเท่านั้น',
      'Optional BIP-39 Passphrase (คำที่ 25) สร้าง 512-bit Seed แยกอิสระ',
      'Anti-Clipboard / Obfuscated Display ป้องกันมัลแวร์จับภาพหน้าจอ',
    ],
    status: 'HARDENED',
    iconType: 'key',
  },
  {
    stageNumber: 2,
    id: 'stage-derivation-isolation',
    nameTh: '2. การแยกสายอนุพันธ์คีย์ (Deterministic Derivation & SLIP-0044)',
    nameEn: '2. Deterministic Derivation & Isolation',
    descriptionTh: 'แยกบัญชีและที่อยู่ตามมาตรฐาน BIP-44/84 พร้อมการแยก Coin Type ตาม SLIP-0044 (BTC: 0, BCH: 145, BSV: 236, BTG: 156, XEC: 899)',
    descriptionEn: 'Deterministic derivation following BIP-44/84 with coin type isolation (BTC 0, BCH 145, BSV 236, BTG 156, XEC 899).',
    securityInterlocks: [
      'Multi-Chain Key Isolation: คีย์ของแต่ละสายฮาร์ดฟอร์กแยกจากกัน',
      'Public Key & Address Derivation ทำในเครื่อง ไม่ส่ง xprv ออกภายนอก',
      'Address Validation ตาม Bech32 / Base58Check checksum',
    ],
    status: 'HARDENED',
    iconType: 'terminal',
  },
  {
    stageNumber: 3,
    id: 'stage-vault-encryption',
    nameTh: '3. การเข้ารหัสและผนึกห้องนิรภัย (PBKDF2 & AES-256-GCM Seal)',
    nameEn: '3. Vault Sealing & Dual-Tier Protection',
    descriptionTh: 'ผนึกคีย์ด้วย PBKDF2 (HMAC-SHA256, 100,000 รอบ) ผสมเกลือ Salt เฉพาะอุปกรณ์ และเข้ารหัสด้วย AES-GCM 256-bit พร้อม Authenticated Tag',
    descriptionEn: 'Vault sealing using PBKDF2 (100,000 rounds HMAC-SHA256) with unique salt and AES-GCM 256-bit authenticated cipher.',
    securityInterlocks: [
      'Encrypted at Rest: ไม่มีคีย์ดิบหลุดไปอยู่ใน LocalStorage หรือ Disk',
      'Duress Decoy PIN: รหัสจำลองฉุกเฉินแยกพื้นที่ความปลอดภัย',
      'WebAuthn Biometric Guard (Touch ID / Face ID / Passkey Hardware Key)',
    ],
    status: 'ENFORCED',
    iconType: 'shield',
  },
  {
    stageNumber: 4,
    id: 'stage-offline-psbt-signing',
    nameTh: '4. การสร้างและลงนามธุรกรรมออฟไลน์ (Air-Gap PSBT & SIGHASH_FORKID)',
    nameEn: '4. Air-Gap PSBT Signing & Replay Defense',
    descriptionTh: 'สร้างและลงนามธุรกรรมแบบแยกสัญญาณสมบูรณ์ (Air-Gap) ผ่าน Animated QR Code หรือ PSBT โดยไม่ต้องต่อเน็ต พร้อมกำกับ SIGHASH_FORKID ป้องกัน Replay Attack',
    descriptionEn: 'Offline signing via Animated QR PSBT (BIP-174) with SIGHASH_FORKID replay protection across all fork transactions.',
    securityInterlocks: [
      'Air-Gap Quarantine: ออฟไลน์ 100% ระหว่างการเซ็นธุรกรรม',
      'SIGHASH_FORKID: ป้องกันธุรกรรมถูกขโมยไปบรอดแคสต์บนสายอื่น',
      'Vault Outbound Freeze Lock: ล็อกการโอนออกด้วยรหัสผ่าน PIN',
    ],
    status: 'ACTIVE',
    iconType: 'wifi',
  },
  {
    stageNumber: 5,
    id: 'stage-verification-zeroize',
    nameTh: '5. การตรวจสอบฉันทามติและการล้างหน่วยความจำ (Consensus & Zeroization)',
    nameEn: '5. Consensus Verification & Memory Zeroization',
    descriptionTh: 'ตรวจสอบธุรกรรมผ่าน 80-byte SPV Header Chain และ BIP-37 Merkle Proofs ควบคู่กับการเคลียร์ RAM (Memory Zeroization) ทันทีที่ทำงานเสร็จ',
    descriptionEn: 'Decentralized SPV header proof verification alongside immediate cryptographic memory zeroization in RAM.',
    securityInterlocks: [
      'Merkle Proof Verification: ตรวจสอบความถูกต้องตามฉันทามติ Bitcoin Core',
      'Memory Zeroization: เขียนทับและล้างตัวแปรคีย์ลับในหน่วยความจำทันที',
      'Zero Background Execution: หยุดการทำงานทันทีเมื่อปิดหน้าจอหรือล็อคแอป',
    ],
    status: 'HARDENED',
    iconType: 'check',
  },
];

export const SECURITY_LAYER_LINKS: SecurityLayerLink[] = [
  {
    layerNumber: 1,
    id: 'sec-layer-hardware',
    titleTh: 'ชั้นฮาร์ดแวร์และการยืนยันตัวตน (Hardware & Biometrics)',
    titleEn: 'Layer 1: Hardware Security & WebAuthn Biometrics',
    technology: 'FIDO2 / WebAuthn + Secure Enclave / Android StrongBox',
    isolationLevel: 'Hardware Enclave Isolation',
    descriptionTh: 'เชื่อมโยง Touch ID, Face ID, Windows Hello หรือชิป HSM โดยตรง กุญแจยืนยันตัวตนจะไม่สามารถถูกสกัดออกจากฮาร์ดแวร์ได้',
    descriptionEn: 'Hardware-backed biometric passkeys leveraging Apple Secure Enclave, Android StrongBox HSM, or Windows Hello TPM.',
    verifiedInvariants: [
      'WebAuthn Passkey Direct Integration',
      'AndroidKeyStore StrongBox HSM Parameter Ready',
      'Dual-Tier PIN Guard (Main PIN + Emergency Duress Decoy PIN)',
    ],
  },
  {
    layerNumber: 2,
    id: 'sec-layer-cryptography',
    titleTh: 'ชั้นการเข้ารหัสทางคณิตศาสตร์ (Authenticated Cryptography)',
    titleEn: 'Layer 2: Authenticated Cryptographic Ciphers',
    technology: 'PBKDF2 (100,000 rounds) + AES-256-GCM + secp256k1',
    isolationLevel: 'NIST & Bitcoin Core Standard',
    descriptionTh: 'คำนวณและเข้ารหัสข้อมูลด้วย Key Derivation มาตรฐานสากล มี Authentication Tag 128-bit ป้องกันการแก้ไขเปลี่ยนแปลงข้อมูลทุกบิต',
    descriptionEn: 'Authenticated cipher security using PBKDF2 with 100,000 HMAC-SHA256 iterations and 256-bit AES-GCM encryption with auth tags.',
    verifiedInvariants: [
      '100% Roundtrip Authenticated Cipher Verification',
      'Automatic Memory Zeroization upon Operation Completion',
      'Non-Linear Scramble Keypad preventing physical screen smudge attacks',
    ],
  },
  {
    layerNumber: 3,
    id: 'sec-layer-protocol',
    titleTh: 'ชั้นโปรโตคอลและเครือข่ายฉันทามติ (Network & SPV Consensus)',
    titleEn: 'Layer 3: Network Security & SPV Consensus Quorum',
    technology: 'BIP-37 SPV + Multi-Peer Quorum + TLS 1.3 / SSL Pinning',
    isolationLevel: 'Decentralized Peer Consensus',
    descriptionTh: 'เชื่อมโยงโครงข่ายโหนดแบบ Dual-Node ป้องกันการโจมตีแบบ Eclipse Attack ตรวจสอบ Proof-of-Work จริงผ่าน 80-byte Header โดยไม่ส่ง Private Key สู่ภายนอก',
    descriptionEn: 'Dual-node anti-eclipse network topology, 80-byte block header Proof-of-Work verification, and zero credential leakage over wire.',
    verifiedInvariants: [
      'Consensus-grade Merkle Root & Inclusion Proof Validation',
      'Strict SSL / SPKI SHA-256 Public Key Pinning Specifications',
      'android:usesCleartextTraffic="false" Manifest Enforcement',
    ],
  },
  {
    layerNumber: 4,
    id: 'sec-layer-airgap',
    titleTh: 'ชั้นกำแพงป้องกันสัญญาณ (Air-Gap & Quarantine Firewall)',
    titleEn: 'Layer 4: Air-Gap Quarantine & Replay Defense Firewall',
    technology: 'Air-Gap Physical Isolation + SIGHASH_FORKID + Vault Freeze Lock',
    isolationLevel: 'Physical & State Quarantine',
    descriptionTh: 'ปิดกั้นช่องทางรับส่งข้อมูลภายนอก 100% เมื่อเปิดโหมดออฟไลน์ พร้อมระบบล็อกระงับการโอนออก (Freeze) เพื่อป้องกันเหตุฉุกเฉิน',
    descriptionEn: 'Total physical signal quarantine in offline mode, automated background sync blocking, and vault outbound transfer freeze.',
    verifiedInvariants: [
      'Zero Background Execution / Zero Network Polling Guard',
      'SIGHASH_FORKID Replay Defense across Bitcoin & Hard Forks',
      'Air-Gap PIN Quarantine Firewall on Online Network Reconnection',
    ],
  },
];
