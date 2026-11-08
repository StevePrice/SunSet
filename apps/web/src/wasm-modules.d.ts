// A .wasm file imported with `?module` is a precompiled WebAssembly.Module (Workers and Turbopack).
declare module "*.wasm?module" {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}
