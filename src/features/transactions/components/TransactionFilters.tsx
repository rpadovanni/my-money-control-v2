/**
 * Barra de filtros da página «Transações»:
 * - busca textual (no título da transação) com debounce
 * - botão «Filtros avançados» (período, conta, categoria, tipo) num modal
 * - botão «Ordenar» (data desc/asc, valor desc/asc) num dropdown
 * - badges dos filtros aplicados + botão «Limpar todos»
 *
 * O backend (gateway de transações) recebe `TransactionsFilters` e devolve a
 * lista já filtrada/ordenada — esta UI apenas dispara `setTransactionsX`.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Calendar,
  Landmark,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";
import { Input } from "../../../shared/components/ui/Input";
import { Modal } from "../../../shared/components/ui/Modal";
import { Select } from "../../../shared/components/ui/Select";
import { cn } from "../../../shared/utils/cn";
import {
  currentMonthYYYYMM,
  formatISODateForDisplay,
  formatMonthYearForDisplay,
  monthDayBounds,
  todayISODate,
} from "../../../shared/lib/dates";
import { useTransactionsStore } from "../store/transactions.store";
import type {
  TransactionsPeriod,
  TransactionsSort,
  TransactionType,
} from "../types/transactions";

const SEARCH_DEBOUNCE_MS = 300;

type AccountOption = { id: string; name: string; isDefault: boolean };
type CategoryOption = { id: string; label: string };

const TYPE_LABEL: Record<"all" | TransactionType, string> = {
  all: "Todos",
  income: "Receitas",
  expense: "Despesas",
  transfer: "Transferências",
};

const SORT_OPTIONS: { value: TransactionsSort; label: string }[] = [
  { value: "date_desc", label: "Mais recentes" },
  { value: "date_asc", label: "Mais antigos" },
  { value: "amount_desc", label: "Maior valor" },
  { value: "amount_asc", label: "Menor valor" },
];

export function TransactionFilters({
  accounts,
  categories,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const period = useTransactionsStore((s) => s.transactions.filters.period);
  const typeFilter = useTransactionsStore((s) => s.transactions.filters.type);
  const categoryFilter = useTransactionsStore(
    (s) => s.transactions.filters.category,
  );
  const accountFilter = useTransactionsStore(
    (s) => s.transactions.filters.accountId,
  );
  const search = useTransactionsStore((s) => s.transactions.filters.search);
  const sort = useTransactionsStore((s) => s.transactions.filters.sort);

  const setPeriod = useTransactionsStore((s) => s.setTransactionsPeriod);
  const setTypeFilter = useTransactionsStore((s) => s.setTransactionsType);
  const setCategoryFilter = useTransactionsStore(
    (s) => s.setTransactionsCategory,
  );
  const setAccountFilter = useTransactionsStore(
    (s) => s.setTransactionsAccount,
  );
  const setSearch = useTransactionsStore((s) => s.setTransactionsSearch);
  const setSort = useTransactionsStore((s) => s.setTransactionsSort);
  const resetFilters = useTransactionsStore((s) => s.resetTransactionsFilters);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const accountById = useMemo(() => {
    const map = new Map<string, AccountOption>();
    for (const a of accounts) map.set(a.id, a);
    return map;
  }, [accounts]);
  const categoryById = useMemo(() => {
    const map = new Map<string, CategoryOption>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const list: ActiveFilter[] = [];
    if (period.kind !== "all") {
      list.push({
        key: "period",
        icon: <Calendar className="size-3.5" aria-hidden />,
        label: formatPeriodBadge(period),
        onClear: () => void setPeriod({ kind: "all" }),
      });
    }
    if (accountFilter !== "all") {
      const acc = accountById.get(accountFilter);
      list.push({
        key: "account",
        icon: <Landmark className="size-3.5" aria-hidden />,
        label: acc?.name ?? "Conta",
        onClear: () => void setAccountFilter("all"),
      });
    }
    if (categoryFilter) {
      const cat = categoryById.get(categoryFilter);
      list.push({
        key: "category",
        icon: <Tag className="size-3.5" aria-hidden />,
        label: cat?.label ?? "Categoria",
        onClear: () => void setCategoryFilter(null),
      });
    }
    if (typeFilter !== "all") {
      list.push({
        key: "type",
        icon: <ArrowDownUp className="size-3.5" aria-hidden />,
        label: TYPE_LABEL[typeFilter],
        onClear: () => void setTypeFilter("all"),
      });
    }
    return list;
  }, [
    period,
    accountFilter,
    accountById,
    categoryFilter,
    categoryById,
    typeFilter,
    setPeriod,
    setAccountFilter,
    setCategoryFilter,
    setTypeFilter,
  ]);

  const advancedCount = activeFilters.length;
  const hasAnyApplied = advancedCount > 0 || search.trim().length > 0;

  return (
    <section aria-label="Filtros de transações" className="flex flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={(next) => void setSearch(next)} />

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowAdvanced(true)}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            <span>Filtros avançados</span>
            {advancedCount > 0 ? (
              <span
                className="badge badge-sm badge-neutral"
                aria-label={`${advancedCount} filtro(s) aplicado(s)`}
              >
                {advancedCount}
              </span>
            ) : null}
          </button>

          <SortDropdown value={sort} onChange={(next) => void setSort(next)} />
        </div>
      </div>

      {hasAnyApplied ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-base-content/70">Filtros ativos:</span>

          {activeFilters.map((f) => (
            <ActiveBadge key={f.key} filter={f} />
          ))}

          {search.trim().length > 0 ? (
            <ActiveBadge
              filter={{
                key: "search",
                icon: <Search className="size-3.5" aria-hidden />,
                label: `“${search.trim()}”`,
                onClear: () => void setSearch(""),
              }}
            />
          ) : null}

          <button
            type="button"
            className="link link-hover text-sm text-base-content/70"
            onClick={() => void resetFilters()}
          >
            Limpar todos
          </button>
        </div>
      ) : null}

      <AdvancedFiltersModal
        open={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        accounts={accounts}
        categories={categories}
        initial={{
          period,
          accountFilter,
          categoryFilter,
          typeFilter,
        }}
        onApply={(next) => {
          setPeriod(next.period);
          setAccountFilter(next.accountFilter);
          setCategoryFilter(next.categoryFilter);
          setTypeFilter(next.typeFilter);
          setShowAdvanced(false);
        }}
      />
    </section>
  );
}

type AdvancedDraft = {
  period: TransactionsPeriod;
  accountFilter: string | "all";
  categoryFilter: string | null;
  typeFilter: "all" | TransactionType;
};

// ---------------------------------------------------------------------------

type ActiveFilter = {
  key: string;
  icon: React.ReactNode;
  label: string;
  onClear: () => void;
};

function ActiveBadge({ filter }: { filter: ActiveFilter }) {
  return (
    <span className="badge badge-soft gap-1.5 py-3">
      {filter.icon}
      <span className="text-sm">{filter.label}</span>
      <button
        type="button"
        className="ml-0.5 cursor-pointer text-base-content/60 hover:text-base-content"
        aria-label={`Remover filtro ${filter.label}`}
        onClick={filter.onClear}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

function formatPeriodBadge(period: TransactionsPeriod): string {
  if (period.kind === "month") return formatMonthYearForDisplay(period.month);
  if (period.kind === "range") {
    return `${formatISODateForDisplay(period.start)} — ${formatISODateForDisplay(period.end)}`;
  }
  return "";
}

// ---------------------------------------------------------------------------

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  // Estado local + debounce para evitar fetch a cada tecla.
  const [draft, setDraft] = useState(value);
  // Acompanha a versão "externa" (do store) para sincronizar o input quando
  // outra ação muda o filtro (ex.: «Limpar todos» ou clicar X na badge de
  // busca). Padrão "ajustar estado durante render" recomendado pelo React,
  // evitando setState dentro de useEffect.
  const [externalValue, setExternalValue] = useState(value);
  const timeoutRef = useRef<number | null>(null);

  function cancelPending() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  if (value !== externalValue) {
    setExternalValue(value);
    setDraft(value);
    // Se o valor externo mudou (ex.: outro componente fez reset), descartamos
    // qualquer dispatch pendente para o input não escrever um valor stale.
    cancelPending();
  }

  useEffect(() => {
    return () => cancelPending();
  }, []);

  function dispatch(next: string) {
    cancelPending();
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      onChange(next);
    }, SEARCH_DEBOUNCE_MS);
  }

  function clear() {
    setDraft("");
    cancelPending();
    onChange("");
  }

  return (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-base-content/50"
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Buscar transações..."
        aria-label="Buscar transações"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          dispatch(e.target.value);
        }}
        className="pl-9 pr-10 input-sm"
      />
      {draft.length > 0 ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-base-content"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SortDropdown({
  value,
  onChange,
}: {
  value: TransactionsSort;
  onChange: (next: TransactionsSort) => void;
}) {
  function handleSelect(next: TransactionsSort) {
    onChange(next);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  const icon =
    value === "amount_desc" || value === "date_desc" ? (
      <ArrowDown className="size-4" aria-hidden />
    ) : (
      <ArrowUp className="size-4" aria-hidden />
    );

  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-sm"
        aria-haspopup="menu"
        aria-label="Ordenar transações"
      >
        {icon}
        <span>Ordenar</span>
      </div>
      <ul
        tabIndex={-1}
        className="dropdown-content menu z-40 mt-1 min-w-52 rounded-box border border-base-200 bg-base-100 p-2 shadow-lg"
      >
        {SORT_OPTIONS.map((opt) => (
          <li key={opt.value}>
            <button
              type="button"
              className={cn(
                "justify-between gap-2",
                value === opt.value && "menu-active font-medium",
              )}
              onClick={() => handleSelect(opt.value)}
            >
              <span>{opt.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

function AdvancedFiltersModal({
  open,
  onClose,
  accounts,
  categories,
  initial,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  accounts: AccountOption[];
  categories: CategoryOption[];
  initial: AdvancedDraft;
  onApply: (next: AdvancedDraft) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filtros avançados"
      description="Configure os filtros e clique em «Concluir» para aplicar."
    >
      {open ? (
        // Renderizamos o formulário só enquanto o modal está aberto: assim o
        // estado de rascunho remonta sempre que o utilizador (re)abre, ficando
        // sincronizado com os filtros aplicados actualmente. Fechar (X /
        // backdrop / ESC / Cancelar) descarta o rascunho.
        <AdvancedFiltersForm
          accounts={accounts}
          categories={categories}
          initial={initial}
          onCancel={onClose}
          onApply={onApply}
        />
      ) : null}
    </Modal>
  );
}

function AdvancedFiltersForm({
  accounts,
  categories,
  initial,
  onCancel,
  onApply,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  initial: AdvancedDraft;
  onCancel: () => void;
  onApply: (next: AdvancedDraft) => void;
}) {
  const [period, setPeriod] = useState<TransactionsPeriod>(initial.period);
  const [accountFilter, setAccountFilter] = useState<string | "all">(
    initial.accountFilter,
  );
  const [categoryFilter, setCategoryFilter] = useState<string | null>(
    initial.categoryFilter,
  );
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>(
    initial.typeFilter,
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onApply({ period, accountFilter, categoryFilter, typeFilter });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PeriodPicker value={period} onChange={setPeriod} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Conta"
          value={accountFilter}
          onChange={(e) =>
            setAccountFilter(e.target.value as typeof accountFilter)
          }
        >
          <option value="all">Todas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.isDefault ? " (padrão)" : ""}
            </option>
          ))}
        </Select>

        <Select
          label="Categoria"
          value={categoryFilter ?? "all"}
          onChange={(e) =>
            setCategoryFilter(e.target.value === "all" ? null : e.target.value)
          }
        >
          <option value="all">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>

        <Select
          label="Tipo"
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as "all" | TransactionType)
          }
          rootClassName="sm:col-span-2"
        >
          <option value="all">Todos</option>
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
          <option value="transfer">Transferência</option>
        </Select>
      </div>

      <div className="mt-1 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          Concluir
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

type PeriodMode = "all" | "month" | "range";

function periodMode(p: TransactionsPeriod): PeriodMode {
  return p.kind;
}

/**
 * Picker de período com 3 modos: sem filtro, mês civil, ou intervalo livre.
 * Trocar de modo aplica um valor sensato imediatamente (mês corrente / mês até
 * hoje), evitando estado intermédio inválido. Cada `onChange` actualiza o
 * rascunho do modal — só é comitado para o store ao clicar em «Concluir».
 */
