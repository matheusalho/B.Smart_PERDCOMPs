import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CadeiaRelacional, DCOMP } from '../models/types';
import { isVigente, isBloqueado, isPedidoCancelamento } from '../utils/statusHelper';
import { classificarTipoCredito } from '../services/normativo/creditRules';
import { classificarStatusProcessamento } from '../services/normativo/statusRules';
import { verificarVedacaoCredito } from '../services/normativo/vedacaoCompensacaoService';
import { useStore } from '../store';
import { ModalEdicao } from './ModalEdicao';
import { ModalHipotetica } from './ModalHipotetica';
import { CascataKpis } from './CascataKpis';
import { CascataFilters } from './CascataFilters';
import { Settings, Pencil, Trash } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export const TimelineCascata: React.FC<{ cadeia: CadeiaRelacional }> = ({ cadeia }) => {
  const formatDate = (date: Date) => format(date, 'dd/MM/yyyy', { locale: ptBR });
  const [dcompEditando, setDcompEditando] = useState<DCOMP | null>(null);
  const [modalHipoteticaAberta, setModalHipoteticaAberta] = useState(false);
  const [editandoRaiz, setEditandoRaiz] = useState(false);
  const [valorRaizEdit, setValorRaizEdit] = useState('');
  
  const editarCreditoOriginal = useStore(state => state.editarCreditoOriginal);
  const salvarSimulacaoCadeia = useStore(state => state.salvarSimulacaoCadeia);

  // Calcula KPIs
  const dcompInicialVigente = cadeia.dcomps.find(d => isVigente(d.situacao, d.tipoDocumento, d.id));
  
  // Lógica do KPI Saldo Inicial:
  const tipoCreditoLimpo = (cadeia.tipoCredito || '').toLowerCase();
  const permiteMultiplosDetalhamentos = 
    tipoCreditoLimpo.includes('pagamento indevido ou a maior esocial') ||
    tipoCreditoLimpo.includes('contribuição previdenciária indevida ou a maior');

  let totalCreditoAtual = 0;
  let totalCreditoOriginal = 0;

  if (permiteMultiplosDetalhamentos) {
    const detalhadoresVigentes = cadeia.dcomps.filter(d => 
      isVigente(d.situacao, d.tipoDocumento, d.id) && 
      d.indicadorCredito !== 'Hipotético' &&
      (!d.numeroDcompDetalhamento || d.numeroDcompDetalhamento === d.id)
    );
    totalCreditoAtual = detalhadoresVigentes.reduce((acc, d) => acc + d.valorTotalCreditoDetalhado, 0);
    totalCreditoOriginal = detalhadoresVigentes.reduce((acc, d) => acc + (d.valorTotalCreditoDetalhadoOriginal || d.valorTotalCreditoDetalhado), 0);
  } else {
    const maiorCreditoVigente = Math.max(...cadeia.dcomps.filter(d => isVigente(d.situacao, d.tipoDocumento, d.id)).map(d => d.valorTotalCreditoDetalhado), 0);
    const dcompInicial = cadeia.dcomps[0];
    totalCreditoOriginal = dcompInicial ? (dcompInicial.valorTotalCreditoDetalhadoOriginal || dcompInicial.valorTotalCreditoDetalhado) : 0;
    totalCreditoAtual = maiorCreditoVigente > 0 ? maiorCreditoVigente : (dcompInicial ? dcompInicial.valorTotalCreditoDetalhado : 0);
  }
  
  const dcompFinal = cadeia.dcomps[cadeia.dcomps.length - 1];
  const saldoFinal = dcompFinal ? (dcompFinal.saldoCreditoOriginalCalculado || 0) : 0;

  // Calcula o valor total das reduções de débitos realizadas pelo usuário
  const variacaoDebitos = cadeia.dcomps
    .filter(d => isVigente(d.situacao, d.tipoDocumento, d.id) && d.indicadorCredito !== 'Hipotético')
    .reduce((acc, d) => {
      const original = d.valorUtilizadoPerdcompOriginal || d.valorUtilizadoPerdcomp;
      return acc + (original - d.valorUtilizadoPerdcomp);
    }, 0);

  // Calcula o delta do valor (atualizado com Selic) dos débitos
  const debitosReduzidos = cadeia.dcomps
    .filter(d => isVigente(d.situacao, d.tipoDocumento, d.id) && d.indicadorCredito !== 'Hipotético')
    .reduce((acc, d) => {
      let diff = 0;
      d.debitos.forEach(deb => {
        const original = deb.valorTotalOriginal || deb.valorTotal;
        diff += (original - deb.valorTotal);
      });
      return acc + diff;
    }, 0);

    // Calcula a soma do Crédito Original Usado (apenas nas Vigentes)
    const totalCreditoUtilizado = cadeia.dcomps
      .filter(d => isVigente(d.situacao, d.tipoDocumento, d.id))
      .reduce((acc, d) => {
        const isPurePER = (d.tipoDocumento === 'Pedido Restituição' || d.tipoDocumento === 'Pedido de Restituição') && (!d.debitos || d.debitos.length === 0);
        const effectiveUtilizado = isPurePER ? 0 : d.valorUtilizadoPerdcomp;
        return acc + effectiveUtilizado;
      }, 0);

  const docsARetificar = cadeia.dcomps.filter(d => d.statusCascata === 'RETIFICAR').length;
  const docsRetificadosUsuario = cadeia.dcomps.filter(d => d.isManuallyEdited).length;

  const handleSalvarRaiz = () => {
    const v = Number(valorRaizEdit);
    if (!isNaN(v) && v >= 0) {
      editarCreditoOriginal(cadeia.id, v);
    }
    setEditandoRaiz(false);
  };

  const handleSalvarSimulacao = () => {
    const hasManualEdits = cadeia.dcomps.some(d => d.isManuallyEdited);
    
    if (!hasManualEdits) {
      const confirmSave = window.confirm('Você não fez edições manuais. Deseja salvar a simulação apenas com as edições colaterais identificadas ou cancelar?');
      if (!confirmSave) return;
    }

    // Coleta de Metadados de Auditoria
    const fontesSet = new Set<string>();
    const hipotesesSet = new Set<string>();
    const dadosAusentesSet = new Set<string>();
    let hasEstimativa = false;
    let hasDadosInsuficientes = false;

    cadeia.dcomps.forEach(d => {
      const res = d.resultadoSelic;
      if (res) {
        if (res.statusCalculo === 'estimativa_historica') hasEstimativa = true;
        if (res.statusCalculo === 'dados_insuficientes') hasDadosInsuficientes = true;
        
        res.fontesNormativas.forEach(f => fontesSet.add(JSON.stringify(f)));
        res.dadosAusentes?.forEach(da => dadosAusentesSet.add(da));
      }
    });

    let statusGlobal: 'normativo' | 'estimativa_historica' | 'parcial' | 'dados_insuficientes' = 'normativo';
    if (hasDadosInsuficientes && hasEstimativa) statusGlobal = 'parcial';
    else if (hasDadosInsuficientes) statusGlobal = 'dados_insuficientes';
    else if (hasEstimativa) statusGlobal = 'estimativa_historica';

    if (hasEstimativa || hasDadosInsuficientes) {
      hipotesesSet.add('Cálculos amparados em fator histórico devido à insuficiência de dados no relatório e-CAC para aplicação estrita da SELIC.');
    }

    const metadadosAuditoria = {
      versaoMotorCalculo: '1.0.0-beta',
      statusCalculoGlobal: statusGlobal,
      fontesNormativas: Array.from(fontesSet).map(f => JSON.parse(f)),
      tabelaSelic: {
        fonte: 'RFB / SelicMensal',
        emitidaEm: '06/2026',
        coberturaAte: '06/2026'
      },
      hipoteses: Array.from(hipotesesSet),
      dadosAusentes: Array.from(dadosAusentesSet)
    };

    const kpis = {
      saldoOriginalTotal: totalCreditoOriginal,
      saldoAtualizadoTotal: totalCreditoAtual,
      economiaProjetada: debitosReduzidos,
      lastroOriginalDisponibilizado: variacaoDebitos,
      saldoOriginalRestanteAntigo: dcompFinal ? (dcompFinal.saldoCreditoOriginalAnterior || 0) : 0,
      saldoOriginalRestanteNovo: saldoFinal
    };

    salvarSimulacaoCadeia(cadeia.id, kpis, metadadosAuditoria);
    alert('Simulação da cadeia salva com sucesso!');
  };

  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ALL'); // ALL, OK, RETIFICAR, IMPEDIDO
  const [apenasDetalhadores, setApenasDetalhadores] = useState(false);

  const dcompsFiltradas = useMemo(() => {
    return cadeia.dcomps.filter(d => {
      // Filtro checkbox: Apenas Detalhadores
      if (apenasDetalhadores) {
        const isDetalhador = d.indicadorCredito !== 'Hipotético' && (!d.numeroDcompDetalhamento || d.numeroDcompDetalhamento === d.id);
        if (!isDetalhador) return false;
      }
      // Filtro de busca (por número da dcomp)
      if (filtroBusca && !d.id.includes(filtroBusca)) return false;
      
      // Filtro de status
      if (filtroStatus !== 'ALL') {
        const vigente = isVigente(d.situacao, d.tipoDocumento, d.id);
        const bloqueado = isBloqueado(d.situacao, d.tipoDocumento, d.id);
        const aRetificar = d.statusCascata === 'RETIFICAR' || d.statusCascata === 'EDITADO_E_RETIFICAR';
        
        if (filtroStatus === 'VIGENTES_EDITAVEIS') {
          const isVigenteEditavel = vigente && !bloqueado;
          // Mostra se for vigente e editável, OU se for a retificar (pois precisamos ver os erros)
          if (!isVigenteEditavel && !aRetificar) return false;
        }
        
        if (filtroStatus === 'IMPEDIDO') {
          // Impedidos de retificação: não vigentes, ou bloqueados
          if (vigente && !bloqueado) return false;
        }

        if (filtroStatus === 'OK') {
          // Mostra OK e EDITADO (apenas itens vigentes e não bloqueados)
          if (!vigente || bloqueado) return false;
          if (d.statusCascata !== 'OK' && d.statusCascata !== 'EDITADO') return false;
        }
        if (filtroStatus === 'RETIFICAR' && !aRetificar) return false;
      }
      return true;
    });
  }, [cadeia.dcomps, filtroBusca, filtroStatus, apenasDetalhadores]);

  const classificacaoCredito = useMemo(() => classificarTipoCredito(cadeia.tipoCredito || ''), [cadeia.tipoCredito]);
  const vedacoesCredito = useMemo(() => {
    // Como a vedação é baseada no tipo e isso está na raiz da DCOMP, pegamos a DCOMP vigente principal ou apenas passamos o tipo.
    // O vedacaoCompensacaoService espera uma DCOMP, mas avalia o tipoCredito. Vamos criar um mock rápido:
    return verificarVedacaoCredito({ tipoCredito: cadeia.tipoCredito });
  }, [cadeia.tipoCredito]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Simulador de Cascata - {cadeia.tipoCredito}</h2>
          {classificacaoCredito.alertas.length > 0 && (
            <span className="status-led status-danger" data-tooltip={classificacaoCredito.alertas.join(' | ')}>RESTRIÇÃO NORMATIVA</span>
          )}
          {vedacoesCredito.length > 0 && (
            <span className="status-led status-danger" data-tooltip={vedacoesCredito.map(v => v.mensagem).join(' | ')}>⚠️ VEDAÇÃO DE CRÉDITO</span>
          )}
        </div>
        
        {/* KPI Panel Extracted */}
        <CascataKpis 
          totalCreditoAtual={totalCreditoAtual}
          totalCreditoOriginal={totalCreditoOriginal}
          totalCreditoUtilizado={totalCreditoUtilizado}
          variacaoDebitos={variacaoDebitos}
          debitosReduzidos={debitosReduzidos}
          saldoFinal={saldoFinal}
          docsRetificadosUsuario={docsRetificadosUsuario}
          docsARetificar={docsARetificar}
        />
      </div>

      {/* Âncora invisível para o Tour Guiado */}
      <div id="tour-target-table" style={{ width: '100%', height: '5px', background: 'transparent' }} />
      <div className="table-floating-wrapper">
        <CascataFilters 
          filtroBusca={filtroBusca}
          setFiltroBusca={setFiltroBusca}
          filtroStatus={filtroStatus}
          setFiltroStatus={setFiltroStatus}
          apenasDetalhadores={apenasDetalhadores}
          setApenasDetalhadores={setApenasDetalhadores}
          onSalvarSimulacao={handleSalvarSimulacao}
        />
        <div style={{ overflowX: 'auto' }}>
          <table className="table-floating" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th>Situação</th>
                <th>Data Transm.</th>
                <th>Data Ref.</th>
                <th>PER/DCOMP</th>
                <th>Crédito Detalhado</th>
                <th>Créd. Data Transm.</th>
                <th>Débitos (Atualizado)</th>
                <th>Crédito Orig. Usado</th>
                <th>Saldo Próx. DCOMP</th>
                <th style={{ width: '150px' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {dcompsFiltradas.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-muted" style={{ padding: '2rem' }}>Nenhuma declaração encontrada com esses filtros.</td>
                </tr>
              )}
              {dcompsFiltradas.map((dcomp) => {
                const vigente = isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
                const bloqueado = isBloqueado(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
                const isOldestVigente = dcompInicialVigente && dcomp.id === dcompInicialVigente.id;
                
                const valorDebitoAtualizado = dcomp.debitos.reduce((acc, deb) => acc + deb.valorTotal, 0);
                const valorCreditoOriginalUsado = dcomp.valorUtilizadoPerdcomp;
                const creditoDetalhado = dcomp.valorTotalCreditoDetalhado;
                const creditoDataTransmissao = dcomp.valorCreditoDataTransmissao;
                const saldoProx = dcomp.saldoCreditoOriginalCalculado || 0;

                const statusClassificado = classificarStatusProcessamento({
                  status: dcomp.situacao,
                  tipoDocumento: dcomp.tipoDocumento || 'desconhecido'
                });
                const alertasStatus = statusClassificado.motivos.filter(m => m !== 'documento_analisado_ou_em_discussao' && m !== 'documento_nao_vigente');

                const getTooltip = (status: string, bloq: boolean, vig: boolean) => {
                  if (status === 'RETIFICAR') return 'Consome mais crédito que o saldo disponível.';
                  if (status === 'EDITADO') return 'Ajustado pelo usuário nesta simulação.';
                  if (bloq) return 'Bloqueado: Situação processual na RFB impede retificação.';
                  if (!vig) return 'Não Vigente: Já retificada por versão posterior.';
                  return 'OK: Documento ativo e saldos consistentes.';
                };

                return (
                  <React.Fragment key={dcomp.id}>
                    <tr style={{ opacity: vigente ? 1 : 0.6 }}>
                      <td>
                        {dcomp.statusCascata === 'EDITADO_E_RETIFICAR' ? (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                             <span className="status-led status-danger" data-tooltip={getTooltip('RETIFICAR', bloqueado, vigente)}>A RETIFICAR</span>
                             <span className="status-led status-success" data-tooltip={getTooltip('EDITADO', bloqueado, vigente)}>EDITADO</span>
                           </div>
                        ) : dcomp.statusCascata === 'RETIFICAR' ? (
                           <span className="status-led status-danger" data-tooltip={getTooltip('RETIFICAR', bloqueado, vigente)}>A RETIFICAR</span>
                        ) : dcomp.statusCascata === 'IMPACTADO_BLOQUEADO' ? (
                           <span className="status-led status-danger" data-tooltip="Falta crédito, mas a declaração está Bloqueada para retificação na RFB.">BLOQUEADO</span>
                        ) : dcomp.statusCascata === 'EDITADO' ? (
                           <span className="status-led status-success" data-tooltip={getTooltip('EDITADO', bloqueado, vigente)}>EDITADO</span>
                        ) : !vigente ? (
                           <span className="status-led status-muted" data-tooltip={getTooltip('NAO_VIGENTE', bloqueado, false)}>Não vigente</span>
                        ) : bloqueado ? (
                           <span className="status-led status-danger" data-tooltip={getTooltip('BLOQ', true, vigente)}>BLOQUEADO</span>
                        ) : (
                           <span className="status-led status-success" data-tooltip={getTooltip('OK', bloqueado, vigente)}>OK</span>
                        )}
                      </td>
                      <td>{formatDate(new Date(dcomp.dataTransmissao))}</td>
                      <td>{formatDate(new Date(dcomp.dataTransmissaoOriginal))}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="font-mono">{dcomp.id}</span>
                            {dcomp.indicadorCredito !== 'Hipotético' && (
                              (!dcomp.numeroDcompDetalhamento || dcomp.numeroDcompDetalhamento === dcomp.id) ? (
                                <span className="status-led status-success" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem' }}>DETALHADOR</span>
                              ) : (
                                <span className="status-led status-muted" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem' }}>CONSUMIDOR</span>
                              )
                            )}
                          </div>
                          <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                            {isPedidoCancelamento(dcomp.id, dcomp.tipoDocumento) ? 'Pedido de Cancelamento' : (dcomp.indicadorCredito === '1' ? 'Original' : 'Retificador')}
                          </span>
                          
                          {dcomp.numeroRetificador && (() => {
                            const retificadora = cadeia.dcomps.find(x => x.id === dcomp.numeroRetificador);
                            const isCancelamento = retificadora ? isPedidoCancelamento(retificadora.id, retificadora.tipoDocumento) : false;
                            return (
                              <span className="text-warning" style={{ fontSize: '0.75rem' }}>
                                {isCancelamento ? 'Cancelada por: ' : 'Retific. Por: '}
                                {dcomp.numeroRetificador}
                              </span>
                            );
                          })()}
                          
                          {alertasStatus.length > 0 && (
                            <span className="status-led status-warning" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem' }} data-tooltip={alertasStatus.join(' | ')}>
                              ATENÇÃO (STATUS)
                            </span>
                          )}
                          
                          {isPedidoCancelamento(dcomp.id, dcomp.tipoDocumento) && (() => {
                            const canceladaPorMim = cadeia.dcomps.find(x => x.numeroRetificador === dcomp.id);
                            if (!canceladaPorMim) return null;
                            return (
                              <span className="text-warning" style={{ fontSize: '0.75rem' }}>
                                Cancela a PER/DCOMP nº: {canceladaPorMim.id}
                              </span>
                            );
                          })()}

                          {dcomp.numeroDcompDetalhamento && (
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>Detalhamento: {dcomp.numeroDcompDetalhamento}</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="text-right">
                        {dcomp.valorTotalCreditoDetalhadoOriginal !== creditoDetalhado ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                              {formatCurrency(dcomp.valorTotalCreditoDetalhadoOriginal)}
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                              NOVO: {formatCurrency(creditoDetalhado)}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontWeight: 600 }}>{formatCurrency(creditoDetalhado)}</div>
                        )}
                      </td>
                      
                      <td className="text-right">
                        {dcomp.divergenciaDetalhes ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                              {formatCurrency(dcomp.divergenciaDetalhes.esperado)}
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                              NOVO: {formatCurrency(dcomp.divergenciaDetalhes.calculado)}
                            </div>
                          </div>
                        ) : dcomp.indicadorCredito === 'Hipotético' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                              {formatCurrency(0)}
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                              NOVO: {formatCurrency(creditoDataTransmissao)}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontWeight: 600 }}>{formatCurrency(creditoDataTransmissao)}</div>
                        )}
                      </td>

                      <td className="text-right">
                        {dcomp.debitos.reduce((acc, deb) => acc + deb.valorTotalOriginal, 0) !== valorDebitoAtualizado ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                              {formatCurrency(dcomp.debitos.reduce((acc, deb) => acc + deb.valorTotalOriginal, 0))}
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                              NOVO: {formatCurrency(valorDebitoAtualizado)}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontWeight: 600 }}>{formatCurrency(valorDebitoAtualizado)}</div>
                        )}
                      </td>

                      <td className="text-right">
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                           {dcomp.valorUtilizadoPerdcompOriginal !== valorCreditoOriginalUsado ? (
                             <>
                               <div style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                 {formatCurrency(dcomp.valorUtilizadoPerdcompOriginal)}
                               </div>
                               <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                                 NOVO: {formatCurrency(valorCreditoOriginalUsado)}
                               </div>
                             </>
                           ) : (
                             <div style={{ fontWeight: 600 }}>{formatCurrency(valorCreditoOriginalUsado)}</div>
                           )}
                           
                           {/* Badge Consultivo da Auditoria SELIC */}
                           {dcomp.resultadoSelic && dcomp.resultadoSelic.statusCalculo === 'normativo' && (
                             <span className="status-led status-success" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem' }} data-tooltip="Cálculo Normativo Verificado">
                               ✓ SELIC Exata
                             </span>
                           )}
                           {dcomp.resultadoSelic && dcomp.resultadoSelic.statusCalculo === 'estimativa_historica' && (
                             <span className="status-led status-warning" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem' }} data-tooltip="Estimativa Histórica (Baseada na RFB)">
                               ⚠️ Estimativa
                             </span>
                           )}
                           {dcomp.resultadoSelic && dcomp.resultadoSelic.statusCalculo === 'dados_insuficientes' && (
                             <span className="status-led status-danger" style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem' }} data-tooltip="Dados Insuficientes para Cálculo Seguro">
                               ! Dados Insuf.
                             </span>
                           )}
                         </div>
                      </td>

                      <td className="text-right">
                         {(() => {
                           // Valor original mantido pelo CalculoService
                           const oldSaldoProx = dcomp.saldoCreditoOriginalAnterior ?? 0;
                           
                           if (dcomp.statusCascata === 'RETIFICAR' || dcomp.statusCascata === 'EDITADO' || dcomp.statusCascata === 'EDITADO_E_RETIFICAR') {
                             return (
                               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                 <div style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                   {formatCurrency(oldSaldoProx)}
                                 </div>
                                 <div style={{ fontWeight: 600, color: dcomp.statusCascata.includes('RETIFICAR') ? 'var(--color-warning)' : 'var(--color-primary)' }}>
                                   NOVO: {formatCurrency(saldoProx)}
                                 </div>
                               </div>
                             );
                           }
                           return <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{formatCurrency(saldoProx)}</div>;
                         })()}
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                          {isOldestVigente && (
                            editandoRaiz ? (
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <input 
                                  type="number" 
                                  className="input-field" 
                                  style={{ width: '80px', padding: '0.25rem' }} 
                                  value={valorRaizEdit} 
                                  onChange={e => setValorRaizEdit(e.target.value)} 
                                />
                                <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem' }} onClick={handleSalvarRaiz}>✓</button>
                              </div>
                            ) : (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => { setValorRaizEdit(totalCreditoAtual.toString()); setEditandoRaiz(true); }}
                                disabled={!vigente || bloqueado}
                                title="Editar Saldo Original"
                              >
                                <Settings size={14} /> Saldo
                              </button>
                            )
                          )}

                          {bloqueado ? (
                            <span className="text-warning" style={{ fontSize: '0.75rem', textAlign: 'center', fontWeight: 600, padding: '0.25rem' }}>Bloqueado</span>
                          ) : !vigente ? (
                            <span className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center', padding: '0.25rem' }}>Não vigente</span>
                          ) : (
                            <>
                              <button 
                                className="btn btn-outline btn-edit-debito" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => setDcompEditando(dcomp)}
                                title="Editar Débitos"
                              >
                                <Pencil size={14} /> Débitos
                              </button>
                              
                              {dcomp.indicadorCredito === 'Hipotético' && (
                                <button 
                                  className="btn btn-ghost text-danger" 
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-danger)' }}
                                  onClick={() => {
                                    if(window.confirm('Excluir esta PER/DCOMP Hipotética da simulação?')) {
                                      useStore.getState().removerDcompHipotetica(cadeia.id, dcomp.id);
                                    }
                                  }}
                                  title="Excluir Hipotética"
                                >
                                  <Trash size={14} /> Excluir
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Âncora invisível para o Tour Guiado */}
      <div id="tour-target-hipotetica" style={{ width: '100%', height: '5px', background: 'transparent' }} />
      {/* Botão de adicionar Hipotética */}
      <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <button 
          className="btn btn-ghost tour-hipotetica" 
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--color-primary)' }}
          onClick={() => setModalHipoteticaAberta(true)}
        >
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>+</span> Simular PER/DCOMP Hipotética
        </button>
      </div>

      {dcompEditando && (
        <ModalEdicao dcomp={dcompEditando} onClose={() => setDcompEditando(null)} />
      )}

      {modalHipoteticaAberta && (
        <ModalHipotetica 
          onClose={() => setModalHipoteticaAberta(false)}
          onConfirm={(debitosSimulados, dataHipotetica) => {
            useStore.getState().adicionarDcompHipotetica(cadeia.id, debitosSimulados, dataHipotetica);
          }}
        />
      )}
    </div>
  );
};
