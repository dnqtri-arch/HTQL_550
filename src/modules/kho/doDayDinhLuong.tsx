import { VthhCategoryManager } from './vthhCategoryManager'

export function DoDayDinhLuong({ onQuayLai }: { onQuayLai: () => void }) {
  return <VthhCategoryManager mode="dinh-luong" onQuayLai={onQuayLai} />
}
