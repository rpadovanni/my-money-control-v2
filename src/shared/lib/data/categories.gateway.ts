import { isRemoteActive } from './data-source'
import { localCategoriesRepo } from '../db/categories.repo'
import { remoteCategoriesRepo } from './remote-categories.repo'
import type { CategoryRecord } from '../../../features/categories/types/category'

export const categoriesRepo = {
  list(): Promise<CategoryRecord[]> {
    return isRemoteActive() ? remoteCategoriesRepo.list() : localCategoriesRepo.list()
  },
  seedIfEmpty(): Promise<void> {
    return isRemoteActive() ? remoteCategoriesRepo.seedIfEmpty() : localCategoriesRepo.seedIfEmpty()
  },
  create(label: string): Promise<CategoryRecord> {
    return isRemoteActive() ? remoteCategoriesRepo.create(label) : localCategoriesRepo.create(label)
  },
  update(id: string, label: string): Promise<CategoryRecord> {
    return isRemoteActive() ? remoteCategoriesRepo.update(id, label) : localCategoriesRepo.update(id, label)
  },
  remove(id: string): Promise<void> {
    return isRemoteActive() ? remoteCategoriesRepo.remove(id) : localCategoriesRepo.remove(id)
  },
}
