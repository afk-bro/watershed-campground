'use client';

import React from 'react';

/**
 * Select option for FormField
 */
export interface FormFieldOption {
  value: string;
  label: string;
}

/**
 * Props for the FormField component
 */
export interface FormFieldProps {
  /** Field label text */
  label: string;
  /** Field name attribute */
  name: string;
  /** Input type (default: text) */
  type?: 'text' | 'number' | 'select' | 'textarea' | 'date' | 'email' | 'tel';
  /** Whether field is required */
  required?: boolean;
  /** Current field value */
  value: string | number;
  /** Change handler - receives new value */
  onChange: (value: string | number) => void;
  /** Error message to display */
  error?: string;
  /** Hint text below field */
  hint?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Disable field */
  disabled?: boolean;

  // Type-specific props
  /** Minimum value for number input */
  min?: number;
  /** Maximum value for number input */
  max?: number;
  /** Step value for number input */
  step?: number;
  /** Maximum length for text input */
  maxLength?: number;
  /** Number of rows for textarea */
  rows?: number;
  /** Options for select input */
  options?: FormFieldOption[];

  // Styling
  /** Prefix text (e.g., "$" for currency) */
  prefix?: string;
  /** Additional className for wrapper */
  className?: string;
  /** Additional className for input element */
  inputClassName?: string;
}

/**
 * Generic form field component with consistent styling
 *
 * Provides a unified interface for text, number, select, and textarea inputs
 * with built-in label, error display, hint text, and required indicator.
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Site Name"
 *   name="name"
 *   type="text"
 *   required
 *   value={formData.name}
 *   onChange={(value) => setFormData({ ...formData, name: value as string })}
 *   placeholder="e.g., Riverfront Site 1"
 * />
 *
 * <FormField
 *   label="Base Rate"
 *   name="baseRate"
 *   type="number"
 *   required
 *   min={0}
 *   step={0.01}
 *   prefix="$"
 *   value={formData.baseRate}
 *   onChange={(value) => setFormData({ ...formData, baseRate: Number(value) })}
 * />
 * ```
 */
export function FormField({
  label,
  name,
  type = 'text',
  required = false,
  value,
  onChange,
  error,
  hint,
  placeholder,
  disabled = false,
  min,
  max,
  step,
  maxLength,
  rows = 3,
  options = [],
  prefix,
  className = '',
  inputClassName = '',
}: FormFieldProps) {
  // Base input className with design tokens
  const baseInputClassName = `w-full px-4 py-3.5 md:py-3 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] text-base focus:border-brand-forest focus:ring-2 focus:ring-brand-forest/20 transition-colors ${
    error ? 'error-input' : ''
  } ${inputClassName}`;

  // Handle input change events
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (type === 'number') {
      // Note: Empty string is converted to 0 for simplicity. For optional numeric fields
      // where null/undefined is needed, use a controlled text input with custom validation.
      onChange(e.target.value === '' ? 0 : Number(e.target.value));
    } else {
      onChange(e.target.value);
    }
  };

  // Render the appropriate input element based on type
  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            id={name}
            name={name}
            required={required}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className={baseInputClassName}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            required={required}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            rows={rows}
            placeholder={placeholder}
            className={baseInputClassName}
          />
        );

      case 'number':
        return (
          <div className="relative">
            {prefix && (
              <span className="absolute left-4 top-3.5 md:top-3 text-[var(--color-text-muted)] pointer-events-none">
                {prefix}
              </span>
            )}
            <input
              type="number"
              id={name}
              name={name}
              required={required}
              value={value}
              onChange={handleChange}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              placeholder={placeholder}
              className={prefix ? `${baseInputClassName} pl-8` : baseInputClassName}
            />
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            id={name}
            name={name}
            required={required}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            className={baseInputClassName}
          />
        );

      case 'email':
      case 'tel':
      case 'text':
      default:
        return (
          <input
            type={type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'text'}
            id={name}
            name={name}
            required={required}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={placeholder}
            className={baseInputClassName}
          />
        );
    }
  };

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
        {label}
        {required && <span className="text-[var(--color-error)] ml-1">*</span>}
      </label>

      {renderInput()}

      {error && (
        <p className="text-sm text-[var(--color-error)] mt-2">
          {error}
        </p>
      )}

      {hint && !error && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          {hint}
        </p>
      )}
    </div>
  );
}
