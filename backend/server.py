"""inclusiv.ai backend — Expo mobile app for adapting school exams for students with disabilities."""
from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import re
import tempfile
import uuid
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Literal, Optional

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from starlette.middleware.cors import CORSMiddleware

from emergentintegrations.llm.chat import FileContentWithMimeType, LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAITextToSpeech

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "inclusiv-dev-secret")
JWT_ALG = "HS256"
JWT_TTL_HOURS = 24 * 14
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="inclusiv.ai")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("inclusiv")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
PROFILE_IDS = Literal[
    "dislexia", "tdah", "tea", "intelectual", "baixa_visao",
    "cegueira", "surdez", "motora", "discalculia", "disgrafia",
]

PROFILE_LABELS = {
    "dislexia": "Dislexia",
    "tdah": "TDAH",
    "tea": "TEA (Autismo)",
    "intelectual": "Deficiência Intelectual",
    "baixa_visao": "Baixa Visão",
    "cegueira": "Cegueira",
    "surdez": "Surdez / Deficiência Auditiva",
    "motora": "Deficiência Física/Motora",
    "discalculia": "Discalculia",
    "disgrafia": "Disgrafia",
}


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    institution: str = "Escola Demo"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    token: str
    user: dict


class StudentIn(BaseModel):
    name: str
    grade: str = ""
    profiles: list[str] = []
    pei_summary: str = ""


class StudentOut(StudentIn):
    id: str
    created_at: datetime


class ExamUploadIn(BaseModel):
    title: str
    source: Literal["pdf", "photo"] = "pdf"
    # base64 content (PDF ou image/jpeg,png)
    content_base64: str
    mime_type: str = "application/pdf"


class Question(BaseModel):
    numero: int
    tipo: str = "multipla_escolha"
    enunciado: str
    alternativas: list[str] = []
    gabarito: Optional[str] = None
    pontos: float = 1.0
    objetivo_aprendizagem: str = ""
    tem_imagem: bool = False
    descricao_imagem: str = ""


class ExamStructure(BaseModel):
    disciplina: str = ""
    etapa_ensino: str = ""
    assuntos: list[str] = []
    habilidades_bncc: list[str] = []
    questoes: list[Question] = []


class ExamOut(BaseModel):
    id: str
    title: str
    source: str
    structure: ExamStructure
    created_at: datetime


class AdaptationCreateIn(BaseModel):
    exam_id: str
    student_id: Optional[str] = None
    profiles: list[str]
    nivel_simplificacao: Literal["leve", "moderado", "alto"] = "moderado"
    tempo_extra: bool = True
    fonte_grande: bool = False
    apoio_visual: bool = True


class AdaptedQuestion(BaseModel):
    numero: int
    enunciado_adaptado: str
    alternativas_adaptadas: list[str] = []
    apoios: list[str] = []
    justificativa: str = ""


class ApplicationGuide(BaseModel):
    antes: list[str] = []
    durante: list[str] = []
    depois: list[str] = []
    recursos: list[str] = []
    tempo_sugerido: str = ""
    dicas_por_assunto: list[str] = []


class AdaptationOut(BaseModel):
    id: str
    exam_id: str
    student_id: Optional[str]
    profiles: list[str]
    nivel_simplificacao: str
    questoes_adaptadas: list[AdaptedQuestion]
    formatacao_recomendada: dict
    guide: ApplicationGuide
    status: str = "rascunho"
    created_at: datetime


class AdaptationEditIn(BaseModel):
    questoes_adaptadas: list[AdaptedQuestion]


# ---------------------------------------------------------------------------
# Helpers: auth
# ---------------------------------------------------------------------------
def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def _make_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user


# ---------------------------------------------------------------------------
# Helpers: AI (Gemini)
# ---------------------------------------------------------------------------
GEMINI_MODEL = "gemini-3.1-pro-preview"
GEMINI_FALLBACK = "gemini-2.5-flash"


def _write_tmp(content_b64: str, suffix: str) -> str:
    raw = base64.b64decode(content_b64)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(raw)
    tmp.close()
    return tmp.name


