const API_PATHS = {
  product: import.meta.env.VITE_API_ENDPOINT || "https://localhost:3000/api",
  order: import.meta.env.VITE_API_ENDPOINT || "https://localhost:3000/api",
  import:
    import.meta.env.VITE_IMPORT_API_ENDPOINT ||
    import.meta.env.VITE_API_ENDPOINT ||
    "https://localhost:3000/api",
  bff: import.meta.env.VITE_API_ENDPOINT || "https://localhost:3000/api",
  cart:
    import.meta.env.VITE_CART_API_ENDPOINT ||
    import.meta.env.VITE_API_ENDPOINT ||
    "https://localhost:3000/api",
};

export default API_PATHS;
