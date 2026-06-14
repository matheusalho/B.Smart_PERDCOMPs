# Auditoria Tributaria B.Smart PER/DCOMPs

Esta pasta concentra os artefatos vivos da auditoria tributaria do B.Smart PER/DCOMPs.

O objetivo e transformar o motor atual de simulacao em uma base tecnicamente auditavel, capaz de demonstrar, por tipo de credito, que os calculos, restricoes, rastreabilidade e relatorios seguem os manuais oficiais da RFB e os atos normativos citados por eles.

## Arquivos Principais

- `AuditoriaTributariaControle.md`: controle geral do trabalho, status por objeto, criticidade, achados, inconsistencias e solucoes possiveis.
- `00-MetodologiaEInventarioFontes.md`: metodologia de auditoria e inventario inicial dos manuais oficiais em `Knowledge/`.
- `09-CasosTesteMatrizEvidencias.md`: matriz transversal para casos de teste normativos e evidencias.
- `10-BaseGeralPERDCOMPWeb.md`: consolidado dos manuais gerais do PER/DCOMP Web, meios permitidos, vedacoes e informacao de debitos.
- `11-DesenhoTecnicoImplementacaoNormativa.md`: desenho tecnico consolidado para futura implementacao normativa autorizada.
- `12-RelatorioContinuidadeAuditoriaImplementacao.md`: continuidade longitudinal da auditoria e implementacao.
- `13-RelatorioHandoffCheckpointB4C779A.md`: handoff do checkpoint `b4c779a`, incluindo rastreabilidade de UI, fallback de Worker, `StatusBadge`, vedacao DCTFWeb consultiva e validacao 14/60.

## Objetos de Auditoria

- `01-SELICAtualizacaoCreditos.md`
- `02-TiposCreditoElegibilidadeRestricoes.md`
- `03-ImportacaoRelatorioECACELinhagem.md`
- `04-ConsumoCreditoOriginalECascata.md`
- `05-ValoresOriginaisRastreabilidade.md`
- `06-RetificacoesVigenciaBloqueios.md`
- `07-SimulacaoEdicoesDcompHipotetica.md`
- `08-RelatoriosPDFExcelRastreabilidade.md`
- `10-BaseGeralPERDCOMPWeb.md`
- `11-DesenhoTecnicoImplementacaoNormativa.md`

## Regra de Ouro

Campos com sufixo `...Original` representam a base importada e auditavel. A auditoria pode propor novos campos calculados, novas camadas de validacao e novos relatorios, mas nao deve propor solucao que sobrescreva, recalcule ou contamine os valores originais importados.
