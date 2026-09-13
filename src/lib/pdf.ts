const DPI_ALVO = 300;
const MAX_LADO = 6000;

export async function pdfParaImagem(file: File): Promise<File> {
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrlMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrlMod.default;

  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buf });
  const pdf = await loadingTask.promise;
  const pagina = await pdf.getPage(1);
  const vp1 = pagina.getViewport({ scale: 1 });

  const escala = Math.min(DPI_ALVO / 96, MAX_LADO / Math.max(vp1.width, vp1.height));
  const viewport = pagina.getViewport({ scale: escala });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível no navegador');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await pagina.render({ canvasContext: ctx, canvas, viewport }).promise;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  await loadingTask.destroy();
  if (!blob) throw new Error('Falha ao gerar imagem do PDF');

  return new File([blob], 'planta.png', { type: 'image/png' });
}