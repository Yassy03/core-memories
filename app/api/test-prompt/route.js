import { GoogleGenerativeAI } from "@google/generative-ai";
import workflow from '../generate/workflow.json'

export const maxDuration = 120

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function wrapPrompt(sceneDescription) {
  const prefix = "m8vic2 style, amateur photography, harsh direct flash, low resolution";
  const suffix = "harsh direct flash, 2000s aesthetic, date stamp in the corner, low quality digital photo, motion blur, red-eye effect, overexposed skin, atmospheric noise";
  return `${prefix}, ${sceneDescription}, ${suffix}`;
}

function buildWorkflow(finalPrompt) {
  const wf = JSON.parse(JSON.stringify(workflow))
  wf["8"].inputs.text = finalPrompt
  return wf
}

export async function POST(request) {
  const { memory } = await request.json();

  // Stage 1: Gemini
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `You are a prompt generator for an image model, your job is to interpret a subjective memory into a scene. 
    Describe the scene the picture taker would be looking at if an image was taken at the place this memory took place. Describe it in simple terms. 
    No flowery language, just the things you would see and where you would see them. Do not include the person having the memory in the description, just the scene.
    No first person. Keep it simple.`,
  });

  const result = await model.generateContent(memory);
  const sceneDescription = result.response.text()
    .trim()
    .replace(/\n/g, ', ')
    .replace(/\s+/g, ' ')

  const finalPrompt = wrapPrompt(sceneDescription);

  // Stage 2: send to Modal
  // Stage 2: send workflow directly to Modal
  const modalRes = await fetch(process.env.COMFYUI_HOST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildWorkflow(finalPrompt)),
  });

  const data = await modalRes.json();

  if (data.error) {
    return Response.json({ error: data.error }, { status: 504 });
  }

  return Response.json({ imageData: data.imageData });
}