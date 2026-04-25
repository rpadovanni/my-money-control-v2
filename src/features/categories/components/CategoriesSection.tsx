/**
 * Lista de categorias com acções rápidas (editar / excluir). A criação e
 * edição vivem no `CategoryFormDialog`, accionado pelo botão «Nova categoria»
 * no cabeçalho da página e pelo lápis em cada linha (que delega no callback
 * `onEditCategory`).
 *
 * Categorias do sistema (ex.: «Transferência») não podem ser editadas nem
 * removidas.
 */
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Pencil,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import { Input } from "../../../shared/components/ui/Input";
import { Select } from "../../../shared/components/ui/Select";
import { SummaryMetricCard } from "../../../shared/components/ui/SummaryMetricCard";
import { errMessage } from "../../../shared/utils/error-message";
import { useCategoriesStore } from "../store/categories.store";
import type { Category, CategoryType } from "../types/category";
import type { EditingCategory } from "./CategoryFormDialog";

type CategoryTypeFilter = "all" | CategoryType;
type CategorySort = "name_asc" | "name_desc" | "type_asc" | "type_desc";

const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
const PAGE_SIZE = 8;
const CATEGORY_TYPE_ORDER: Record<CategoryType, number> = {
  income: 0,
  expense: 1,
  transfer: 2,
};

function categoryTypeLabel(type: CategoryType): string {
  if (type === "income") return "Receita";
  if (type === "expense") return "Despesa";
  return "Transferência";
}

