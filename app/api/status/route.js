export const maxDuration = 30

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const job_id = searchParams.get('job_id');

  if (!job_id) {
    return Response.json({ error: 'Missing job_id' }, { status: 400 });
  }

  const modalRes = await fetch(
    `${process.env.COMFYUI_HOST}/status/${encodeURIComponent(job_id)}`
  );

  if (!modalRes.ok) {
    return Response.json({ error: 'Status check failed' }, { status: 500 });
  }

  return Response.json(await modalRes.json());
}

