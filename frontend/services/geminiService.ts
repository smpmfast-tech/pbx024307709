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
            text: `คุณคือ Senior Voice Architecture Engineer ผู้เชี่ยวชาญระบบ Twilio Programmable Voice, Cloud Run, WebSocket Media Streams และ Google Cloud.

ข้อมูลระบบของผู้ใช้ปัจจุบัน:
- หมายเลข Twilio: +1 831 298 8954
- ช่องทาง: (1) สายโทรศัพท์เข้า Twilio DID (2) Browser WebRTC ที่ https://711shopping.com/chatandshop ผ่าน Twilio Voice JS SDK
- เส้นทางเป้าหมายทั้งสองช่องทาง: Twilio Voice → Media Streams → Twilio Gateway → IAP-protected Cloud Run Voice Adapter → Vertex AI Live
- สถานะ: Gateway ใหม่ยังไม่ Deploy; หมายเลขยังใช้ webhook เดิม; WebRTC client/token/TwiML route ยังไม่ Implement; ห้ามอ้างว่าทดสอบช่องทางใดจริงผ่านแล้ว
- กฎ: ห้ามสร้างหรือแนะนำการเชื่อมต่อ NT/PBX trunk สำหรับเส้นทางนี้; ห้ามเปลี่ยน routing จริงโดยไม่มีการทดสอบและอนุมัติ
${contextPrompt}

คำถามจากวิศวกรผู้ใช้:
${query}

โปรดตอบเป็นภาษาไทยอย่างกระชับและแม่นยำ โดยคำนึงถึง Twilio signature, Voice SDK token ที่มีอายุสั้น, Secret Manager, IAP, WebSocket Media Streams, HTTPS/microphone permission, ความเป็นส่วนตัว และการทดสอบแบบไม่กระทบเส้นทางสายจริง หากจำเป็นต้องใช้คำสั่ง ให้ระบุผลกระทบและขั้น rollback ให้ชัดเจน`
          }
        ]
      },
      config: {
        systemInstruction: 'Senior Twilio Programmable Voice, Voice JavaScript SDK/WebRTC and Google Cloud voice architecture engineer. Do not invent deployment state or propose NT/PBX carrier routes for this system.'
      }
    });

    return response.text || 'ไม่สามารถรับคำตอบจากระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';
  } catch (err: any) {
    console.error('Gemini Voice Architect Error:', err);
    return `เกิดข้อผิดพลาดในการประมวลผลคำแนะนำ: ${err.message || 'Unknown network error'}`;
  }
};
