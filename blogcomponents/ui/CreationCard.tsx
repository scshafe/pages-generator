"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EnumSelect } from "@/blogcomponents/ui/EnumSelect";
import { cn } from "@/lib/utils";

export type CreationValueType = "text" | "textarea" | "number" | "select" | "checkbox" | "url" | "email";

export type CreationValueOption = {
  label: string;
  value: string;
};

export type CreationValueConfig = {
  label: string;
  placeholder?: string;
  helperText?: string;
  options?: CreationValueOption[];
  multiple?: boolean;
  selectStyle?: "enum";
  maxRows?: number;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
};

export type CreationValueValidation = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validate?: (value: CreationValueState, allValues: Record<string, CreationValueState>) => string | null;
};

export type CreationValueState = string | number | boolean | string[];

export type CreationValue = {
  id: string;
  type: CreationValueType;
  defaultValue: CreationValueState;
  validation?: CreationValueValidation;
  config: CreationValueConfig;
};

export type CreationStageBranch = {
  when: (values: Record<string, CreationValueState>) => boolean;
  next: string;
};

export type CreationStage = {
  id: string;
  title?: string;
  description?: string;
  values: CreationValue[];
  validate?: (values: Record<string, CreationValueState>, allValues: Record<string, CreationValueState>) => string | null;
  next?: string | null;
  branches?: CreationStageBranch[];
  asCard?: boolean;
};

export type CreationCardProps = {
  title: string;
  stages: CreationStage[];
  className?: string;
  onChange?: (values: Record<string, CreationValueState>) => void;
  startStageId?: string;
  onSave?: (values: Record<string, CreationValueState>) => void | Promise<void>;
  saveLabel?: string;
  saveStageAsCard?: boolean;
};

function getInitialValues(stages: CreationStage[]) {
  const initial: Record<string, CreationValueState> = {};
  stages.forEach((stage) => {
    stage.values.forEach((value) => {
      initial[value.id] = value.defaultValue;
    });
  });
  return initial;
}

function isValueEmpty(value: CreationValueState) {
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim().length === 0;
  if (typeof value === "number") return Number.isNaN(value);
  if (typeof value === "boolean") return !value;
  return true;
}

function getValueError(
  value: CreationValueState,
  validation: CreationValueValidation | undefined,
  allValues: Record<string, CreationValueState>
) {
  if (!validation) return null;
  if (validation.required && isValueEmpty(value)) {
    return "This field is required.";
  }
  if (typeof value === "string") {
    if (validation.minLength !== undefined && value.trim().length < validation.minLength) {
      return `Minimum ${validation.minLength} characters.`;
    }
    if (validation.maxLength !== undefined && value.trim().length > validation.maxLength) {
      return `Maximum ${validation.maxLength} characters.`;
    }
    if (validation.pattern && !validation.pattern.test(value)) {
      return "Invalid format.";
    }
  }
  if (validation.validate) {
    return validation.validate(value, allValues);
  }
  return null;
}

