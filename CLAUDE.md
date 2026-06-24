# CLAUDE.md

Orientação para o Claude Code neste repositório. As diretrizes completas e permanentes vivem no **AGENTS.md** (fonte única — vale para Claude Code e Codex):

@AGENTS.md

## Notas para o Claude Code
- Projeto individual; pode estar aberto isoladamente. Recursos compartilhados do workspace pai (`Knowledge/`, `Sheets/`) são opcionais — os testes de planilha real pulam se ausentes (ou use `BSMART_PERDCOMP_SHEETS_DIR`). Ver AGENTS.md.
- Zonas "do not touch" sem aprovação expressa: âncoras `...Original` e a lógica de linhagem `getDepth` em `src/services/ExcelParser.ts`.
- Antes de alterar comportamento ativo da aplicação, confirme com o usuário.
- Comandos: `npm run dev` (:5173) · `npm run build` · `npm run lint` · `npm test`.
