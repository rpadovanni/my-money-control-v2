/** Tokens de classe Tailwind compartilhados entre telas do app (sem lógica de domínio). */
export const ui = {
  container: 'mx-auto max-w-[1100px] px-mmc-3 pb-12 pt-mmc-4',
  containerOffline:
    'mx-auto max-w-[1100px] px-mmc-3 pb-12 pt-[calc(var(--spacing-mmc-4)+36px)]',
  header: 'mb-4 flex items-start justify-between gap-4',
  headerAside:
    'flex max-w-full shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 self-center sm:max-w-[520px]',
  headerCloud: 'flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5',
  headerCloudEmail:
    'max-w-[160px] truncate text-mmc-sm leading-tight sm:max-w-[55vw] min-[900px]:max-w-[280px]',
  headerCloudActions: 'flex shrink-0 flex-nowrap gap-1',
  muted: 'text-mmc-muted',
  card: 'rounded-mmc-card border border-mmc-border-subtle bg-mmc-surface p-mmc-3',
  cardTitle: 'mb-mmc-2 text-mmc-md font-semibold',
  cardLogin: 'mb-4 rounded-mmc-card border border-mmc-border-subtle bg-mmc-surface p-mmc-3',
  codeBlock:
    'mt-2.5 overflow-auto whitespace-pre rounded-mmc-card border border-mmc-border bg-mmc-code-bg p-3 text-mmc-sm leading-snug',
  cloudAuthError:
    'mb-3 rounded-mmc-input border border-mmc-notice-err-border bg-mmc-notice-err-bg p-2.5 text-mmc-base text-mmc-notice-err-text',
  pill: 'rounded-full border border-white/16 bg-white/[0.06] px-2.5 py-1.5 text-mmc-sm',
  row: 'grid grid-cols-1 gap-3 min-[640px]:grid-cols-3',
  row2: 'grid grid-cols-1 gap-3 min-[640px]:grid-cols-2',
  row4: 'grid grid-cols-1 gap-3 min-[640px]:grid-cols-2 min-[960px]:grid-cols-4',
  rowActionsLogin: 'mt-3 flex flex-wrap items-center gap-2.5',
  form: 'grid grid-cols-1 gap-3 min-[640px]:grid-cols-2',
  formFull: 'col-span-full min-[640px]:col-span-2',
  actions: 'col-span-full flex justify-end gap-2 min-[640px]:col-span-2',
  btnWithIcon: 'inline-flex items-center gap-2',
  btnIcon: 'size-[18px] shrink-0 opacity-90',
  btnIconSpin: 'size-[18px] shrink-0 animate-spin opacity-90',
  btnIconHeader: 'size-4 shrink-0 opacity-90',
  btnGhost: 'bg-transparent',
  btnDanger: 'border-mmc-danger-border text-mmc-danger-fg',
  btnSecondary: 'bg-white/[0.04]',
  btnIconBtn:
    'inline-flex min-h-10 min-w-10 items-center justify-center p-2 leading-none',
  btnIconBtnHeader:
    'inline-flex min-h-9 min-w-9 items-center justify-center p-1.5 leading-none',
  btnIconAside:
    'inline-flex min-h-10 min-w-10 items-center justify-center border-mmc-border bg-mmc-surface-2 p-2 leading-none',
  btnIconAsideGhost:
    'inline-flex min-h-10 min-w-10 items-center justify-center border-mmc-border bg-white/[0.05] p-2 leading-none',
  btnIconAsideDanger:
    'inline-flex min-h-10 min-w-10 items-center justify-center border-mmc-danger-icon-border bg-mmc-danger-icon-bg p-2 leading-none text-red-200',
  topNavIcon: 'size-[18px] shrink-0',
  grid: 'mt-mmc-3 grid grid-cols-1 gap-mmc-3 min-[900px]:grid-cols-2',
  gridSingle: 'mt-mmc-3 grid grid-cols-1 gap-mmc-3',
  pageTitle: 'mb-mmc-2 text-mmc-lg font-bold tracking-tight text-white/95',
  noticeError:
    'mb-4 flex items-start gap-2.5 rounded-mmc-panel border border-mmc-notice-err-border bg-mmc-notice-err-bg px-3.5 py-3 text-mmc-base leading-snug text-mmc-notice-err-text',
  noticeText: 'min-w-0 flex-1',
  noticeDismiss:
    'inline-flex min-h-8 min-w-8 shrink-0 bg-black/15 px-2.5 py-1 text-lg leading-tight',
  hint: 'text-mmc-xs leading-snug text-mmc-hint',
  hintBlock: 'mb-3 mt-0 text-mmc-xs leading-snug text-mmc-hint',
  stickyFilters:
    'sticky top-mmc-2 z-[3] self-start rounded-mmc-card border border-mmc-border-subtle bg-mmc-surface p-mmc-3 shadow-[0_4px_24px_rgb(0_0_0_/_0.35)]',
  periodLabel: 'mb-3 mt-0 text-[13px] text-mmc-muted',
  summaryGrid: 'grid grid-cols-2 gap-3 min-[720px]:grid-cols-4',
  value: 'mt-1 font-bold',
  positive: 'text-mmc-positive',
  negative: 'text-mmc-negative',
  neutral: 'text-mmc-neutral',
  accountForm: 'mb-4',
  accountFormDisabled: 'pointer-events-none opacity-55',
  accountEditForm:
    'mb-4 grid grid-cols-1 gap-3 rounded-mmc-panel border border-mmc-pwa-border p-3 min-[640px]:grid-cols-2',
  accountEditTitle: 'col-span-full mb-2 mt-0 text-[15px] font-semibold',
  list: 'mt-2 flex list-none flex-col gap-2.5 p-0',
  item: 'flex items-start justify-between gap-3 rounded-mmc-panel border border-mmc-border-soft bg-mmc-item-bg p-3',
  itemRow: 'items-center',
  itemRowTall: 'items-start',
  itemMain: 'min-w-0 flex-1',
  itemAside: 'flex shrink-0 flex-col items-end justify-center gap-2.5',
  itemAsideTall: 'flex shrink-0 flex-col items-end justify-start gap-2.5 pt-px',
  itemAsideMeta:
    'max-w-[min(200px,52vw)] text-right text-mmc-sm leading-snug tracking-wide text-mmc-muted [overflow-wrap:break-word] [hyphens:auto]',
  itemActions: 'flex shrink-0 flex-nowrap items-center justify-end gap-1.5',
  itemHead: 'flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2',
  itemHeadMain: 'flex min-w-0 flex-wrap items-center gap-2',
  tag: 'inline-flex shrink-0 items-center rounded-full border border-mmc-tag-border bg-mmc-tag-bg px-2 py-0.5 text-mmc-xs font-semibold tracking-wide text-mmc-tag-text',
  txAmount: 'leading-snug [&_strong]:text-[1.05rem]',
  txDetail: 'mt-1.5 text-mmc-base leading-snug text-mmc-muted',
  emptyState:
    'flex flex-col items-center gap-mmc-2 px-mmc-2 py-mmc-4 text-center',
  emptyIcon: 'size-12 text-mmc-empty-icon opacity-45',
  emptyTitle: 'm-0 text-mmc-md font-semibold text-white/88',
  offlineBar:
    'fixed left-0 right-0 top-0 z-[200] flex items-center justify-center gap-mmc-2 border-b border-mmc-offline-border bg-mmc-offline-bg px-mmc-3 py-mmc-1 text-mmc-sm text-mmc-offline-text',
  toastStack:
    'pointer-events-none fixed bottom-mmc-3 left-1/2 z-[150] flex max-w-[min(420px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-mmc-1 [&>*]:pointer-events-auto',
  toastOk:
    'animate-[mmc-toast-in_0.22s_ease-out] rounded-mmc-toast border border-mmc-toast-ok-border bg-mmc-toast-ok-bg px-mmc-3 py-mmc-2 text-mmc-sm leading-snug text-mmc-toast-ok-text shadow-[0_8px_32px_rgb(0_0_0_/_0.45)]',
  toastErr:
    'animate-[mmc-toast-in_0.22s_ease-out] rounded-mmc-toast border border-mmc-toast-err-border bg-mmc-toast-err-bg px-mmc-3 py-mmc-2 text-mmc-sm leading-snug text-mmc-toast-err-text shadow-[0_8px_32px_rgb(0_0_0_/_0.45)]',
  scrollTop:
    'fixed bottom-mmc-3 right-mmc-3 z-[130] inline-flex size-11 items-center justify-center rounded-full border border-white/18 bg-mmc-scroll-bg text-white/90 shadow-[0_4px_20px_rgb(0_0_0_/_0.4)] hover:bg-mmc-scroll-hover',
  pwaBar:
    'fixed bottom-mmc-3 left-mmc-3 right-mmc-3 z-[140] flex flex-wrap items-center justify-between gap-mmc-2 rounded-mmc-panel border border-mmc-pwa-border bg-mmc-pwa-bg px-mmc-3 py-mmc-2 text-mmc-sm shadow-[0_8px_32px_rgb(0_0_0_/_0.5)]',
  pwaBarText: 'm-0 min-w-[200px] flex-1 leading-snug text-white/82',
  pwaActions: 'flex flex-wrap items-center gap-mmc-1',
  modalRoot:
    'fixed inset-0 z-[1000] flex items-center justify-center bg-mmc-modal-overlay p-4',
  modalPanel:
    'w-full max-w-[420px] rounded-mmc-card border border-mmc-modal-border bg-mmc-modal-panel p-5 shadow-[0_16px_48px_rgb(0_0_0_/_0.45)] outline-none focus-visible:shadow-[0_16px_48px_rgb(0_0_0_/_0.45),0_0_0_4px_rgb(120_163_255_/_0.22)]',
  modalTitle: 'mb-2.5 mt-0 text-lg font-bold',
  modalDesc: 'mb-4 mt-0 text-mmc-base leading-snug text-white/76',
  modalActions: 'flex flex-wrap justify-end gap-2',
  archivedDetails:
    'mt-4 border-t border-white/10 pt-3 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:text-mmc-base [&_summary]:font-semibold [&_summary::-webkit-details-marker]:hidden',
  itemArchived: 'opacity-[0.92]',
  accountFatura: 'mt-2 text-mmc-sm text-mmc-muted',
  accountPayable: 'mt-1 text-[15px] font-bold text-mmc-payable',
  accountBalance: 'mt-2 text-mmc-base font-bold',
  accountBalanceSubtle: 'mt-1 text-mmc-sm font-medium text-mmc-muted',
  accountBalanceCompact: '!mt-1.5 !text-[13px]',
  payForm:
    'mt-3 grid grid-cols-1 gap-2.5 rounded-mmc-input border border-mmc-pwa-border bg-mmc-pay-form-bg p-3',
  payFormActions: 'flex flex-wrap justify-end gap-2',
  payOpen: 'mt-2.5 self-start',
  topNav: 'mb-4 mt-0 flex flex-wrap gap-2.5',
  checkboxLabel:
    '!flex-row !items-center gap-2.5 [&_input]:h-auto [&_input]:w-auto [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0',
} as const
