import { LucidRow, ModelObject, ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import { BaseModel } from '@adonisjs/lucid/orm'
import { SimplePaginator } from '@adonisjs/lucid/database'
import { Infer, Prettify } from './lucid.js'

function serializeModel(model: LucidRow): ModelObject
function serializeModel(model: LucidRow[]): ModelObject[]
function serializeModel(model: any) {
  if (Array.isArray(model)) {
    return model.map((m) => serializeModel(m))
  }

  return model.serialize()
}

function serializePagination(paginator: ModelPaginatorContract<any>) {
  const { meta, data } = paginator.toJSON()
  return {
    data: serializeModel(data as any),
    meta,
  }
}

export function serialize<T extends object>(props: T): Prettify<Infer<T>> {
  return Object.keys(props).reduce((acc, key) => {
    const value = props[key as keyof T]

    if (value instanceof SimplePaginator) {
      return { ...acc, [key]: serializePagination(value as any) }
    }

    if (value instanceof BaseModel) {
      return { ...acc, [key]: serializeModel(value) }
    }

    if (Array.isArray(value)) {
      return { ...acc, [key]: value.map((v) => (v instanceof BaseModel ? serializeModel(v) : v)) }
    }

    return { ...acc, [key]: value }
  }, {} as any)
}