def _extract_json(text: str) -> dict:
    """Pull the first JSON object/array out of a model response."""
    text = text.strip()
    # Remove ```json ... ``` fences
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    # Find first { and last }
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    try:
        return json.loads(text)
    except Exception as e:
        logger.exception("JSON parse failed: %s", e)
        raise HTTPException(status_code=502, detail="Resposta da IA inválida")


async def _llm_chat(system: str) -> LlmChat:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"inclusiv-{uuid.uuid4()}",
        system_message=system,
    ).with_model("gemini", GEMINI_MODEL)
    return chat


ANALYZE_SYSTEM = """Você é um analisador de provas escolares brasileiras. Receba um PDF ou imagem de uma prova e extraia a estrutura.
Responda APENAS com JSON válido no formato:
{
  "disciplina": "",
  "etapa_ensino": "",
  "assuntos": [],
  "habilidades_bncc": [],
  "questoes": [
    {
      "numero": 1,
      "tipo": "multipla_escolha|verdadeiro_falso|discursiva|associacao|calculo",
      "enunciado": "",
      "alternativas": ["A) ...", "B) ..."],
      "gabarito": null,
      "pontos": 1.0,
      "objetivo_aprendizagem": "",
      "tem_imagem": false,
      "descricao_imagem": ""
    }
  ]
}
Nunca invente conteúdo. Se algo estiver ilegível, use "ilegível" no texto.
"""

ADAPT_SYSTEM = """Você é especialista em educação inclusiva (BNCC + AEE no Brasil).
Adapte a prova mantendo o MESMO objetivo de aprendizagem de cada questão.
Aplique as regras pedagógicas do(s) perfil(is) informado(s):
- Dislexia: frases curtas, fonte sem serifa, destacar palavras-chave do comando em negrito markdown.
- TDAH: dividir em blocos, destacar verbo de comando, uma tarefa por frase.
- TEA: linguagem literal (sem ironia/metáforas), estrutura previsível, contexto explícito.
- Deficiência Intelectual: vocabulário cotidiano, exemplos concretos, reduzir alternativas (2-3).
- Baixa Visão: enunciados mais curtos, recomendar fonte grande.
- Cegueira: incluir audiodescrição textual de imagens e gráficos.
- Surdez: português como L2, frases diretas, glossário curto.
- Motora: preferir alternativas, reduzir cópia.
- Discalculia: separar passos do problema, contexto claro, apoio de retas numéricas.
- Disgrafia: preferir marcar/alternativas, sem penalizar caligrafia.

NUNCA mude o gabarito. NUNCA insinue a resposta. NUNCA faça diagnóstico.
Responda APENAS com JSON válido:
{
  "questoes_adaptadas": [
    {
      "numero": 1,
      "enunciado_adaptado": "",
      "alternativas_adaptadas": [],
      "apoios": ["glossario","imagem","pictograma","exemplo_resolvido"],
      "justificativa": "frase curta explicando a mudança"
    }
  ],
  "formatacao_recomendada": {"fonte": "Atkinson Hyperlegible", "tamanho": 16, "espacamento": 1.5, "fundo": "creme"},
  "guide": {
    "antes": [], "durante": [], "depois": [],
    "recursos": [], "tempo_sugerido": "", "dicas_por_assunto": []
  }
}
"""


# ---------------------------------------------------------------------------
# Routes: auth
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"app": "inclusiv.ai", "status": "ok"}


@api_router.post("/auth/register", response_model=AuthOut)
async def register(data: RegisterIn):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "name": data.name,
        "email": data.email.lower(),
        "institution": data.institution,
        "role": "professor",
        "password_hash": _hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = _make_token(user_id, data.email.lower())
    doc.pop("password_hash")
    doc.pop("_id", None)
    return {"token": token, "user": doc}


