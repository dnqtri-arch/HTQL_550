import { VthhCategoryManager } from './vthhCategoryManager'

/** Danh mục Thuế GTGT (trước đây «Thuế VAT») — cùng `VthhCategoryManager` mode `vat`. */
export function ThueGtgt({ onQuayLai }: { onQuayLai: () => void }) {
  return <VthhCategoryManager mode="vat" onQuayLai={onQuayLai} />
}
