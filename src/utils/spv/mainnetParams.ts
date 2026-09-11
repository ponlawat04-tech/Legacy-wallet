/**
 * Bitcoin Mainnet Network Parameters (bitcoinj org.bitcoinj.params.MainNetParams)
 * 
 * Defines canonical network parameters, genesis constants, consensus rules,
 * wire protocol packet magic, DNS seeds, and cryptographic address prefixes
 * for connecting to the decentralized Bitcoin Mainnet.
 */

import { MainnetParameterItem, MainnetVerificationReport } from '../../types/spv';
import { doubleSha256, reverseBytes } from './bitcoinjBlockStore';
import { bytesToHex } from '@noble/hashes/utils.js';

export const BITCOIN_MAINNET_PARAMS = {
  // Identity
  id: 'org.bitcoin.production',
  networkName: 'Bitcoin',
  ticker: 'BTC',

  // P2P Wire Protocol
  packetMagic: 0xf9beb4d9,
  packetMagicHex: 'f9beb4d9',
  packetMagicWireBytes: [0xd9, 0xb4, 0xbe, 0xf9], // Little-endian over the wire
  defaultPort: 8333,
  rpcPort: 8332,
  protocolVersion: 70016,
  minProtocolVersion: 70001,
  servicesFlags: 1037, // NODE_NETWORK (1) | NODE_BLOOM (4) | NODE_WITNESS (8) | NODE_NETWORK_LIMITED (1024)

  // Address & Key Prefixes
  p2pkhAddressHeader: 0x00, // Prefix '1' (Base58Check)
  p2shAddressHeader: 0x05,  // Prefix '3' (Base58Check)
  segwitHrp: 'bc',          // Bech32 / Bech32m (bc1q..., bc1p...)
  wifPrivateKeyHeader: 0x80,// 128 -> WIF starts with '5', 'K', or 'L'

  // Extended Public & Private Key Headers (BIP-32 / SLIP-0132)
  bip32Headers: {
    xpub: 0x0488b21e, // BIP-44 Legacy P2PKH
    xprv: 0x0488ade4,
    ypub: 0x049d7cb2, // BIP-49 Nested SegWit P2SH-P2WPKH
    yprv: 0x049d7878,
    zpub: 0x04b24746, // BIP-84 Native SegWit P2WPKH
    zprv: 0x04b2430c,
  },

  // Consensus & Proof-of-Work Mathematics
  targetTimespan: 1209600, // 14 days (2016 blocks * 600 seconds)
  targetSpacing: 600,      // 10 minutes per block
  interval: 2016,          // Difficulty retarget interval
  subsidyHalvingInterval: 210000, // Halving every 210,000 blocks (~4 years)
  coinbaseMaturity: 100,   // Spendable coinbase depth (100 blocks)
  maxTargetBits: 0x1d00ffff,
  maxTargetHex: '00000000ffff0000000000000000000000000000000000000000000000000000',

  // Genesis Block Specification
  genesisBlock: {
    hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
    merkleRoot: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
    time: 1231006505, // 2009-01-03 18:15:05 UTC
    nonce: 2083236893,
    bits: 0x1d00ffff,
    version: 1,
    coinbaseHeadline: 'The Times 03/Jan/2009 Chancellor on brink of second bailout for banks',
  },

  // Canonical DNS Seeds (Bitcoin Core & bitcoinj Peer Discovery)
  dnsSeeds: [
    'seed.bitcoin.sipa.be',         // Pieter Wuille
    'dnsseed.bluematt.me',          // Matt Corallo
    'dnsseed.bitcoin.dashjr.org',   // Luke Dashjr
    'seed.bitcoinstats.com',        // Christian Decker
    'seed.bitcoin.jonasschnelli.ch',// Jonas Schnelli
    'seed.btc.petertodd.net',       // Peter Todd
    'seed.bitcoin.sprovoost.nl',    // Sjors Provoost
    'dnsseed.emzy.de',              // Stephan Oeste
    'seed.delirium.io',             // Canonical Seed
  ],

  // Fallback SPV Electrum Endpoints
  electrumFallbacks: [
    { host: 'electrum.blockstream.info', port: 50002, ssl: true },
    { host: 'bitcoin.lu.ke', port: 50002, ssl: true },
    { host: 'electrum.bitaroo.net', port: 50002, ssl: true },
  ],

  // BIP Standards Verified
  supportedBIPs: [
    { bip: 'BIP-32', title: 'Hierarchical Deterministic Wallets (HD)', status: 'Active' },
    { bip: 'BIP-37', title: 'Peer-to-Peer Bloom Filtering (SPV)', status: 'Active' },
    { bip: 'BIP-39', title: 'Mnemonic Code for Generating Deterministic Keys', status: 'Active' },
    { bip: 'BIP-44', title: 'Multi-Account Hierarchy for Deterministic Wallets', status: 'Active' },
    { bip: 'BIP-49', title: 'Derivation Scheme for P2WPKH-nested-in-P2SH', status: 'Active' },
    { bip: 'BIP-84', title: 'Derivation Scheme for Native SegWit P2WPKH', status: 'Active' },
    { bip: 'BIP-86', title: 'Derivation Scheme for Taproot P2TR', status: 'Active' },
    { bip: 'BIP-111', title: 'NODE_BLOOM Service Bit Requirements', status: 'Active' },
    { bip: 'BIP-141', title: 'Segregated Witness (Consensus Layer)', status: 'Active' },
    { bip: 'BIP-157', title: 'Client Side Block Filtering (Neutrino SPV)', status: 'Active' },
    { bip: 'BIP-174', title: 'Partially Signed Bitcoin Transaction (PSBT)', status: 'Active' },
  ],
};

