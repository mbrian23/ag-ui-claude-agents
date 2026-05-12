// Frontend tool names that bridge the server-side allowlist and the
// browser-side AG-UI tool declarations. A typo in either place breaks
// the contract silently — the model would call a tool the server hasn't
// allowed, the server would refuse without surfacing why. Single source.
export const RENDER_WIDGET_TOOL_NAME = "render_widget" as const;
export const EXPORT_PDF_TOOL_NAME = "export_pdf" as const;
