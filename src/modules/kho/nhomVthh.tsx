import { VthhCategoryManager } from './vthhCategoryManager'

export function NhomVthh({ onQuayLai }: { onQuayLai: () => void }) {
  return <VthhCategoryManager mode="nhom" onQuayLai={onQuayLai} />
}
