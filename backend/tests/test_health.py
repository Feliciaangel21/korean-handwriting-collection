from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app import main
from app.main import create_app


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "init_pool", AsyncMock())
    monkeypatch.setattr(main, "close_pool", AsyncMock())
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def test_health_returns_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
