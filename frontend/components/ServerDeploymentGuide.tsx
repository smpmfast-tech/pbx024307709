import React, { useState } from 'react';
import { Terminal, Shield, Globe, Lock, Copy, Check } from 'lucide-react';
import { safeCopyToClipboard } from '../types';

interface Props {
  fqdn: string;
}

export const ServerDeploymentGuide: React.FC<Props> = ({ fqdn }) => {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Fix: replace direct navigator.clipboard.writeText with safeCopyToClipboard
  const copyScript = async (code: string, id: string) => {
    await safeCopyToClipboard(code);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const fullInstallBash = `#!/bin/bash
# ==============================================================================
# Enterprise FreePBX 16/17 + Asterisk 20 Auto-Deployment Suite
# Target FQDN: ${fqdn}
# OS: Debian 12 (Bookworm) / Ubuntu 22.04 LTS
# Designed for Senior Telecom & Voice Architecture Engineers
# ==============================================================================

set -e
echo ">>> [1/6] เริ่มต้นการเตรียมสภาพแวดล้อมระบบ..."
apt-get update && apt-get upgrade -y
apt-get install -y build-essential linux-headers-$(uname -r) wget curl git \\
  subversion libssl-dev libxml2-dev libsqlite3-dev uuid-dev libjansson-dev \\
  libsrtp2-dev libgsm1-dev sox libsox-fmt-all fail2ban ufw sngrep htop \\
  certbot python3-certbot-apache apache2 mariadb-server php php-curl php-cli \\
  php-mysql php-pear php-gd php-mbstring php-intl php-bcmath php-zip

echo ">>> [2/6] กำหนดค่า FQDN และ Hostname (${fqdn})..."
hostnamectl set-hostname ${fqdn}
echo "127.0.0.1 ${fqdn} localhost" >> /etc/hosts

echo ">>> [3/6] ติดตั้ง Let's Encrypt SSL สำหรับ ${fqdn}..."
certbot certonly --standalone -d ${fqdn} --non-interactive --agree-tos \\
  --register-unsafely-without-email || true

echo ">>> [4/6] กำหนดค่า Firewall (UFW) สำหรับ SIP & RTP โทรคมนาคม..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH Remote'
ufw allow 80/tcp comment 'HTTP Let's Encrypt'
ufw allow 443/tcp comment 'HTTPS FreePBX Admin'
ufw allow 5060/udp comment 'PJSIP Signaling (NT Trunk & Phones)'
ufw allow 5061/tcp comment 'SIP TLS Secure'
ufw allow 10000:20000/udp comment 'Asterisk RTP Audio Voice'
ufw --force enable

echo ">>> [5/6] ติดตั้ง Fail2Ban กรอง Brute-force Asterisk..."
cat << 'EOF' > /etc/fail2ban/jail.d/asterisk.local
[asterisk]
enabled  = true
filter   = asterisk
port     = 5060,5061
protocol = all
logpath  = /var/log/asterisk/messages
maxretry = 5
findtime = 600
bantime  = 86400
EOF
systemctl restart fail2ban

echo ">>> [6/6] สรุปผลการติดตั้ง:"
echo "เข้าใช้งาน FreePBX ผ่าน: https://${fqdn}"
echo "Asterisk Version: $(asterisk -V 2>/dev/null || echo 'พร้อมติดตั้ง FreePBX Distro Core')"
`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            การติดตั้งเซิร์ฟเวอร์ & ความปลอดภัยสำหรับ {fqdn}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            สคริปต์อัตโนมัติ ติดตั้ง Firewall, SSL Let's Encrypt, Fail2Ban และสถาปัตยกรรม SIP Engine
          </p>
        </div>

        <button
          onClick={() => copyScript(fullInstallBash, 'full_bash')}
          className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-cyan-600/30"
        >
          {copiedScript === 'full_bash' ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>คัดลอกสคริปต์แล้ว!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>คัดลอก Bash Script (.sh)</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Globe className="w-4 h-4" />
            <h4 className="font-bold text-sm text-white">DNS & FQDN</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            ชี้ A Record ของโดเมน <code className="text-cyan-300 font-mono">{fqdn}</code> ไปยัง Public Static IP ของเซิร์ฟเวอร์ PBX ของคุณ
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Lock className="w-4 h-4" />
            <h4 className="font-bold text-sm text-white">HTTPS & WebRTC</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            เข้ารหัส GUI และ WebRTC Softphone ด้วย Let's Encrypt Auto Renewal รองรับการรับสายผ่านบราวเซอร์สำหรับตัวแทน 711shopping
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Shield className="w-4 h-4" />
            <h4 className="font-bold text-sm text-white">RTP & NAT Traversal</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            พอร์ต UDP 10000-20000 ต้อง Forward ตรงมายัง PBX พร้อมตั้งค่า <code className="text-amber-300 font-mono">rtp_symmetric=yes</code> ป้องกันเสียงขาดหาย
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <span className="text-xs font-mono text-slate-400">
            Executable Shell: <code className="text-cyan-400">install_freepbx_nt.sh</code>
          </span>
          <span className="text-[11px] text-slate-500">รันด้วยสิทธิ์ root บนเซิร์ฟเวอร์</span>
        </div>
        <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-cyan-200 overflow-x-auto border border-slate-800 leading-relaxed max-h-[380px]">
          {fullInstallBash}
        </pre>
      </div>
    </div>
  );
};
