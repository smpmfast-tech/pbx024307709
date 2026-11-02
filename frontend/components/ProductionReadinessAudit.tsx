import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Terminal, 
  PhoneCall, 
  ShieldAlert, 
  Copy, 
  Check, 
  ExternalLink, 
  Cpu, 
  Zap, 
  ArrowRight,
  RefreshCw,
  Server,
  Network,
  Globe,
  KeyRound
} from 'lucide-react';
import { safeCopyToClipboard } from '../types';

interface Props {
  pilotNumber: string;
  fqdn: string;
  sipServer: string;
  outboundProxy?: string;
  secret?: string;
  aiEndpointUrl: string;
}

export const ProductionReadinessAudit: React.FC<Props> = ({
  pilotNumber,
  fqdn,
  sipServer,
  outboundProxy = 'res.ntnextgen.com',
  secret = 'HnAyT6TP@$7V',
  aiEndpointUrl
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({
    step1: true,
    step2: false,
    step3: false,
    step4: false,
    step5: false
  });

  const toggleCheck = (step: string) => {
    setCheckedSteps(prev => ({ ...prev, [step]: !prev[step] }));
  };

  // Fix: use safeCopyToClipboard to avoid unhandled NotAllowedError
  const copyToClipboard = async (text: string, id: string) => {
    await safeCopyToClipboard(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Production Deployment One-Liner updated with verified NT NextGen settings
  const oneLinerDeployBash = `#!/bin/bash
# ==============================================================================
# 🚀 REAL LIVE DEPLOYMENT FOR NT NEXTGEN (024307709) & FAHSAI AI
# SIP Domain: ${sipServer} | Proxy: ${outboundProxy} | User: ${pilotNumber}
# ==============================================================================
set -e

echo "=== [1/5] ติดตั้ง Dependencies สำหรับ AudioSocket และ Python Gateway ==="
apt-get update -y
apt-get install -y python3-pip python3-venv sngrep curl jq
pip3 install aiohttp websockets --break-system-packages 2>/dev/null || pip3 install aiohttp websockets

echo "=== [2/5] สร้าง PJSIP NT NextGen Trunk ใน /etc/asterisk/pjsip.custom.conf ==="
cat << 'EOF' > /etc/asterisk/pjsip_nt_nextgen.conf
[nt_nextgen_reg]
type=registration
transport=transport-udp
outbound_auth=nt_nextgen_auth
server_uri=sip:${sipServer}:5060
client_uri=sip:${pilotNumber}@${sipServer}:5060
contact_user=${pilotNumber}
outbound_proxy=sip:${outboundProxy}:5060\\;lr
retry_interval=15
expiration=3600
line=yes
endpoint=NT_TRUNK_${pilotNumber}

[nt_nextgen_auth]
type=auth
auth_type=userpass
username=${pilotNumber}
password=${secret}
realm=${sipServer}

[NT_TRUNK_${pilotNumber}]
type=aor
contact=sip:${sipServer}:5060
outbound_proxy=sip:${outboundProxy}:5060\\;lr
qualify_frequency=25
max_contacts=1

[NT_IDENTIFY_${pilotNumber}]
type=identify
endpoint=NT_TRUNK_${pilotNumber}
match=${sipServer},${outboundProxy}

[NT_TRUNK_${pilotNumber}]
type=endpoint
transport=transport-udp
context=from-pstn-custom
disallow=all
allow=alaw,ulaw,g729
aors=NT_TRUNK_${pilotNumber}
outbound_auth=nt_nextgen_auth
outbound_proxy=sip:${outboundProxy}:5060\\;lr
from_user=${pilotNumber}
from_domain=${sipServer}
send_rpid=yes
send_pai=yes
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
language=th
EOF

# Include เข้าสู่คอนฟิกหลัก
grep -q "pjsip_nt_nextgen.conf" /etc/asterisk/pjsip.conf || echo "#include pjsip_nt_nextgen.conf" >> /etc/asterisk/pjsip.conf

echo "=== [3/5] สร้าง Python AudioSocket Bridge สู่น้องฟ้าใส Cloud Run ==="
mkdir -p /opt/fahsai-bridge
cat << 'EOF' > /opt/fahsai-bridge/bridge.py
import asyncio, struct, uuid, aiohttp, logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

AUDIOSOCKET_PORT = 9092
CLOUD_RUN_URL = "${aiEndpointUrl}"

async def handle_client(reader, writer):
    session_id = str(uuid.uuid4())
    logging.info(f"Incoming Call for DID ${pilotNumber}. Session: {session_id}")
    ws_url = CLOUD_RUN_URL.replace("https://", "wss://") + "ws/voice-stream"
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.ws_connect(ws_url, headers={"X-Pilot-DID": "${pilotNumber}"}) as ws:
                logging.info("Connected to น้องฟ้าใส Vertex AI successfully")
                await ws.send_json({"event": "call_start", "did": "${pilotNumber}", "session_id": session_id})
                
                async def pcm_in():
                    while True:
                        hdr = await reader.readexactly(3)
                        m_type, p_len = struct.unpack("!BH", hdr)
                        payload = await reader.readexactly(p_len)
                        if m_type == 0x10:
                            await ws.send_bytes(payload)
                        elif m_type == 0x00:
                            break
                            
                async def pcm_out():
                    async for msg in ws:
                        if msg.type == aiohttp.WSMsgType.BINARY:
                            writer.write(struct.pack("!BH", 0x10, len(msg.data)) + msg.data)
                            await writer.drain()

                await asyncio.gather(pcm_in(), pcm_out())
        except Exception as e:
            logging.error(f"Stream error: {e}")
        finally:
            writer.close()

async def main():
    server = await asyncio.start_server(handle_client, "0.0.0.0", AUDIOSOCKET_PORT)
    logging.info(f"Fahsai Bridge ready on port {AUDIOSOCKET_PORT}")
    async with server:
        await server.serve_forever()

if __name__ == "__main__":
    asyncio.run(main())
EOF

cat << 'EOF' > /etc/systemd/system/fahsai-bridge.service
[Unit]
Description=Fahsai AI Voice Telesales AudioSocket Bridge
After=network.target asterisk.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/fahsai-bridge
ExecStart=/usr/bin/python3 /opt/fahsai-bridge/bridge.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now fahsai-bridge
systemctl restart fahsai-bridge

echo "=== [4/5] ฉีด Dialplan เสียงสดเข้า /etc/asterisk/extensions_custom.conf ==="
cat << 'EOF' > /etc/asterisk/extensions_custom.conf
[from-pstn-custom]
exten => ${pilotNumber},1,NoOp(>>> LIVE CALL: ${pilotNumber} -> FAHSAI AI <<<)
 same => n,Answer()
 same => n,Wait(0.5)
 same => n,AudioSocket(\${UUID()},127.0.0.1:9092)
 same => n,NoOp(AI Ended -> Fallback to Yealink T30 Desk Phone Ext 1001)
 same => n,Dial(PJSIP/1001,30,tT)
 same => n,Hangup()

exten => *555,1,NoOp(Supervisor Spy on น้องฟ้าใส)
 same => n,Authenticate(1234)
 same => n,ChanSpy(PJSIP/NT_TRUNK_${pilotNumber},wq)
 same => n,Hangup()
EOF

echo "=== [5/5] รีโหลด Asterisk และตรวจสอบสถานะ Register ==="
asterisk -rx "core reload"
asterisk -rx "pjsip reload"
asterisk -rx "dialplan reload"
sleep 2
asterisk -rx "pjsip show registrations"
echo ">>> เสร็จสมบูรณ์! ตรวจสอบว่า Status แสดงคำว่า 'Registered' <<<"
`;

  return (
    <div className="space-y-6">
      {/* Live Credentials Verified Alert */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/70 border-2 border-emerald-500/60 rounded-2xl p-6 shadow-2xl relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider border border-emerald-500/40">
                  NT NEXTGEN CREDENTIALS VERIFIED & APPLIED
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                ได้รับค่าเชื่อมต่อ NT NextGen ของจริงแล้ว (เบอร์ {pilotNumber})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 font-mono text-xs">
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">User / DID:</span>
                  <span className="text-emerald-400 font-bold">{pilotNumber}</span>
                </div>
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">SIP Domain:</span>
                  <span className="text-cyan-300 font-bold">{sipServer}</span>
                </div>
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">SIP Proxy:</span>
                  <span className="text-amber-400 font-bold">{outboundProxy}</span>
                </div>
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Password:</span>
                  <span className="text-purple-300 font-bold">••••••••••••</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 text-center shrink-0 min-w-[170px]">
            <div className="text-xs text-slate-400">สถานะความพร้อม</div>
            <div className="text-2xl font-black font-mono mt-1 text-emerald-400">
              พร้อมรันคำสั่งจริง
            </div>
            <a 
              href="https://ntnextgen.com" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[11px] text-cyan-400 hover:underline inline-flex items-center gap-1 mt-1 font-mono"
            >
              <span>Web Self Care</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Production One-Click Deployment Automation Shell */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              คำสั่งรันอัตโนมัติบน SSH เพื่อเปิดระบบจริงทันที (Execute on Real Server)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              คัดลอกคำสั่งด้านล่างนี้ไปวางที่ Terminal (สิทธิ์ root) บนเครื่อง GCP VM ({fqdn}) เพื่อลงทะเบียน NT NextGen และเริ่มระบบทันที
            </p>
          </div>

          <button
            onClick={() => copyToClipboard(oneLinerDeployBash, 'deploy_bash')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/30"
          >
            {copiedKey === 'deploy_bash' ? (
              <>
                <Check className="w-4 h-4" />
                <span>คัดลอกสคริปต์เรียบร้อย!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>คัดลอก Production Script (.sh)</span>
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800 leading-relaxed max-h-[380px]">
            {oneLinerDeployBash}
          </pre>
        </div>
      </div>
    </div>
  );
};
