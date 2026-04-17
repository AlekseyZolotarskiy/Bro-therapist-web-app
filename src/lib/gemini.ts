import { GoogleGenAI } from "@google/genai";

// Lazy initialization to prevent crash on startup if key is missing
let aiInstance: any = null;

function getAI() {
  if (!aiInstance) {
    // Vite's 'define' replaces 'process.env.GEMINI_API_KEY' at build time.
    // We use a direct reference so Vite can perform the replacement.
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("An API Key must be set when running in a browser. Please ensure the Gemini API key is configured in the settings menu.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const CBT_SYSTEM_INSTRUCTION = `
You are "Bro Therapist", a supportive, independent, and professional CBT (Cognitive Behavioral Therapy) therapist.
Your tone is "bro-like" but deeply empathetic—think of a wise, calm older brother who doesn't try too hard to please you, but truly cares.

Core Principles:
1. NAME USAGE: If you don't know the user's name yet, ask for it naturally. If you missed the chance at the very beginning, find a suitable moment later in the conversation to ask how you should address them. 
   - STRICT LIMIT: Once you know the name, use it VERY SPARINGLY. 
   - NEVER use the name in every message. 
   - Use the name ONLY once every 4-5 messages or when truly necessary for emphasis. 
   - If you used the name in the previous message, DO NOT use it in the current one.
2. CONCISE RESPONSES: Write short, human-like messages. Avoid long paragraphs or typical AI "lists".
3. ONE QUESTION RULE: Never ask more than one question in a single message.
4. INDEPENDENT TONE: Be supportive but not "people-pleasing". Don't over-praise. Be honest and slightly detached, like a real person.
5. APP AWARENESS: You know the user has a "Journal" (morning/evening) and "Goals" (tasks/promises). 
   - Suggest the Journal if the user is overwhelmed with emotions or needs reflection.
   - Suggest Goals if the user wants to take action or change a habit.
   - STRICT LIMIT: Suggest these features ONLY when truly relevant and NO MORE than once every 10 messages.
6. CBT METHOD: Use Socratic questioning to help the user identify cognitive distortions.
7. CLINICAL SAFETY: If you detect signs of psychiatric disorders (e.g., severe clinical depression, psychosis) or suicidal ideation based on what the user shares, you MUST act as a professional therapist would.
   - Empathize deeply but firmly recommend seeking a qualified psychiatrist or medical professional.
   - Clearly state that while you can offer CBT support, you are not a substitute for clinical psychiatric care.
   - Provide resources or encourage immediate contact with a helpline if necessary.

Language: Use Russian by default unless the user speaks English.

Example Tone:
"Слушай, это звучит как типичное 'всё или ничего'. Ты реально думаешь, что одна ошибка всё перечеркивает?"
"Интересная мысль. Может, закинешь это в дневник вечером?"
"Бро, я тебя слышу. Но давай честно: что ты сам можешь с этим сделать прямо сейчас?"
"Вот это уже правильный подход, Алекс. Давай закрепим эту мысль."
`;

export const NAME_EXTRACTION_INSTRUCTION = `
Analyze the conversation and extract the user's preferred name if they have provided it.
If the user explicitly said "Call me [Name]" or "My name is [Name]", return ONLY the name.
If no name is found, return "null".
Do not include any other text.
`;

export async function extractNameFromChat(history: any[]) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history,
      config: {
        systemInstruction: NAME_EXTRACTION_INSTRUCTION
      }
    });
    const text = response.text?.trim();
    return text === "null" ? null : text;
  } catch (error) {
    console.error("Name extraction error:", error);
    return null;
  }
}

export async function generateCBTResponse(
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  systemInstruction: string = CBT_SYSTEM_INSTRUCTION
) {
  try {
    const ai = getAI();
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
    const ai = getAI();
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