export function CreationCard({
  title,
  stages,
  className,
  onChange,
  startStageId,
  onSave,
  saveLabel = "Save",
  saveStageAsCard = true
}: CreationCardProps) {
  const [values, setValues] = useState<Record<string, CreationValueState>>(() => getInitialValues(stages));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { stateById, visibleStageIds, isComplete } = useMemo(() => {
    const stageOrder = stages.map((stage) => stage.id);
    const stageIndex = new Map(stageOrder.map((id, index) => [id, index]));
    const stageMap = new Map(stages.map((stage) => [stage.id, stage]));
    const stateMap = new Map<
      string,
      { isVisible: boolean; isValid: boolean; stageError?: string; errors: Record<string, string> }
    >();
    const visibleIds: string[] = [];
    const visited = new Set<string>();

    let currentId: string | null = startStageId ?? stageOrder[0] ?? null;
    let previousValid: boolean = true;
    let flowComplete = false;

    const resolveNext = (stage: CreationStage): string | null => {
      if (stage.branches?.length) {
        for (const branch of stage.branches) {
          if (branch.when(values)) return branch.next;
        }
      }
      if (stage.next !== undefined) return stage.next ?? null;
      const index = stageIndex.get(stage.id);
      if (index === undefined) return null;
      return stageOrder[index + 1] ?? null;
    };

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const stage = stageMap.get(currentId);
      if (!stage) break;
      const errors: Record<string, string> = {};
      if (previousValid) {
        stage.values.forEach((value) => {
          const message = getValueError(values[value.id], value.validation, values);
          if (message) {
            errors[value.id] = message;
          }
        });
      }
      const stageError: string | undefined =
        previousValid ? stage.validate?.(values, values) ?? undefined : undefined;
      const isValid: boolean = previousValid && Object.keys(errors).length === 0 && !stageError;
      const isVisible = previousValid;
      stateMap.set(stage.id, { isVisible, isValid, stageError, errors });
      if (isVisible) {
        visibleIds.push(stage.id);
      }
      if (!isValid) {
        flowComplete = false;
        break;
      }
      const nextId = resolveNext(stage);
      if (!nextId) {
        flowComplete = true;
        break;
      }
      currentId = nextId;
      previousValid = isValid;
    }

    return { stateById: stateMap, visibleStageIds: visibleIds, isComplete: flowComplete };
  }, [startStageId, stages, values]);

  const handleValueChange = (id: string, nextValue: CreationValueState) => {
    setValues((prev) => {
      const updated = { ...prev, [id]: nextValue };
      onChange?.(updated);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!onSave || !isComplete || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(values);
    } finally {
      setIsSaving(false);
    }
  };

  if (!stages.length) return null;

  const showHeader = title.trim().length > 0;
  const showSaveStage = isComplete;

  return (
    <div className={cn("creation-card", className)}>
      {showHeader ? (
        <div className="creation-card__header">
          <h3>{title}</h3>
        </div>
      ) : null}
      <div className="creation-card__stages">
        {visibleStageIds.map((stageId) => {
          const stage = stages.find((entry) => entry.id === stageId);
          if (!stage) return null;
          const state = stateById.get(stageId);
          if (!state?.isVisible) return null;
          const stageClassName = cn(
            "creation-stage",
            stage.asCard === false ? "creation-stage--plain" : "section-card"
          );
          return (
            <div key={stageId} className={stageClassName}>
              {stage.title || stage.description ? (
                <div className="creation-stage__header">
                  {stage.title ? <h4>{stage.title}</h4> : null}
                  {stage.description ? <p>{stage.description}</p> : null}
                </div>
              ) : null}
              <div className="creation-stage__content">
                {stage.values.map((value) => {
                  const errorMessage = state.errors[value.id];
                  const showError = Boolean(errorMessage && touched[value.id]);
                  const config = value.config;
                  const fieldValue = values[value.id];

                  if (value.type === "textarea") {
                    return (
                      <label key={value.id} className="creation-field">
                        <span>{config.label}</span>
                        <textarea
                          rows={config.rows ?? 4}
                          value={String(fieldValue ?? "")}
                          placeholder={config.placeholder}
                          onChange={(event) => handleValueChange(value.id, event.target.value)}
                          onBlur={() => setTouched((prev) => ({ ...prev, [value.id]: true }))}
                        />
                        {config.helperText ? <span className="form-hint">{config.helperText}</span> : null}
                        {showError ? <span className="form-error">{errorMessage}</span> : null}
                      </label>
                    );
                  }

                  if (value.type === "checkbox") {
                    return (
                      <label key={value.id} className="creation-field creation-field--checkbox">
                        <span>{config.label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(fieldValue)}
                          onChange={(event) => handleValueChange(value.id, event.target.checked)}
                          onBlur={() => setTouched((prev) => ({ ...prev, [value.id]: true }))}
                        />
                        {config.helperText ? <span className="form-hint">{config.helperText}</span> : null}
                        {showError ? <span className="form-error">{errorMessage}</span> : null}
                      </label>
                    );
                  }

                  if (value.type === "select") {
                    const options = config.options ?? [];
                    const isMultiple = Boolean(config.multiple);
                    const selectedValues = Array.isArray(fieldValue)
                      ? fieldValue
                      : fieldValue
                        ? [String(fieldValue)]
                        : [];
                    const selectedValue = selectedValues[0] ?? "";
                    if (config.selectStyle === "enum") {
                      return (
                        <div key={value.id} className="creation-field">
                          <span>{config.label}</span>
                          <EnumSelect
                            config={{
                              values: options,
                              multiSelect: isMultiple,
                              maxRows: config.maxRows
                            }}
                            value={isMultiple ? selectedValues : selectedValue}
                            onChange={(next) => handleValueChange(value.id, next as CreationValueState)}
                            ariaLabel={config.label}
                          />
                          {config.helperText ? <span className="form-hint">{config.helperText}</span> : null}
                          {showError ? <span className="form-error">{errorMessage}</span> : null}
                        </div>
                      );
                    }
                    if (isMultiple) {
                      return (
                        <div key={value.id} className="creation-field">
                          <span>{config.label}</span>
                          <ToggleGroup
                            type="multiple"
                            value={selectedValues}
                            onValueChange={(next) => handleValueChange(value.id, next)}
                            className="creation-select-toggle"
                          >
                            {options.map((option) => (
                              <ToggleGroupItem
                                key={option.value}
                                value={option.value}
                                className="creation-select-toggle-item"
                              >
                                {option.label}
                              </ToggleGroupItem>
                            ))}
                          </ToggleGroup>
                          {config.helperText ? <span className="form-hint">{config.helperText}</span> : null}
                          {showError ? <span className="form-error">{errorMessage}</span> : null}
                        </div>
                      );
                    }
                    return (
                      <div key={value.id} className="creation-field">
                        <span>{config.label}</span>
                        <Tabs value={selectedValue} className="creation-select">
                          <TabsList
                            className={cn(
                              "creation-select-tabs"
                            )}
                          >
                            {options.map((option, index) => {
                              const handleSelect = () => {
                                handleValueChange(value.id, option.value);
                              };
                              return (
                                <div key={option.value} className="creation-select-item">
                                  <TabsTrigger
                                    value={option.value}
                                    className={cn(
                                      "creation-select-trigger"
                                    )}
                                    onClick={(event) => {
                                      handleSelect();
                                    }}
                                  >
                                    {option.label}
                                  </TabsTrigger>
                                  {index < options.length - 1 ? (
                                    <span className="creation-select-divider" aria-hidden="true">
                                      |
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })}
                          </TabsList>
                        </Tabs>
                        {config.helperText ? <span className="form-hint">{config.helperText}</span> : null}
                        {showError ? <span className="form-error">{errorMessage}</span> : null}
                      </div>
                    );
                  }

                  const inputType = value.type === "number" ? "number" : value.type;
                  return (
                    <label key={value.id} className="creation-field">
                      <span>{config.label}</span>
                      <input
                        type={inputType}
                        value={String(fieldValue ?? "")}
                        placeholder={config.placeholder}
                        min={value.type === "number" ? config.min : undefined}
                        max={value.type === "number" ? config.max : undefined}
                        step={value.type === "number" ? config.step : undefined}
                        onChange={(event) => {
                          if (value.type === "number") {
                            const next = event.target.value === "" ? "" : Number(event.target.value);
                            handleValueChange(value.id, Number.isNaN(next) ? "" : next);
                          } else {
                            handleValueChange(value.id, event.target.value);
                          }
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, [value.id]: true }))}
                      />
                      {config.helperText ? <span className="form-hint">{config.helperText}</span> : null}
                      {showError ? <span className="form-error">{errorMessage}</span> : null}
                    </label>
                  );
                })}
                {state.stageError ? <span className="form-error">{state.stageError}</span> : null}
              </div>
            </div>
          );
        })}
        {showSaveStage ? (
          <div
            className={cn(
              "creation-stage creation-stage--save",
              saveStageAsCard ? "section-card" : "creation-stage--plain"
            )}
          >
            <div className="creation-stage__content">
              <div className="action-bar">
                <div className="action-group action-group--right">
                  <button
                    className="button"
                    type="button"
                    onClick={handleSave}
                    disabled={!onSave || isSaving}
                  >
                    {isSaving ? "Saving..." : saveLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
