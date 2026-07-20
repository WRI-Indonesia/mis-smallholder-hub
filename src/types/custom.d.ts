declare module "*.csv" {
  const content: string;
  export default content;
}

// Konten Bantuan (#184) — di-bundle sebagai string via webpack `asset/source`.
declare module "*.md" {
  const content: string;
  export default content;
}
