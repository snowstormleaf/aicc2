import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: "1rem",
				md: "1.5rem",
				lg: "2rem",
			},
			screens: {
				"2xl": "1280px",
			},
		},
		extend: {
			fontFamily: {
				sans: ["var(--font-body)"],
				display: ["var(--font-display)"],
				mono: ["var(--font-mono)"],
			},
			fontSize: {
				display: ["clamp(2.2rem, 4vw, 3.6rem)", { lineHeight: "1.02", letterSpacing: "-0.025em", fontWeight: "600" }],
				headline: ["clamp(1.5rem, 2.3vw, 2.4rem)", { lineHeight: "1.1", letterSpacing: "-0.018em", fontWeight: "600" }],
				deck: ["1.125rem", { lineHeight: "1.6", letterSpacing: "-0.004em", fontWeight: "400" }],
				body: ["1rem", { lineHeight: "1.65", fontWeight: "400" }],
				caption: ["0.8125rem", { lineHeight: "1.35", letterSpacing: "0.02em", fontWeight: "500" }],
			},
			maxWidth: {
				measure: "66ch",
				article: "78ch",
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				surface: 'hsl(var(--surface))',
				'surface-elevated': 'hsl(var(--surface-elevated))',
				'text-primary': 'hsl(var(--text-primary))',
				'text-muted': 'hsl(var(--text-muted))',
				'border-subtle': 'hsl(var(--border-subtle))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					hover: 'hsl(var(--primary-hover))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				automotive: {
					blue: 'hsl(var(--automotive-blue))',
					silver: 'hsl(var(--automotive-silver))',
					dark: 'hsl(var(--automotive-dark))'
				},
				data: {
					positive: 'hsl(var(--data-positive))',
					warning: 'hsl(var(--data-warning))',
					negative: 'hsl(var(--data-negative))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				xl: "var(--radius-xl)",
				lg: "var(--radius-lg)",
				md: "var(--radius-md)",
				sm: "var(--radius-sm)",
			},
			boxShadow: {
				subtle: "var(--shadow-subtle)",
				soft: "var(--shadow-soft)",
				card: "var(--shadow-card)",
				focus: "var(--shadow-focus)",
			},
			spacing: {
				1: "0.25rem",
				2: "0.5rem",
				3: "0.75rem",
				4: "1rem",
				6: "1.5rem",
				8: "2rem",
				12: "3rem",
				16: "4rem",
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			},
			transitionDuration: {
				standard: "180ms",
				emphasis: "220ms",
			},
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
