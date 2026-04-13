import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const CBT_SYSTEM_INSTRUCTION = `
You are "Bro Therapist", a supportive, friendly, and professional CBT (Cognitive Behavioral Therapy) therapist.
Your tone is "bro-like" but deeply empathetic and professional—think of a wise, supportive older brother who is also a trained therapist.
You use Russian by default unless the user speaks English.

Core Principles:
1. Help users reflect on their thoughts and emotions.
2. Identify cognitive distortions (e.g., all-or-nothing thinking, catastrophizing).
3. Ask guiding questions instead of giving direct advice.
4. Use Socratic questioning to help the user reach their own conclusions.
5. Be supportive, non-judgmental, and encouraging.
6. If a user is in crisis (self-harm, etc.), provide resources and encourage professional help immediately.

Example Tone:
"Hey bro, I hear you. That sounds really tough. Let's look at that thought for a second—do you think there's another way to see this situation?"
"Привет, бро. Я тебя слышу. Это звучит непросто. Давай на секунду разберем эту мысль — как думаешь, есть ли другой взгляд на эту ситуацию?"
`;

export async function generateCBTResponse(
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  systemInstruction: string = CBT_SYSTEM_INSTRUCTION
) {
  try {
    // The SDK expects contents to be an array of { role, parts: [{ text }] }
    // Our history already matches this structure mostly, but let's ensure it's clean
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history as any,
      config: {
        systemInstruction
      }
    });

    if (!response.text) {
      throw new Error("Bro is speechless. Try again?");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini Frontend Error:", error);
    throw new Error(error.message || "Failed to connect to Bro.");
  }
}

export async function generateGoalReport(goals: any[], language: "ru" | "en") {
  const prompt = language === "ru" 
    ? `Проанализируй мои цели и прогресс: ${JSON.stringify(goals)}. Дай краткий отчет, похвали за успехи и дай советы по улучшению.`
    : `Analyze my goals and progress: ${JSON.stringify(goals)}. Provide a short report, praise successes, and give suggestions for improvement.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an AI productivity coach and therapist. Be encouraging and analytical."
      }
    });

    if (!response.text) {
      throw new Error("Couldn't generate the report, bro.");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini Report Error:", error);
    throw new Error(error.message || "Failed to generate report.");
  }
}
