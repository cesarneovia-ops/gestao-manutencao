import { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  inputValue?: string;
  onInputChange?: (v: string) => void;
  showInput?: boolean;
}

export default function Modal({
  open, title, message, onConfirm, onCancel,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  inputValue, onInputChange, showInput
}: ModalProps) {
  if (!open) return null;
  return (
    <div className="custom-modal-overlay">
      <div className="custom-modal">
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        {showInput && (
          <input
            type="text"
            value={inputValue || ''}
            onChange={(e) => onInputChange && onInputChange(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', marginBottom: 20 }}
            autoFocus
          />
        )}
        <div className="custom-modal-actions">
          <button className="btn-action" style={{ background: 'var(--danger)', color: '#fff' }} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn-action" style={{ background: 'var(--success)', color: '#fff' }} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BadgeStatus({ status }: { status: string }) {
  const cls =
    status === 'Concluído' ? 'badge-concluido'
    : status === 'Em Andamento' ? 'badge-andamento'
    : status === 'Reprogramado' ? 'badge-reprogramado'
    : 'badge-aberto';
  return <span className={`badge ${cls}`}>{status}</span>;
}

export function BadgePerfil({ perfil }: { perfil: string }) {
  const cls = perfil === 'Dev' ? 'bp-dev' : perfil === 'Admin' ? 'bp-admin' : 'bp-usuario';
  return <span className={`badge-perfil ${cls}`}>{perfil}</span>;
}