@api_router.post("/auth/login", response_model=AuthOut)
async def login(data: LoginIn):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not _verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    token = _make_token(user["id"], user["email"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}


@api_router.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user


# ---------------------------------------------------------------------------
# Routes: students
# ---------------------------------------------------------------------------
@api_router.get("/students", response_model=list[StudentOut])
async def list_students(user: dict = Depends(current_user)):
    docs = await db.students.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api_router.post("/students", response_model=StudentOut)
async def create_student(data: StudentIn, user: dict = Depends(current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "name": data.name,
        "grade": data.grade,
        "profiles": data.profiles,
        "pei_summary": data.pei_summary,
        "created_at": datetime.now(timezone.utc),
    }
    await db.students.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/students/{sid}")
async def delete_student(sid: str, user: dict = Depends(current_user)):
    await db.students.delete_one({"id": sid, "owner_id": user["id"]})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Routes: exams
# ---------------------------------------------------------------------------
async def _analyze_file(content_b64: str, mime_type: str) -> ExamStructure:
    """Run Gemini vision over PDF or photo and parse structured JSON."""
    suffix = ".pdf" if mime_type == "application/pdf" else (".jpg" if "jpeg" in mime_type or "jpg" in mime_type else ".png")
    tmp_path = _write_tmp(content_b64, suffix)
    try:
        chat = await _llm_chat(ANALYZE_SYSTEM)
        file_attach = FileContentWithMimeType(file_path=tmp_path, mime_type=mime_type)
        resp = await chat.send_message(UserMessage(
            text="Extraia a estrutura desta prova em JSON válido conforme o schema do sistema.",
            file_contents=[file_attach],
        ))
        data = _extract_json(resp if isinstance(resp, str) else str(resp))
        for k in ("assuntos", "habilidades_bncc"):
            data[k] = _str_list(data.get(k))
        for k in ("disciplina", "etapa_ensino"):
            data[k] = _to_str(data.get(k) or "")
        qs = []
        for i, q in enumerate(data.get("questoes") or []):
            if not isinstance(q, dict):
                continue
            q["numero"] = int(q.get("numero") or i + 1) if str(q.get("numero") or "").isdigit() else i + 1
            q["enunciado"] = _to_str(q.get("enunciado") or "")
            q["alternativas"] = _str_list(q.get("alternativas"))
            q["gabarito"] = _to_str(q["gabarito"]) if q.get("gabarito") is not None else None
            try:
                q["pontos"] = float(q.get("pontos") or 1.0)
            except Exception:
                q["pontos"] = 1.0
            q["tipo"] = _to_str(q.get("tipo") or "discursiva")
            q["objetivo_aprendizagem"] = _to_str(q.get("objetivo_aprendizagem") or "")
            q["descricao_imagem"] = _to_str(q.get("descricao_imagem") or "")
            q["tem_imagem"] = bool(q.get("tem_imagem"))
            qs.append(q)
        data["questoes"] = qs
        return ExamStructure(**data)
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@api_router.post("/exams", response_model=ExamOut)
async def upload_exam(data: ExamUploadIn, user: dict = Depends(current_user)):
    try:
        structure = await _analyze_file(data.content_base64, data.mime_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("exam analysis failed")
        raise HTTPException(status_code=502, detail=f"Falha ao analisar a prova: {e}")

    exam_id = str(uuid.uuid4())
    doc = {
        "id": exam_id,
        "owner_id": user["id"],
        "title": data.title,
        "source": data.source,
        "structure": structure.model_dump(),
        "created_at": datetime.now(timezone.utc),
    }
    await db.exams.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/exams", response_model=list[ExamOut])
async def list_exams(user: dict = Depends(current_user)):
    docs = await db.exams.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api_router.get("/exams/{eid}", response_model=ExamOut)
async def get_exam(eid: str, user: dict = Depends(current_user)):
    doc = await db.exams.find_one({"id": eid, "owner_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Prova não encontrada")
    return doc


@api_router.put("/exams/{eid}/structure", response_model=ExamOut)
async def update_structure(eid: str, structure: ExamStructure, user: dict = Depends(current_user)):
    doc = await db.exams.find_one({"id": eid, "owner_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Prova não encontrada")
    await db.exams.update_one({"id": eid}, {"$set": {"structure": structure.model_dump()}})
    doc["structure"] = structure.model_dump()
    return doc


@api_router.delete("/exams/{eid}")
async def delete_exam(eid: str, user: dict = Depends(current_user)):
    await db.exams.delete_one({"id": eid, "owner_id": user["id"]})
    await db.adaptations.delete_many({"exam_id": eid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Routes: adaptations
# ---------------------------------------------------------------------------
async def _adapt_exam(exam: dict, data: AdaptationCreateIn, student: Optional[dict]) -> dict:
    chat = await _llm_chat(ADAPT_SYSTEM)
    perfis = [PROFILE_LABELS.get(p, p) for p in data.profiles]
    preferencias = {
        "nivel_simplificacao": data.nivel_simplificacao,
        "tempo_extra": data.tempo_extra,
        "fonte_grande": data.fonte_grande,
        "apoio_visual": data.apoio_visual,
    }
    payload = {
        "prova_json": exam["structure"],
        "perfis": perfis,
        "preferencias": preferencias,
        "pei_resumo": (student or {}).get("pei_summary", ""),
    }
    msg = (
        "Adapte a prova abaixo seguindo o schema do sistema. "
        "Inclua guia de aplicação (antes/durante/depois) com até 8 itens cada. "
        "Dados:\n```json\n" + json.dumps(payload, ensure_ascii=False) + "\n```"
    )
    resp = await chat.send_message(UserMessage(text=msg))
    data_json = _extract_json(resp if isinstance(resp, str) else str(resp))
    return data_json


def _to_str(item: Any) -> str:
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        return " — ".join(str(v) for v in item.values() if v not in (None, ""))
    return str(item)


def _str_list(val: Any) -> list[str]:
    if not val:
        return []
    if not isinstance(val, list):
        val = [val]
    return [_to_str(v) for v in val]


def _normalize_adaptation(doc: dict) -> dict:
    g = doc.get("guide") or {}
    doc["guide"] = {
        "antes": _str_list(g.get("antes")),
        "durante": _str_list(g.get("durante")),
        "depois": _str_list(g.get("depois")),
        "recursos": _str_list(g.get("recursos")),
        "tempo_sugerido": _to_str(g.get("tempo_sugerido") or ""),
        "dicas_por_assunto": _str_list(g.get("dicas_por_assunto")),
    }
    qs = []
    for i, q in enumerate(doc.get("questoes_adaptadas") or []):
        if not isinstance(q, dict):
            continue
        try:
            numero = int(q.get("numero", i + 1))
        except Exception:
            numero = i + 1
        qs.append({
            "numero": numero,
            "enunciado_adaptado": _to_str(q.get("enunciado_adaptado") or ""),
            "alternativas_adaptadas": _str_list(q.get("alternativas_adaptadas")),
            "apoios": _str_list(q.get("apoios")),
            "justificativa": _to_str(q.get("justificativa") or ""),
        })
    doc["questoes_adaptadas"] = qs
    if not isinstance(doc.get("formatacao_recomendada"), dict):
        doc["formatacao_recomendada"] = {}
    return doc


@api_router.post("/adaptations", response_model=AdaptationOut)
async def create_adaptation(data: AdaptationCreateIn, user: dict = Depends(current_user)):
    exam = await db.exams.find_one({"id": data.exam_id, "owner_id": user["id"]}, {"_id": 0})
    if not exam:
        raise HTTPException(status_code=404, detail="Prova não encontrada")
    student = None
    if data.student_id:
        student = await db.students.find_one({"id": data.student_id, "owner_id": user["id"]}, {"_id": 0})

    try:
        result = await _adapt_exam(exam, data, student)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("adaptation failed")
        raise HTTPException(status_code=502, detail=f"Falha ao gerar adaptação: {e}")

    adaptation_id = str(uuid.uuid4())
    doc = {
        "id": adaptation_id,
        "owner_id": user["id"],
        "exam_id": data.exam_id,
        "student_id": data.student_id,
        "profiles": data.profiles,
        "nivel_simplificacao": data.nivel_simplificacao,
        "questoes_adaptadas": result.get("questoes_adaptadas", []),
        "formatacao_recomendada": result.get("formatacao_recomendada", {}),
        "guide": result.get("guide", {"antes": [], "durante": [], "depois": [], "recursos": [], "tempo_sugerido": "", "dicas_por_assunto": []}),
        "status": "rascunho",
        "created_at": datetime.now(timezone.utc),
    }
    _normalize_adaptation(doc)
    await db.adaptations.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/adaptations", response_model=list[AdaptationOut])
async def list_adaptations(user: dict = Depends(current_user)):
    docs = await db.adaptations.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [_normalize_adaptation(d) for d in docs]


@api_router.get("/adaptations/{aid}", response_model=AdaptationOut)
async def get_adaptation(aid: str, user: dict = Depends(current_user)):
    doc = await db.adaptations.find_one({"id": aid, "owner_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Adaptação não encontrada")
    return _normalize_adaptation(doc)


@api_router.put("/adaptations/{aid}", response_model=AdaptationOut)
async def edit_adaptation(aid: str, data: AdaptationEditIn, user: dict = Depends(current_user)):
    doc = await db.adaptations.find_one({"id": aid, "owner_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Adaptação não encontrada")
    await db.adaptations.update_one(
        {"id": aid},
        {"$set": {"questoes_adaptadas": [q.model_dump() for q in data.questoes_adaptadas]}},
    )
    doc["questoes_adaptadas"] = [q.model_dump() for q in data.questoes_adaptadas]
    return doc


@api_router.post("/adaptations/{aid}/approve")
async def approve_adaptation(aid: str, user: dict = Depends(current_user)):
    doc = await db.adaptations.find_one({"id": aid, "owner_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Adaptação não encontrada")
    await db.adaptations.update_one({"id": aid}, {"$set": {"status": "aprovada"}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Routes: export (PDF, TXT, Áudio)
# ---------------------------------------------------------------------------
def _build_txt(exam: dict, adaptation: dict) -> str:
    lines = [
        f"PROVA ADAPTADA — {exam.get('title','')}",
        f"Disciplina: {exam['structure'].get('disciplina','')}",
        f"Perfis: {', '.join(PROFILE_LABELS.get(p,p) for p in adaptation.get('profiles',[]))}",
        f"Nível de simplificação: {adaptation.get('nivel_simplificacao','')}",
        "",
    ]
    for q in adaptation.get("questoes_adaptadas", []):
        lines.append(f"Questão {q['numero']}.")
        lines.append(q.get("enunciado_adaptado", ""))
        for alt in q.get("alternativas_adaptadas", []):
            lines.append(f"  {alt}")
        lines.append("")
    return "\n".join(lines)


def _build_pdf(exam: dict, adaptation: dict, big_font: bool = False) -> bytes:
    buf = BytesIO()
    base_size = 16 if big_font else 12
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("t", parent=styles["Heading1"], fontSize=base_size + 6, textColor="#232F3E")
    sub_style = ParagraphStyle("s", parent=styles["Normal"], fontSize=base_size - 2, textColor="#5F6B7A")
    q_style = ParagraphStyle("q", parent=styles["Normal"], fontSize=base_size, leading=base_size * 1.5, spaceAfter=6)
    alt_style = ParagraphStyle("a", parent=styles["Normal"], fontSize=base_size, leading=base_size * 1.5, leftIndent=18)

    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm, leftMargin=20 * mm, rightMargin=20 * mm)
    story = []
    story.append(Paragraph(f"Prova adaptada — {exam.get('title','')}", title_style))
    story.append(Paragraph(f"Disciplina: {exam['structure'].get('disciplina','—')}", sub_style))
    story.append(Paragraph(
        "Perfis: " + ", ".join(PROFILE_LABELS.get(p, p) for p in adaptation.get("profiles", [])),
        sub_style,
    ))
    story.append(Spacer(1, 12))

    for q in adaptation.get("questoes_adaptadas", []):
        enun = (q.get("enunciado_adaptado") or "").replace("\n", "<br/>")
        story.append(Paragraph(f"<b>Questão {q['numero']}.</b> {enun}", q_style))
        for alt in q.get("alternativas_adaptadas", []):
            story.append(Paragraph(alt.replace("\n", "<br/>"), alt_style))
        story.append(Spacer(1, 10))
    doc.build(story)
    buf.seek(0)
    return buf.read()


@api_router.get("/adaptations/{aid}/export.txt")
async def export_txt(aid: str, user: dict = Depends(current_user)):
    adaptation = await db.adaptations.find_one({"id": aid, "owner_id": user["id"]}, {"_id": 0})
    if not adaptation:
        raise HTTPException(status_code=404, detail="Adaptação não encontrada")
    exam = await db.exams.find_one({"id": adaptation["exam_id"]}, {"_id": 0})
    content = _build_txt(exam, adaptation)
    return Response(content=content, media_type="text/plain; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="prova-{aid}.txt"'})


@api_router.get("/adaptations/{aid}/export.pdf")
async def export_pdf(aid: str, user: dict = Depends(current_user)):
    adaptation = await db.adaptations.find_one({"id": aid, "owner_id": user["id"]}, {"_id": 0})
    if not adaptation:
        raise HTTPException(status_code=404, detail="Adaptação não encontrada")
    exam = await db.exams.find_one({"id": adaptation["exam_id"]}, {"_id": 0})
    big = adaptation.get("formatacao_recomendada", {}).get("tamanho", 12) >= 16
    content = _build_pdf(exam, adaptation, big_font=big)
    return Response(content=content, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="prova-{aid}.pdf"'})




def _clean_tts(text: str) -> str:
    text = re.sub(r"[*_#>~|`]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


@api_router.post("/adaptations/{aid}/tts")
async def generate_tts(aid: str, user: dict = Depends(current_user)):
    """Generate TTS mp3 for the adapted exam and return the audio URL."""
    adaptation = await db.adaptations.find_one({"id": aid, "owner_id": user["id"]}, {"_id": 0})
    if not adaptation:
        raise HTTPException(status_code=404, detail="Adaptação não encontrada")
    exam = await db.exams.find_one({"id": adaptation["exam_id"]}, {"_id": 0})
    text = _clean_tts(_build_txt(exam, adaptation))
    # Limit to 4000 chars per OpenAI constraint
    text = text[:4000]
    key_src = f"{aid}|{text}|coral|tts-1"
    key = hashlib.sha256(key_src.encode()).hexdigest()[:16]
    if not await db.tts_audio.find_one({"key": key}, {"_id": 0, "key": 1}):
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio = await tts.generate_speech(text=text, model="tts-1", voice="coral", response_format="mp3")
        await db.tts_audio.insert_one({"key": key, "audio": audio, "created_at": datetime.now(timezone.utc)})
    return {"url": f"/api/tts/{key}.mp3"}


@api_router.get("/tts/{key}.mp3")
async def get_tts(key: str):
    doc = await db.tts_audio.find_one({"key": key}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Áudio expirado")
    audio = bytes(doc["audio"])
    return Response(content=audio, media_type="audio/mpeg",
                    headers={"Cache-Control": "public, max-age=86400"})


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------
@api_router.get("/profiles")
async def list_profiles():
    return [{"id": k, "label": v} for k, v in PROFILE_LABELS.items()]


# ---------------------------------------------------------------------------
# Seed demo data
# ---------------------------------------------------------------------------
DEMO_EMAIL = "professor@inclusiv.ai"
DEMO_PASSWORD = "inclusiv123"


DEMO_EXAM_MATH = {
    "title": "Prova de Matemática — 6º ano",
    "source": "demo",
    "structure": {
        "disciplina": "Matemática",
        "etapa_ensino": "Ensino Fundamental — 6º ano",
        "assuntos": ["Operações com números naturais", "Problemas de adição e subtração"],
        "habilidades_bncc": ["EF06MA03"],
        "questoes": [
            {"numero": 1, "tipo": "multipla_escolha",
             "enunciado": "João tinha 128 figurinhas. Ganhou 47 e perdeu 29. Quantas figurinhas ele tem agora?",
             "alternativas": ["A) 146", "B) 150", "C) 156", "D) 204"],
             "gabarito": "A", "pontos": 2.0, "objetivo_aprendizagem": "Resolver problemas com adição e subtração",
             "tem_imagem": False, "descricao_imagem": ""},
            {"numero": 2, "tipo": "calculo",
             "enunciado": "Calcule: 345 + 278 − 156.",
             "alternativas": [], "gabarito": "467", "pontos": 2.0,
             "objetivo_aprendizagem": "Operar com números naturais",
             "tem_imagem": False, "descricao_imagem": ""},
            {"numero": 3, "tipo": "discursiva",
             "enunciado": "Escreva um problema do seu dia a dia que envolva soma e subtração e resolva-o.",
             "alternativas": [], "gabarito": None, "pontos": 2.0,
             "objetivo_aprendizagem": "Formular e resolver problemas",
             "tem_imagem": False, "descricao_imagem": ""},
        ],
    },
}


DEMO_EXAM_PORT = {
    "title": "Prova de Português — 7º ano",
    "source": "demo",
    "structure": {
        "disciplina": "Língua Portuguesa",
        "etapa_ensino": "Ensino Fundamental — 7º ano",
        "assuntos": ["Interpretação de texto", "Classes de palavras"],
        "habilidades_bncc": ["EF07LP03"],
        "questoes": [
            {"numero": 1, "tipo": "multipla_escolha",
             "enunciado": "Leia o trecho: 'O menino correu rapidamente pela rua.' A palavra 'rapidamente' é um:",
             "alternativas": ["A) Substantivo", "B) Adjetivo", "C) Advérbio", "D) Verbo"],
             "gabarito": "C", "pontos": 2.0, "objetivo_aprendizagem": "Identificar classes de palavras",
             "tem_imagem": False, "descricao_imagem": ""},
            {"numero": 2, "tipo": "verdadeiro_falso",
             "enunciado": "No trecho acima, 'correu' é o verbo principal da oração.",
             "alternativas": ["Verdadeiro", "Falso"], "gabarito": "Verdadeiro", "pontos": 1.0,
             "objetivo_aprendizagem": "Reconhecer verbo", "tem_imagem": False, "descricao_imagem": ""},
            {"numero": 3, "tipo": "discursiva",
             "enunciado": "Reescreva a frase do item 1 mudando o advérbio 'rapidamente' por outro advérbio de modo.",
             "alternativas": [], "gabarito": None, "pontos": 2.0,
             "objetivo_aprendizagem": "Produzir frases usando advérbios",
             "tem_imagem": False, "descricao_imagem": ""},
        ],
    },
}


DEMO_STUDENTS = [
    {"name": "Ana (6º ano)", "grade": "6º ano", "profiles": ["dislexia"], "pei_summary": "Dislexia moderada; prefere fonte sem serifa, 16pt."},
    {"name": "Bruno (6º ano)", "grade": "6º ano", "profiles": ["tdah"], "pei_summary": "TDAH; pausas a cada 10min, blocos curtos."},
    {"name": "Clara (7º ano)", "grade": "7º ano", "profiles": ["tea", "discalculia"], "pei_summary": "TEA + discalculia; rotina previsível e material concreto."},
]


@app.on_event("startup")
async def seed_demo():
    existing = await db.users.find_one({"email": DEMO_EMAIL})
    if existing:
        return
    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id,
        "name": "Prof. Demonstração",
        "email": DEMO_EMAIL,
        "institution": "Escola Demo inclusiv.ai",
        "role": "professor",
        "password_hash": _hash_password(DEMO_PASSWORD),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    for exam in [DEMO_EXAM_MATH, DEMO_EXAM_PORT]:
        await db.exams.insert_one({
            "id": str(uuid.uuid4()),
            "owner_id": user_id,
            "title": exam["title"],
            "source": "demo",
            "structure": exam["structure"],
            "created_at": datetime.now(timezone.utc),
        })
    for s in DEMO_STUDENTS:
        await db.students.insert_one({
            "id": str(uuid.uuid4()),
            "owner_id": user_id,
            **s,
            "created_at": datetime.now(timezone.utc),
        })
    logger.info("Seed data inserted for demo user %s", DEMO_EMAIL)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
