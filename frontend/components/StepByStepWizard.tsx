import React, { useState } from 'react';
import { TrunkConfig, safeCopyToClipboard } from '../types';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Terminal, 
  Copy, 
  Check, 
  PhoneCall, 
  Play, 
  ExternalLink, 
  ShieldCheck, 
  RefreshCw, 
  Cloud, 
  Server, 
  Layers, 
  Sparkles, 
  AlertTriangle, 
  Keyboard, 
  Wrench, 
  Flame, 
  CheckSquare, 
  Zap, 
  Globe, 
  KeyRound, 
  Search, 
  Activity, 
  Radio, 
  Bug, 
  Eye, 
  FileSearch, 
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface Props {
  config: TrunkConfig;
}

export const StepByStepWizard: React.FC<Props> = ({ config }) => {
  const [currentStep, setCurrentStep] = useState<number>(3);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<'wizard' | 'voip4share'>('wizard');

  const copyToClipboard = async (text: string, id: string) => {
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    await safeCopyToClipboard(cleanText);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const markComplete = (stepNum: number) => {
    if (stepNum < 6) {
      setCurrentStep(stepNum + 1);
    }
  };

  // VoIP4Share Thailand Standard Script for NT NextGen:
  // 1. Dumps exact SIP response header with error details (403 Forbidden vs 401 Unauthorized)
  // 2. Tests the proven VoIP4Share config template with clean password and without host /tmp issues
  const voip4shareDiagnosticCommand = `sudo bash -c '
echo "=========================================================="
echo "📡 VoIP4Share Thailand: ดึงข้อมูลการตอบกลับสดจาก NT NextGen"
echo "=========================================================="

# 1. บันทึกคอนฟิกมาตรฐาน VoIP4Share สำหรับ NT NextGen ลง Asterisk โดยตรง
cat << "EOF" | docker exec -i asterisk sh -c "cat > /etc/asterisk/pjsip.conf"
[global]
type=global
user_agent=Yealink SIP-T30 1.0.0

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
local_net=10.148.0.0/20
external_media_address=34.142.220.2
external_signaling_address=34.142.220.2

; === VoIP4Share NT NextGen Template ===
[nt_reg]
type=registration
transport=transport-udp
outbound_auth=nt_auth
server_uri=sip:sip.ntnextgen.com:5060
client_uri=sip:024307709@sip.ntnextgen.com:5060
contact_user=024307709
outbound_proxy=sip:res.ntnextgen.com:5060\\;lr
retry_interval=10
auth_rejection_permanent=no
forbidden_retry_interval=15
expiration=3600
line=yes
endpoint=NT_024307709

[nt_auth]
type=auth
auth_type=userpass
username=024307709
password=HnAyT6TP@$7V

[NT_024307709]
type=aor
contact=sip:sip.ntnextgen.com:5060
outbound_proxy=sip:res.ntnextgen.com:5060\\;lr
qualify_frequency=25
max_contacts=1

[NT_IDENTIFY]
type=identify
endpoint=NT_024307709
match=sip.ntnextgen.com,res.ntnextgen.com,ent.ntnextgen.com,202.129.60.39,202.129.60.40

[NT_024307709]
type=endpoint
transport=transport-udp
context=from-pstn
disallow=all
allow=alaw,ulaw,g729
aors=NT_024307709
outbound_auth=nt_auth
outbound_proxy=sip:res.ntnextgen.com:5060\\;lr
from_user=024307709
from_domain=sip.ntnextgen.com
send_rpid=yes
send_pai=yes
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
EOF

# 2. เปิดดักแพ็กเก็ต SIP แล้วส่งคำขอลงทะเบียน
docker exec asterisk asterisk -rx "pjsip set logger on" >/dev/null 2>&1
docker exec asterisk asterisk -rx "pjsip reload" >/dev/null 2>&1
sleep 2
docker exec asterisk asterisk -rx "pjsip send register nt_reg" >/dev/null 2>&1
sleep 3
docker exec asterisk asterisk -rx "pjsip set logger off" >/dev/null 2>&1

echo ""
echo "=========================================================="
echo "ผลการตรวจสอบสถานะ (Status):"
echo "=========================================================="
docker exec asterisk asterisk -rx "pjsip show registrations"

echo ""
echo ">>> ข้อความจริงที่ NT ตอบกลับมา (SIP Response):"
docker logs --tail 40 asterisk 2>&1 | grep -iE "SIP/2.0 (200|401|403|404|407|500)|WWW-Authenticate|Reason:" | tail -n 5
'`;

  // Step 5 Command: Start Fahsai AI Voice AudioSocket Bridge Service
  const step5AudioSocketCommand = `sudo bash -c 'mkdir -p /opt/fahsai-bridge

cat << "EOF" > /opt/fahsai-bridge/bridge.py
import asyncio, struct, uuid, aiohttp, logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

AUDIOSOCKET_PORT = 9092
CLOUD_RUN_URL = "https://genai-app-fahsaiaivoicetelesales-al-1-17935438439-413450112749.asia-southeast1.run.app/"

async def handle_client(reader, writer):
    session_id = str(uuid.uuid4())
    logging.info(f"Connecting Fahsai AI for DID 024307709, Session: {session_id}")
    ws_url = CLOUD_RUN_URL.replace("https://", "wss://") + "ws/voice-stream"
    async with aiohttp.ClientSession() as session:
        try:
            async with session.ws_connect(ws_url, headers={"X-Pilot-DID": "024307709"}) as ws:
                await ws.send_json({"event": "call_start", "did": "024307709", "session_id": session_id})
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
    logging.info("Fahsai Bridge ready on port 9092")
    async with server:
        await server.serve_forever()

if __name__ == "__main__":
    asyncio.run(main())
EOF

cat << "EOF" > /etc/systemd/system/fahsai-bridge.service
[Unit]
Description=Fahsai AI Voice Bridge
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /opt/fahsai-bridge/bridge.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Route incoming calls to Fahsai AI
docker exec -i asterisk bash -c "cat << \\"EOF\\" >> /etc/asterisk/extensions.conf
[from-pstn]
exten => 024307709,1,NoOp(>>> INCOMING CALL 024307709 -> FAHSAI AI <<<)
 same => n,Answer()
 same => n,Wait(0.5)
 same => n,AudioSocket(\${UUID()},127.0.0.1:9092)
 same => n,Hangup()
EOF
"

systemctl daemon-reload
systemctl enable --now fahsai-bridge
docker exec asterisk asterisk -rx "dialplan reload" >/dev/null 2>&1
echo "Fahsai Voice Bridge started successfully!"
'`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-4xl mx-auto space-y-6">
      {/* VoIP4Share Header Guide */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border-2 border-emerald-500/70 p-5 rounded-xl shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">แนวทางวิศวกรรมโทรคมนาคม (มาตรฐาน VoIP4Share Thailand)</span>
                <span className="text-[10px] font-mono bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded font-bold border border-emerald-700">
                  VOIP4SHARE EXPERT
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                อ้างอิงแนวทางแก้ไขเบอร์ TOT / NT NextGen จากชุมชนวิศวกรเสียง VoIP4Share.com
              </p>
            </div>
          </div>
          <a
            href="https://www.voip4share.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-cyan-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-all flex items-center gap-1 shrink-0"
          >
            <span>voip4share.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* VoIP4Share Insights */}
        <div className="bg-slate-950/90 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2 font-sans">
          <p className="font-semibold text-white">
            จากประสบการณ์วิศวกรใน <b>VoIP4Share</b> เมื่อต่อ NT NextGen แล้วขึ้น <code className="text-amber-400 font-mono">Rejected</code> มีข้อชี้ชัด 2 ข้อ:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
              <b className="text-cyan-300 block mb-0.5">1. ปัญหา User-Agent:</b>
              NT NextGen บางโหนดจะ Reject หากใช้ User-Agent ของ Asterisk โดยตรง จึงต้องปลอมเป็น <code className="text-white font-mono">Yealink SIP-T30 1.0.0</code>
            </div>
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
              <b className="text-amber-300 block mb-0.5">2. การตรวจสอบ IP ล็อกของ NT:</b>
              เบอร์ NT NextGen บางแพ็กเกจจะล็อกให้ใช้งานเฉพาะ IP ในไทย หรือต้องแจ้ง NT NOC เพื่อปลดล็อก IP ของ Google Cloud (34.142.220.2)
            </div>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            โหมดติดตั้งทีละ 1 ขั้นตอน (Step-by-Step Installation)
          </span>
          <span className="font-mono text-white">ขั้นตอนที่ 3 จาก 6</span>
        </div>
        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(3 / 6) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Header Title */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/60 text-emerald-400 font-bold font-mono text-lg flex items-center justify-center shrink-0">
          3
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">
            รันคำสั่งมาตรฐาน VoIP4Share (ปรับ User-Agent Yealink + แสดงผลลัพธ์ทันที)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            คำสั่งนี้เขียนตรงเข้า Asterisk ไม่ผ่านโฟลเดอร์ /tmp ไม่ติด Permission denied และจะพ่นผลลัพธ์ออกจอทันที
          </p>
        </div>
      </div>

      {/* Command Card */}
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm block">
              กดปุ่มสีเขียว "คัดลอกคำสั่ง" ไปวางในหน้าจอ smpmfast@asterisk-vm:~$ แล้วกด Enter:
            </span>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 p-4 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800 leading-relaxed max-h-56">
              {voip4shareDiagnosticCommand}
            </pre>
            <button
              onClick={() => copyToClipboard(voip4shareDiagnosticCommand, 'voip4share_cmd')}
              className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition-all shadow-lg shadow-emerald-600/30"
            >
              {copiedKey === 'voip4share_cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'voip4share_cmd' ? 'คัดลอกแล้ว!' : 'คัดลอกคำสั่งนี้'}</span>
            </button>
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/90 rounded-lg border border-slate-800 text-slate-300 text-xs space-y-1.5">
          <span className="font-semibold text-white block">สิ่งที่คำสั่งนี้จะบอกคุณในหน้าจอ:</span>
          <p>• <b>บรรทัดผลการลงทะเบียน:</b> จะดูว่าเปลี่ยนเป็น <code className="text-emerald-400 font-mono font-bold">Registered</code> หรือไม่</p>
          <p>• <b>บรรทัดข้อความจริงที่ NT ตอบ:</b> จะบอกเลยว่า NT ปฏิเสธด้วยเหตุผลใด (เช่น 403 Forbidden หรือ 401 Challenge)</p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ย้อนกลับ</span>
        </button>

        <button
          onClick={() => markComplete(3)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/30"
        >
          <span>ไปขั้นตอนถัดไป (เปิดรับสาย AI)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
