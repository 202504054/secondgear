// app/api/test/route.ts
export async function GET() {
  console.log("API KEY:", process.env.GROQ_API_KEY);

  return Response.json({ ok: true });
}