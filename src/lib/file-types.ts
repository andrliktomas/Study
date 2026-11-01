// Povolené přípony příloh – samostatně, aby šly použít i v prohlížeči bez serverového kódu.
export const ATTACHMENT_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf", "mp3", "m4a", "docx", "xlsx", "pptx", "odt", "txt"];
export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map((e) => `.${e}`).join(",");
