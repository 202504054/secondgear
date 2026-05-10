import Groq from "groq-sdk";

const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

type Message = {
  role: "system" | "user";
  content: string;
};

export async function createChatCompletion(messages: Message[]) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing");
  }

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content ?? "";
}
