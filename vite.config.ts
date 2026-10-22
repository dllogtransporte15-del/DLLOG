import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api/evolution': {
        target: 'https://evolution-api-production-e3eb.up.railway.app',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/evolution/, '')
      }
    }
  },
  plugins: [
    react(),
    {
      name: 'unshorten-url-endpoint',
      configureServer(server) {
        server.middlewares.use('/api/unshorten', async (req, res) => {
          const parsedUrl = new URL(req.url || '', 'http://localhost');
          const targetUrl = parsedUrl.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'url parameter required' }));
            return;
          }
          try {
            const fetchRes = await fetch(targetUrl, { redirect: 'follow' });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ originalUrl: targetUrl, resolvedUrl: fetchRes.url }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'Failed to unshorten', originalUrl: targetUrl }));
          }
        });
      }
    },
    {
      name: 'rdo-nacional-proxy-endpoint',
      configureServer(server) {
        server.middlewares.use('/api/rdo-nacional/solicitacoes', async (req, res) => {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.statusCode = 200;
            res.end();
            return;
          }
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            const token = req.headers['x-access-token'] || process.env.VITE_RDO_API_TOKEN;
            try {
              const upstream = await fetch('https://painel.mrbsolucoes.com.br/api/integracao/solicitacoes', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-access-token': String(token || '').trim(),
                },
                body: bodyStr,
              });
              const data = await upstream.text();
              res.statusCode = upstream.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
            } catch (err: any) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Upstream connection error' }));
            }
          });
        });
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Transcunha Logística',
        short_name: 'Transcunha',
        description: 'Sistema de Gestão Transcunha',
        theme_color: '#0B66E4',
        background_color: '#F8FAFC',
        display: 'standalone',
        icons: [
          {
            src: '/vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdfjs-dist') || id.includes('jspdf') || id.includes('jspdf-autotable') || id.includes('html2canvas')) {
              return 'pdf-vendor';
            }
            if (id.includes('leaflet') || id.includes('react-leaflet') || id.includes('@vis.gl/react-google-maps')) {
              return 'geo-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
          }
        }
      }
    }
  }
});
