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

export async function generateCBTResponse(history: { role: "user" | "model"; parts: { text: string }[] }[]) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      history,
      systemInstruction: CBT_SYSTEM_INSTRUCTION
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate response');
  }
  
  const data = await response.json();
  return data.text;
}

export async function generateGoalReport(goals: any[], language: "ru" | "en") {
  const prompt = language === "ru" 
    ? `Проанализируй мои цели и прогресс: ${JSON.stringify(goals)}. Дай краткий отчет, похвали за успехи и дай советы по улучшению.`
    : `Analyze my goals and progress: ${JSON.stringify(goals)}. Provide a short report, praise successes, and give suggestions for improvement.`;

  const response = await fetch('/api/goals/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      systemInstruction: "You are an AI productivity coach and therapist. Be encouraging and analytical."
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate report');
  }

  const data = await response.json();
  return data.text;
}
