export type ChainId = 'BTC' | 'BCH' | 'BSV' | 'BTG' | 'XEC';

export interface ChainConfig {
  id: ChainId;
  name: string;
  symbol: string;
  coinType: number; // SLIP-0044 coin type
  curve: 'secp256k1';
  derivationPath: string;
  addressPrefix: string;
  addressFormatName: string;
  iconBg: string;
  badgeColor: string;
  defaultPriceUsd: number;
  decimals: number;
  explorerUrl: string;
  coingeckoId: string;
  descriptionTh: string;
  descriptionEn: string;
  forkHeight?: number;
  replayProtection?: string;
}

export const SUPPORTED_MULTI_CHAINS: ChainConfig[] = [
  {
    id: 'BTC',
    name: 'Bitcoin',
    symbol: 'BTC',
    coinType: 0,
    curve: 'secp256k1',
    derivationPath: "m/84'/0'/0'/0/0",
    addressPrefix: 'bc1q',
    addressFormatName: 'Native SegWit (Bech32)',
    iconBg: 'from-amber-500 to-orange-600',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    defaultPriceUsd: 94850.00,
    decimals: 8,
    explorerUrl: 'https://mempool.space/address/',
    coingeckoId: 'bitcoin',
    descriptionTh: 'บล็อกเชนต้นกำเนิด ราชาแห่งสินทรัพย์ดิจิทัล (PoW SHA-256)',
    descriptionEn: 'The original decentralized digital gold (PoW SHA-256)',
  },
  {
    id: 'BCH',
    name: 'Bitcoin Cash',
    symbol: 'BCH',
    coinType: 145,
    curve: 'secp256k1',
    derivationPath: "m/44'/145'/0'/0/0",
    addressPrefix: 'bitcoincash:q',
    addressFormatName: 'CashAddr Base32',
    iconBg: 'from-emerald-500 to-green-600',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    defaultPriceUsd: 385.50,
    decimals: 8,
    explorerUrl: 'https://blockchair.com/bitcoin-cash/address/',
    coingeckoId: 'bitcoin-cash',
    descriptionTh: 'แยกสาขาปี 2017 บล็อก 32MB โอนไว ป้องกัน Replay ด้วย SIGHASH_FORKID',
    descriptionEn: 'Hard fork (2017) with 32MB blocks, fast low-fee transfers, and SIGHASH_FORKID',
    forkHeight: 478558,
    replayProtection: 'SIGHASH_FORKID (0x40)',
  },
  {
    id: 'BSV',
    name: 'Bitcoin SV',
    symbol: 'BSV',
    coinType: 236,
    curve: 'secp256k1',
    derivationPath: "m/44'/236'/0'/0/0",
    addressPrefix: '1',
    addressFormatName: 'Legacy P2PKH',
    iconBg: 'from-yellow-600 to-amber-700',
    badgeColor: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/40',
    defaultPriceUsd: 48.20,
    decimals: 8,
    explorerUrl: 'https://blockchair.com/bitcoin-sv/address/',
    coingeckoId: 'bitcoin-cash-sv',
    descriptionTh: 'แยกสาขาปี 2018 บล็อกขนาดไม่จำกัด กู้คืนคำสั่ง Script ดั้งเดิม',
    descriptionEn: 'Hard fork (2018) unbounded block size restoring original Bitcoin script opcodes',
    forkHeight: 556767,
    replayProtection: 'SIGHASH_FORKID (0x40)',
  },
  {
    id: 'BTG',
    name: 'Bitcoin Gold',
    symbol: 'BTG',
    coinType: 156,
    curve: 'secp256k1',
    derivationPath: "m/44'/156'/0'/0/0",
    addressPrefix: 'G',
    addressFormatName: 'Equihash P2PKH (G-Prefix)',
    iconBg: 'from-yellow-400 to-amber-500',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    defaultPriceUsd: 28.50,
    decimals: 8,
    explorerUrl: 'https://explorer.bitcoingold.org/insight/address/',
    coingeckoId: 'bitcoin-gold',
    descriptionTh: 'แยกสาขาปี 2017 ใช้อัลกอริทึม Equihash เพื่อให้ขุดด้วย GPU ได้ทั่วถึง',
    descriptionEn: 'Hard fork (2017) using Equihash-BTG PoW for GPU mining decentralization',
    forkHeight: 491407,
    replayProtection: 'SIGHASH_FORKID (0x4f)',
  },
  {
    id: 'XEC',
    name: 'eCash',
    symbol: 'XEC',
    coinType: 899,
    curve: 'secp256k1',
    derivationPath: "m/44'/899'/0'/0/0",
    addressPrefix: 'ecash:q',
    addressFormatName: 'CashAddr eCash',
    iconBg: 'from-cyan-500 to-blue-600',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    defaultPriceUsd: 0.000042,
    decimals: 2,
    explorerUrl: 'https://blockchair.com/ecash/address/',
    coingeckoId: 'ecash',
    descriptionTh: 'พัฒนาต่อจาก Bitcoin Cash ABC หน่วย 2 ทศนิยม ฉันทามติ Avalanche',
    descriptionEn: 'Rebranding of Bitcoin Cash ABC with 2-decimal denomination and Avalanche consensus',
    forkHeight: 661647,
    replayProtection: 'SIGHASH_FORKID (0x40)',
  },
];
