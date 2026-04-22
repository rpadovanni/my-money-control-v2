/**
 * Lista de categorias com acções rápidas (editar / excluir). A criação e
 * edição vivem no `CategoryFormDialog`, accionado pelo botão «Nova categoria»
 * no cabeçalho da página e pelo lápis em cada linha (que delega no callback
 * `onEditCategory`).
 *
 * Categorias do sistema (ex.: «Transferência») não podem ser editadas nem
 * removidas.
 */
import { Pencil, Trash2 } from "lucide-react";
import { errMessage } from "../../../shared/utils/error-message";
import { useCategoriesStore } from "../store/categories.store";
import type { EditingCategory } from "./CategoryFormDialog";

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

  async function onDeleteCategory(id: string) {
    try {
      await deleteCategory(id);
      pushToast("success", "Categoria excluída.");
    } catch (err) {
      pushToast("error", errMessage(err));
    }
  }

  return (
    <section className="mt-4">
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body">
          <p className="text-sm text-base-content/70">
            Use categorias como &quot;Ajuste&quot; para alinhar faturas sem
            lançar tudo retroativamente. A categoria &quot;Transferência&quot; é
            reservada ao app. Não dá para excluir uma categoria que ainda tenha
            lançamentos — altere ou apague esses lançamentos antes.
          </p>

          {!catReady ? (
            <p className="text-base-content/70">Carregando…</p>
          ) : categoriesInitError ? (
            <p className="text-base-content/70">
              Lista indisponível até o Supabase estar correto. Use o aviso acima
              e &quot;Tentar novamente&quot;.
            </p>
          ) : categories.length === 0 ? (
            <p className="text-base-content/70">
              Nenhuma categoria. Use «Nova categoria» no topo da página para
              começar.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="rounded-box border border-base-300 bg-base-100 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <strong className="block">{c.label}</strong>
                      {c.system ? (
                        <span className="badge badge-outline">Sistema</span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className="text-xs text-base-content/60"
                        title={c.id}
                      >
                        {c.id}
                      </span>
                      {!c.system ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-square"
                            aria-label={`Editar ${c.label}`}
                            title="Editar"
                            onClick={() =>
                              onEditCategory({ id: c.id, label: c.label })
                            }
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-error btn-sm btn-square"
                            aria-label={`Excluir ${c.label}`}
                            title="Excluir"
                            onClick={() => void onDeleteCategory(c.id)}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
