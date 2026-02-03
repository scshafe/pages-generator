"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  fallbackValues,
  readComputedValues,
  resolveTarget,
  themeModeSelectors
} from "@/blogcomponents/author/themeModeUtils";
import type { StyleValues } from "@/blogcomponents/author/themeModeUtils";

type StylePanelProps = {
  title: string;
  description: string;
  selectors: string[];
};

function StylePanel({ title, description, selectors }: StylePanelProps) {
  const [values, setValues] = useState<StyleValues>(fallbackValues);
  const [hasTarget, setHasTarget] = useState(true);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const target = resolveTarget(selectors);
    targetRef.current = target;
    if (!target) {
      setHasTarget(false);
      setValues(fallbackValues);
      return;
    }
    setHasTarget(true);
    setValues(readComputedValues(target));
  }, [selectors]);

  const updateValue = (key: keyof StyleValues, nextValue: string) => {
    setValues((prev: StyleValues) => ({ ...prev, [key]: nextValue }));
    const target = targetRef.current;
    if (!target) return;
    if (key === "backgroundColor") {
      target.style.backgroundColor = nextValue;
      return;
    }
    if (key === "textColor") {
      target.style.color = nextValue;
      return;
    }
    if (key === "borderColor") {
      target.style.borderColor = nextValue;
      return;
    }
    if (key === "fontFamily") {
      target.style.fontFamily = nextValue;
      return;
    }
    if (key === "fontSize") {
      target.style.fontSize = nextValue;
      return;
    }
    if (key === "lineHeight") {
      target.style.lineHeight = nextValue;
    }
  };

  const helperText = useMemo(() => {
    if (hasTarget) return null;
    return "Target element not found on this view.";
  }, [hasTarget]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="section-card">
        <div className="form-grid theme-inspector-grid">
          <label>
            <span>Background</span>
            <input
              type="color"
              value={values.backgroundColor}
              onChange={(event) => updateValue("backgroundColor", event.target.value)}
              disabled={!hasTarget}
            />
          </label>
          <label>
            <span>Text</span>
            <input
              type="color"
              value={values.textColor}
              onChange={(event) => updateValue("textColor", event.target.value)}
              disabled={!hasTarget}
            />
          </label>
          <label>
            <span>Border</span>
            <input
              type="color"
              value={values.borderColor}
              onChange={(event) => updateValue("borderColor", event.target.value)}
              disabled={!hasTarget}
            />
          </label>
          <label>
            <span>Font Family</span>
            <input
              value={values.fontFamily}
              onChange={(event) => updateValue("fontFamily", event.target.value)}
              disabled={!hasTarget}
            />
          </label>
          <label>
            <span>Font Size</span>
            <input
              value={values.fontSize}
              onChange={(event) => updateValue("fontSize", event.target.value)}
              disabled={!hasTarget}
            />
          </label>
          <label>
            <span>Line Height</span>
            <input
              value={values.lineHeight}
              onChange={(event) => updateValue("lineHeight", event.target.value)}
              disabled={!hasTarget}
            />
          </label>
        </div>
        {helperText ? <p className="theme-inspector-note">{helperText}</p> : null}
      </div>
    </div>
  );
}

export function AuthorGeneralPanel() {
  return (
    <StylePanel
      title="General"
      description="Fallback colors and typography for the overall theme."
      selectors={themeModeSelectors.general}
    />
  );
}

export function AuthorHeaderPanel() {
  return (
    <StylePanel
      title="Header"
      description="Header colors and typography."
      selectors={themeModeSelectors.header}
    />
  );
}

export function AuthorFooterPanel() {
  return (
    <StylePanel
      title="Footer"
      description="Footer colors and typography."
      selectors={themeModeSelectors.footer}
    />
  );
}

export function AuthorViewPanel() {
  return (
    <StylePanel
      title="View"
      description="View container colors and typography."
      selectors={themeModeSelectors.view}
    />
  );
}

export function AuthorGroupsPanel() {
  return (
    <StylePanel
      title="Groups"
      description="Group container colors and typography."
      selectors={themeModeSelectors.groups}
    />
  );
}

export function AuthorUnitsPanel() {
  return (
    <StylePanel
      title="Units"
      description="Unit colors and typography."
      selectors={themeModeSelectors.units}
    />
  );
}
