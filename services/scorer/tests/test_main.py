from fastapi.testclient import TestClient

from scorer.main import SCORER_VERSION, app

client = TestClient(app)


def test_health_reports_version():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": SCORER_VERSION}


def test_score_rejects_an_empty_body():
    response = client.post("/score", content=b"")
    assert response.status_code == 400


def test_score_is_not_implemented_yet():
    response = client.post("/score", content=b"\xff\xd8\xff")
    assert response.status_code == 501
