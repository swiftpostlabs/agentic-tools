// Type declarations for globals commonly exposed by userscript managers.
// This file provides minimal ambient types so TypeScript and linters do not
// report missing globals when checking extracted .user.js files.

/** Minimal XHR response shape exposed to GM_xmlhttpRequest callbacks */
declare type GM_XHR_Response<T = any> = {
  status: number;
  statusText: string;
  response: T;
  responseText?: string;
  finalUrl?: string;
  readyState?: number;
};

/** Parameters accepted by GM_xmlhttpRequest (minimal subset) */
declare type GM_XHR_Params<T = any> = {
  method?: string;
  url: string;
  responseType?: 'json' | 'text' | 'arraybuffer' | 'blob';
  timeout?: number;
  headers?: Record<string, string>;
  data?: string | Document | Blob | ArrayBuffer | null;
  onload?: (response: GM_XHR_Response<T>) => void;
  onerror?: (error?: any) => void;
  ontimeout?: () => void;
  onprogress?: (e: { loaded: number; total?: number; lengthComputable?: boolean }) => void;
  anonymous?: boolean;
};

declare function GM_xmlhttpRequest<T = any>(params: GM_XHR_Params<T>): void;
declare function GM_getValue<T = any>(key: string, defaultValue?: T): T | undefined;
declare function GM_setValue<T = any>(key: string, value: T): Promise<void> | void;
declare function GM_deleteValue(key: string): Promise<void> | void;
declare function GM_listValues(): string[];
declare function GM_addStyle(css: string): void;
declare const GM_info: any;

export { };
