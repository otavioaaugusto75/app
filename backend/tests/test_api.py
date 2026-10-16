"""Backend regression tests for inclusiv.ai"""
import base64
import io
import os
import time
import uuid

import pytest
import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://app-mobile-lab-6.preview.emergentagent.com").rstrip("/")


# --- Health ---------------------------------------------------------
def test_root(api):
    r = api.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# --- Auth -----------------------------------------------------------
def test_login_demo(api):
    r = api.post(f"{BASE_URL}/api/auth/login",
                 json={"email": "professor@inclusiv.ai", "password": "inclusiv123"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "token" in body and "user" in body
    assert body["user"]["email"] == "professor@inclusiv.ai"


def test_login_bad(api):
    r = api.post(f"{BASE_URL}/api/auth/login",
                 json={"email": "professor@inclusiv.ai", "password": "wrong"})
    assert r.status_code == 401


def test_me(api, auth_headers):
    r = api.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "professor@inclusiv.ai"


def test_me_unauth(api):
    r = api.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401


def test_register_new(api):
    email = f"test_{uuid.uuid4().hex[:8]}@test.com"
    r = api.post(f"{BASE_URL}/api/auth/register",
                 json={"name": "TEST User", "email": email, "password": "test1234"})
    assert r.status_code == 200, r.text
    assert "token" in r.json()
    # Duplicate
    r2 = api.post(f"{BASE_URL}/api/auth/register",
                  json={"name": "TEST User", "email": email, "password": "test1234"})
    assert r2.status_code == 409


# --- Profiles catalog -----------------------------------------------
def test_profiles(api):
    r = api.get(f"{BASE_URL}/api/profiles")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 10
    ids = {p["id"] for p in data}
    assert "dislexia" in ids and "tdah" in ids


# --- Students -------------------------------------------------------
def test_students_list(api, auth_headers):
    r = api.get(f"{BASE_URL}/api/students", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 3  # seeded


def test_student_crud(api, auth_headers):
    payload = {"name": "TEST Student", "grade": "5º ano",
               "profiles": ["dislexia"], "pei_summary": "test"}
    r = api.post(f"{BASE_URL}/api/students", headers=auth_headers, json=payload)
    assert r.status_code == 200, r.text
    sid = r.json()["id"]
    # Verify in list
    lst = api.get(f"{BASE_URL}/api/students", headers=auth_headers).json()
    assert any(s["id"] == sid for s in lst)
    # Cleanup
    rd = api.delete(f"{BASE_URL}/api/students/{sid}", headers=auth_headers)
    assert rd.status_code == 200
    lst2 = api.get(f"{BASE_URL}/api/students", headers=auth_headers).json()
    assert not any(s["id"] == sid for s in lst2)


# --- Exams ---------------------------------------------------------
def test_exams_list_has_seed(api, auth_headers):
    r = api.get(f"{BASE_URL}/api/exams", headers=auth_headers)
    assert r.status_code == 200
    exams = r.json()
    titles = [e["title"] for e in exams]
    assert any("Matemática" in t for t in titles)
    assert any("Português" in t for t in titles)


@pytest.fixture(scope="session")
def exam_math_id(api, auth_headers):
    r = api.get(f"{BASE_URL}/api/exams", headers=auth_headers)
    for e in r.json():
        if "Matemática" in e["title"]:
            return e["id"]
    pytest.skip("Math exam not seeded")


def test_exam_detail(api, auth_headers, exam_math_id):
    r = api.get(f"{BASE_URL}/api/exams/{exam_math_id}", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()["structure"]["questoes"]) >= 1


def _make_png_b64() -> str:
    """Generate a small PNG with simulated exam text."""
    img = Image.new("RGB", (900, 600), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except Exception:
        font = ImageFont.load_default()
    d.text((40, 30), "Prova de Ciências — 5º ano", fill="black", font=font)
    d.text((40, 100), "1) Qual é o estado físico da água a 25°C?", fill="black", font=font)
    d.text((60, 140), "A) Sólido   B) Líquido   C) Gasoso", fill="black", font=font)
    d.text((40, 220), "2) Cite dois exemplos de seres vivos.", fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


@pytest.mark.slow
def test_upload_exam_photo_ocr(api, auth_headers):
    """Takes 20–60s due to Gemini vision call."""
    b64 = _make_png_b64()
    r = api.post(f"{BASE_URL}/api/exams",
                 headers=auth_headers,
                 json={"title": "TEST Photo Exam", "source": "photo",
                       "content_base64": b64, "mime_type": "image/png"},
                 timeout=180)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"]
    assert isinstance(body["structure"]["questoes"], list)
    # cleanup
    api.delete(f"{BASE_URL}/api/exams/{body['id']}", headers=auth_headers)


# --- Adaptations ----------------------------------------------------
@pytest.fixture(scope="session")
def adaptation_id(api, auth_headers, exam_math_id):
    payload = {"exam_id": exam_math_id, "profiles": ["dislexia"],
               "nivel_simplificacao": "moderado"}
    r = api.post(f"{BASE_URL}/api/adaptations",
                 headers=auth_headers, json=payload, timeout=180)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"]
    assert len(body["questoes_adaptadas"]) >= 1
    assert "guide" in body
    # guide items must be strings (normalization fix)
    for key in ("antes", "durante", "depois"):
        for item in body["guide"][key]:
            assert isinstance(item, str), f"guide.{key} contains non-string: {item}"
    return body["id"]


def test_list_adaptations_200(api, auth_headers, adaptation_id):
    r = api.get(f"{BASE_URL}/api/adaptations", headers=auth_headers)
    assert r.status_code == 200
    docs = r.json()
    assert any(d["id"] == adaptation_id for d in docs)
    # Verify normalization produces strings for all guide fields
    for d in docs:
        for k in ("antes", "durante", "depois", "recursos", "dicas_por_assunto"):
            for item in d["guide"].get(k, []):
                assert isinstance(item, str)


def test_get_adaptation(api, auth_headers, adaptation_id):
    r = api.get(f"{BASE_URL}/api/adaptations/{adaptation_id}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["id"] == adaptation_id


def test_edit_adaptation(api, auth_headers, adaptation_id):
    r = api.get(f"{BASE_URL}/api/adaptations/{adaptation_id}", headers=auth_headers)
    doc = r.json()
    qs = doc["questoes_adaptadas"]
    qs[0]["enunciado_adaptado"] = "EDITADO — " + qs[0]["enunciado_adaptado"][:50]
    rp = api.put(f"{BASE_URL}/api/adaptations/{adaptation_id}",
                 headers=auth_headers, json={"questoes_adaptadas": qs})
    assert rp.status_code == 200
    rg = api.get(f"{BASE_URL}/api/adaptations/{adaptation_id}", headers=auth_headers)
    assert rg.json()["questoes_adaptadas"][0]["enunciado_adaptado"].startswith("EDITADO")


def test_approve_adaptation(api, auth_headers, adaptation_id):
    r = api.post(f"{BASE_URL}/api/adaptations/{adaptation_id}/approve",
                 headers=auth_headers)
    assert r.status_code == 200
    rg = api.get(f"{BASE_URL}/api/adaptations/{adaptation_id}", headers=auth_headers)
    assert rg.json()["status"] == "aprovada"


# --- Export ---------------------------------------------------------
def test_export_txt(api, auth_headers, adaptation_id):
    r = api.get(f"{BASE_URL}/api/adaptations/{adaptation_id}/export.txt",
                headers=auth_headers)
    assert r.status_code == 200
    assert "PROVA ADAPTADA" in r.text
    assert "text/plain" in r.headers.get("content-type", "")


def test_export_pdf(api, auth_headers, adaptation_id):
    r = api.get(f"{BASE_URL}/api/adaptations/{adaptation_id}/export.pdf",
                headers=auth_headers)
    assert r.status_code == 200
    assert r.headers.get("content-type") == "application/pdf"
    assert r.content.startswith(b"%PDF")


def test_tts_endpoint(api, auth_headers, adaptation_id):
    r = api.post(f"{BASE_URL}/api/adaptations/{adaptation_id}/tts",
                 headers=auth_headers, timeout=120)
    assert r.status_code == 200, r.text
    url = r.json()["url"]
    assert url.startswith("/api/tts/") and url.endswith(".mp3")
    r2 = api.get(f"{BASE_URL}{url}", timeout=60)
    assert r2.status_code == 200
    assert r2.headers.get("content-type") == "audio/mpeg"
    assert len(r2.content) > 1000
