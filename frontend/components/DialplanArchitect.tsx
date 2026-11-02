import React, { useState } from 'react';
import { DialPlanRule } from '../types';
import { Route, PhoneOutgoing, PhoneIncoming, AlertCircle, CheckCircle2, ChevronRight, Bot, Sparkles, Headphones } from 'lucide-react';

interface Props {
  pilotNumber: string;
}

export const DialplanArchitect: React.FC<Props> = ({ pilotNumber }) => {
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound' | 'ai_routing'>('inbound');

  const thaiOutboundRules: DialPlanRule[] = [
    {
      id: 'bkk_fixed',
      name: 'เบอร์พื้นฐานกรุงเทพฯ และปริมณฑล (02)',
      description: 'โทรออกเบอร์บ้าน/สำนักงาน 02xxxxxxx รวม 9 หลัก',
      prepend: '',
      prefix: '',
      matchPattern: '02XXXXXXX',
      callerId: pilotNumber,
      example: '024307709, 021234567'
    },
    {
      id: 'prov_fixed',
      name: 'เบอร์บ้านต่างจังหวัด (03x, 04x, 05x, 07x)',
      description: 'โทรออกเบอร์ต่างจังหวัด 9 หลัก',
      prepend: '',
      prefix: '',
      matchPattern: '0[3457]XXXXXXX',
      callerId: pilotNumber,
      example: '053123456 (เชียงใหม่), 038123456 (ชลบุรี)'
    },
    {
      id: 'mobile',
      name: 'เบอร์มือถือทุกเครือข่ายในไทย (06, 08, 09)',
      description: 'โทรออกเบอร์มือถือ 10 หลัก',
      prepend: '',
      prefix: '',
      matchPattern: '0[689]XXXXXXXX',
      callerId: pilotNumber,
      example: '0812345678, 0987654321, 0612345678'
    },
    {
      id: 'emergency',
      name: 'เบอร์ฉุกเฉินและหน่วยงานรัฐ (Emergency)',
      description: 'ตำรวจ (191), กู้ชีพ (1669), ดับเพลิง (199), ตำรวจท่องเที่ยว (1155)',
      prepend: '',
      prefix: '',
      matchPattern: '1[169]XX',
      callerId: pilotNumber,
      example: '191, 1669, 199, 1155'
    },
    {
      id: 'prefix9_dial',
      name: 'กด 9 นำหน้าเพื่อตัดสายนอก (Enterprise Standard)',
      description: 'สำหรับแผนกที่ต้องกด 9 ก่อนต่อสายนอก',
      prepend: '',
      prefix: '9',
      matchPattern: '0XXXXXXXX.',
      callerId: pilotNumber,
      example: 'กด 9 แล้วตามด้วยเบอร์ 024307709'
    }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Route className="w-5 h-5 text-emerald-400" />
            สถาปัตยกรรม Dialplan & เส้นทางการโทร (Thai Numbering Plan & AI Voice)
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            กำหนด Dial Pattern แผนเลขหมายไทย และการวิ่งสายตรงเข้า <span className="text-purple-300 font-semibold">น้องฟ้าใส AI Telesales</span>
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('inbound')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'inbound'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PhoneIncoming className="w-3.5 h-3.5" />
            Inbound Routes (สายเข้า DID {pilotNumber})
          </button>
          <button
            onClick={() => setActiveTab('ai_routing')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'ai_routing'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-300" />
            AI Telesales Flow (น้องฟ้าใส)
          </button>
          <button
            onClick={() => setActiveTab('outbound')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'outbound'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PhoneOutgoing className="w-3.5 h-3.5" />
            Outbound Routes (สายนอก)
          </button>
        </div>
      </div>

      {activeTab === 'inbound' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-emerald-400" />
                การตั้งค่า FreePBX Inbound Route สำหรับ NT DID 024307709
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Description:</span>
                  <span className="font-mono text-white font-medium">NT_INBOUND_FAHSAI_AI</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">DID Number:</span>
                  <span className="font-mono text-emerald-400 font-bold">{pilotNumber}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">CallerID Number:</span>
                  <span className="text-slate-400">(เว้นว่างเพื่อรับทุกเบอร์ที่โทรเข้ามา)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Alert Info:</span>
                  <span className="font-mono text-cyan-300">&lt;http://127.0.0.1&gt;;info=FAHSAI_LIVE</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Call Recording:</span>
                  <span className="text-emerald-400 font-semibold">Force (เก็บบันทึกเสียงทั้งสองฝั่ง)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Set Destination:</span>
                  <span className="font-bold text-purple-300">Custom Destinations ➔ Fahsai_AI_AudioSocket</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-cyan-400" />
                จุดต่อเชื่อม FreePBX Custom Destination
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                เข้าเมนู <code className="bg-slate-900 text-cyan-300 px-1 py-0.5 rounded">Admin</code> ➔ <code className="bg-slate-900 text-cyan-300 px-1 py-0.5 rounded">Custom Destinations</code> แล้วเพิ่มรายการ:
              </p>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Target:</span>{' '}
                  <span className="text-purple-300 font-bold">from-pstn-custom,{pilotNumber},1</span>
                </div>
                <div>
                  <span className="text-slate-400">Description:</span>{' '}
                  <span className="text-white">Fahsai AI Vertex Stream (AudioSocket)</span>
                </div>
                <div>
                  <span className="text-slate-400">Failover Destination:</span>{' '}
                  <span className="text-amber-400">Queues ➔ 1000 (Human Telesales Agents)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai_routing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Bot className="w-4 h-4" />
                <h4 className="font-bold text-sm text-white">Full-Duplex VAD</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                ระบบตรวจจับเสียงพูดของลูกค้าแบบ Realtime เมื่อลูกค้าพูดแทรก (Barge-in) เสียงพูดของน้องฟ้าใสจะหยุดทันที เพื่อรับฟังคำถามของลูกค้าอย่างเป็นธรรมชาติ
              </p>
            </div>

            <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-cyan-400 mb-2">
                <Headphones className="w-4 h-4" />
                <h4 className="font-bold text-sm text-white">Supervisor Whisper & Barge</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                หัวหน้าทีม Telesales สามารถกด <code className="text-cyan-300 font-mono">*555</code> เพื่อฟังการสนทนาของน้องฟ้าใสแบบ Real-time และพูดกระซิบ (Whisper) หรือดึงสายมาคุยเองได้ทันที
              </p>
            </div>

            <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Sparkles className="w-4 h-4" />
                <h4 className="font-bold text-sm text-white">711shopping Order Sync</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                เมื่อน้องฟ้าใสปิดการขายสำเร็จ จะยิง Webhook ข้อมูลสั่งซื้อ (Order Payload) กลับเข้าสู่ระบบ ERP/CRM ของ 711shopping พร้อมหมายเลขโทรศัพท์และสรุปบทสนทนา
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'outbound' && (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-800 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">ชื่อเส้นทาง (Route Name)</th>
                  <th className="py-3 px-3">Prepend</th>
                  <th className="py-3 px-3">Prefix</th>
                  <th className="py-3 px-4">Match Pattern (FreePBX)</th>
                  <th className="py-3 px-4">Trunk CallerID</th>
                  <th className="py-3 px-4">ตัวอย่างเบอร์โทร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono">
                {thaiOutboundRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-white">
                      <div>{rule.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{rule.description}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{rule.prepend || '-'}</td>
                    <td className="py-3 px-3 text-amber-400">{rule.prefix || '-'}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold bg-slate-900/40">
                      {rule.matchPattern}
                    </td>
                    <td className="py-3 px-4 text-cyan-300">{rule.callerId}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">{rule.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
