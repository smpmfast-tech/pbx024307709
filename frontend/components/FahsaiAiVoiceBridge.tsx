import React, { useState } from 'react';
import { FahsaiAiBridgeConfig, safeCopyToClipboard } from '../types';
import { Bot, Zap, Copy, Check, Terminal, Play, Cpu, ArrowUpRight, Volume2, Shield, Settings2, Sparkles, RefreshCw, PhoneForwarded } from 'lucide-react';

interface Props {
  pilotNumber: string;
  fqdn: string;
  sipServer: string;
}

export const FahsaiAiVoiceBridge: React.FC<Props> = ({ pilotNumber, fqdn, sipServer }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dialplan' | 'middleware' | 'live_test'>('live_test');

  const [bridgeConfig, setBridgeConfig] = useState<FahsaiAiBridgeConfig>({
    aiEndpointUrl: 'https://genai-app-fahsaiaivoicetelesales-al-1-17935438439-413450112749.asia-southeast1.run.app/',
    streamProtocol: 'audiosocket',
    audioFormat: 'slin16',
    sampleRate: 16000,
    audioSocketPort: 9092,
    dtmfDetection: true,
    bargeInEnabled: true,
    sentimentAnalysis: true,
    callTimeoutSeconds: 300,
    fallbackExtension: '1001', // Yealink T30 on Desk
    routingMode: 'ai_first_handover'
  });

  // Call simulation states
  const [simState, setSimState] = useState<'idle' | 'calling' | 'connected' | 'ai_speaking' | 'customer_speaking' | 'transferred_to_yealink' | 'ended'>('idle');
  const [simLog, setSimLog] = useState<string[]>([]);

  // Fix: use safeCopyToClipboard to avoid unhandled NotAllowedError
  const copyToClipboard = async (text: string, id: string) => {
    await safeCopyToClipboard(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Asterisk Dialplan syntax with Yealink T30 Transfer
  const dialplanCustomConf = `
; ==============================================================================
; Dual-Path Routing: NT DID ${pilotNumber} ➔ น้องฟ้าใส (AudioSocket) ➔ Yealink T30 (Ext ${bridgeConfig.fallbackExtension})
; File: /etc/asterisk/extensions_custom.conf
; Target Service: ${bridgeConfig.aiEndpointUrl}
; ==============================================================================

[from-pstn-custom]
exten => ${pilotNumber},1,NoOp(>>> [INBOUND] NT DID ${pilotNumber} -> Routing to Fahsai AI Voice Stream <<<)
 same => n,Set(CHANNEL(language)=th)
 same => n,Answer()
 same => n,Wait(0.5)

 ; สร้าง Session UUID เฉพาะสำหรับการโทรครั้งนี้
 same => n,Set(FAHSAI_SESSION_UUID=\${UUID()})
 same => n,Set(CDR(userfield)=FAHSAI_AI_\${FAHSAI_SESSION_UUID})

 ; บันทึกไฟล์เสียงต้นฉบับสำหรับการตรวจสอบคุณภาพ (QA & Compliance)
 same => n,Set(RECORDING_FILE=/var/spool/asterisk/monitor/FAHSAI-\${STRFTIME(\${EPOCH},,%Y%m%d-%H%M%S)}-\${CALLERID(num)}.wav)
 same => n,MixMonitor(\${RECORDING_FILE},b)

 ; เชื่อมต่อ Real-time Bi-directional AudioSocket ไปยัง Gateway น้องฟ้าใส (Port ${bridgeConfig.audioSocketPort})
 same => n,NoOp(Connecting AudioSocket to 127.0.0.1:${bridgeConfig.audioSocketPort}...)
 same => n,AudioSocket(\${FAHSAI_SESSION_UUID},127.0.0.1:${bridgeConfig.audioSocketPort})

 ; หากลูกค้าร้องขอคุยกับมนุษย์ หรือ AI ปิดการขายต้องการคอนเฟิร์ม (Handover to Yealink T30 Desk Phone)
 same => n,NoOp(AudioSocket Status: \${AUDIOSOCKET_STATUS}. Routing to Yealink T30 Ext ${bridgeConfig.fallbackExtension}...)
 same => n,Playback(transfer)
 same => n,Dial(PJSIP/${bridgeConfig.fallbackExtension},30,tT)
 same => n,Hangup()

; --- Feature Code: Supervisor Spy on น้องฟ้าใส (*555) บน Yealink T30 ---
exten => *555,1,NoOp(Yealink Desk Phone Supervisor Spy)
 same => n,Authenticate(1234)
 same => n,ChanSpy(PJSIP/NT_TRUNK_${pilotNumber},wq)
 same => n,Hangup()
`;

  // Simulator Handler including Handover to Yealink T30
  const startSimulation = () => {
    setSimState('calling');
    setSimLog([`[0.0s] ลูกค้าโทรเข้ามาที่เบอร์ ${pilotNumber} ผ่าน NT VoIP Gateway (${sipServer})`]);

    setTimeout(() => {
      setSimState('connected');
      setSimLog((prev) => [...prev, `[0.3s] Asterisk VM บน GCP (${fqdn}) ตอบรับ 200 OK -> เริ่มสตรีม AudioSocket :${bridgeConfig.audioSocketPort}`]);
    }, 700);

    setTimeout(() => {
      setSimState('ai_speaking');
      setSimLog((prev) => [
        ...prev,
        `[0.9s] น้องฟ้าใส (AI Agent / Cloud Run): "สวัสดีค่ะ 711shopping ยินดีต้อนรับค่ะ วันนี้ฟ้าใสมีโปรโมชั่นพิเศษ หรือมีรายการสินค้าใดให้ฟ้าใสช่วยดูแลคะ?"`
      ]);
    }, 1800);

    setTimeout(() => {
      setSimState('customer_speaking');
      setSimLog((prev) => [
        ...prev,
        `[4.2s] ลูกค้าพูด: "อยากสั่งของด่วน 5 รายการ ขอคุยกับพนักงานตัวจริงเลยได้ไหมครับ"`,
        `[4.5s] น้องฟ้าใส VAD & Intent Analysis: ตรวจพบความต้องการคุยกับพนักงาน (Intent: Handover_To_Human)`
      ]);
    }, 4500);

    setTimeout(() => {
      setSimState('transferred_to_yealink');
      setSimLog((prev) => [
        ...prev,
        `[5.0s] น้องฟ้าใส: "ได้เลยค่ะ ฟ้าใสกำลังโอนสายไปยังโทรศัพท์ตั้งโต๊ะเจ้าหน้าที่สักครู่นะคะ..."`,
        `[5.4s] 🔔 สัญญาณกริ่งดังขึ้นที่เครื่อง [Yealink T30 (Ext ${bridgeConfig.fallbackExtension}) บนโต๊ะทำงาน]`,
        `[6.5s] พนักงานที่โต๊ะทำงานยกหู Yealink T30 ➔ เชื่อมต่อสายสนทนากับลูกค้าทันที!`
      ]);
    }, 6500);

    setTimeout(() => {
      setSimState('ended');
      setSimLog((prev) => [
        ...prev,
        `[9.5s] การสนทนาสำเร็จ • ลำดับเหตุการณ์: NT ➔ GCP Asterisk ➔ น้องฟ้าใส ➔ โอนเข้า Yealink T30 บนโต๊ะสมบูรณ์ 100%`
      ]);
    }, 10000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-500/50 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                ระบบเชื่อมต่อเสียงสด Vertex AI "น้องฟ้าใส" & โอนสายไป Yealink T30
                <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full font-bold">
                  AudioSocket + SIP Ext 1001
                </span>
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            เชื่อมสัญญาณเสียงสดจากเบอร์ <span className="text-emerald-400 font-mono font-bold">{pilotNumber}</span> ผ่าน NT เข้าสู่ Cloud Run Endpoint: 
            <a 
              href={bridgeConfig.aiEndpointUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="text-purple-300 hover:text-white font-mono underline ml-1 inline-flex items-center gap-0.5"
            >
              <span>{bridgeConfig.aiEndpointUrl}</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('live_test')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeTab === 'live_test'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3 h-3" />
            จำลองสายโทรเข้า (Call Simulator)
          </button>
          <button
            onClick={() => setActiveTab('dialplan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'dialplan'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Dialplan Asterisk
          </button>
        </div>
      </div>

      {/* Simulator View */}
      {activeTab === 'live_test' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                การทดสอบจำลองสายโทรเข้า DID {pilotNumber} ➔ น้องฟ้าใส ➔ โอนเข้า Yealink T30
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                จำลองพฤติกรรมจริง: เมื่อลูกค้าคุยกับน้องฟ้าใสแล้วขอมนุษย์ สายจะถูกส่งไปดังที่เครื่อง Yealink T30 บนโต๊ะทำงานทันที
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={startSimulation}
                disabled={simState !== 'idle' && simState !== 'ended'}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30"
              >
                <Play className="w-4 h-4" />
                <span>เริ่มจำลองการโทรจริง</span>
              </button>
              {simState !== 'idle' && (
                <button
                  onClick={() => { setSimState('idle'); setSimLog([]); }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 4 Steps Interactive Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className={`p-4 rounded-xl border text-center transition-all ${
              simState === 'calling'
                ? 'bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/20'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="text-xs text-slate-400">1. ผู้โทรภายนอก (NT)</div>
              <div className="font-mono text-cyan-400 font-bold text-sm mt-1">
                {simState === 'calling' ? 'กำลังเรียกสาย...' : 'DID 024307709'}
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-center transition-all ${
              simState === 'connected'
                ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="text-xs text-slate-400">2. Asterisk VM (GCP)</div>
              <div className="font-mono text-emerald-400 font-bold text-sm mt-1">
                {simState === 'connected' ? 'AudioSocket :9092' : fqdn}
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-center transition-all ${
              simState === 'ai_speaking' || simState === 'customer_speaking'
                ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="text-xs text-slate-400">3. น้องฟ้าใส (Cloud Run)</div>
              <div className="font-mono text-purple-400 font-bold text-sm mt-1">
                {simState === 'ai_speaking' ? 'น้องฟ้าใส กำลังคุย 🎙️' : 'AI Telesales'}
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-center transition-all ${
              simState === 'transferred_to_yealink'
                ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/40 animate-pulse'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="text-xs text-slate-400">4. Yealink T30 (บนโต๊ะ)</div>
              <div className="font-mono text-amber-300 font-bold text-sm mt-1">
                {simState === 'transferred_to_yealink' ? '🔔 กริ่งดังที่โต๊ะทำงาน!' : `Ext ${bridgeConfig.fallbackExtension}`}
              </div>
            </div>
          </div>

          {/* Console Output */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs min-h-[170px] max-h-[250px] overflow-y-auto space-y-1.5">
            {simLog.length === 0 ? (
              <div className="text-slate-500 text-center py-8">
                กดปุ่ม "เริ่มจำลองการโทรจริง" เพื่อทดสอบทราฟฟิกลำดับเหตุการณ์ NT ➔ GCP ➔ น้องฟ้าใส ➔ Yealink T30
              </div>
            ) : (
              simLog.map((log, idx) => (
                <div key={idx} className={
                  log.includes('🔔')
                    ? 'text-amber-300 font-bold text-sm bg-amber-950/40 p-1.5 rounded'
                    : log.includes('น้องฟ้าใส')
                    ? 'text-purple-300 font-medium'
                    : log.includes('ลูกค้าพูด')
                    ? 'text-cyan-300 font-semibold'
                    : log.includes('200 OK')
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'dialplan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400">
              นำโค้ดนี้ไปวางในไฟล์: <code className="text-purple-400">/etc/asterisk/extensions_custom.conf</code> บน GCP VM
            </span>
            <button
              onClick={() => copyToClipboard(dialplanCustomConf, 'dialplan')}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700"
            >
              {copiedKey === 'dialplan' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกเรียบร้อย!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอก Dialplan</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-purple-300 overflow-x-auto border border-slate-800 leading-relaxed max-h-[460px]">
            {dialplanCustomConf}
          </pre>
        </div>
      )}
    </div>
  );
};
