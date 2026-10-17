# inclusiv.ai — PRD

## Original problem statement
App mobile (iOS/Android) que lê o PDF (ou foto, "modo Lens") de uma prova e gera uma versão adaptada ao perfil de cada aluno PCD, mantendo o objetivo de aprendizagem, com guia de como APLICAR a prova por perfil. Especificação completa no pacote enviado (PROMPT_PRINCIPAL, PRD, TELAS, DESIGN_SYSTEM, ADAPTACOES, ARQUITETURA, PROMPTS_IA).

## User choices
Gemini 3 Pro (gemini-3.1-pro-preview) via Emergent key · Auth JWT e-mail/senha · Export PDF + TXT + Áudio (OpenAI tts-1) · Dados demo · Telas MVP completas · Extra: leitura por foto estilo Google Lens.

## Architecture
- Expo Router (SDK 57) frontend: onboarding, (auth) login/register, (tabs) Início/Provas/Alunos/Conta, new/ upload → profile → preview/[id] → guide/[id] → export/[id]
- FastAPI + MongoDB backend (/api): auth JWT, students, exams (Gemini vision analysis of PDF/image), adaptations (Gemini adaptation + guide, normalized output), export PDF (reportlab)/TXT, TTS (stored in Mongo tts_audio)
- Design: tokens from user design system (Aurora/Marca/Mar gradients, AWS palette) in src/theme.ts

## Implemented (Jun 2026)
- Onboarding 3 passos, login/cadastro, home com estatísticas e atalhos
- Upload PDF / câmera (Lens) / galeria → análise IA
- Escolha de aluno + 10 perfis combináveis + nível + opções
- Preview comparativo original × adaptada, justificativas, edição por questão
- Guia de aplicação Antes/Durante/Depois com checklist
- Exportar PDF, TXT, áudio; aprovação do professor (human-in-the-loop)
- Cadastro de alunos com perfis e PEI; seed demo
- Tested: 19/19 backend, all frontend flows pass
- Animated startup screen (src/components/animated-splash.tsx): 4 logo shapes fly in from screen corners into the logo, wordmark fades in, respects reduce-motion; app name changed to "inclusiv.ai", native splash bg #EEF0FF

## Backlog
- P1: Regenerate single question; edit exam analysis (structure editor UI); history/performance reports by subject (Relatórios); DOCX export
- P1: Google login; institution workspaces & roles (admin/coord/AEE)
- P2: Student mode (one question per screen, read-aloud, reading ruler), pictograms (ARASAAC), plans/billing, white-label, LGPD export/delete data, dark mode, dyslexia font setting
