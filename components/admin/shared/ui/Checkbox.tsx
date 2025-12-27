"use client";

import { useEffect, useRef } from "react";
import { UI_CONSTANTS } from "@/lib/admin/constants";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Checkbox - Reusable checkbox component for admin panel
 *
 * Features:
 * - Consistent styling via constants
 * - Supports indeterminate state
 * - Accessible with aria-label support
 * - Customizable via className prop
 *
 * @example
 * ```tsx
 * <Checkbox
 *   checked={isChecked}
 *   onChange={setIsChecked}
 *   aria-label="Select all items"
 * />
 * ```
 */
export function Checkbox({
  checked,
  onChange,
  disabled = false,
  indeterminate = false,
  className = "",
  "aria-label": ariaLabel,
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  // Handle indeterminate state (not controllable via HTML attribute)
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${UI_CONSTANTS.CHECKBOX_SIZE} ${UI_CONSTANTS.CHECKBOX_CLASSES} ${className} ${
        disabled ? "opacity-20 cursor-not-allowed" : ""
      }`}
    />
  );
}
