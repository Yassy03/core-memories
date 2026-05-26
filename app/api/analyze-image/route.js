import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 30

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  const { imageData } = await request.json();

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `You analyze photographs and identify visual elements. Identify exactly 3-4 distinct objects, textures, or atmospheric details in the image. For each return:
- label: 1-2 word name
- description: 8-12 words, specific and evocative, describing exactly what you see
- point: [y, x] coordinates where both are integers between 0 and 1000 (0,0 = top-left corner, 1000,1000 = bottom-right corner). Place the point ON the element, not near it.

Return ONLY a valid JSON array. No markdown, no explanation, no code fences.
Example: [{"label":"wooden floor","description":"rough grain planks with scattered dust catching light","point":[820,340]}]`,
  });

  const result = await model.generateContent([
    { inlineData: { data: imageData, mimeType: "image/png" } },
    "Identify the key visual elements in this photograph.",
  ]);

  const text = result.response.text().trim()
    .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const objects = JSON.parse(text);
    return Response.json({ objects: objects.slice(0, 4) });
  } catch {
    return Response.json({ error: 'Parse failed', raw: text }, { status: 500 });
  }
}
