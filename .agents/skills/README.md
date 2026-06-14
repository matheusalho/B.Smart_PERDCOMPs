# Skills Do Repositorio bsmart-perdcomp

Este diretorio e o local estavel para skills especificas do repositorio
`bsmart-perdcomp`.

Crie uma skill somente quando houver um fluxo reutilizavel da aplicacao ou da
auditoria tributaria. O formato esperado e:

```text
.agents/skills/<nome-da-skill>/SKILL.md
```

Regras:

- Nao copie skills internas do Codex nem plugins baixados para
  `$HOME\.codex\plugins\cache\...`.
- Nao hardcode caminhos de cache de plugins/skills em documentacao, scripts,
  prompts de continuidade ou testes.
- Mantenha referencias e scripts relativos ao diretorio da propria skill.
- Invoque a skill por nome (`$nome-da-skill`) e use plugins pelo diretorio de
  Plugins do Codex ou por `~\.codex\config.toml`.
