"""HTTP service the Worker calls with a photo's bytes.

The Worker owns all storage access (R2) and database writes; this service only
analyses the image it is sent and returns scores, so it needs no credentials.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

SCORER_VERSION = "0.0.0"

app = FastAPI(title="Sunset Soul scorer", version=SCORER_VERSION)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": SCORER_VERSION}


@app.post("/score")
async def score(request: Request) -> JSONResponse:
    # Scoring arrives in Phase 3.
    image = await request.body()
    if not image:
        return JSONResponse({"error": "Send the photo as the request body."}, status_code=400)
    return JSONResponse({"error": "Scoring is not implemented yet."}, status_code=501)
