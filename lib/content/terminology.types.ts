export type TerminologyEntry = {
  Definitions?: string[];
  Examples?: string[];
};

export type TerminologyMap = Record<string, TerminologyEntry>;

export type VocabSegment =
  | { type: "text"; value: string }
  | {
      type: "term";
      value: string;
      term: string;
      isFirst: boolean;
      definitions: string[];
      examples: string[];
    };
