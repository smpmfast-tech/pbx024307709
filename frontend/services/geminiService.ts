import { GoogleGenAI } from '@google/genai';

export const askVoiceArchitect = async (query: string, contextPrompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [
          {
            text: `คุณคือ Senior Telecom & Voice Architecture Engineer ผู้เชี่ยวชาญพิเศษระดับ CCIE Collaboration / Asterisk dCAP 
เกี่ยวกับระบบ FreePBX, Asterisk PJSIP, และผู้ให้บริการโทรคมนาคมในไทย (NT - National Telecom / TOT / CAT).

ข้อมูลระบบของผู้ใช้ปัจจุบัน:
- Pilot DID: 024307709
- FQDN / Domain: pbx.711shopping.com
- ระบบ: FreePBX 16/17 + Asterisk 20 PJSIP
${contextPrompt}

คำถามจากวิศวกรผู้ใช้:
${query}

โปรดตอบเป็นภาษาไทยอย่างกระชับ แม่นยำ เชิงเทคนิคระดับวิศวกรรม (PJSIP syntax, sngrep, Asterisk CLI, Firewall iptables/UFW, NAT traversal, Thai numbering dialplan) พร้อม Code snippet หรือ CLI command ที่ชัดเจน`
          }
        ]
      },
      config: {
        systemInstruction: 'Senior Telecom & VoIP Infrastructure Engineer with deep Asterisk, PJSIP and Thailand NT Telecom expertise.'
      }
    });

    return response.text || 'ไม่สามารถรับคำตอบจากระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';
  } catch (err: any) {
    console.error('Gemini Voice Architect Error:', err);
    return `เกิดข้อผิดพลาดในการประมวลผลคำแนะนำ: ${err.message || 'Unknown network error'}`;
  }
};
