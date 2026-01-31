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

export function GitHubIcon({ title, size = 20, ...props }: IconProps) {
  const ariaLabel = props["aria-label"];
  const hasLabel = Boolean(title || ariaLabel);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      role={hasLabel ? "img" : "presentation"}
      aria-hidden={hasLabel ? undefined : true}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d="M12 .5C5.73.5.5 5.74.5 12.21c0 5.18 3.44 9.58 8.2 11.13.6.11.82-.27.82-.6v-2.21c-3.34.74-4.04-1.45-4.04-1.45-.55-1.41-1.34-1.78-1.34-1.78-1.09-.76.08-.75.08-.75 1.2.09 1.83 1.26 1.83 1.26 1.07 1.86 2.8 1.32 3.48 1 .11-.79.42-1.32.76-1.62-2.66-.31-5.46-1.37-5.46-6.08 0-1.35.46-2.46 1.23-3.33-.12-.31-.53-1.58.12-3.29 0 0 1.01-.33 3.3 1.27.96-.27 1.99-.41 3.02-.41 1.03 0 2.06.14 3.02.41 2.29-1.6 3.3-1.27 3.3-1.27.65 1.71.24 2.98.12 3.29.77.87 1.23 1.98 1.23 3.33 0 4.72-2.8 5.77-5.47 6.08.43.38.82 1.11.82 2.25v3.33c0 .33.22.72.83.6 4.76-1.55 8.2-5.95 8.2-11.13C23.5 5.74 18.27.5 12 .5z" />
    </svg>
  );
}