export function CategoriesSection({
  pushToast,
  onEditCategory,
}: {
  pushToast: (
    variant: "success" | "error",
    message: string,
    durationMs?: number,
  ) => void;
  onEditCategory: (category: EditingCategory) => void;
}) {
  const catReady = useCategoriesStore((s) => s.categories.ready);
  const categories = useCategoriesStore((s) => s.categories.items);
  const categoriesInitError = useCategoriesStore((s) => s.categories.initError);
  const deleteCategory = useCategoriesStore((s) => s.deleteCategory);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CategoryTypeFilter>("all");
  const [sort, setSort] = useState<CategorySort>("name_asc");
  const [page, setPage] = useState(1);

  const metrics = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const category of categories) {
      if (category.type === "income") income += 1;
      if (category.type === "expense") expense += 1;
    }

    return { total: categories.length, income, expense };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");

    return [...categories]
      .filter((category) => {
        if (
          query &&
          !category.label.toLocaleLowerCase("pt-BR").includes(query)
        ) {
          return false;
        }
        if (typeFilter !== "all") {
          return category.type === typeFilter;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === "type_asc" || sort === "type_desc") {
          const byType =
            CATEGORY_TYPE_ORDER[a.type] - CATEGORY_TYPE_ORDER[b.type];
          if (byType !== 0) return sort === "type_asc" ? byType : -byType;
        }

        const byName = collator.compare(a.label, b.label);
        return sort === "name_desc" ? -byName : byName;
      });
  }, [categories, search, sort, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredCategories.slice(pageStart, pageStart + PAGE_SIZE);
  const hasActiveListControls =
    search.trim().length > 0 || typeFilter !== "all" || sort !== "name_asc";

  function resetListControls() {
    setSearch("");
    setTypeFilter("all");
    setSort("name_asc");
    setPage(1);
  }

  async function onDeleteCategory(id: string) {
    try {
      await deleteCategory(id);
      pushToast("success", "Categoria excluída.");
    } catch (err) {
      pushToast("error", errMessage(err));
    }
  }

  return (
    <section className="mt-4 flex flex-col gap-4">
      <section
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
        aria-label="Resumo das categorias"
      >
        <SummaryMetricCard
          label="Total de Categorias"
          value={metrics.total}
          headerAction={<Tags aria-hidden />}
        />

        <SummaryMetricCard
          label="Receitas"
          value={metrics.income}
          headerAction={<ArrowUp aria-hidden />}
        />

        <SummaryMetricCard
          label="Despesas"
          value={metrics.expense}
          headerAction={<ArrowDown aria-hidden />}
        />
      </section>

      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(180px,0.75fr)_minmax(220px,1fr)]"
        aria-label="Filtros de categorias"
      >
        <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-base-content/50"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Buscar categoria..."
            aria-label="Buscar categoria por nome"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          aria-label="Filtrar categorias por tipo"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as CategoryTypeFilter);
            setPage(1);
          }}
        >
          <option value="all">Todos os Tipos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
          <option value="transfer">Transferências</option>
        </Select>

        <Select
          aria-label="Ordenar categorias"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as CategorySort);
            setPage(1);
          }}
        >
          <option value="name_asc">Ordenar: Nome (A-Z)</option>
          <option value="name_desc">Ordenar: Nome (Z-A)</option>
          <option value="type_asc">Ordenar: Tipo (Receitas primeiro)</option>
          <option value="type_desc">Ordenar: Tipo (Transferências primeiro)</option>
        </Select>
      </section>

      {hasActiveListControls ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
          <span>
            {filteredCategories.length} categoria(s) encontrada(s)
          </span>
          <button
            type="button"
            className="link link-hover"
            onClick={resetListControls}
          >
            Limpar filtros
          </button>
        </div>
      ) : null}

      <section aria-label="Listagem de categorias">
        <p className="text-sm text-base-content/70">
          Use categorias como &quot;Ajuste&quot; para alinhar faturas sem lançar
          tudo retroativamente. A categoria &quot;Transferência&quot; é reservada
          ao app. Não dá para excluir uma categoria que ainda tenha lançamentos
          — altere ou apague esses lançamentos antes.
        </p>

        {!catReady ? (
          <p className="text-base-content/70">Carregando…</p>
        ) : categoriesInitError ? (
          <p className="text-base-content/70">
            Lista indisponível até o Supabase estar correto. Use o aviso acima e
            &quot;Tentar novamente&quot;.
          </p>
        ) : categories.length === 0 ? (
          <p className="text-base-content/70">
            Nenhuma categoria. Use «Nova categoria» no topo da página para
            começar.
          </p>
        ) : filteredCategories.length === 0 ? (
          <div className="rounded-box border border-base-300 bg-base-100 p-6 text-center">
            <p className="font-semibold text-base-content">
              Nenhuma categoria encontrada
            </p>
            <p className="mt-1 text-sm text-base-content/70">
              Ajuste a busca ou limpe os filtros para ver todas as categorias.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm mt-3"
              onClick={resetListControls}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-2 md:hidden">
              {pageItems.map((c) => {
                return (
                  <div
                    key={c.id}
                    className="rounded-box border border-base-300 bg-base-100 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-box border border-base-300 bg-base-200 text-base-content/70"
                          aria-hidden
                        >
                          <Tags className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <strong className="block truncate text-base-content">
                            {c.label}
                          </strong>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <CategoryTypeBadge type={c.type} />
                            {c.system ? (
                              <span className="badge badge-neutral badge-sm">
                                Sistema
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <CategoryActions
                        category={c}
                        onEditCategory={onEditCategory}
                        onDeleteCategory={() => void onDeleteCategory(c.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 hidden overflow-x-auto rounded-box border border-base-300 bg-base-100 md:block">
                <table className="table">
                  <thead>
                    <tr className="bg-base-200/70 text-xs uppercase tracking-wide text-base-content/70">
                      <th>Categoria</th>
                      <th>Tipo</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((c) => {
                      return (
                        <tr key={c.id}>
                          <td>
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className="flex size-9 shrink-0 items-center justify-center rounded-box border border-base-300 bg-base-200 text-base-content/70"
                                aria-hidden
                              >
                                <Tags className="size-4" />
                              </div>
                              <div className="min-w-0">
                                <strong className="block truncate text-base-content">
                                  {c.label}
                                </strong>
                                {c.system ? (
                                  <span className="badge badge-neutral badge-sm mt-1">
                                    Sistema
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td>
                            <CategoryTypeBadge type={c.type} />
                          </td>
                          <td>
                            <CategoryActions
                              category={c}
                              onEditCategory={onEditCategory}
                              onDeleteCategory={() => void onDeleteCategory(c.id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="m-0 text-sm text-base-content/70">
                  Mostrando {pageStart + 1}-
                  {Math.min(pageStart + pageItems.length, filteredCategories.length)}{" "}
                  de {filteredCategories.length} categorias
                </p>

                <div className="max-w-full overflow-x-auto pb-1 sm:pb-0">
                  <div className="join" aria-label="Paginação">
                  <button
                    type="button"
                    className="btn join-item btn-sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`btn join-item btn-sm ${pageNumber === currentPage ? "btn-neutral" : ""}`}
                        onClick={() => setPage(pageNumber)}
                        aria-current={
                          pageNumber === currentPage ? "page" : undefined
                        }
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="btn join-item btn-sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Próxima página"
                  >
                    <ArrowRight className="size-4" aria-hidden />
                  </button>
                </div>
                </div>
              </div>
          </>
        )}
      </section>
    </section>
  );
}

function CategoryTypeBadge({ type }: { type: CategoryType }) {
  return (
    <span className="badge badge-soft gap-1 whitespace-nowrap">
      {type === "income" ? (
        <ArrowUp className="size-3.5" aria-hidden />
      ) : type === "expense" ? (
        <ArrowDown className="size-3.5" aria-hidden />
      ) : (
        <ArrowRight className="size-3.5" aria-hidden />
      )}
      {categoryTypeLabel(type)}
    </span>
  );
}

function CategoryActions({
  category,
  onEditCategory,
  onDeleteCategory,
}: {
  category: Category;
  onEditCategory: (category: EditingCategory) => void;
  onDeleteCategory: () => void;
}) {
  if (category.system) {
    return (
      <div className="flex justify-end">
        <span className="text-sm text-base-content/50">-</span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 justify-end gap-1">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        aria-label={`Editar ${category.label}`}
        title="Editar"
        onClick={() =>
          onEditCategory({
            id: category.id,
            label: category.label,
            type: category.type,
          })
        }
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className="btn btn-outline btn-error btn-sm btn-square"
        aria-label={`Excluir ${category.label}`}
        title="Excluir"
        onClick={onDeleteCategory}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}
