/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Fotos são comprimidas no navegador antes do envio (ver lib/image.ts),
      // mas deixamos folga aqui como rede de segurança.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
