import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS, ArcElement, BarElement, LineElement, CategoryScale,
  LinearScale, PointElement, Tooltip, Legend, Title
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { OS, getStatusOS } from '../lib/types';
import { listarOS, getConfig } from '../lib/api';

ChartJS.register(ArcElement, BarElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Title);

export default function Dashboard() {
  const [db, setDb] = useState<OS[]>([]);
  const [filtroFab, setFiltroFab] = useState('TODAS');
  const [filtroPeriodo, setFiltroPeriodo] = useState('TODOS');
  const [filtroCat, setFiltroCat] = useState('TODAS');
  const [fabricas, setFabricas] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const os = await listarOS();
      setDb(os);
      setFabricas((await getConfig('conf_fabricas')) || []);
      setCategorias((await getConfig('conf_categorias')) || []);
    })();
  }, []);

  const dados = useMemo(() => {
    let bd = db;
    if (filtroFab !== 'TODAS') bd = bd.filter((o) => o.fabrica === filtroFab);
    if (filtroCat !== 'TODAS') bd = bd.filter((o) => o.categoria === filtroCat);
    const hoje = new Date();
    if (filtroPeriodo !== 'TODOS') {
      const ref7 = new Date(); ref7.setDate(ref7.getDate() - 7);
      const ref30 = new Date(); ref30.setDate(ref30.getDate() - 30);
      bd = bd.filter((o) => {
        if (!o.data) return false;
        const dOS = new Date(o.data + 'T00:00:00');
        if (isNaN(dOS.getTime())) return true;
        if (filtroPeriodo === '7D') return dOS >= ref7;
        if (filtroPeriodo === '30D') return dOS >= ref30;
        if (filtroPeriodo === 'MES') return dOS.getMonth() === hoje.getMonth() && dOS.getFullYear() === hoje.getFullYear();
        if (filtroPeriodo === 'ANO') return dOS.getFullYear() === hoje.getFullYear();
        return true;
      });
    }
    return bd;
  }, [db, filtroFab, filtroPeriodo, filtroCat]);

  const kpis = useMemo(() => {
    const total = dados.length;
    const concluidas = dados.filter((o) => o.executado_em).length;
    const taxaConcl = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    const pend = dados.filter((o) => !o.executado_em);
    const backlogCrit = pend.filter((o) => o.criticidade === 'Alta' || o.criticidade === 'Emergência').length;
    const emerg = pend.filter((o) => o.criticidade === 'Emergência').length;
    const semReprog = dados.filter((o) => !o.reprogramado).length;
    const taxaPrazo = total > 0 ? Math.round((semReprog / total) * 100) : 100;
    let soma = 0, count = 0;
    dados.forEach((o) => {
      if (o.data && o.executado_em) {
        const diff = Math.round((new Date(o.executado_em + 'T00:00:00').getTime() - new Date(o.data + 'T00:00:00').getTime()) / 86400000);
        if (!isNaN(diff) && diff >= 0) { soma += diff; count++; }
      }
    });
    const lead = count > 0 ? (soma / count).toFixed(1) + ' d' : '-';
    return { total, concluidas, taxaConcl, backlogCrit, emerg, taxaPrazo, lead };
  }, [dados]);

  // ---- Dados dos gráficos ----
  const graficos = useMemo(() => {
    const contagemStatus = { 'Aberto': 0, 'Concluído': 0, 'Em Andamento': 0, 'Reprogramado': 0 };
    const abertasPorDia: Record<string, number> = {};
    const concluidasPorDia: Record<string, number> = {};
    const contagemLocais: Record<string, number> = {};
    const benchmarking: Record<string, { abertas: number; concluidas: number }> = {};
    fabricas.forEach((f) => { benchmarking[f] = { abertas: 0, concluidas: 0 }; });

    dados.forEach((o) => {
      contagemStatus[getStatusOS(o)]++;
      const f = o.fabrica || 'Não Informada';
      if (!benchmarking[f]) benchmarking[f] = { abertas: 0, concluidas: 0 };
      benchmarking[f].abertas++;
      if (o.executado_em) benchmarking[f].concluidas++;
      if (o.data) {
        const d = o.data.split('-').slice(0, 2).join('/');
        abertasPorDia[d] = (abertasPorDia[d] || 0) + 1;
      }
      if (o.executado_em) {
        const d = o.executado_em.split('-').slice(0, 2).join('/');
        concluidasPorDia[d] = (concluidasPorDia[d] || 0) + 1;
      }
      const loc = o.local || 'Geral';
      contagemLocais[loc] = (contagemLocais[loc] || 0) + 1;
    });

    const fabricasLabels = Object.keys(benchmarking).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const todasDatas = Array.from(new Set([...Object.keys(abertasPorDia), ...Object.keys(concluidasPorDia)])).sort();
    const locaisOrd = Object.keys(contagemLocais).sort((a, b) => contagemLocais[b] - contagemLocais[a]).slice(0, 10);
    const dataVolume = locaisOrd.map((l) => contagemLocais[l]);
    const totalTop = dataVolume.reduce((a, v) => a + v, 0);
    let sum = 0;
    const dataPct = dataVolume.map((v) => { sum += v; return totalTop > 0 ? Number(((sum / totalTop) * 100).toFixed(1)) : 0; });

    const criticidades = ['Alta', 'Baixa', 'Emergência', 'Média'];
    const critCores: Record<string, string> = { Alta: '#fd7e14', Baixa: '#28a745', 'Emergência': '#dc3545', Média: '#ffc107' };
    const pend = dados.filter((o) => !o.executado_em);

    return {
      pizza: {
        labels: ['Aberto', 'Concluído', 'Em Andamento', 'Reprogramado'],
        datasets: [{ data: [contagemStatus['Aberto'], contagemStatus['Concluído'], contagemStatus['Em Andamento'], contagemStatus['Reprogramado']], backgroundColor: ['#dc3545', '#28a745', '#0d6efd', '#ffc107'] }]
      },
      benchmark: {
        labels: fabricasLabels,
        datasets: [
          { label: 'OS Abertas', data: fabricasLabels.map((f) => benchmarking[f].abertas), backgroundColor: '#0056b3' },
          { label: 'OS Concluídas', data: fabricasLabels.map((f) => benchmarking[f].concluidas), backgroundColor: '#28a745' }
        ]
      },
      throughput: {
        labels: todasDatas.length ? todasDatas : ['Hoje'],
        datasets: [
          { label: 'Abertas', data: todasDatas.map((d) => abertasPorDia[d] || 0), borderColor: '#dc3545', backgroundColor: 'rgba(220,53,69,0.1)', fill: true, tension: 0.3 },
          { label: 'Concluídas', data: todasDatas.map((d) => concluidasPorDia[d] || 0), borderColor: '#28a745', backgroundColor: 'rgba(40,167,69,0.1)', fill: true, tension: 0.3 }
        ]
      },
      pareto: {
        labels: locaisOrd.length ? locaisOrd : ['Sem dados'],
        datasets: [
          { label: '% Acumulada', data: locaisOrd.length ? dataPct : [0], type: 'line' as const, borderColor: '#dc3545', borderWidth: 3, pointRadius: 4, tension: 0.3, yAxisID: 'yAc', order: 0 },
          { label: 'Volume OS', data: locaisOrd.length ? dataVolume : [0], backgroundColor: '#0056b3', borderRadius: 4, yAxisID: 'yVol', order: 1 }
        ]
      },
      backlog: {
        labels: categorias,
        datasets: criticidades.map((c) => ({
          label: c, backgroundColor: critCores[c],
          data: categorias.map((cat) => pend.filter((o) => o.categoria === cat && o.criticidade.startsWith(c)).length)
        }))
      }
    };
  }, [dados, fabricas, categorias]);

  return (
    <div>
      <div className="filter-card">
        <div>
          <label>Edifício:</label>
          <select value={filtroFab} onChange={(e) => setFiltroFab(e.target.value)}>
            <option value="TODAS">Todos</option>
            {fabricas.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label>Período:</label>
          <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}>
            <option value="TODOS">Todo o Histórico</option>
            <option value="7D">Últimos 7 Dias</option>
            <option value="30D">Últimos 30 Dias</option>
            <option value="MES">Mês Atual</option>
            <option value="ANO">Ano Atual</option>
          </select>
        </div>
        <div>
          <label>Categoria:</label>
          <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)}>
            <option value="TODAS">Todas</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="kpi-container">
        <div className="kpi-card"><span className="kpi-title">Total de OS</span><span className="kpi-value">{kpis.total}</span><span className="kpi-subtitle">Volume no filtro</span></div>
        <div className="kpi-card kpi-success"><span className="kpi-title">Taxa de Conclusão</span><span className="kpi-value">{kpis.taxaConcl}%</span><span className="kpi-subtitle">{kpis.concluidas} de {kpis.total} concluídas</span></div>
        <div className="kpi-card kpi-danger"><span className="kpi-title">Backlog Crítico</span><span className="kpi-value">{kpis.backlogCrit}</span><span className="kpi-subtitle">{kpis.emerg} pendentes</span></div>
        <div className="kpi-card kpi-warning"><span className="kpi-title">No Prazo</span><span className="kpi-value">{kpis.taxaPrazo}%</span><span className="kpi-subtitle">Sem reprogramação</span></div>
        <div className="kpi-card kpi-purple"><span className="kpi-title">Lead Time</span><span className="kpi-value">{kpis.lead}</span><span className="kpi-subtitle">Média em dias</span></div>
      </div>

      <div className="dashboard-grid">
        <div className="chart-card">
          <h3 className="chart-title">Status Geral</h3>
          <div className="chart-container"><Doughnut data={graficos.pizza} options={{ responsive: true, maintainAspectRatio: false }} /></div>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">Benchmarking</h3>
          <div className="chart-container"><Bar data={graficos.benchmark} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} /></div>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">Throughput</h3>
          <div className="chart-container"><Line data={graficos.throughput} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} /></div>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">Pareto - Locais</h3>
          <div className="chart-container"><Bar data={graficos.pareto as any} options={{ responsive: true, maintainAspectRatio: false, scales: { yVol: { beginAtZero: true, position: 'left' }, yAc: { beginAtZero: true, max: 100, position: 'right' } } }} /></div>
        </div>
        <div className="chart-card grid-full">
          <h3 className="chart-title">Backlog por Categoria</h3>
          <div className="chart-container"><Bar data={graficos.backlog} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }} /></div>
        </div>
      </div>
    </div>
  );
}