import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  Archive,
  Check,
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  Star,
  Undo2,
  WalletCards,
  X,
} from 'lucide-react'
import { currentMonthYYYYMM, formatMonthYearForDisplay, todayISODate } from '../../../shared/lib/dates'
import { ui } from '../../../shared/styles/dashboard-ui'
import { errMessage, formatCents } from '../../../shared/utils/money-format'
import { useAccountsStore } from '../store/accounts.store'
import type { Account, AccountType } from '../types/accounts'

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  bank: 'Banco',
  wallet: 'Carteira',
  credit_card: 'Cartão de crédito',
  other: 'Outro',
}

export type AddTransferPayload = {
  type: 'transfer'
  fromAccountId: string
  toAccountId: string
  amountCents: number
  date: string
  category: string
  description?: string
}

export function AccountsCard({
  onAddTransfer,
  pushToast,
  setNotice,
}: {
  onAddTransfer: (input: AddTransferPayload) => Promise<void>
  pushToast: (variant: 'success' | 'error', message: string, durationMs?: number) => void
  setNotice: (n: null | { variant: 'error'; message: string }) => void
}) {
  const accounts = useAccountsStore((s) => s.accounts.items)
  const archivedAccounts = useAccountsStore((s) => s.accounts.archivedItems)
  const balancesByAccountId = useAccountsStore((s) => s.accounts.balancesByAccountId)
  const creditCardPayableByAccountId = useAccountsStore((s) => s.accounts.creditCardPayableByAccountId)
  const addAccount = useAccountsStore((s) => s.addAccount)
  const setDefaultAccount = useAccountsStore((s) => s.setDefaultAccount)
  const archiveAccount = useAccountsStore((s) => s.archiveAccount)
  const unarchiveAccount = useAccountsStore((s) => s.unarchiveAccount)
  const getAccountOpeningForEdit = useAccountsStore((s) => s.getAccountOpeningForEdit)
  const updateAccountDetails = useAccountsStore((s) => s.updateAccountDetails)

  const accountFormNameRef = useRef<HTMLInputElement>(null)
  const payInvoiceAmountRef = useRef<HTMLInputElement>(null)

  const [submittingAccount, setSubmittingAccount] = useState(false)
  const [submittingAccountEdit, setSubmittingAccountEdit] = useState(false)
  const [submittingPayInvoice, setSubmittingPayInvoice] = useState(false)

  const [payInvoice, setPayInvoice] = useState<null | { cardId: string }>(null)
  const [payFromId, setPayFromId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(() => todayISODate())

  const [accountForm, setAccountForm] = useState(() => ({
    name: '',
    type: 'bank' as AccountType,
    openingBalance: '',
    makeDefault: false,
  }))

  const [accountEdit, setAccountEdit] = useState<null | {
    id: string
    name: string
    type: AccountType
    openingBalance: string
    openingDate: string
  }>(null)

  const [archiveConfirm, setArchiveConfirm] = useState<null | { accountId: string; displayName: string }>(
    null,
  )
  const confirmTitleId = useId()
  const confirmDescId = useId()
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const confirmCancelRef = useRef<HTMLButtonElement>(null)

  const dismissArchiveConfirm = useCallback(() => {
    const restore = previouslyFocusedRef.current
    setArchiveConfirm(null)
    queueMicrotask(() => restore?.focus?.())
  }, [])

  useEffect(() => {
    if (!payInvoice) return
    payInvoiceAmountRef.current?.focus()
  }, [payInvoice])

  useEffect(() => {
    if (!archiveConfirm) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissArchiveConfirm()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const id = requestAnimationFrame(() => confirmCancelRef.current?.focus())
    return () => {
      document.body.style.overflow = prevOverflow
      cancelAnimationFrame(id)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [archiveConfirm, dismissArchiveConfirm])

  const defaultAccountId =
    accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? ''

  const canSubmitAccount = accountForm.name.trim().length > 0 && accountEdit == null

  const accountEditOpeningRaw = accountEdit?.openingBalance.trim().replace(',', '.') ?? ''
  const accountEditOpeningValid =
    accountEditOpeningRaw.length === 0 || Number.isFinite(Number(accountEditOpeningRaw))
  const canSubmitAccountEdit =
    accountEdit != null &&
    accountEdit.name.trim().length > 0 &&
    accountEditOpeningValid

  const payRaw = payAmount.trim().replace(',', '.')
  const payNum = payRaw.length > 0 ? Number(payRaw) : Number.NaN
  const canSubmitPayInvoice =
    payInvoice != null &&
    payFromId.length > 0 &&
    payFromId !== payInvoice.cardId &&
    payAmount.trim().length > 0 &&
    Number.isFinite(payNum) &&
    Math.round(payNum * 100) > 0

  function accountName(id: string) {
    return (
      accounts.find((a) => a.id === id)?.name ?? archivedAccounts.find((a) => a.id === id)?.name ?? id
    )
  }

  function openPayInvoice(cardId: string) {
    setPayInvoice({ cardId })
    const suggested = creditCardPayableByAccountId[cardId] ?? 0
    setPayAmount(suggested > 0 ? String(suggested / 100) : '')
    setPayDate(todayISODate())
    const from =
      accounts.find((a) => a.isDefault && a.id !== cardId && a.type !== 'credit_card')?.id ??
      accounts.find((a) => a.id !== cardId && a.type !== 'credit_card')?.id ??
      defaultAccountId
    setPayFromId(from)
  }

  async function onSubmitAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitAccount || accountEdit || submittingAccount) return

    setSubmittingAccount(true)
    setNotice(null)
    try {
      const obRaw = accountForm.openingBalance.trim().replace(',', '.')
      const openingBalanceCents =
        obRaw.length > 0 && Number.isFinite(Number(obRaw)) ? Math.round(Number(obRaw) * 100) : undefined

      await addAccount({
        name: accountForm.name.trim(),
        type: accountForm.type,
        makeDefault: accountForm.makeDefault,
        openingBalanceCents,
      })

      setAccountForm({ name: '', type: 'bank', openingBalance: '', makeDefault: false })
      pushToast('success', 'Conta criada.')
      queueMicrotask(() => accountFormNameRef.current?.focus())
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    } finally {
      setSubmittingAccount(false)
    }
  }

  async function beginEditAccount(a: Account) {
    setNotice(null)
    try {
      const snap = await getAccountOpeningForEdit(a.id)
      setAccountEdit({
        id: a.id,
        name: a.name,
        type: a.type,
        openingBalance: snap.amountCents != null ? String(snap.amountCents / 100) : '',
        openingDate: snap.date,
      })
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    }
  }

  async function onSubmitAccountEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitAccountEdit || !accountEdit || submittingAccountEdit) return

    setSubmittingAccountEdit(true)
    setNotice(null)
    try {
      const raw = accountEdit.openingBalance.trim().replace(',', '.')
      let openingBalanceCents: number | null = null
      if (raw.length > 0) {
        if (!Number.isFinite(Number(raw))) {
          pushToast('error', 'Saldo inicial inválido.')
          return
        }
        const cents = Math.round(Number(raw) * 100)
        openingBalanceCents = cents === 0 ? null : cents
      }

      await updateAccountDetails(accountEdit.id, {
        name: accountEdit.name.trim(),
        type: accountEdit.type,
        openingBalanceCents,
        openingDate: accountEdit.openingDate,
      })
      setAccountEdit(null)
      pushToast('success', 'Conta atualizada.')
      queueMicrotask(() => accountFormNameRef.current?.focus())
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    } finally {
      setSubmittingAccountEdit(false)
    }
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

  async function runArchiveAccountAction(id: string) {
    setNotice(null)
    try {
      await archiveAccount(id)
      pushToast('success', 'Conta arquivada.')
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    }
  }

  function requestArchiveAccount(id: string, displayName: string) {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    setArchiveConfirm({ accountId: id, displayName })
  }

  async function handleArchiveConfirmPrimary() {
    if (!archiveConfirm) return
    const state = archiveConfirm
    const restore = previouslyFocusedRef.current
    setArchiveConfirm(null)
    queueMicrotask(() => restore?.focus?.())
    await runArchiveAccountAction(state.accountId)
  }

  async function handleSetDefaultAccount(id: string) {
    setNotice(null)
    try {
      await setDefaultAccount(id)
      pushToast('success', 'Conta padrão atualizada.')
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    }
  }

  async function handleUnarchiveAccount(id: string) {
    setNotice(null)
    try {
      await unarchiveAccount(id)
      pushToast('success', 'Conta restaurada.')
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    }
  }

  async function onSubmitPayInvoice(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitPayInvoice || !payInvoice || submittingPayInvoice) return

    const amountCents = Math.round(payNum * 100)
    const nm = accountName(payInvoice.cardId)
    const label = formatMonthYearForDisplay(currentMonthYYYYMM())

    setSubmittingPayInvoice(true)
    setNotice(null)
    try {
      if (payFromId === payInvoice.cardId) {
        pushToast('error', 'Escolha outra conta para debitar o pagamento.')
        return
      }
      await onAddTransfer({
        type: 'transfer',
        fromAccountId: payFromId,
        toAccountId: payInvoice.cardId,
        amountCents,
        date: payDate,
        category: 'transfer',
        description: `Pagamento fatura — ${nm} (${label})`,
      })
      setPayInvoice(null)
      pushToast('success', 'Pagamento de fatura registrado.')
    } catch (err) {
      setNotice({ variant: 'error', message: errMessage(err) })
    } finally {
      setSubmittingPayInvoice(false)
    }
  }

  const faturaMesLabel = formatMonthYearForDisplay(currentMonthYYYYMM())

  return (
    <>
      <div className={ui.card}>
        <h2 className={ui.cardTitle}>Contas</h2>
        <p className={ui.hintBlock}>
          Saldo por conta = histórico completo. Em cartões, &quot;A pagar&quot; usa sempre o{' '}
          <strong>mês civil atual</strong> (independente do filtro da lista).
        </p>
        <div className={accountEdit ? ui.accountFormDisabled : undefined}>
          <form className={`${ui.form} ${ui.accountForm}`} onSubmit={onSubmitAccount}>
            <label className={ui.formFull}>
              <span>Nome</span>
              <input
                ref={accountFormNameRef}
                placeholder="ex.: Bradesco"
                autoComplete="off"
                maxLength={120}
                value={accountForm.name}
                onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label>
              <span>Tipo</span>
              <select
                value={accountForm.type}
                onChange={(e) => setAccountForm((f) => ({ ...f, type: e.target.value as AccountType }))}
              >
                <option value="bank">Banco</option>
                <option value="wallet">Carteira</option>
                <option value="credit_card">Cartão de crédito</option>
                <option value="other">Outro</option>
              </select>
            </label>
            <label>
              <span>Saldo inicial (opcional)</span>
              <input
                inputMode="decimal"
                placeholder="ex.: 1500 ou −200"
                value={accountForm.openingBalance}
                onChange={(e) =>
                  setAccountForm((f) => ({ ...f, openingBalance: e.target.value.replace(',', '.') }))
                }
              />
            </label>
            <label className={ui.checkboxLabel}>
              <input
                type="checkbox"
                checked={accountForm.makeDefault}
                onChange={(e) => setAccountForm((f) => ({ ...f, makeDefault: e.target.checked }))}
              />
              <span>Definir como conta padrão</span>
            </label>
            <div className={ui.actions}>
              <button
                type="submit"
                disabled={!canSubmitAccount || submittingAccount}
                className={ui.btnWithIcon}
              >
                {submittingAccount ? (
                  <Loader2 className={ui.btnIconSpin} aria-hidden />
                ) : (
                  <Plus className={ui.btnIcon} aria-hidden />
                )}
                <span>{submittingAccount ? 'Salvando…' : 'Incluir conta'}</span>
              </button>
            </div>
          </form>
        </div>

        {accountEdit ? (
          <form className={`${ui.accountEditForm} ${ui.accountForm}`} onSubmit={onSubmitAccountEdit}>
            <h3 className={ui.accountEditTitle}>Editar conta</h3>
            <p className={`${ui.hint} ${ui.formFull}`}>
              Ajuste nome, tipo ou saldo inicial. Deixe o saldo vazio para remover o lançamento de saldo
              inicial.
            </p>
            <label className={ui.formFull}>
              <span>Nome</span>
              <input
                value={accountEdit.name}
                onChange={(e) => setAccountEdit((f) => (f ? { ...f, name: e.target.value } : f))}
              />
            </label>
            <label>
              <span>Tipo</span>
              <select
                value={accountEdit.type}
                onChange={(e) =>
                  setAccountEdit((f) => (f ? { ...f, type: e.target.value as AccountType } : f))
                }
              >
                <option value="bank">Banco</option>
                <option value="wallet">Carteira</option>
                <option value="credit_card">Cartão de crédito</option>
                <option value="other">Outro</option>
              </select>
            </label>
            <label>
              <span>Saldo inicial</span>
              <input
                inputMode="decimal"
                placeholder="vazio = sem saldo inicial"
                value={accountEdit.openingBalance}
                onChange={(e) =>
                  setAccountEdit((f) =>
                    f ? { ...f, openingBalance: e.target.value.replace(',', '.') } : f,
                  )
                }
              />
            </label>
            <label>
              <span>Data do saldo inicial</span>
              <input
                type="date"
                value={accountEdit.openingDate}
                onChange={(e) => setAccountEdit((f) => (f ? { ...f, openingDate: e.target.value } : f))}
              />
            </label>
            <div className={ui.actions}>
              <button
                type="button"
                className={`${ui.btnGhost} ${ui.btnWithIcon}`}
                onClick={() => setAccountEdit(null)}
              >
                <X className={ui.btnIcon} aria-hidden />
                <span>Voltar</span>
              </button>
              <button
                type="submit"
                disabled={!canSubmitAccountEdit || submittingAccountEdit}
                className={ui.btnWithIcon}
              >
                {submittingAccountEdit ? (
                  <Loader2 className={ui.btnIconSpin} aria-hidden />
                ) : (
                  <Check className={ui.btnIcon} aria-hidden />
                )}
                <span>{submittingAccountEdit ? 'Salvando…' : 'Salvar'}</span>
              </button>
            </div>
          </form>
        ) : null}
        {accounts.length === 0 ? (
          <div className={ui.emptyState}>
            <WalletCards className={ui.emptyIcon} aria-hidden />
            <p className={ui.emptyTitle}>Nenhuma conta cadastrada</p>
            <p className={ui.muted}>
              Crie uma conta (banco, carteira ou cartão) no formulário acima para começar a lançar
              transações.
            </p>
          </div>
        ) : (
          <ul className={ui.list}>
            {accounts.map((a: Account) => (
              <li
                key={a.id}
                className={`${ui.item} ${ui.itemRow} ${a.type === 'credit_card' ? ui.itemRowTall : ''}`}
              >
                <div className={ui.itemMain}>
                  <div className={ui.itemHead}>
                    <div className={ui.itemHeadMain}>
                      <strong>{a.name}</strong>
                      {a.isDefault ? <span className={ui.tag}>Padrão</span> : null}
                    </div>
                  </div>
                  {a.type === 'credit_card' ? (
                    <>
                      <div className={`${ui.accountFatura} ${ui.muted}`}>Fatura ({faturaMesLabel})</div>
                      <div className={ui.accountPayable}>
                        A pagar: {formatCents(creditCardPayableByAccountId[a.id] ?? 0)}
                      </div>
                      <div className={`${ui.accountBalanceSubtle} ${ui.muted}`}>
                        Saldo (contábil): {formatCents(balancesByAccountId[a.id] ?? 0)}
                      </div>
                      {payInvoice?.cardId === a.id ? (
                        <form className={ui.payForm} onSubmit={onSubmitPayInvoice}>
                          <label>
                            <span>Pagar de</span>
                            <select
                              value={payFromId}
                              onChange={(e) => setPayFromId(e.target.value)}
                            >
                              {(accounts.filter((x) => x.id !== a.id && x.type !== 'credit_card').length > 0
                                ? accounts.filter((x) => x.id !== a.id && x.type !== 'credit_card')
                                : accounts.filter((x) => x.id !== a.id)
                              ).map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Valor (R$)</span>
                            <input
                              ref={payInvoiceAmountRef}
                              inputMode="decimal"
                              value={payAmount}
                              onChange={(e) => setPayAmount(e.target.value.replace(',', '.'))}
                            />
                          </label>
                          <label>
                            <span>Data</span>
                            <input
                              type="date"
                              value={payDate}
                              onChange={(e) => setPayDate(e.target.value)}
                            />
                          </label>
                          <div className={ui.payFormActions}>
                            <button
                              type="button"
                              className={`${ui.btnGhost} ${ui.btnWithIcon}`}
                              onClick={() => setPayInvoice(null)}
                            >
                              <X className={ui.btnIcon} aria-hidden />
                              <span>Voltar</span>
                            </button>
                            <button
                              type="submit"
                              disabled={!canSubmitPayInvoice || submittingPayInvoice}
                              className={ui.btnWithIcon}
                            >
                              {submittingPayInvoice ? (
                                <Loader2 className={ui.btnIconSpin} aria-hidden />
                              ) : (
                                <Check className={ui.btnIcon} aria-hidden />
                              )}
                              <span>{submittingPayInvoice ? 'Registrando…' : 'Registrar'}</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className={`${ui.btnGhost} ${ui.payOpen} ${ui.btnWithIcon}`}
                          onClick={() => openPayInvoice(a.id)}
                        >
                          <CreditCard className={ui.btnIcon} aria-hidden />
                          <span>Pagar fatura</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div
                      className={`${ui.accountBalance} ${
                        (balancesByAccountId[a.id] ?? 0) >= 0 ? ui.positive : ui.negative
                      }`}
                    >
                      Saldo: {formatCents(balancesByAccountId[a.id] ?? 0)}
                    </div>
                  )}
                </div>
                <div className={a.type === 'credit_card' ? ui.itemAsideTall : ui.itemAside}>
                  <span className={ui.itemAsideMeta} title={ACCOUNT_TYPE_LABEL[a.type]}>
                    {ACCOUNT_TYPE_LABEL[a.type]}
                  </span>
                  <div className={ui.itemActions}>
                    <button
                      type="button"
                      className={`${ui.btnGhost} ${ui.btnIconAsideGhost}`}
                      onClick={() => {
                        void beginEditAccount(a)
                      }}
                      aria-label={`Editar conta ${a.name}`}
                      title="Editar"
                    >
                      <Pencil className={ui.btnIcon} aria-hidden />
                    </button>
                    {!a.isDefault ? (
                      <button
                        type="button"
                        className={`${ui.btnGhost} ${ui.btnIconAsideGhost}`}
                        onClick={() => void handleSetDefaultAccount(a.id)}
                        aria-label="Definir como conta padrão"
                        title="Conta padrão"
                      >
                        <Star className={ui.btnIcon} aria-hidden />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`${ui.btnDanger} ${ui.btnIconAsideDanger}`}
                      disabled={accounts.length <= 1}
                      onClick={() => void requestArchiveAccount(a.id, a.name)}
                      aria-label={`Arquivar conta ${a.name}`}
                      title="Arquivar"
                    >
                      <Archive className={ui.btnIcon} aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {archivedAccounts.length > 0 ? (
          <details className={ui.archivedDetails}>
            <summary>
              Contas arquivadas <span className={ui.muted}>({archivedAccounts.length})</span>
            </summary>
            <ul className={ui.list}>
              {archivedAccounts.map((a: Account) => (
                <li
                  key={a.id}
                  className={`${ui.item} ${ui.itemArchived} ${ui.itemRow} ${
                    a.type === 'credit_card' ? ui.itemRowTall : ''
                  }`}
                >
                  <div className={ui.itemMain}>
                    <div className={ui.itemHead}>
                      <div className={ui.itemHeadMain}>
                        <strong>{a.name}</strong>
                        {a.isDefault ? <span className={ui.tag}>Padrão</span> : null}
                      </div>
                    </div>
                    {a.type === 'credit_card' ? (
                      <>
                        <div className={`${ui.accountFatura} ${ui.muted}`}>Fatura ({faturaMesLabel})</div>
                        <div className={`${ui.accountPayable} ${ui.accountBalanceCompact}`}>
                          A pagar: {formatCents(creditCardPayableByAccountId[a.id] ?? 0)}
                        </div>
                        <div
                          className={`${ui.accountBalanceSubtle} ${ui.muted} ${ui.accountBalanceCompact}`}
                        >
                          Saldo (contábil): {formatCents(balancesByAccountId[a.id] ?? 0)}
                        </div>
                      </>
                    ) : (
                      <div
                        className={`${ui.accountBalance} ${ui.accountBalanceCompact} ${
                          (balancesByAccountId[a.id] ?? 0) >= 0 ? ui.positive : ui.negative
                        }`}
                      >
                        Saldo: {formatCents(balancesByAccountId[a.id] ?? 0)}
                      </div>
                    )}
                  </div>
                  <div className={a.type === 'credit_card' ? ui.itemAsideTall : ui.itemAside}>
                    <span className={ui.itemAsideMeta} title={ACCOUNT_TYPE_LABEL[a.type]}>
                      {ACCOUNT_TYPE_LABEL[a.type]}
                    </span>
                    <div className={ui.itemActions}>
                      <button
                        type="button"
                        className={`${ui.btnGhost} ${ui.btnIconAsideGhost}`}
                        onClick={() => {
                          void beginEditAccount(a)
                        }}
                        aria-label={`Editar conta ${a.name}`}
                        title="Editar"
                      >
                        <Pencil className={ui.btnIcon} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={`${ui.btnGhost} ${ui.btnIconAsideGhost}`}
                        onClick={() => void handleUnarchiveAccount(a.id)}
                        aria-label={`Restaurar conta ${a.name}`}
                        title="Restaurar"
                      >
                        <Undo2 className={ui.btnIcon} aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      {archiveConfirm ? (
        <div
          className={ui.modalRoot}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) dismissArchiveConfirm()
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
              Arquivar conta?
            </h2>
            <p id={confirmDescId} className={ui.modalDesc}>
              Arquivar a conta &quot;{archiveConfirm.displayName}&quot;? Você pode restaurá-la depois em
              contas arquivadas.
            </p>
            <div className={ui.modalActions}>
              <button
                ref={confirmCancelRef}
                type="button"
                className={`${ui.btnGhost} ${ui.btnWithIcon}`}
                onClick={dismissArchiveConfirm}
              >
                <X className={ui.btnIcon} aria-hidden />
                <span>Voltar</span>
              </button>
              <button
                type="button"
                className={ui.btnWithIcon}
                onClick={() => void handleArchiveConfirmPrimary()}
              >
                <Archive className={ui.btnIcon} aria-hidden />
                <span>Arquivar</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
