# Build Plan - AudioSplit

## Objetivo

Montar e evoluir o aplicativo desktop `AudioSplit` com Electron + React + Tailwind + TypeScript e engine Python sidecar para separação de stems com suporte a GPU e fallback para CPU.

## Estrutura base (root)

- `/home/beneti/Documentos/projetos/AudioSplit/electron`
- `/home/beneti/Documentos/projetos/AudioSplit/src`
- `/home/beneti/Documentos/projetos/AudioSplit/engine`
- `/home/beneti/Documentos/projetos/AudioSplit/output`

## Fases de build

1. Scaffold de projeto Node/TypeScript + Electron + React + Tailwind.
2. Bridge IPC tipada entre renderer e main process.
3. Upload drag-and-drop com validacao de extensoes e sanitizacao de nome.
4. Sidecar Python (`separator_core.py`) com logs JSON em `stdout`.
5. Integracao ponta a ponta com progresso em tempo real e exibicao de stems.
6. Hardening: fallback GPU->CPU, tratamento de erro e timeout/cancelamento.

## Critérios de aceite

- Upload aceita apenas `.mp3`, `.wav`, `.flac`, `.m4a`.
- Processamento roda assincrono sem travar a UI.
- Progresso e logs aparecem em tempo real no frontend.
- Stems sao gravados em WAV no diretorio de output.
- Acao "Abrir na Pasta" funciona via Electron shell.
- Em ausencia de GPU, o processo continua em CPU com aviso claro.

## Setup Python (resumo)

1. Criar ambiente virtual:
   - `python3 -m venv .venv`
2. Ativar:
   - Linux/macOS: `source .venv/bin/activate`
3. Instalar dependencias:
   - `pip install -r engine/requirements.txt`

