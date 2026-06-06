# KNOWN_ISSUES.md

## Bugs / Problemas Conhecidos

1. **Auditoria normativa ainda pendente por tipo de crédito:**
   - *Comportamento:* A aplicação possui motor funcional, mas ainda não há matriz formal comprovando que cada tipo de crédito segue os manuais oficiais da RFB e atos normativos relacionados.
   - *Risco:* Regras de atualização, consumo, vigência e origem do crédito podem variar conforme o tipo de crédito e o sistema da Receita.
   - *Solução:* Auditar `CalculoService.ts`, `ExcelParser.ts`, UI e PDF contra os manuais oficiais em `Knowledge/`, registrando evidências normativas e casos reais.

2. **Estado não Volátil vs. Schema:**
   - *Comportamento:* A persistência de Zustand salva as Cadeias processadas localmente. Se o formato estrutural dos objetos `CadeiaRelacional` no código-fonte for drasticamente alterado em um novo deploy (exemplo: adição/remoção de chaves obrigatórias), a aplicação tentará hidratar a loja com objetos que não correspondem ao esquema esperado e pode falhar na tela.
   - *Possível Causa:* Zustand localStorage hydration.
   - *Solução:* Implementar versionamento no zustand ou limpar local storage sempre que houver falha de parse no render.

3. **Tipagens da Lib XLSX:**
   - *Comportamento:* Ao extrair dados (`XLSX.utils.sheet_to_json`), o fallback padrão é tipar como `any`. Se as colunas "Valor Principal" vierem do Excel com Strings com R$ na frente (raro, mas dependente do setup do sistema de origem), o parser numérico do `Number(row['Valor Principal'])` resultará em `NaN`.
   - *Sugestão:* Mapeamento mais restrito, sanitização tirando strings de moeda se surgirem.

4. **Performance com muitas DCOMPs no Modal:**
   - *Comportamento:* A edição de um débito aciona um loop pelo array inteiro de DCOMPs no `CalculoService`. Para cadeias até 100 itens funciona lisinho e a 60fps. Se alguma cadeia tiver 50.000 declarações encadeadas, pode travar a thread principal da tela do navegador.
   - *Solução Futura:* Mover também o recálculo pós-edição para dentro de um Web Worker caso esse caso de uso gigante apareça. A importação inicial já usa worker.

## Resolvidos Recentemente

- **KPI de Saldo Original Restante na UI não ficava negativo:** corrigido separando formatação monetária com sinal de formatação de magnitude.
- **Lint falhando apesar do build passar:** corrigido; `npm run lint` passa.
