import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  title?: string;
  size?: number;
};

type IconBaseProps = IconProps & {
  children: React.ReactNode;
  viewBox?: string;
};

function IconBase({
  title,
  size = 20,
  viewBox = "0 0 24 24",
  children,
  ...props
}: IconBaseProps) {
  const ariaLabel = props["aria-label"];
  const hasLabel = Boolean(title || ariaLabel);

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={hasLabel ? "img" : "presentation"}
      aria-hidden={hasLabel ? undefined : true}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4v9" />
      <path d="m9 10 3 3 3-3" />
      <path d="M5 15v4h14v-4" />
    </IconBase>
  );
}

export function DeleteIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 7h14" />
      <path d="M9 7V4h6v3" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </IconBase>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13.5 6.5 17.5 10.5" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10.5 6h3l.5 2.1a5.7 5.7 0 0 1 1.7 1l2-1.1 1.5 2.6-1.7 1a5.6 5.6 0 0 1 0 2l1.7 1-1.5 2.6-2-1.1a5.7 5.7 0 0 1-1.7 1L13.5 18h-3l-.5-2.1a5.7 5.7 0 0 1-1.7-1l-2 1.1-1.5-2.6 1.7-1a5.6 5.6 0 0 1 0-2l-1.7-1L6.3 8l2 1.1a5.7 5.7 0 0 1 1.7-1L10.5 6z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export function AddIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10.5V20h14v-9.5" />
    </IconBase>
  );
}

export function CopyrightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5a3.5 3.5 0 1 0 0 5" />
    </IconBase>
  );
}
