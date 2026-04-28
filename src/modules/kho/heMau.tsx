import { VthhCategoryManager } from './vthhCategoryManager'

export function HeMau({ onQuayLai }: { onQuayLai: () => void }) {
  return <VthhCategoryManager mode="he-mau" onQuayLai={onQuayLai} />
}
