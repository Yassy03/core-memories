import modal
import subprocess
import time
import base64
import uuid
import struct
import json
from pathlib import Path

app = modal.App("core-memories")

volume = modal.Volume.from_name("core-memories-models")
MODEL_DIR = "/models"
GENERATED_DIR = Path("/models/generated")

# Shared state between the spawned run_generation container and the web container
job_map     = modal.Dict.from_name("cm-job-map",  create_if_missing=True)
preview_store = modal.Dict.from_name("cm-previews", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install([
        "git",
        "wget",
        "libgl1",
        "libglib2.0-0",
        "libglib2.0-dev"
    ])
    .pip_install(
        "torch==2.4.1",
        "torchvision==0.19.1",
        "torchaudio==2.4.1",
        "numpy<2",
        extra_options="--index-url https://download.pytorch.org/whl/cu121"
    )
    .pip_install([
        "transformers",
        "accelerate",
        "safetensors",
        "aiohttp",
        "einops",
        "kornia",
        "pyyaml",
        "Pillow",
        "scipy",
        "tqdm",
        "requests",
        "gguf",
        "fastapi[standard]",
        "websocket-client",
    ])
    .run_commands([
        "git clone https://github.com/comfyanonymous/ComfyUI /comfyui",
        "cd /comfyui && pip install -r requirements.txt",
        "cd /comfyui/custom_nodes && git clone https://github.com/city96/ComfyUI-GGUF",
        "cd /comfyui/custom_nodes/ComfyUI-GGUF && pip install -r requirements.txt",
        "cd /comfyui/custom_nodes && git clone https://github.com/kijai/ComfyUI-KJNodes",
    ])
)


