import { isRemoteActive } from './data-source'
import { localCategoriesRepo } from '../db/categories.repo'
import { remoteCategoriesRepo } from './remote-categories.repo'
import type { CategoryRecord, CategoryType } from '../../../domain/categories/types'

export const categoriesRepo = {
  list(): Promise<CategoryRecord[]> {
    return isRemoteActive() ? remoteCategoriesRepo.list() : localCategoriesRepo.list()
  },
  seedIfEmpty(): Promise<void> {
    return isRemoteActive() ? remoteCategoriesRepo.seedIfEmpty() : localCategoriesRepo.seedIfEmpty()
  },
  create(label: string, type: CategoryType): Promise<CategoryRecord> {
    return isRemoteActive()
      ? remoteCategoriesRepo.create(label, type)
      : localCategoriesRepo.create(label, type)
  },
  update(id: string, label: string, type: CategoryType): Promise<CategoryRecord> {
    return isRemoteActive()
      ? remoteCategoriesRepo.update(id, label, type)
      : localCategoriesRepo.update(id, label, type)
  },
  remove(id: string): Promise<void> {
    return isRemoteActive() ? remoteCategoriesRepo.remove(id) : localCategoriesRepo.remove(id)
  },
}
