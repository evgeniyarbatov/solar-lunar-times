import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the project site under /<repo>/; dev and Playwright stay at /.
  base: command === 'build' ? '/solar-lunar-times/' : '/',
}))
