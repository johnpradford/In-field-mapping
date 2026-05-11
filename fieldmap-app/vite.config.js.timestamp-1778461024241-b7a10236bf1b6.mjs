// vite.config.js
import { defineConfig } from "file:///sessions/gifted-inspiring-franklin/mnt/In-field%20navigation%20app/fieldmap-app/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/gifted-inspiring-franklin/mnt/In-field%20navigation%20app/fieldmap-app/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "/sessions/gifted-inspiring-franklin/mnt/In-field navigation app/fieldmap-app";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    host: true,
    // listen on 0.0.0.0 so phones on the same wifi can hit it during dev
    port: 5173
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split heavy libraries into their own chunks so the initial
        // page load only pulls in what's needed for the first paint.
        // The MapLibre + tile/format parsers are only needed once the
        // map screen actually mounts.
        manualChunks: {
          map: ["maplibre-gl", "pmtiles"],
          fileformats: ["shpjs", "@tmcw/togeojson"],
          react: ["react", "react-dom"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvZ2lmdGVkLWluc3BpcmluZy1mcmFua2xpbi9tbnQvSW4tZmllbGQgbmF2aWdhdGlvbiBhcHAvZmllbGRtYXAtYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvc2Vzc2lvbnMvZ2lmdGVkLWluc3BpcmluZy1mcmFua2xpbi9tbnQvSW4tZmllbGQgbmF2aWdhdGlvbiBhcHAvZmllbGRtYXAtYXBwL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9zZXNzaW9ucy9naWZ0ZWQtaW5zcGlyaW5nLWZyYW5rbGluL21udC9Jbi1maWVsZCUyMG5hdmlnYXRpb24lMjBhcHAvZmllbGRtYXAtYXBwL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgICBhbGlhczoge1xuICAgICAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIHNlcnZlcjoge1xuICAgICAgICBob3N0OiB0cnVlLCAvLyBsaXN0ZW4gb24gMC4wLjAuMCBzbyBwaG9uZXMgb24gdGhlIHNhbWUgd2lmaSBjYW4gaGl0IGl0IGR1cmluZyBkZXZcbiAgICAgICAgcG9ydDogNTE3MyxcbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICAgIG91dERpcjogJ2Rpc3QnLFxuICAgICAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgIG91dHB1dDoge1xuICAgICAgICAgICAgICAgIC8vIFNwbGl0IGhlYXZ5IGxpYnJhcmllcyBpbnRvIHRoZWlyIG93biBjaHVua3Mgc28gdGhlIGluaXRpYWxcbiAgICAgICAgICAgICAgICAvLyBwYWdlIGxvYWQgb25seSBwdWxscyBpbiB3aGF0J3MgbmVlZGVkIGZvciB0aGUgZmlyc3QgcGFpbnQuXG4gICAgICAgICAgICAgICAgLy8gVGhlIE1hcExpYnJlICsgdGlsZS9mb3JtYXQgcGFyc2VycyBhcmUgb25seSBuZWVkZWQgb25jZSB0aGVcbiAgICAgICAgICAgICAgICAvLyBtYXAgc2NyZWVuIGFjdHVhbGx5IG1vdW50cy5cbiAgICAgICAgICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAgICAgICAgICAgbWFwOiBbJ21hcGxpYnJlLWdsJywgJ3BtdGlsZXMnXSxcbiAgICAgICAgICAgICAgICAgICAgZmlsZWZvcm1hdHM6IFsnc2hwanMnLCAnQHRtY3cvdG9nZW9qc29uJ10sXG4gICAgICAgICAgICAgICAgICAgIHJlYWN0OiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMFosU0FBUyxvQkFBb0I7QUFDdmIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUN4QixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsU0FBUztBQUFBLElBQ0wsT0FBTztBQUFBLE1BQ0gsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3hDO0FBQUEsRUFDSjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ0osTUFBTTtBQUFBO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDVjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0gsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ1gsUUFBUTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFLSixjQUFjO0FBQUEsVUFDVixLQUFLLENBQUMsZUFBZSxTQUFTO0FBQUEsVUFDOUIsYUFBYSxDQUFDLFNBQVMsaUJBQWlCO0FBQUEsVUFDeEMsT0FBTyxDQUFDLFNBQVMsV0FBVztBQUFBLFFBQ2hDO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
