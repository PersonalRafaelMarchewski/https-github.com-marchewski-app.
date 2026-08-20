/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Fotos são comprimidas no navegador antes do envio (ver lib/image.ts),
      // mas deixamos folga aqui como rede de segurança.
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // ninguém pode embutir o app num iframe (clickjacking: uma página
          // falsa por cima da real capturando os cliques do aluno)
          { key: "X-Frame-Options", value: "DENY" },
          // navegador não "adivinha" o tipo do arquivo — evita que um upload
          // com extensão inocente seja executado como script
          { key: "X-Content-Type-Options", value: "nosniff" },
          // só https daqui pra frente, inclusive na primeira visita
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // sai daqui pra outro site sem levar a URL cheia junto (a URL pode
          // ter id de aluno)
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // câmera e microfone ficam liberados só pro próprio app (o aluno
          // grava o vídeo do set e tira foto de avatar/progresso via
          // <input capture>), nunca pra um terceiro embutido. Localização o
          // app não usa em lugar nenhum, essa fica bloqueada de vez.
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
