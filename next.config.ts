import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Fixa a raiz do projeto. Sem isso o Turbopack pode detectar um
    // package-lock.json de um diretorio acima (ex.: a home do usuario) e
    // avisar que esta ignorando o lockfile na inferencia da raiz.
    root: process.cwd(),
  },
};

export default nextConfig;
