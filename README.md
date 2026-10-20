# adapt.ica

**Provas adaptadas para cada aluno.**

O adapt.ica (nome anterior: inclusiv.ai) é um aplicativo móvel para iOS e Android que lê o PDF de uma prova, ou uma foto dela, e gera uma versão adaptada ao perfil de cada aluno com deficiência (PCD), mantendo o objetivo de aprendizagem. Junto com a prova, o app entrega ao professor um guia de como aplicá-la.

Projeto desenvolvido para a disciplina de **Dispositivos Móveis (Android)**.

> Relatório técnico completo: Relatorio-adapt-ica (1).pdf

## Funcionalidades

- Onboarding em 3 passos, login e cadastro com e-mail e senha
- Envio da prova por **PDF**, **câmera (modo Lens)** ou **galeria**, com análise por IA
- Cadastro de alunos com perfis e PEI (Plano Educacional Individualizado)
- **10 perfis combináveis**: Dislexia, TDAH, TEA (Autismo), Deficiência Intelectual, Baixa Visão, Cegueira, Surdez/Deficiência Auditiva, Deficiência Física/Motora, Discalculia e Disgrafia
- Níveis de simplificação (Leve, Moderado, Alto) e opções como tempo extra e fonte ampliada
- Preview comparativo **original × adaptada**, com justificativa e edição por questão
- Guia de aplicação em três momentos (Antes, Durante, Depois), com checklist
- Exportação em **PDF, TXT e áudio**
- Aprovação final do professor (human-in-the-loop)
- Dados de demonstração para testes e apresentações

## Fluxo de uso

1. Enviar a prova (PDF, foto ou galeria)
2. Escolher o aluno, os perfis, o nível e as opções
3. Conferir o preview comparativo e editar se necessário
4. Consultar o guia de aplicação
5. Aprovar e exportar (PDF, TXT ou áudio)

## Tecnologias

| Camada | Tecnologia |
|---|---|
| App móvel | Expo Router (SDK 57) |
| API | FastAPI (rotas em `/api`) |
| Banco de dados | MongoDB |
| IA | Gemini 3 Pro (`gemini-3.1-pro-preview`), via chave Emergent |
| Áudio | OpenAI `tts-1` |
| PDF | reportlab |
| Autenticação | JWT (e-mail e senha) |
| Desenvolvimento | Emergent + GitHub |

## Estrutura do repositório

```
.
├── backend/        # API em FastAPI
├── frontend/       # Aplicativo em Expo
├── memory/         # PRD e documentação de produto
├── tests/          # Testes automatizados
├── test_reports/   # Relatórios de testes
├── docs/           # Relatório técnico da disciplina
└── README.md
```

## Como executar

<!-- Confirmar os comandos e nomes de variáveis de ambiente conforme os arquivos de backend/ e frontend/ -->

**Pré-requisitos:** Node.js, Python 3, MongoDB e uma chave de acesso aos modelos de IA.

**Backend**

```bash
cd backend
pip install -r requirements.txt
# configure o arquivo .env (URL do MongoDB, chave de IA e segredo do JWT)
uvicorn server:app --reload
```

**Aplicativo**

```bash
cd frontend
npm install
# configure a URL do backend no arquivo .env
npx expo start
```

Abra o app no emulador Android ou no celular, com o aplicativo Expo Go.

## Testes

Os testes ficam na pasta `tests/`, e os relatórios em `test_reports/`. Na última rodada, **19 de 19 testes de backend** passaram e os fluxos de frontend testados funcionaram.

## Próximos passos

- Regenerar uma única questão
- Editor da estrutura da análise da prova
- Relatórios de histórico e desempenho por disciplina
- Exportação em DOCX
- Login com Google e espaços de trabalho por instituição
- Modo aluno (uma questão por tela, leitura em voz alta e régua de leitura)
- Pictogramas (ARASAAC), modo escuro e fonte para dislexia
- Exportação e exclusão de dados conforme a LGPD

## Autores
Otávio Augusto
  └─ José Álvaro
       └─ Análise e Desenvolvimento de Sistemas
            └─ UNIFBV WYDEN
