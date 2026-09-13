import { useRef, useState, useEffect, useCallback, CSSProperties, ReactNode } from 'react';
import { OS, getStatusOS, STATUS_CORES, iconeCategoria, ehSerraCircular } from '../lib/types';

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
  const vpcRef = useRef<HTMLDivElement>(null);
  const [fs, setFs] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef({ on: false, startX: 0, startY: 0, panX: 0, panY: 0, moved: false });
  const touch = useRef<{ mode: 'none' | 'pan' | 'pinch'; baseDist: number; baseScale: number; basePan: { x: number; y: number }; startX: number; startY: number; cx: number; cy: number; moved: boolean }>({
    mode: 'none', baseDist: 0, baseScale: 1, basePan: { x: 0, y: 0 }, startX: 0, startY: 0, cx: 0, cy: 0, moved: false
  });
  const lastTouch = useRef(0);
  const [tip, setTip] = useState<{ os: OS; x: number; y: number } | null>(null);

  const aplicarTransform = useCallback((sc: number, p: { x: number; y: number }) => {
    const l = layerRef.current;
    if (l) l.style.transform = `translate(${p.x}px, ${p.y}px) scale(${sc})`;
  }, []);

  const alternarTelaCheia = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
      return;
    }
    const el = vpcRef.current;
    if (el && el.requestFullscreen) {
      try { await el.requestFullscreen(); return; } catch { /* fallback abaixo */ }
    }
    setFs(true); // iOS Safari e navegadores sem Fullscreen API
  }, []);

  useEffect(() => {
    const onFsChange = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
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

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (Date.now() - lastTouch.current < 500) return;
    drag.current = { on: true, startX: e.clientX - pan.x, startY: e.clientY - pan.y, panX: pan.x, panY: pan.y, moved: false };
  };

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

  const onTouchStart = (e: React.TouchEvent) => {
    lastTouch.current = Date.now();
    const stage = stageRef.current!;
    const rect = stage.getBoundingClientRect();
    const t = touch.current;
    if (e.touches.length === 1) {
      t.mode = 'pan';
      t.startX = e.touches[0].clientX;
      t.startY = e.touches[0].clientY;
      t.moved = false;
      t.basePan = { ...pan };
    } else if (e.touches.length === 2) {
      t.mode = 'pinch';
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      t.baseDist = Math.hypot(dx, dy);
      t.baseScale = scale;
      t.basePan = { ...pan };
      t.cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      t.cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = touch.current;
    if (t.mode === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - t.startX;
      const dy = e.touches[0].clientY - t.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) t.moved = true;
      const nx = t.basePan.x + dx;
      const ny = t.basePan.y + dy;
      setPan({ x: nx, y: ny });
      aplicarTransform(scale, { x: nx, y: ny });
    } else if (t.mode === 'pinch' && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (t.baseDist > 0) {
        const ns = Math.min(Math.max(t.baseScale * (dist / t.baseDist), 0.5), 8.0);
        const factor = ns / t.baseScale;
        const panX = t.cx - (t.cx - t.basePan.x) * factor;
        const panY = t.cy - (t.cy - t.basePan.y) * factor;
        setScale(ns);
        setPan({ x: panX, y: panY });
        aplicarTransform(ns, { x: panX, y: panY });
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current;
    if (t.mode === 'pan' && !t.moved && modoMarcacao && aoMarcar && e.changedTouches.length > 0) {
      const layer = layerRef.current;
      const rect = layer!.getBoundingClientRect();
      const c = e.changedTouches[0];
      const x = ((c.clientX - rect.left) / rect.width) * 100;
      const y = ((c.clientY - rect.top) / rect.height) * 100;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) aoMarcar(Number(x.toFixed(1)), Number(y.toFixed(1)));
    }
    t.mode = 'none';
    lastTouch.current = Date.now();
  };

  const tocarPonto = (e: React.MouseEvent) => {
    // usado quando o usuário clica num ponto de marcação rápido (sem arrastar)
    if (modoMarcacao && aoMarcar && !drag.current.moved) { /* já tratado no mouseUp */ }
  };

  const innerStyle: CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
    transformOrigin: '0 0'
  };

  // mantém o pino com tamanho visual constante independente do zoom
  const pinScale = 1 / scale;

  return (
    <div ref={vpcRef} className={`map-viewport-container ${fs ? 'map-fs-overlay' : ''}`} style={{ ['--pin-scale' as any]: pinScale }}>
      <div className="map-toolbar">
        <div className="map-tools-group">
          <button className="btn-map-tool" onClick={() => zoom(0.25)}>🔍 + Zoom</button>
          <button className="btn-map-tool" onClick={() => zoom(-0.25)}>🔍 - Zoom</button>
          <button className="btn-map-tool" onClick={resetar}>🔄 Enquadrar</button>
          <span style={{ fontSize: 11, fontWeight: 'bold', marginLeft: 4 }}>{Math.round(scale * 100)}%</span>
        </div>
        <div className="map-tools-group">
          <button className="btn-map-tool" onClick={alternarTelaCheia}>
            {fs || document.fullscreenElement ? '✕ Sair da tela cheia' : '⛶ Tela cheia'}
          </button>
        </div>
      </div>
      <div
        ref={stageRef}
        className="map-stage"
        style={{ height: altura, position: 'relative', overflow: 'hidden' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { drag.current.on = false; }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
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
                <span className="pin-ico" title={`${o.id} — ${getStatusOS(o)}`}>{ehSerraCircular(o.categoria) ? <IconeSerraCircular /> : iconeCategoria(o.categoria)}</span>
              </div>
            ))}
        </div>

        {tip && <TooltipMapa os={tip.os} top={tip.y} left={tip.x} />}
      </div>
    </div>
  );
}

export function IconeSerraCircular({ size = 19 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.4" style={{ display: 'block' }}>
      <circle cx="12" cy="12" r="8.6" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="8.8" strokeDasharray="2.4 1.35" strokeWidth="1.9" opacity="0.9" />
      <circle cx="12" cy="12" r="5.4" fill="currentColor" stroke="none" opacity="0.12" />
      <circle cx="12" cy="12" r="4.4" opacity="0.7" />
      <circle cx="13" cy="10.4" r="1.1" fill="currentColor" stroke="none" opacity="0.55" />
      <circle cx="10.8" cy="13.3" r="1.1" fill="currentColor" stroke="none" opacity="0.55" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
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