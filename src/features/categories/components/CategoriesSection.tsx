import { useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { errMessage } from "../../../shared/utils/error-message";
import { Input } from "../../../shared/components/ui/Input";
import { useCategoriesStore } from "../store/categories.store";

export function CategoriesSection({
  pushToast,
}: {
  pushToast: (
    variant: "success" | "error",
    message: string,
    durationMs?: number,
  ) => void;
}) {
  const catReady = useCategoriesStore((s) => s.categories.ready);
  const categories = useCategoriesStore((s) => s.categories.items);
  const categoriesInitError = useCategoriesStore((s) => s.categories.initError);
  const addCategory = useCategoriesStore((s) => s.addCategory);
  const updateCategory = useCategoriesStore((s) => s.updateCategory);
  const deleteCategory = useCategoriesStore((s) => s.deleteCategory);

  const [categoryNewLabel, setCategoryNewLabel] = useState("");
  const [categoryEdit, setCategoryEdit] = useState<null | {
    id: string;
    label: string;
  }>(null);
  const [submittingCategory, setSubmittingCategory] = useState(false);

  async function onAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const label = categoryNewLabel.trim();
    if (!label || submittingCategory) return;
    setSubmittingCategory(true);
    try {
      await addCategory(label);
      setCategoryNewLabel("");
      pushToast("success", "Categoria criada.");
    } catch (err) {
      pushToast("error", errMessage(err));
    } finally {
      setSubmittingCategory(false);
    }
  }

  async function onSaveCategoryEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryEdit || submittingCategory) return;
    const label = categoryEdit.label.trim();
    if (!label) return;
    setSubmittingCategory(true);
    try {
      await updateCategory(categoryEdit.id, label);
      setCategoryEdit(null);
      pushToast("success", "Categoria atualizada.");
    } catch (err) {
      pushToast("error", errMessage(err));
    } finally {
      setSubmittingCategory(false);
    }
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
    <section className="mt-4">
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body">
          <h2 className="card-title">Gerenciar categorias</h2>
          <p className="text-sm text-base-content/70">
            Use categorias como &quot;Ajuste&quot; para alinhar faturas sem
            lançar tudo retroativamente. A categoria &quot;Transferência&quot; é
            reservada ao app. Não dá para excluir uma categoria que ainda tenha
            lançamentos — altere ou apague esses lançamentos antes.
          </p>
          <form
            className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2"
            onSubmit={(e) => {
              void onAddCategory(e);
            }}
          >
            <Input
              rootClassName="col-span-full min-[640px]:col-span-2"
              label="Nova categoria"
              value={categoryNewLabel}
              onChange={(e) => setCategoryNewLabel(e.target.value)}
              placeholder="ex.: Ajuste"
              maxLength={80}
              autoComplete="off"
              disabled={Boolean(categoriesInitError)}
            />
            <div className="col-span-full flex justify-end min-[640px]:col-span-2">
              <button
                type="submit"
                disabled={
                  submittingCategory ||
                  !categoryNewLabel.trim() ||
                  Boolean(categoriesInitError)
                }
                className="btn btn-primary"
              >
                {submittingCategory ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
                <span>{submittingCategory ? "Salvando…" : "Incluir"}</span>
              </button>
            </div>
          </form>

          {!catReady ? (
            <p className="text-base-content/70">Carregando…</p>
          ) : categoriesInitError ? (
            <p className="text-base-content/70">
              Lista indisponível até o Supabase estar correto. Use o aviso acima
              e &quot;Tentar novamente&quot;.
            </p>
          ) : categories.length === 0 ? (
            <p className="text-base-content/70">Nenhuma categoria.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="rounded-box border border-base-300 bg-base-100 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    {categoryEdit?.id === c.id ? (
                      <form
                        className="grid w-full grid-cols-1 gap-3 min-[640px]:grid-cols-2"
                        onSubmit={(e) => {
                          void onSaveCategoryEdit(e);
                        }}
                      >
                        <Input
                          rootClassName="col-span-full min-[640px]:col-span-2"
                          label="Nome"
                          value={categoryEdit.label}
                          onChange={(e) =>
                            setCategoryEdit((x) =>
                              x ? { ...x, label: e.target.value } : x,
                            )
                          }
                          maxLength={80}
                        />
                        <div className="col-span-full flex justify-end gap-2 min-[640px]:col-span-2">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setCategoryEdit(null)}
                          >
                            <X className="size-4" aria-hidden />
                            <span>Voltar</span>
                          </button>
                          <button
                            type="submit"
                            disabled={submittingCategory}
                            className="btn btn-primary"
                          >
                            {submittingCategory ? (
                              <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <Check className="size-4" aria-hidden />
                            )}
                            <span>
                              {submittingCategory ? "Salvando…" : "Salvar"}
                            </span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <strong className="block">{c.label}</strong>
                          {c.system ? (
                            <span className="badge badge-outline">Sistema</span>
                          ) : null}
                        </div>
                      </>
                    )}
                    {categoryEdit?.id !== c.id ? (
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
                                setCategoryEdit({ id: c.id, label: c.label })
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
                    ) : null}
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