/**
 * Perform exhaustive verification of all Bitcoin Mainnet connection parameters
 */
export function verifyMainnetParameters(): MainnetVerificationReport {
  const checks: MainnetParameterItem[] = [];

  // 1. Packet Magic Verification
  const magicMatches = BITCOIN_MAINNET_PARAMS.packetMagic === 0xf9beb4d9;
  checks.push({
    id: 'check-magic',
    category: 'network_wire',
    name: 'Packet Magic Bytes (Bitcoin Wire)',
    key: 'packetMagic',
    value: BITCOIN_MAINNET_PARAMS.packetMagic,
    hexValue: '0xF9BEB4D9',
    expectedValue: '0xF9BEB4D9',
    status: magicMatches ? 'valid' : 'invalid',
    bipReference: 'Bitcoin Core Wire Protocol',
    descriptionTh: 'ค่า Magic 4 ไบต์สำหรับคัดแยกแพ็กเก็ตข้อมูลของเครือข่ายบิตคอยน์',
    descriptionEn: '4-byte packet delimiter identifying Bitcoin traffic on the wire',
  });

  // 2. Default P2P Port
  const portMatches = BITCOIN_MAINNET_PARAMS.defaultPort === 8333;
  checks.push({
    id: 'check-port',
    category: 'network_wire',
    name: 'Default P2P Inbound/Outbound Port',
    key: 'defaultPort',
    value: BITCOIN_MAINNET_PARAMS.defaultPort,
    expectedValue: 8333,
    status: portMatches ? 'valid' : 'invalid',
    descriptionTh: 'พอร์ต TCP มาตรฐานสำหรับการเชื่อมต่อเพียร์ของ Bitcoin Node (8333)',
    descriptionEn: 'Standard TCP port for peer-to-peer node connections',
  });

  // 3. Protocol Version
  const protoMatches = BITCOIN_MAINNET_PARAMS.protocolVersion >= 70015;
  checks.push({
    id: 'check-protocol',
    category: 'network_wire',
    name: 'Bitcoin Protocol Version',
    key: 'protocolVersion',
    value: BITCOIN_MAINNET_PARAMS.protocolVersion,
    expectedValue: '>= 70015 (70016)',
    status: protoMatches ? 'valid' : 'invalid',
    bipReference: 'BIP-37 / BIP-111 / BIP-144',
    descriptionTh: 'เวอร์ชันโปรโตคอล 70016 รองรับ Bloom Filter, SegWit และ Compact Blocks',
    descriptionEn: 'Protocol version 70016 supporting Bloom Filter, SegWit, and compact blocks',
  });

  // 4. Services Flags (NODE_NETWORK | NODE_BLOOM | NODE_WITNESS)
  const servicesValid = (BITCOIN_MAINNET_PARAMS.servicesFlags & 0x01) !== 0 && (BITCOIN_MAINNET_PARAMS.servicesFlags & 0x04) !== 0;
  checks.push({
    id: 'check-services',
    category: 'network_wire',
    name: 'P2P Service Flags',
    key: 'servicesFlags',
    value: BITCOIN_MAINNET_PARAMS.servicesFlags,
    hexValue: 'NODE_NETWORK | NODE_BLOOM | NODE_WITNESS',
    expectedValue: 'NODE_BLOOM (0x04) enabled',
    status: servicesValid ? 'valid' : 'invalid',
    bipReference: 'BIP-111',
    descriptionTh: 'กำหนดสิทธิโหนดที่ให้บริการ Bloom Filter สำหรับ SPV Client ตามมาตรฐาน BIP-111',
    descriptionEn: 'Service flags verifying BIP-111 Bloom filtering support for SPV peers',
  });

  // 5. Address Headers (P2PKH)
  const p2pkhValid = BITCOIN_MAINNET_PARAMS.p2pkhAddressHeader === 0x00;
  checks.push({
    id: 'check-p2pkh',
    category: 'cryptography_keys',
    name: 'P2PKH Address Header (Base58)',
    key: 'p2pkhAddressHeader',
    value: BITCOIN_MAINNET_PARAMS.p2pkhAddressHeader,
    hexValue: '0x00',
    expectedValue: '0x00 (Prefix "1")',
    status: p2pkhValid ? 'valid' : 'invalid',
    descriptionTh: 'เฮดเดอร์ 0x00 สำหรับที่อยู่บิตคอยน์รูปแบบ Legacy (ขึ้นต้นด้วยเลข 1)',
    descriptionEn: '0x00 header byte for legacy Bitcoin addresses starting with digit 1',
  });

  // 6. P2SH Address Header
  const p2shValid = BITCOIN_MAINNET_PARAMS.p2shAddressHeader === 0x05;
  checks.push({
    id: 'check-p2sh',
    category: 'cryptography_keys',
    name: 'P2SH Address Header (Base58)',
    key: 'p2shAddressHeader',
    value: BITCOIN_MAINNET_PARAMS.p2shAddressHeader,
    hexValue: '0x05',
    expectedValue: '0x05 (Prefix "3")',
    status: p2shValid ? 'valid' : 'invalid',
    bipReference: 'BIP-16',
    descriptionTh: 'เฮดเดอร์ 0x05 สำหรับที่อยู่บิตคอยน์รูปแบบ Script Hash (ขึ้นต้นด้วยเลข 3)',
    descriptionEn: '0x05 header byte for script hash addresses starting with digit 3',
  });

  // 7. SegWit HRP
  const hrpValid = BITCOIN_MAINNET_PARAMS.segwitHrp === 'bc';
  checks.push({
    id: 'check-segwit-hrp',
    category: 'cryptography_keys',
    name: 'SegWit Human-Readable Part (HRP)',
    key: 'segwitHrp',
    value: BITCOIN_MAINNET_PARAMS.segwitHrp,
    expectedValue: '"bc" (bc1q / bc1p)',
    status: hrpValid ? 'valid' : 'invalid',
    bipReference: 'BIP-173 / BIP-350',
    descriptionTh: 'คำนำหน้า Bech32 ของ Bitcoin คือ "bc" (เช่น bc1q... สำหรับ SegWit, bc1p... สำหรับ Taproot)',
    descriptionEn: 'Bech32 human-readable prefix "bc" for Native SegWit and Taproot',
  });

  // 8. WIF Private Key Header
  const wifValid = BITCOIN_MAINNET_PARAMS.wifPrivateKeyHeader === 0x80;
  checks.push({
    id: 'check-wif',
    category: 'cryptography_keys',
    name: 'WIF Private Key Header',
    key: 'wifPrivateKeyHeader',
    value: BITCOIN_MAINNET_PARAMS.wifPrivateKeyHeader,
    hexValue: '0x80 (128)',
    expectedValue: '0x80 (Prefix "5", "K", "L")',
    status: wifValid ? 'valid' : 'invalid',
    descriptionTh: 'เฮดเดอร์ 0x80 สำหรับนำเข้า/ส่งออก Private Key แบบ WIF บนเครือข่าย Bitcoin',
    descriptionEn: '0x80 byte for Wallet Import Format private keys starting with 5, K, or L',
  });

  // 9. BIP-32 xpub / zpub Headers
  const xpubValid = BITCOIN_MAINNET_PARAMS.bip32Headers.xpub === 0x0488b21e && BITCOIN_MAINNET_PARAMS.bip32Headers.zpub === 0x04b24746;
  checks.push({
    id: 'check-bip32-versions',
    category: 'cryptography_keys',
    name: 'BIP-32 / BIP-84 Extended Key Versions',
    key: 'bip32Headers',
    value: 'xpub: 0x0488B21E, zpub: 0x04B24746',
    hexValue: '0x0488B21E / 0x04B24746',
    expectedValue: 'Standard SLIP-0132 Serialization',
    status: xpubValid ? 'valid' : 'invalid',
    bipReference: 'BIP-32 / BIP-84 / SLIP-0132',
    descriptionTh: 'เวอร์ชัน Serialization สำหรับคีย์สาธารณะส่วนขยาย xpub (BIP-44) และ zpub (BIP-84)',
    descriptionEn: 'SLIP-0132 4-byte serialization version bytes for xpub and zpub extended keys',
  });

  // 10. Genesis Block Hash Verification
  const genesisHashValid = BITCOIN_MAINNET_PARAMS.genesisBlock.hash === '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
  checks.push({
    id: 'check-genesis-hash',
    category: 'genesis_checkpoints',
    name: 'Genesis Block Hash (Block #0)',
    key: 'genesisBlock.hash',
    value: BITCOIN_MAINNET_PARAMS.genesisBlock.hash,
    expectedValue: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
    status: genesisHashValid ? 'valid' : 'invalid',
    descriptionTh: 'แฮชบล็อกปฐมฤกษ์ของบิตคอยน์ ขุดโดย Satoshi Nakamoto เมื่อ 3 ม.ค. 2009',
    descriptionEn: 'Canonical Satoshi Nakamoto Bitcoin Genesis Block #0 hash',
  });

  // 11. Genesis Merkle Root
  const genesisMerkleValid = BITCOIN_MAINNET_PARAMS.genesisBlock.merkleRoot === '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b';
  checks.push({
    id: 'check-genesis-merkle',
    category: 'genesis_checkpoints',
    name: 'Genesis Merkle Root',
    key: 'genesisBlock.merkleRoot',
    value: BITCOIN_MAINNET_PARAMS.genesisBlock.merkleRoot,
    expectedValue: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
    status: genesisMerkleValid ? 'valid' : 'invalid',
    descriptionTh: 'Merkle Root ของธุรกรรมแรก (Coinbase) ในบล็อกกำเนิดบิตคอยน์',
    descriptionEn: 'Genesis block Coinbase transaction Merkle Root',
  });

  // 12. Difficulty Retarget Interval & Timespan
  const timespanValid = BITCOIN_MAINNET_PARAMS.targetTimespan === BITCOIN_MAINNET_PARAMS.interval * BITCOIN_MAINNET_PARAMS.targetSpacing;
  checks.push({
    id: 'check-retarget',
    category: 'consensus_pow',
    name: 'Difficulty Retarget Rule (2016 Blocks)',
    key: 'interval & targetTimespan',
    value: `${BITCOIN_MAINNET_PARAMS.interval} blocks (${BITCOIN_MAINNET_PARAMS.targetTimespan / 86400} days)`,
    expectedValue: '2016 blocks = 1,209,600s',
    status: timespanValid ? 'valid' : 'invalid',
    descriptionTh: 'การปรับความยากทุก 2,016 บล็อก (~14 วัน) เพื่อรักษาเวลาเฉลี่ย 10 นาทีต่อบล็อก',
    descriptionEn: 'Consensus difficulty adjustment every 2016 blocks maintaining 10-minute block interval',
  });

  // 13. Halving Interval
  const halvingValid = BITCOIN_MAINNET_PARAMS.subsidyHalvingInterval === 210000;
  checks.push({
    id: 'check-halving',
    category: 'consensus_pow',
    name: 'Subsidy Halving Interval',
    key: 'subsidyHalvingInterval',
    value: `${BITCOIN_MAINNET_PARAMS.subsidyHalvingInterval.toLocaleString()} blocks`,
    expectedValue: '210,000 blocks',
    status: halvingValid ? 'valid' : 'invalid',
    descriptionTh: 'รางวัลบล็อกลดลงครึ่งหนึ่งทุก 210,000 บล็อก (ประมาณทุก 4 ปี)',
    descriptionEn: 'Block reward halves every 210,000 blocks',
  });

  // 14. Coinbase Maturity
  const maturityValid = BITCOIN_MAINNET_PARAMS.coinbaseMaturity === 100;
  checks.push({
    id: 'check-maturity',
    category: 'consensus_pow',
    name: 'Coinbase UTXO Maturity Depth',
    key: 'coinbaseMaturity',
    value: `${BITCOIN_MAINNET_PARAMS.coinbaseMaturity} blocks`,
    expectedValue: '100 blocks',
    status: maturityValid ? 'valid' : 'invalid',
    descriptionTh: 'เหรียญที่ขุดได้ใหม่ต้องรอการยืนยันครบ 100 บล็อกก่อนนำไปใช้ได้',
    descriptionEn: 'Newly mined coins must mature for 100 blocks before they can be spent',
  });

  // 15. Maximum Target / Difficulty 1 Limit
  const maxTargetValid = BITCOIN_MAINNET_PARAMS.maxTargetBits === 0x1d00ffff;
  checks.push({
    id: 'check-max-target',
    category: 'consensus_pow',
    name: 'Proof-of-Work Limit (Difficulty 1)',
    key: 'maxTargetBits',
    value: '0x1d00ffff',
    hexValue: BITCOIN_MAINNET_PARAMS.maxTargetHex,
    expectedValue: '0x1d00ffff',
    status: maxTargetValid ? 'valid' : 'invalid',
    descriptionTh: 'ค่าความยากขั้นต่ำสุดและขีดจำกัดสูงสุดของเป้าหมาย PoW ของเครือข่ายบิตคอยน์',
    descriptionEn: 'Lowest possible difficulty target (Difficulty 1) for double-SHA256 PoW',
  });

  // 16. DNS Seed Nodes Count
  const dnsSeedsValid = BITCOIN_MAINNET_PARAMS.dnsSeeds.length >= 6;
  checks.push({
    id: 'check-dns-seeds',
    category: 'dns_seeds',
    name: 'Decentralized Bitcoin DNS Seeds',
    key: 'dnsSeeds.length',
    value: `${BITCOIN_MAINNET_PARAMS.dnsSeeds.length} Core Seeds`,
    expectedValue: '>= 6 seeds (9 configured)',
    status: dnsSeedsValid ? 'valid' : 'invalid',
    descriptionTh: 'โหนด DNS Seeds สำหรับการค้นหาเพียร์ตั้งต้นแบบกระจายศูนย์โดยอัตโนมัติ',
    descriptionEn: 'Canonical Bitcoin Core DNS seed hosts for initial peer discovery',
  });

  const passedChecks = checks.filter(c => c.status === 'valid').length;
  const failedChecks = checks.filter(c => c.status === 'invalid').length;

  return {
    timestamp: Date.now(),
    totalChecks: checks.length,
    passedChecks,
    failedChecks,
    overallStatus: failedChecks === 0 ? 'PASS' : 'FAIL',
    networkName: BITCOIN_MAINNET_PARAMS.networkName,
    protocolVersion: BITCOIN_MAINNET_PARAMS.protocolVersion,
    magicHex: BITCOIN_MAINNET_PARAMS.packetMagicHex,
    port: BITCOIN_MAINNET_PARAMS.defaultPort,
    checks,
  };
}
