import { VthhCategoryManager } from './vthhCategoryManager'

export function LoaiGiay({ onQuayLai }: { onQuayLai: () => void }) {
  return <VthhCategoryManager mode="loai-giay" onQuayLai={onQuayLai} />
}
