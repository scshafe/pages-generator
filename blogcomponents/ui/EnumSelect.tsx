"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export type EnumSelectOption = {
  value: string;
  label?: string;
  disabled?: boolean;
};

export type EnumSelectConfig = {
  values: EnumSelectOption[];
  multiSelect?: boolean;
  maxRows?: number;
};

export type EnumSelectProps = {
  config: EnumSelectConfig;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  className?: string;
  ariaLabel?: string;
};

export function EnumSelect({ config, value, onChange, className, ariaLabel }: EnumSelectProps) {
  const isMulti = Boolean(config.multiSelect);
  const options = config.values ?? [];
  if (!options.length) return null;

  const maxRows = Math.max(1, config.maxRows ?? 1);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [useSelect, setUseSelect] = useState(false);

  const selectedValues = isMulti
    ? Array.isArray(value)
      ? value
      : value
        ? [String(value)]
        : []
    : [];
  const selectedValue = !isMulti
    ? Array.isArray(value)
      ? value[0] ?? ""
      : value ?? ""
    : "";

  const selectedLabels = useMemo(
    () =>
      options
        .filter((option) => selectedValues.includes(option.value))
        .map((option) => option.label ?? option.value),
    [options, selectedValues]
  );

  const selectLabel = isMulti
    ? selectedLabels.length
      ? selectedLabels.join(", ")
      : "Select options"
    : options.find((option) => option.value === selectedValue)?.label ?? "Select option";

  const handleSelect = (optionValue: string) => {
    if (isMulti) {
      const next = selectedValues.includes(optionValue)
        ? selectedValues.filter((item) => item !== optionValue)
        : [...selectedValues, optionValue];
      onChange(next);
      return;
    }
    if (selectedValue === optionValue) return;
    onChange(optionValue);
  };

  const updateLayout = useCallback(() => {
    const container = measureRef.current;
    if (!container) return;
    const buttons = Array.from(container.querySelectorAll("[data-enum-option]")) as HTMLElement[];
    if (!buttons.length) return;
    const rows = new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top))).size;
    setUseSelect(rows > maxRows);
  }, [maxRows]);

  useEffect(() => {
    updateLayout();
  }, [options.length, selectedValue, selectedValues.length, updateLayout]);

  useEffect(() => {
    const container = measureRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => updateLayout());
    observer.observe(container);
    window.addEventListener("resize", updateLayout);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, [updateLayout]);

  const renderButtons = (isMeasure = false) => (
    <div
      className={cn(
        "enum-select author-panel-buttons",
        isMulti && "enum-select--multi",
        isMeasure && "enum-select--measure"
      )}
      role={isMeasure ? undefined : "group"}
      aria-label={!isMeasure ? ariaLabel : undefined}
    >
      {options.map((option, index) => {
        const isSelected = isMulti
          ? selectedValues.includes(option.value)
          : selectedValue === option.value;
        return (
          <Fragment key={option.value}>
            <button
              type="button"
              className={cn("author-panel__tab", isSelected && "is-active")}
              onClick={() => handleSelect(option.value)}
              aria-pressed={!isMeasure ? isSelected : undefined}
              disabled={option.disabled}
              data-enum-option
              tabIndex={isMeasure ? -1 : undefined}
            >
              {option.label ?? option.value}
            </button>
            {!isMulti && index < options.length - 1 ? (
              <span className="author-panel__divider" aria-hidden="true">
                |
              </span>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );

  if (useSelect) {
    const selectValue = isMulti ? selectedValues[0] ?? "" : selectedValue;
    return (
      <div className={cn("enum-select-wrapper", className)}>
        <Select
          value={selectValue}
          onValueChange={(next) => {
            if (isMulti) {
              handleSelect(next);
              return;
            }
            onChange(next);
          }}
        >
          <SelectTrigger className="enum-select__trigger" aria-label={ariaLabel}>
            {isMulti ? <span className="enum-select__value">{selectLabel}</span> : <SelectValue placeholder={selectLabel} />}
          </SelectTrigger>
          <SelectContent className="enum-select__content" position="popper">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {isMulti && selectedValues.includes(option.value) ? `✓ ${option.label ?? option.value}` : option.label ?? option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="enum-select-measure" ref={measureRef} aria-hidden>
          {renderButtons(true)}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("enum-select-wrapper", className)}>
      {renderButtons(false)}
      <div className="enum-select-measure" ref={measureRef} aria-hidden>
        {renderButtons(true)}
      </div>
    </div>
  );
}
