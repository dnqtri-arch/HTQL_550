import { VthhCategoryManager } from './vthhCategoryManager'

export function LoaiVthh({ onQuayLai }: { onQuayLai: () => void }) {
  return <VthhCategoryManager mode="loai" onQuayLai={onQuayLai} />
}
