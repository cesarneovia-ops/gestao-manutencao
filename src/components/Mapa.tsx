import { useRef, useState, useCallback, CSSProperties, ReactNode } from 'react';
import { OS, getStatusOS, STATUS_CORES, iconeCategoria } from '../lib/types';

interface MapaProps {
  dados: OS[];                        // ordens com map_x/map_y
  altura?: number;
  plantaUrl?: string | null;
  modoMarcacao?: boolean;             // true = aba 1 (marca ponto ao clicar)
  aoMarcar?: (x: number, y: number) => void;
  onCarregarArquivo?: (dataUrl: string) => void; // opcional: callback específico
  children?: ReactNode;               // conteúdo extra dentro do stage (ex.: marcador)
  detalhesOS?: OS[];                  // para validação de duplicados (evita erro RLS)
}

export default function Mapa({
  dados, altura = 500, plantaUrl, modoMarcacao = false,
  aoMarcar, children
}: MapaProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef({ on: false, startX: 0, startY: 0, panX: 0, panY: 0, moved: false });
  const [tip, setTip] = useState<{ os: OS; x: number; y: number } | null>(null);

  const aplicarTransform = useCallback((sc: number, p: { x: number; y: number }) => {
    const l = layerRef.current;
    if (l) l.style.transform = `translate(${p.x}px, ${p.y}px) scale(${sc})`;
  }, []);

  const zoom = useCallback((delta: number, focal?: { cx: number; cy: number }) => {
    setScale((cur) => {
      const stage = stageRef.current;
      if (!stage) return cur;
      const newScale = Math.min(Math.max(cur + delta, 0.5), 8.0);
      if (newScale === cur) return cur;
      let fx = stage.clientWidth / 2, fy = stage.clientHeight / 2;
      if (focal) { fx = focal.cx; fy = focal.cy; }
      const factor = newScale / cur;
      const panX = fx - (fx - pan.x) * factor;
      const panY = fy - (fy - pan.y) * factor;
      setPan({ x: panX, y: panY });
      requestAnimationFrame(() => aplicarTransform(newScale, { x: panX, y: panY }));
      return newScale;
    });
  }, [pan, aplicarTransform]);

  const resetar = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    requestAnimationFrame(() => aplicarTransform(1, { x: 0, y: 0 }));
  }, [aplicarTransform]);

  const onMouseMove = (e: React.MouseEvent) => {
    const d = drag.current;
    if (!d.on) return;
    const nx = e.clientX - d.startX, ny = e.clientY - d.startY;
    if (Math.abs(nx - d.panX) > 3 || Math.abs(ny - d.panY) > 3) d.moved = true;
    d.panX = nx; d.panY = ny;
    setPan({ x: nx, y: ny });
    aplicarTransform(scale, { x: nx, y: ny });
  };

  const onMouseUp = (e: React.MouseEvent) => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    if (!d.moved && modoMarcacao && aoMarcar) {
      const layer = layerRef.current;
      const rect = layer!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) aoMarcar(Number(x.toFixed(1)), Number(y.toFixed(1)));
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const stage = stageRef.current!;
    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const fator = scale * 0.15;
    zoom(e.deltaY < 0 ? fator : -fator, { cx, cy });
  };

  const marcar = (e: React.MouseEvent) => {
    // usado quando o usuário clica num ponto de marcação rápido (sem arrastar)
    if (modoMarcacao && aoMarcar && !drag.current.moved) { /* já tratado no mouseUp */ }
  };

  const innerStyle: CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
    transformOrigin: '0 0'
  };

  return (
    <div className="map-viewport-container">
      <div className="map-toolbar">
        <div className="map-tools-group">
          <button className="btn-map-tool" onClick={() => zoom(0.25)}>🔍 + Zoom</button>
          <button className="btn-map-tool" onClick={() => zoom(-0.25)}>🔍 - Zoom</button>
          <button className="btn-map-tool" onClick={resetar}>🔄 Enquadrar</button>
          <span style={{ fontSize: 11, fontWeight: 'bold', marginLeft: 4 }}>{Math.round(scale * 100)}%</span>
        </div>
      </div>
      <div
        ref={stageRef}
        className="map-stage"
        style={{ height: altura, position: 'relative', overflow: 'hidden' }}
        onWheel={onWheel}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { on: true, startX: e.clientX - pan.x, startY: e.clientY - pan.y, panX: pan.x, panY: pan.y, moved: false };
        }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { drag.current.on = false; }}
      >
        <div ref={layerRef} className="map-content-layer" style={innerStyle}>
          {plantaUrl && <img className="plant-bg-img" src={plantaUrl} alt="Planta" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />}
          {!plantaUrl && (
            <svg viewBox="0 0 1000 680" width="100%" height="100%">
              <rect width="1000" height="680" fill="none" stroke="#495057" strokeWidth="2" />
              <text x="400" y="340" fill="#999">Planta Base Padrão</text>
            </svg>
          )}

          {children}

          {dados
            .filter((o) => o.map_x != null && o.map_y != null)
            .map((o) => (
              <div
                key={o.id}
                className="map-pin"
                style={{ left: o.map_x + '%', top: o.map_y + '%' }}
                onMouseEnter={(e) => setTip({ os: o, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTip(null)}
                onMouseMove={(e) => setTip((t) => (t && t.os.id === o.id ? { ...t, x: e.clientX, y: e.clientY } : t))}
              >
                <span className="pin-cat" style={{ borderColor: STATUS_CORES[getStatusOS(o)] }}>
                  <span className="pin-cat-emoji">{iconeCategoria(o.categoria)}</span>
                </span>
              </div>
            ))}
        </div>

        {tip && <TooltipMapa os={tip.os} top={tip.y} left={tip.x} />}
      </div>
    </div>
  );
}

function TooltipMapa({ os, top, left }: { os: OS; top: number; left: number }) {
  const cor = STATUS_CORES[getStatusOS(os)];
  return (
    <div className="map-tooltip" style={{ top: top + 12, left: left + 12, display: 'block', position: 'absolute' }}>
      <div className="tooltip-titulo" style={{ borderColor: cor }}>{os.id}</div>
      {os.evidencia && (
        <div className="tooltip-mini"><img src={os.evidencia} alt="evidência" /></div>
      )}
      <table className="tooltip-resumo">
        <tbody>
          <tr><td>Status</td><td><strong style={{ color: cor }}>{getStatusOS(os)}</strong></td></tr>
          <tr><td>Categoria</td><td>{os.categoria}{os.subcategoria ? ' › ' + os.subcategoria : ''}</td></tr>
          <tr><td>Local</td><td>{os.local}</td></tr>
          <tr><td>Solicitante</td><td>{os.solicitante || '—'}</td></tr>
          <tr><td>Responsável</td><td>{os.responsavel || '—'}</td></tr>
        </tbody>
      </table>
      <div className="tooltip-desc">{os.descricao}</div>
    </div>
  );
}