function PeriodPicker({
  value,
  onChange,
}: {
  value: TransactionsPeriod;
  onChange: (next: TransactionsPeriod) => void;
}) {
  const mode = periodMode(value);

  function selectMode(next: PeriodMode) {
    if (next === mode) return;
    if (next === "all") {
      onChange({ kind: "all" });
      return;
    }
    if (next === "month") {
      const month = value.kind === "month" ? value.month : currentMonthYYYYMM();
      onChange({ kind: "month", month });
      return;
    }
    const today = todayISODate();
    const fallback = monthDayBounds(currentMonthYYYYMM());
    const start = value.kind === "range" ? value.start : fallback.startISO;
    const end = value.kind === "range" ? value.end : today;
    onChange({ kind: "range", start, end });
  }

  return (
    <fieldset className="rounded-box border border-base-300 p-3">
      <legend className="px-1 text-sm font-medium text-base-content/80">
        Período
      </legend>

      <div role="tablist" className="tabs tabs-box mb-3">
        {(
          [
            { id: "all", label: "Sem filtro" },
            { id: "month", label: "Mês" },
            { id: "range", label: "Período" },
          ] as { id: PeriodMode; label: string }[]
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={mode === opt.id}
            className={cn("tab", mode === opt.id && "tab-active")}
            onClick={() => selectMode(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {value.kind === "month" ? (
        <Input
          type="month"
          aria-label="Mês"
          value={value.month}
          onChange={(e) => {
            const next = e.target.value;
            if (!next) return;
            onChange({ kind: "month", month: next });
          }}
        />
      ) : null}

      {value.kind === "range" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Data inicial"
            type="date"
            value={value.start}
            max={value.end}
            onChange={(e) => {
              const next = e.target.value;
              if (!next) return;
              const start = next > value.end ? value.end : next;
              onChange({ kind: "range", start, end: value.end });
            }}
          />
          <Input
            label="Data final"
            type="date"
            value={value.end}
            min={value.start}
            onChange={(e) => {
              const next = e.target.value;
              if (!next) return;
              const end = next < value.start ? value.start : next;
              onChange({ kind: "range", start: value.start, end });
            }}
          />
        </div>
      ) : null}

      {value.kind === "all" ? (
        <p className="text-sm text-base-content/60">
          A lista mostra todas as transações.
        </p>
      ) : null}
    </fieldset>
  );
}
