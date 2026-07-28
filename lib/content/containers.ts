export function getGroupStyles(config: Record<string, unknown>): React.CSSProperties {
  const styles: React.CSSProperties = {};

  // Layout
  if (config.display) styles.display = String(config.display);
  if (config.flexDirection) styles.flexDirection = String(config.flexDirection) as React.CSSProperties["flexDirection"];
  if (config.flexWrap) styles.flexWrap = String(config.flexWrap) as React.CSSProperties["flexWrap"];
  if (config.justifyContent) styles.justifyContent = String(config.justifyContent);
  if (config.alignItems) styles.alignItems = String(config.alignItems);
  if (config.gap) styles.gap = String(config.gap);

  // Spacing
  if (config.padding) styles.padding = String(config.padding);
  if (config.paddingTop) styles.paddingTop = String(config.paddingTop);
  if (config.paddingRight) styles.paddingRight = String(config.paddingRight);
  if (config.paddingBottom) styles.paddingBottom = String(config.paddingBottom);
  if (config.paddingLeft) styles.paddingLeft = String(config.paddingLeft);
  if (config.margin) styles.margin = String(config.margin);
  if (config.marginTop) styles.marginTop = String(config.marginTop);
  if (config.marginRight) styles.marginRight = String(config.marginRight);
  if (config.marginBottom) styles.marginBottom = String(config.marginBottom);
  if (config.marginLeft) styles.marginLeft = String(config.marginLeft);

  // Sizing
  if (config.width) styles.width = String(config.width);
  if (config.maxWidth) styles.maxWidth = String(config.maxWidth);
  if (config.minWidth) styles.minWidth = String(config.minWidth);
  if (config.height) styles.height = String(config.height);
  if (config.maxHeight) styles.maxHeight = String(config.maxHeight);
  if (config.minHeight) styles.minHeight = String(config.minHeight);

  // Background & Border
  if (config.backgroundColor) styles.backgroundColor = String(config.backgroundColor);
  if (config.borderRadius) styles.borderRadius = String(config.borderRadius);
  if (config.border) styles.border = String(config.border);
  if (config.borderColor) styles.borderColor = String(config.borderColor);
  if (config.borderWidth) styles.borderWidth = String(config.borderWidth);
  if (config.borderStyle) styles.borderStyle = String(config.borderStyle) as React.CSSProperties["borderStyle"];
  if (config.boxShadow) styles.boxShadow = String(config.boxShadow);

  // Typography (inherited by children)
  if (config.textAlign) styles.textAlign = String(config.textAlign) as React.CSSProperties["textAlign"];
  if (config.fontSize) styles.fontSize = String(config.fontSize);
  if (config.lineHeight) styles.lineHeight = String(config.lineHeight);
  if (config.color) styles.color = String(config.color);

  // Other
  if (config.overflow) styles.overflow = String(config.overflow) as React.CSSProperties["overflow"];
  if (config.opacity) styles.opacity = Number(config.opacity);

  return styles;
}

export function isContainerComponent(componentType: string) {
  return componentType === "Container";
}

export function isGroupComponent(componentType: string) {
  return componentType === "Group";
}

export function isScopeComponent(componentType: string) {
  return componentType === "Container" || componentType === "Group";
}

export function isViewContainer(componentType: string, config: Record<string, unknown>) {
  if (componentType !== "Container") return false;
  const path = (config as { path?: string }).path;
  return typeof path === "string" && path.length > 0;
}
