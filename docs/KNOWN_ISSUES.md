# KNOWN_ISSUES.md

## Bugs / Problemas Conhecidos

1. **Estado não Volátil vs. Schema:**
   - *Comportamento:* A persistência de Zustand salva as Cadeias processadas localmente. Se o formato estrutural dos objetos `CadeiaRelacional` no código-fonte for drasticamente alterado em um novo deploy (exemplo: adição/remoção de chaves obrigatórias), a aplicação tentará hidratar a loja com objetos que não correspondem ao esquema esperado e pode falhar na tela.
   - *Possível Causa:* Zustand localStorage hydration.
   - *Solução:* Implementar versionamento no zustand ou limpar local storage sempre que houver falha de parse no render.

2. **Tipagens da Lib XLSX:**
   - *Comportamento:* Ao extrair dados (`XLSX.utils.sheet_to_json`), o fallback padrão é tipar como `any`. Se as colunas "Valor Principal" vierem do Excel com Strings com R$ na frente (raro, mas dependente do setup do sistema de origem), o parser numérico do `Number(row['Valor Principal'])` resultará em `NaN`.
   - *Sugestão:* Mapeamento mais restrito, sanitização tirando strings de moeda se surgirem.

3. **Performance com muitas DCOMPs no Modal:**
   - *Comportamento:* A edição de um débito aciona um loop pelo array inteiro de DCOMPs no `CalculoService`. Para cadeias até 100 itens funciona lisinho e a 60fps. Se alguma cadeia tiver 50.000 declarações encadeadas, pode travar a thread principal da tela do navegador.
   - *Solução Futura:* Mover o recalculo pesado para dentro de um Web Worker caso esse caso de uso gigante apareça.
