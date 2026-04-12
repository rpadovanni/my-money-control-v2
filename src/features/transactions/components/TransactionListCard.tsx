import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Inbox, Pencil, Trash2, X } from 'lucide-react'
import { formatISODateForDisplay } from '../../../shared/lib/dates'
import { ui } from '../../../shared/styles/dashboard-ui'
import { errMessage, formatCents, signedFormatCents } from '../../../shared/utils/money-format'
import { useTransactionsStore } from '../store/transactions.store'

export type TxListAccountOption = { id: string; name: string }
export type TxListCategoryOption = { id: string; label: string }

export function TransactionListCard({
  accounts,
  archivedAccounts,
  categories,
  pushToast,
  setNotice,
  editingId,
  setEditingId,
  setSubmittingTx,
  transactionsRouteActive,
}: {
  accounts: TxListAccountOption[]
  archivedAccounts: TxListAccountOption[]
  categories: TxListCategoryOption[]
  pushToast: (variant: 'success' | 'error', message: string, durationMs?: number) => void
  setNotice: (n: null | { variant: 'error'; message: string }) => void
  editingId: string | null
  setEditingId: (id: string | null) => void
  setSubmittingTx: (v: boolean) => void
  /** `true` quando a rota é `/transactions` (texto do empty state). */
  transactionsRouteActive: boolean
}) {
  const rows = useTransactionsStore((s) => s.transactions.items)
  const remove = useTransactionsStore((s) => s.deleteTransaction)

  const [deleteConfirmTransactionId, setDeleteConfirmTransactionId] = useState<string | null>(null)
  const confirmTitleId = useId()
  const confirmDescId = useId()
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const confirmCancelRef = useRef<HTMLButtonElement>(null)

  const dismissDeleteConfirm = useCallback(() => {
    const restore = previouslyFocusedRef.current
    setDeleteConfirmTransactionId(null)
    queueMicrotask(() => restore?.focus?.())
  }, [])

  useEffect(() => {
    if (!deleteConfirmTransactionId) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissDeleteConfirm()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const id = requestAnimationFrame(() => confirmCancelRef.current?.focus())
    return () => {
      document.body.style.overflow = prevOverflow
      cancelAnimationFrame(id)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [deleteConfirmTransactionId, dismissDeleteConfirm])

  function accountName(id: string) {
    return accounts.find((a) => a.id === id)?.name ?? archivedAccounts.find((a) => a.id === id)?.name ?? id
  }

  async function runDeleteTransaction(id: string) {
    setSubmittingTx(true)
    setNotice(null)
    try {
      await remove(id)
      if (editingId === id) setEditingId(null)
      pushToast('success', 'Transação excluída.')
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    } finally {
      setSubmittingTx(false)
    }
  }

  function requestDeleteTransaction(id: string) {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    setDeleteConfirmTransactionId(id)
  }

  async function handleDeleteConfirmPrimary() {
    const id = deleteConfirmTransactionId
    const restore = previouslyFocusedRef.current
    setDeleteConfirmTransactionId(null)
    queueMicrotask(() => restore?.focus?.())
    if (id) await runDeleteTransaction(id)
  }

  function onConfirmDialogKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return
    const root = e.currentTarget
    const focusables = [...root.querySelectorAll<HTMLButtonElement>('button:not([disabled])')]
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      <div className={ui.card}>
        <h2 className={ui.cardTitle}>Transações</h2>
        {rows.length === 0 ? (
          <div className={ui.emptyState}>
            <Inbox className={ui.emptyIcon} aria-hidden />
            <p className={ui.emptyTitle}>Nenhuma transação neste período</p>
            <p className={ui.muted}>
              Ajuste mês, conta ou tipo nos filtros — ou inclua um lançamento{' '}
              {transactionsRouteActive ? 'no formulário ao lado' : 'no formulário acima'}.
            </p>
          </div>
        ) : (
          <ul className={ui.list}>
            {rows.map((t) => (
              <li key={t.id} className={`${ui.item} ${ui.itemRow}`}>
                <div className={ui.itemMain}>
                  <div className={ui.txAmount}>
                    {t.kind === 'opening_balance' ? (
                      <strong className={ui.neutral}>{signedFormatCents(t.amountCents)}</strong>
                    ) : t.type === 'transfer' ? (
                      <strong className={ui.neutral}>↔ {formatCents(t.amountCents)}</strong>
                    ) : (
                      <strong className={t.type === 'income' ? ui.positive : ui.negative}>
                        {t.type === 'income' ? '+' : '−'} {formatCents(t.amountCents)}
                      </strong>
                    )}
                  </div>
                  <div className={ui.txDetail}>
                    {t.kind === 'opening_balance' ? (
                      <>Saldo inicial • {accountName(t.accountId)}</>
                    ) : t.type === 'transfer' ? (
                      <>
                        Transferência • {accountName(t.fromAccountId ?? '')} →{' '}
                        {accountName(t.toAccountId ?? '')}
                        {t.description ? ` • ${t.description}` : ''}
                      </>
                    ) : (
                      <>
                        {categories.find((c) => c.id === t.category)?.label ?? t.category} •{' '}
                        {accountName(t.accountId)}
                        {t.description ? ` • ${t.description}` : ''}
                      </>
                    )}
                  </div>
                </div>
                <div className={ui.itemAside}>
                  <span className={ui.itemAsideMeta}>{formatISODateForDisplay(t.date)}</span>
                  <div className={ui.itemActions}>
                    <button
                      type="button"
                      className={`${ui.btnGhost} ${ui.btnIconAsideGhost}`}
                      onClick={() => setEditingId(t.id)}
                      aria-label="Editar transação"
                      title="Editar"
                    >
                      <Pencil className={ui.btnIcon} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={`${ui.btnDanger} ${ui.btnIconAsideDanger}`}
                      onClick={() => void requestDeleteTransaction(t.id)}
                      aria-label="Excluir transação"
                      title="Excluir"
                    >
                      <Trash2 className={ui.btnIcon} aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {deleteConfirmTransactionId ? (
        <div
          className={ui.modalRoot}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) dismissDeleteConfirm()
          }}
        >
          <div
            className={ui.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            aria-describedby={confirmDescId}
            onKeyDown={onConfirmDialogKeyDown}
          >
            <h2 id={confirmTitleId} className={ui.modalTitle}>
              Excluir transação?
            </h2>
            <p id={confirmDescId} className={ui.modalDesc}>
              Esta ação não pode ser desfeita. A transação será removida permanentemente.
            </p>
            <div className={ui.modalActions}>
              <button
                ref={confirmCancelRef}
                type="button"
                className={`${ui.btnGhost} ${ui.btnWithIcon}`}
                onClick={dismissDeleteConfirm}
              >
                <X className={ui.btnIcon} aria-hidden />
                <span>Voltar</span>
              </button>
              <button
                type="button"
                className={`${ui.btnDanger} ${ui.btnWithIcon}`}
                onClick={() => void handleDeleteConfirmPrimary()}
              >
                <Trash2 className={ui.btnIcon} aria-hidden />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
