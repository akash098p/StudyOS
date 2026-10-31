import { useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'

type ConfirmVariant = 'delete' | 'confirm' | 'warning'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'confirm',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)
  if (!isOpen) return null

  const isDelete = variant === 'delete'
  const confirmText = confirmLabel || (isDelete ? 'Delete' : 'Confirm')

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="modal-backdrop confirm-backdrop"
      onClick={() => {
        if (!pending) onCancel()
      }}
    >
      <div
        className="confirm-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={e => e.stopPropagation()}
      >
        <div className="confirm-header">
          <div className={`confirm-icon confirm-icon-${variant}`}>
            {variant === 'delete' ? <X size={20} /> : <CheckCircle2 size={20} />}
          </div>
          <div>
            <h3 className="confirm-title" id="confirm-title">{title}</h3>
            <p className="confirm-message" id="confirm-message">{message}</p>
          </div>
        </div>
        <div className="confirm-actions">
          <button
            type="button"
            className="confirm-cancel"
            onClick={onCancel}
            disabled={pending}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-confirm confirm-confirm-${variant}`}
            onClick={() => void handleConfirm()}
            disabled={pending}
          >
            {pending ? 'Please wait…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
