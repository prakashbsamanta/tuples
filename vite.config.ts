import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// `base` differs between dev and prod:
//   - dev server runs at "/" for convenience
//   - production build is served from a GitHub Pages *project* site at
//     https://<user>.github.io/tuples/, so assets must be referenced under "/tuples/".
// If you later move to a custom domain or a user/org page (served at "/"),
// change the build base back to "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/tuples/' : '/',
  plugins: [react()],
}))
