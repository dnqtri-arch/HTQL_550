import { VthhCategoryManager } from './vthhCategoryManager'

export function KhoGiay({ onQuayLai }: { onQuayLai: () => void }) {
  return <VthhCategoryManager mode="kho-giay" onQuayLai={onQuayLai} />
}
