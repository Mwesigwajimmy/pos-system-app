/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}', // Ensure this path is correct for your project
    './pages/**/*.{js,ts,jsx,tsx,mdx}', // Added if you use a pages directory
    './components/**/*.{js,ts,jsx,tsx,mdx}', // Added if you use a components directory
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))", // Modern accent color
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Custom keyframes for background patterns and subtle movements
        "hero-gradient": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "zoom-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "spin-slow": { // Custom animation for the BrainCircuit icon
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-subtle": { // Custom pulse for background patterns
          "0%, 100%": { opacity: "0.1" },
          "50%": { opacity: "0.05" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "hero-gradient": "hero-gradient 15s ease infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "zoom-in": "zoom-in 0.3s ease-out forwards",
        "spin-slow": "spin-slow 5s linear infinite", // 5 seconds, linear, infinite
        "pulse-subtle": "pulse-subtle 20s infinite ease-in-out", // 20 seconds, subtle, infinite
      },
      backgroundImage: {
        'grid-pattern-light': 'url("/patterns/grid-light.svg")', // We'll create this pattern
        'grid-pattern-dark': 'url("/patterns/grid-dark.svg")', // Dark mode pattern
        'dots-pattern-light': 'url("/patterns/dots-light.svg")', // Subtle dots
        'dots-pattern-dark': 'url("/patterns/dots-dark.svg")', // Dark mode dots
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}