@app.cls(
    image=image,
    gpu="A10G",
    volumes={MODEL_DIR: volume},
    timeout=600,
    scaledown_window=30,
)
class ComfyUI:
    @modal.enter()
    def start(self):
        import requests as req
        import os
        import sys

        comfy_model_dir = Path("/comfyui/models")

        links = [
            ("/models/models/unet/flux1-dev-Q4_K_S.gguf",                   "unet/flux1-dev-Q4_K_S.gguf"),
            ("/models/models/loras/Mavica_Project_light (1).safetensors",    "loras/Mavica_Project_light (1).safetensors"),
            ("/models/models/vae/ae.safetensors",                            "vae/ae.safetensors"),
            ("/models/models/clip/clip_l.safetensors",                       "clip/clip_l.safetensors"),
            ("/models/models/clip/t5xxl_fp8_e4m3fn.safetensors",            "clip/t5xxl_fp8_e4m3fn.safetensors"),
        ]

        for src, dest in links:
            target = comfy_model_dir / dest
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                os.symlink(src, str(target))

        self.process = subprocess.Popen(
            ["python", "main.py", "--listen", "0.0.0.0", "--port", "8188", "--preview-method", "latent2rgb"],
            cwd="/comfyui",
            stdout=sys.stdout,
            stderr=sys.stderr,
        )

        print("Waiting for ComfyUI to start...")
        for i in range(60):
            time.sleep(3)
            try:
                r = req.get("http://127.0.0.1:8188/system_stats", timeout=5)
                if r.status_code == 200:
                    print(f"ComfyUI ready after {i * 3}s")
                    return
            except Exception as e:
                print(f"Waiting... ({i * 3}s) {e}")

        raise RuntimeError("ComfyUI failed to start within 3 minutes")

    @modal.exit()
    def stop(self):
        if hasattr(self, "process") and self.process.poll() is None:
            self.process.terminate()

    @modal.method()
    def run_generation(self, workflow: dict, job_id: str) -> dict:
        import websocket as ws_lib
        import requests as req

        client_id = str(uuid.uuid4())
        step_count = 0
        preview_count = 0

        # Write immediately so the status endpoint can see the Dict is working
        diag = {"wsConnected": False, "binaryMsgs": 0, "textMsgs": 0, "previewMsgs": 0}
        preview_store[job_id] = {"count": 0, "latest": None, "diag": diag}

        ws = ws_lib.WebSocket()
        try:
            ws.connect(f"ws://127.0.0.1:8188/ws?clientId={client_id}", timeout=300)
            diag["wsConnected"] = True
            preview_store[job_id] = {"count": 0, "latest": None, "diag": diag}
            print(f"[{job_id}] WebSocket connected")
        except Exception as e:
            print(f"[{job_id}] WebSocket connect failed: {e}")
            ws = None

        prompt_id = None
        try:
            submit = req.post(
                "http://127.0.0.1:8188/prompt",
                json={"prompt": workflow, "client_id": client_id if ws else ""},
                timeout=30,
            )
            submit.raise_for_status()
            prompt_id = submit.json()["prompt_id"]
            print(f"[{job_id}] prompt_id={prompt_id}")

            if ws:
                while True:
                    try:
                        msg = ws.recv()
                    except Exception as e:
                        print(f"[{job_id}] ws.recv() exception: {e}")
                        break

                    if isinstance(msg, bytes) and len(msg) > 4:
                        diag["binaryMsgs"] += 1
                        event_type = struct.unpack(">I", msg[:4])[0]
                        print(f"[{job_id}] binary msg event_type={event_type} len={len(msg)}")
                        if event_type == 1:  # preview JPEG from ComfyUI
                            diag["previewMsgs"] += 1
                            step_count += 1
                            if step_count % 2 == 0:
                                preview_count += 1
                                jpeg_b64 = base64.b64encode(msg[8:]).decode("utf-8")  # skip 8-byte header
                                try:
                                    preview_store[job_id] = {
                                        "count": preview_count,
                                        "latest": jpeg_b64,
                                        "diag": diag,
                                    }
                                except Exception as de:
                                    print(f"[{job_id}] Dict write error: {de}")

                    elif isinstance(msg, str):
                        diag["textMsgs"] += 1
                        try:
                            data = json.loads(msg)
                            msg_type = data.get("type", "")
                            print(f"[{job_id}] text msg type={msg_type}")
                            if (msg_type == "executing" and
                                    data.get("data", {}).get("node") is None and
                                    data.get("data", {}).get("prompt_id") == prompt_id):
                                print(f"[{job_id}] generation complete signal received")
                                break
                        except Exception:
                            pass

                    # Keep diag up to date in Dict every few messages
                    if (diag["binaryMsgs"] + diag["textMsgs"]) % 5 == 0:
                        try:
                            existing = preview_store.get(job_id, {})
                            existing["diag"] = diag
                            preview_store[job_id] = existing
                        except Exception:
                            pass

        finally:
            if ws:
                try:
                    ws.close()
                except Exception:
                    pass

        # Fetch the finished image from ComfyUI history
        for _ in range(30):
            time.sleep(3)
            try:
                history = req.get(
                    f"http://127.0.0.1:8188/history/{prompt_id}",
                    timeout=10,
                ).json()

                if history.get(prompt_id, {}).get("outputs"):
                    outputs = history[prompt_id]["outputs"]
                    for node_output in outputs.values():
                        if "images" in node_output:
                            img = node_output["images"][0]
                            img_response = req.get(
                                "http://127.0.0.1:8188/view",
                                params={
                                    "filename": img["filename"],
                                    "subfolder": img["subfolder"],
                                    "type": img["type"],
                                },
                                timeout=30,
                            )
                            image_bytes = img_response.content

                            GENERATED_DIR.mkdir(parents=True, exist_ok=True)
                            filename = f"{int(time.time())}.png"
                            (GENERATED_DIR / filename).write_bytes(image_bytes)
                            volume.commit()

                            try:
                                del preview_store[job_id]
                            except Exception:
                                pass

                            return {"imageData": base64.b64encode(image_bytes).decode("utf-8")}
            except Exception:
                pass

        try:
            del preview_store[job_id]
        except Exception:
            pass
        return {"error": "Generation timed out"}

    @modal.asgi_app()
    def web(self):
        from fastapi import FastAPI

        api = FastAPI()

        @api.post("/generate")
        def generate(workflow: dict):
            job_id = str(uuid.uuid4())
            call = self.run_generation.spawn(workflow, job_id)
            job_map[job_id] = call.object_id
            return {"job_id": job_id}

        @api.get("/status/{job_id}")
        def status(job_id: str):
            modal_call_id = job_map.get(job_id)
            if not modal_call_id:
                return {"status": "error", "error": "Unknown job"}

            preview_data = preview_store.get(job_id)

            try:
                result = modal.FunctionCall.from_id(modal_call_id).get(timeout=0)
                # Clean up job_map once we've confirmed completion
                try:
                    del job_map[job_id]
                except Exception:
                    pass
                return {"status": "complete", **result}
            except TimeoutError:
                response: dict = {"status": "pending"}
                if preview_data:
                    response["previewCount"] = preview_data["count"]
                    response["latestPreview"] = preview_data["latest"]
                return response
            except Exception as e:
                return {"status": "error", "error": str(e)}

        @api.get("/gallery")
        def gallery():
            if not GENERATED_DIR.exists():
                return {"images": []}
            files = sorted(GENERATED_DIR.glob("*.png"), reverse=True)
            return {"images": [f"/image/{f.name}" for f in files]}

        @api.get("/image/{filename}")
        def serve_image(filename: str):
            from fastapi.responses import Response
            filepath = GENERATED_DIR / filename
            if not filepath.exists():
                return Response(status_code=404)
            return Response(content=filepath.read_bytes(), media_type="image/png")

        return api
