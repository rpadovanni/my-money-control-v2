import { useState } from 'react'
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { ui } from '../../../shared/styles/dashboard-ui'
import { errMessage } from '../../../shared/utils/money-format'
import { useCategoriesStore } from '../store/categories.store'

export function CategoriesSection({
  pushToast,
}: {
  pushToast: (variant: 'success' | 'error', message: string, durationMs?: number) => void
}) {
  const catReady = useCategoriesStore((s) => s.categories.ready)
  const categories = useCategoriesStore((s) => s.categories.items)
  const categoriesInitError = useCategoriesStore((s) => s.categories.initError)
  const addCategory = useCategoriesStore((s) => s.addCategory)
  const updateCategory = useCategoriesStore((s) => s.updateCategory)
  const deleteCategory = useCategoriesStore((s) => s.deleteCategory)

  const [categoryNewLabel, setCategoryNewLabel] = useState('')
  const [categoryEdit, setCategoryEdit] = useState<null | { id: string; label: string }>(null)
  const [submittingCategory, setSubmittingCategory] = useState(false)

  async function onAddCategory(e: React.FormEvent) {
    e.preventDefault()
    const label = categoryNewLabel.trim()
    if (!label || submittingCategory) return
    setSubmittingCategory(true)
    try {
      await addCategory(label)
      setCategoryNewLabel('')
      pushToast('success', 'Categoria criada.')
    } catch (err) {
      pushToast('error', errMessage(err))
    } finally {
      setSubmittingCategory(false)
    }
  }

  async function onSaveCategoryEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryEdit || submittingCategory) return
    const label = categoryEdit.label.trim()
    if (!label) return
    setSubmittingCategory(true)
    try {
      await updateCategory(categoryEdit.id, label)
      setCategoryEdit(null)
      pushToast('success', 'Categoria atualizada.')
    } catch (err) {
      pushToast('error', errMessage(err))
    } finally {
      setSubmittingCategory(false)
    }
  }

  async function onDeleteCategory(id: string) {
    try {
      await deleteCategory(id)
      pushToast('success', 'Categoria excluída.')
    } catch (err) {
      pushToast('error', errMessage(err))
    }
  }

  return (
    <section className={ui.gridSingle}>
      <div className={ui.card}>
        <h2 className={ui.cardTitle}>Gerenciar categorias</h2>
        <p className={ui.hintBlock}>
          Use categorias como &quot;Ajuste&quot; para alinhar faturas sem lançar tudo retroativamente. A
          categoria &quot;Transferência&quot; é reservada ao app. Não dá para excluir uma categoria que ainda
          tenha lançamentos — altere ou apague esses lançamentos antes.
        </p>
        <form
          className={`${ui.form} ${ui.accountForm}`}
          onSubmit={(e) => {
            void onAddCategory(e)
          }}
        >
          <label className={ui.formFull}>
            <span>Nova categoria</span>
            <input
              value={categoryNewLabel}
              onChange={(e) => setCategoryNewLabel(e.target.value)}
              placeholder="ex.: Ajuste"
              maxLength={80}
              autoComplete="off"
              disabled={Boolean(categoriesInitError)}
            />
          </label>
          <div className={ui.actions}>
            <button
              type="submit"
              disabled={
                submittingCategory || !categoryNewLabel.trim() || Boolean(categoriesInitError)
              }
              className={ui.btnWithIcon}
            >
              {submittingCategory ? (
                <Loader2 className={ui.btnIconSpin} aria-hidden />
              ) : (
                <Plus className={ui.btnIcon} aria-hidden />
              )}
              <span>{submittingCategory ? 'Salvando…' : 'Incluir'}</span>
            </button>
          </div>
        </form>

        {!catReady ? (
          <p className={ui.muted}>Carregando…</p>
        ) : categoriesInitError ? (
          <p className={ui.muted}>
            Lista indisponível até o Supabase estar correto. Use o aviso acima e &quot;Tentar
            novamente&quot;.
          </p>
        ) : categories.length === 0 ? (
          <p className={ui.muted}>Nenhuma categoria.</p>
        ) : (
          <ul className={ui.list}>
            {categories.map((c) => (
              <li key={c.id} className={`${ui.item} ${ui.itemRow}`}>
                <div className={ui.itemMain}>
                  {categoryEdit?.id === c.id ? (
                    <form
                      className={`${ui.form} ${ui.accountForm}`}
                      onSubmit={(e) => {
                        void onSaveCategoryEdit(e)
                      }}
                    >
                      <label className={ui.formFull}>
                        <span>Nome</span>
                        <input
                          value={categoryEdit.label}
                          onChange={(e) =>
                            setCategoryEdit((x) => (x ? { ...x, label: e.target.value } : x))
                          }
                          maxLength={80}
                        />
                      </label>
                      <div className={ui.actions}>
                        <button
                          type="button"
                          className={`${ui.btnGhost} ${ui.btnWithIcon}`}
                          onClick={() => setCategoryEdit(null)}
                        >
                          <X className={ui.btnIcon} aria-hidden />
                          <span>Voltar</span>
                        </button>
                        <button type="submit" disabled={submittingCategory} className={ui.btnWithIcon}>
                          {submittingCategory ? (
                            <Loader2 className={ui.btnIconSpin} aria-hidden />
                          ) : (
                            <Check className={ui.btnIcon} aria-hidden />
                          )}
                          <span>{submittingCategory ? 'Salvando…' : 'Salvar'}</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className={ui.itemHead}>
                        <div className={ui.itemHeadMain}>
                          <strong>{c.label}</strong>
                          {c.system ? <span className={ui.tag}>Sistema</span> : null}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {categoryEdit?.id !== c.id ? (
                  <div className={ui.itemAside}>
                    <span className={ui.itemAsideMeta} title={c.id}>
                      {c.id}
                    </span>
                    {!c.system ? (
                      <div className={ui.itemActions}>
                        <button
                          type="button"
                          className={`${ui.btnGhost} ${ui.btnIconAsideGhost}`}
                          aria-label={`Editar ${c.label}`}
                          title="Editar"
                          onClick={() => setCategoryEdit({ id: c.id, label: c.label })}
                        >
                          <Pencil className={ui.btnIcon} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={`${ui.btnDanger} ${ui.btnIconAsideDanger}`}
                          aria-label={`Excluir ${c.label}`}
                          title="Excluir"
                          onClick={() => void onDeleteCategory(c.id)}
                        >
                          <Trash2 className={ui.btnIcon} aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
