import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'hsl(214.3 31.8% 91.4%)',
      },
      borderColor: {
        DEFAULT: 'hsl(214.3 31.8% 91.4%)',
      },
    },
  },
  plugins: [],
}
export default config
