export type UniqueId = number;
export type NodeId = UniqueId;
export type RefId = UniqueId;
export type CompId = UniqueId;
export type MenuId = UniqueId;
export type FooterId = UniqueId;
export type ThemeId = UniqueId;

export type ComponentType =
  | "ViewContainer"
  | "ListContainer"
  | "InlineContainer"
  | "StyleContainer"
  | "SectionUnit"
  | "PlainTextUnit"
  | "AlertUnit"
  | "MarkdownUnit"
  | "LinkUnit"
  | "ImageMedia"
  | "VideoMedia"
  | "PDFMedia"
  | "ExperienceComponent"
  | "HtmlComponent"
  | "JsComponent";

export type ContainerType =
  | "ViewContainer"
  | "ListContainer"
  | "InlineContainer"
  | "StyleContainer";

export type HeadingLevel = "h1" | "h2" | "h3";
export type AlertVariant = "info" | "warning" | "error" | "success";
export type DisplayMode = "list" | "grid" | "cards";
export type ColorScheme = "system" | "light" | "dark";

export interface NodeRecord {
  node_id: NodeId;
  ref_id: RefId;
  parent_node_id?: NodeId | null;
  previous_node_id?: NodeId | null;
  next_node_id?: NodeId | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReferenceRecord {
  ref_id: RefId;
  node_id: NodeId;
  comp_id: CompId;
  overrides?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface ComponentRecord<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  comp_id: CompId;
  type: ComponentType;
  config: TConfig;
  reference_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ResolvedNode {
  node: NodeRecord;
  reference: ReferenceRecord;
  component: ComponentRecord;
  config: Record<string, unknown>;
  children: ResolvedNode[];
}

export interface ViewSummary {
  comp_id: CompId;
  ref_id: RefId;
  node_id: NodeId | null;
  config: {
    path?: string;
    name?: string;
    title?: string;
    browser_title?: string;
    description?: string | null;
  };
}

export interface NavigationItem {
  label: string;
  href: string;
}

export interface MenuItem extends NavigationItem {
  menu_id: MenuId;
  order?: number;
  position?: "left" | "right";
  view_node_id?: NodeId | null;
}

export interface FooterItem extends NavigationItem {
  footer_id: FooterId;
  order?: number;
  position?: "left" | "right";
  view_node_id?: NodeId | null;
}

export interface HomeSettings {
  label: string;
  root_view_node_id?: NodeId | null;
}

export interface SiteSettings {
  site_name: string;
  tagline: string;
  site_url: string;
  description: string;
  keywords: string;
  author: string;
  language: string;
  theme_color: string;
  twitter_handle: string;
  social_image_url: string;
  social_image_border_enabled: boolean;
  social_image_border_color: string;
  social_image_border_width: number;
  social_image_border_radius: number;
  robots: string;
  favicon_src: string;
}

export interface ThemeDefinition {
  theme_id: ThemeId;
  name: string;
  color_scheme: ColorScheme;
  tokens?: Record<string, string>;
}
