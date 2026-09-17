import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  Terminal,
  Cpu,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Wifi,
  WifiOff,
  Flame,
  Fingerprint,
  RefreshCw,
  ExternalLink,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Language } from '../types/wallet';
import { SOVEREIGN_EXECUTION_PIPELINE, SECURITY_LAYER_LINKS, PipelineStage, SecurityLayerLink } from '../utils/securityPipeline';
import { APP_VERSION_TAG } from '../utils/version';

interface SecurityPipelineVisualizerProps {
  lang: Language;
  onOpenVaultModal?: () => void;
  onOpenSpvModal?: () => void;
}

export const SecurityPipelineVisualizer: React.FC<SecurityPipelineVisualizerProps> = ({
  lang,
  onOpenVaultModal,
  onOpenSpvModal,
}) => {
  const [selectedView, setSelectedView] = useState<'pipeline' | 'layers'>('pipeline');
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  const toggleStage = (stageNum: number) => {
    setExpandedStage(prev => (prev === stageNum ? null : stageNum));
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 shadow-2xl space-y-4 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/90">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/15">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-100 tracking-tight">
                {lang === 'th'
                  ? 'ลำดับการทำงาน & การเชื่อมโยงระบบรักษาความปลอดภัย'
                  : 'Execution Pipeline & Security Interlock Architecture'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-extrabold border border-amber-500/40">
                {APP_VERSION_TAG}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-normal">
              {lang === 'th'
                ? 'ผังลำดับขั้นตอนการประมวลผล 5 ขั้นตอน และการเชื่อมโยงระบบป้องกัน 4 ระดับชั้น (Defense-in-Depth)'
                : '5-Stage Execution Flow with 4-Layer Cryptographic Security Interlocks & Memory Hygiene.'}
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setSelectedView('pipeline')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 ${
              selectedView === 'pipeline'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ลำดับ 5 ขั้นตอน' : '5-Stage Pipeline'}</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedView('layers')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 ${
              selectedView === 'layers'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? '4 ระดับชั้นความปลอดภัย' : '4 Security Layers'}</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: 5-Stage Execution Pipeline */}
      {selectedView === 'pipeline' && (
        <div className="space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'th' ? 'ผังลำดับการทำงาน (Sequential Operational Workflow):' : 'Sequential Workflow Stages:'}</span>
            </span>
            <span className="text-[10.5px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              5/5 HARDENED
            </span>
          </div>

          <div className="space-y-2">
            {SOVEREIGN_EXECUTION_PIPELINE.map((stage, idx) => {
              const isExpanded = expandedStage === stage.stageNumber;
              return (
                <div
                  key={stage.id}
                  className="rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700/80 transition-all overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleStage(stage.stageNumber)}
                    className="w-full p-3 sm:p-3.5 text-left flex items-start sm:items-center justify-between gap-3 group transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 sm:mt-0 shadow-sm">
                        {stage.stageNumber}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                            {lang === 'th' ? stage.nameTh : stage.nameEn}
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                            {stage.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-1">
                          {lang === 'th' ? stage.descriptionTh : stage.descriptionEn}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto mt-1 sm:mt-0">
                      <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-slate-200">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Security Interlocks Details */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/80 space-y-2 text-xs animate-in fade-in duration-200">
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {lang === 'th' ? stage.descriptionTh : stage.descriptionEn}
                      </p>

                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                          {lang === 'th' ? 'มาตรการควบคุมความปลอดภัยเฉพาะขั้นตอน (Security Interlocks):' : 'Stage Security Interlocks:'}
                        </span>
                        <div className="space-y-1">
                          {stage.securityInterlocks.map((interlock, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{interlock}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: 4 Security Layers (Defense-in-Depth) */}
      {selectedView === 'layers' && (
        <div className="space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'th' ? 'การเชื่อมโยงระบบรักษาความปลอดภัย 4 ระดับ (Defense-in-Depth Ring):' : '4-Tier Security Defense Ring:'}</span>
            </span>
            <span className="text-[10.5px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
              RING 0 - 3 ENFORCED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {SECURITY_LAYER_LINKS.map(layer => (
              <div
                key={layer.id}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        L{layer.layerNumber}
                      </div>
                      <span className="text-xs font-bold text-slate-100">
                        {lang === 'th' ? layer.titleTh : layer.titleEn}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-[9.5px]">
                      {layer.technology}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[9px] font-bold">
                      {layer.isolationLevel}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {lang === 'th' ? layer.descriptionTh : layer.descriptionEn}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-900 space-y-1">
                  {layer.verifiedInvariants.map((inv, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-300 font-mono">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{inv}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Quick Links Footer */}
      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <Fingerprint className="w-4 h-4 text-emerald-400" />
          <span>
            {lang === 'th'
              ? 'ระบบทำงานอย่างสมบูรณ์แบบในตัวเอง (Zero Remote Code Injection • 100% Deterministic)'
              : 'Deterministic self-contained execution with zero remote code injection.'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenVaultModal && (
            <button
              type="button"
              onClick={onOpenVaultModal}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <Key className="w-3 h-3 text-amber-400" />
              <span>{lang === 'th' ? 'ตรวจสอบคลังกุญแจ' : 'Inspect Key Vault'}</span>
            </button>
          )}

          {onOpenSpvModal && (
            <button
              type="button"
              onClick={onOpenSpvModal}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>{lang === 'th' ? 'คอนโซล SPV' : 'SPV Quorum'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
