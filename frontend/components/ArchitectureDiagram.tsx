import React from 'react';
import { 
  PhoneCall, 
  Server, 
  Network, 
  Globe, 
  Bot, 
  Zap, 
  PhoneForwarded, 
  Headphones, 
  Cpu, 
  Cloud,
  CheckCircle2,
  ShieldCheck,
  Radio
} from 'lucide-react';

interface Props {
  pilotNumber: string;
  fqdn: string;
  sipServer: string;
  transport: string;
  aiEndpointUrl: string;
  yealinkExtension?: string;
}

export const ArchitectureDiagram: React.FC<Props> = ({ 
  pilotNumber, 
  fqdn, 
  sipServer, 
  transport, 
  aiEndpointUrl,
  yealinkExtension = '1001'
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between mb-6 pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              สถาปัตยกรรมโครงข่ายเสียงโทรคมนาคมจริง (Dual-Path Hub Architecture)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            GCP Center Hub: <span className="text-cyan-300 font-mono font-semibold">{fqdn}</span> | 
            NT DID: <span className="text-emerald-400 font-mono font-bold">{pilotNumber}</span> | 
            Desk Phone: <span className="text-amber-400 font-mono font-bold">Yealink T30 (Ext {yealinkExtension})</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-300">
          <Cloud className="w-4 h-4 text-cyan-400" />
          <span>GCP Compute Engine • asia-southeast1</span>
        </div>
      </div>

      {/* ASCII Architectural Topology Match */}
      <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 mb-6 font-mono text-xs text-cyan-300/95 leading-relaxed overflow-x-auto shadow-inner">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-sans font-bold">
          แผนผังทราฟฟิกเสียงตามโครงสร้างจริงที่คุณกำหนด:
        </div>
        <pre>{`[ NT VoIP Gateway (02-430-7709) ]
        │
        │ SIP Trunk (PJSIP) :5060 UDP
        ▼
 [ Asterisk VM บน GCP (ศูนย์กลาง: ${fqdn}) ]
    │                               │
    │ AudioSocket (Port 9092)       │ SIP Extension (${yealinkExtension})
    ▼                               ▼
 [ AI Agent / Cloud Run ]       [ Yealink T30 (บนโต๊ะทำงาน) ]
 (น้องฟ้าใส: Gemini Voice)        (โอนสายมนุษย์ / กดฟัง *555)`}</pre>
      </div>

      {/* Visual Dual-Path Topology Flow Cards */}
      <div className="space-y-4">
        {/* Top Node: NT VoIP Gateway */}
        <div className="bg-[#0b1326] border-2 border-cyan-500/40 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-900/40 border border-cyan-400 flex items-center justify-center">
              <PhoneCall className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Telco Gateway
                </span>
                <span className="text-xs text-slate-400">NT (National Telecom)</span>
              </div>
              <h4 className="text-base font-bold text-white mt-0.5">NT VoIP Gateway (02-430-7709)</h4>
              <p className="text-xs font-mono text-cyan-400">{sipServer}:5060</p>
            </div>
          </div>
          <div className="text-right text-xs font-mono text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <div>Signaling: <span className="text-emerald-400 font-bold">SIP INVITE (024307709)</span></div>
            <div>Audio Codec: <span className="text-cyan-300">G.711a (alaw) / G.711u (ulaw)</span></div>
          </div>
        </div>

        {/* Center Node: Asterisk VM on GCP */}
        <div className="bg-[#0f1d38] border-2 border-emerald-500/60 rounded-xl p-5 shadow-2xl relative ring-2 ring-emerald-500/20">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-900/50 border border-emerald-400 flex items-center justify-center">
                <Server className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                  Core Voice Engine (GCP Center)
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">Asterisk 20 + FreePBX VM บน GCP</h4>
                <p className="text-xs font-mono text-emerald-400 font-semibold">{fqdn} (Static Public IP)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 font-mono text-xs font-bold">
                Smart Bridge & Audio Splitter
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 mb-4 leading-relaxed">
            เซิร์ฟเวอร์บน Google Cloud Engine ทำหน้าที่เป็นศูนย์กลางแยกและส่งสัญญาณเสียงออกเป็น <b>2 ปลายทางขนานกัน (Dual Dispatch)</b>:
          </p>

          {/* 2 Child Destinations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Branch 1: AudioSocket -> Cloud Run AI Agent */}
            <div className="bg-purple-950/30 border-2 border-purple-500/50 rounded-xl p-4 hover:border-purple-400 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    ท่อที่ 1: AudioSocket ➔ AI Agent
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded border border-purple-700">
                  Port 9092
                </span>
              </div>
              <h5 className="font-bold text-purple-300 text-sm">AI Agent / Cloud Run (น้องฟ้าใส)</h5>
              <p className="text-[11px] text-slate-400 mt-1">
                รับสายแรกทันที 24/7 เพื่อแนะนำโปรโมชั่น 711shopping, ตอบคำถาม, เช็กสถานะคำสั่งซื้อด้วย Gemini Live Real-time Full-Duplex
              </p>
              <div className="mt-3 bg-slate-950/80 p-2 rounded text-[11px] font-mono text-slate-300 border border-purple-900/50">
                <div className="text-purple-300 font-semibold">Endpoint:</div>
                <div className="truncate text-slate-400" title={aiEndpointUrl}>
                  {aiEndpointUrl}
                </div>
              </div>
            </div>

            {/* Branch 2: SIP Extension 1001 -> Yealink T30 */}
            <div className="bg-amber-950/30 border-2 border-amber-500/50 rounded-xl p-4 hover:border-amber-400 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <PhoneForwarded className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    ท่อที่ 2: SIP Extension ➔ บนโต๊ะทำงาน
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded border border-amber-700">
                  Ext {yealinkExtension}
                </span>
              </div>
              <h5 className="font-bold text-amber-300 text-sm">Yealink T30 (IP Phone บนโต๊ะทำงาน)</h5>
              <p className="text-[11px] text-slate-400 mt-1">
                โทรศัพท์ตั้งโต๊ะจริงของพนักงาน/Supervisor: รับสายโอนจากน้องฟ้าใส, โทรออกภายนอกด้วยเบอร์ 024307709, และกด <code className="text-amber-300 font-bold">*555</code> แอบฟังหรือแทรกสายคุย
              </p>
              <div className="mt-3 bg-slate-950/80 p-2 rounded text-[11px] font-mono text-slate-300 border border-amber-900/50 flex justify-between items-center">
                <div>Device: <b className="text-white">Yealink SIP-T30</b></div>
                <div className="text-emerald-400 font-semibold">Status: Registered</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interaction Handshake Protocols Summary */}
      <div className="mt-5 bg-slate-950/80 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <b className="text-white block">AI First ➔ Desk Transfer</b>
            น้องฟ้าใสคุยกับลูกค้า หากลูกค้าขอมนุษย์ ระบบยิงคำสั่ง Dialplan โอนสายเข้า Yealink T30 Ext 1001 ทันที
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Headphones className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <b className="text-white block">Supervisor Live Spy (*555)</b>
            พนักงานที่นั่งอยู่หน้า Yealink T30 สามารถยกหูกด <code className="text-amber-300">*555</code> เพื่อฟังน้องฟ้าใสคุยสดและพูดแทรก (Barge-in) ได้
          </div>
        </div>
        <div className="flex items-start gap-2">
          <PhoneCall className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <b className="text-white block">Outbound Calls via Yealink</b>
            พนักงานสามารถยกหู Yealink T30 กดเบอร์มือถือลูกค้า 08xxxxxxxx โทรออกสายนอกจะโชว์เบอร์ <b>024307709</b> อัตโนมัติ
          </div>
        </div>
      </div>
    </div>
  );
};
