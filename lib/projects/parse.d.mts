export type ProjectStatus = "active" | "exploring" | "paused" | "completed" | "archived";

export interface ParsedProject {
  slug: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  tags: string[];
  repo?: string;
  demo?: string;
  started?: string;
  updated?: string;
  featured: boolean;
  order: number;
  body: string;
}

export interface ProjectParseResult {
  slug: string;
  project: ParsedProject | null;
  errors: string[];
}

export declare const PROJECT_STATUSES: readonly ProjectStatus[];
export declare const SLUG_RE: RegExp;
export declare const PROJECT_FILE_RE: RegExp;
export declare function parseProjectFile(fileName: string, raw: string): ProjectParseResult;
