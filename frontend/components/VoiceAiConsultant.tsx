import React, { useState } from 'react';
import { askVoiceArchitect } from '../services/geminiService';
import { Bot, Send, Sparkles, Loader2, MessageSquare, Wrench } from 'lucide-react';

interface Props {
  pilotNumber: string;
  fqdn: string;
}

export const VoiceAiConsultant: React.FC<Props> = ({ pilotNumber, fqdn }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    'วิธีแก้ปัญหาโทรเข้า NT 024307709 แล้วเกิดเสียงทางเดียว (One-way Audio)',
    'วิธีตรวจสอบ SIP 403 Forbidden หรือ 401 Unauthorized จาก NT SBC',
    'ตัวอย่างการตั้งค่า IVR สำหรับธุรกิจ 711shopping บน FreePBX',
    'วิธีคอนฟิก WebRTC บน pbx.711shopping.com เพื่อใช้โทรผ่านเบราว์เซอร์'
  ];

  const handleAsk = async (queryText?: string) => {
    const q = queryText || prompt;
    if (!q.trim() || loading) return;

    setLoading(true);
    setResponse(null);

    const context = `DID: ${pilotNumber}, PBX Domain: ${fqdn}`;
    const result = await askVoiceArchitect(q, context);
    setResponse(result);
    setLoading(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              ผู้ช่วยวิศวกรเสียง AI (Gemini 2.5 Flash Voice Architect)
              <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full font-mono">
                Asterisk & NT Expert
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              ปรึกษาเทคนิคเชิงลึก, แก้ไขปัญหา SIP Signaling, NAT Traversal และสถาปัตยกรรม Call Center
            </p>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickPrompts.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPrompt(item);
              handleAsk(item);
            }}
            className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{item}</span>
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="พิมพ์คำถามเทคนิค เช่น 'ขอ syntax dialplan สำหรับบล็อกเบอร์สแปม' หรือ 'วิเคราะห์ SIP trace'"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-mono"
          />
        </div>
        <button
          onClick={() => handleAsk()}
          disabled={loading || !prompt.trim()}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-cyan-600/20"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>ส่งคำถาม</span>
        </button>
      </div>

      {/* AI Response Box */}
      {response && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mt-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-2 border-b border-slate-800 pb-2">
            <MessageSquare className="w-4 h-4" />
            <span>คำแนะนำจาก Senior Voice Architecture Engineer:</span>
          </div>
          <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
            {response}
          </div>
        </div>
      )}
    </div>
  );
};
