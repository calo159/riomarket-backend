/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca turquesa (encabezado, enlaces). 600 = #00626D del diseño aprobado.
        // Marca: la escala sale de variables (src/paletasMarca.css) para que el administrador cambie el color desde el panel.
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
        },
        // Acción coral: comprar, agregar, confirmar.
        accion: { DEFAULT: '#CF3F1B', hover: '#B53414', suave: '#FDE8E1' },
        amarillo: '#FFD166',
        azul: { DEFAULT: '#0D5C8A', suave: '#DFF1FA' },
        exito: { DEFAULT: '#09703A', suave: '#E2F4E7' },
        estrella: '#8F5300',
        tinta: '#14262A',
        // «Sal»: el blanco de las salinas, apenas verdoso. Ni el gris frío de antes ni el crema que usan todas las
        // interfaces «cálidas»: el color lo ponen las cartulinas de categoría y las bandas, no el fondo.
        fondo: '#F4F6F2',
        papel: '#FBF7EE',
        crema: '#FFF4DC',
        // «Arena»: la lona y la arena del mercado. Una sola banda por página (los puestos) para romper el verde-sal sin
        // llenar la tienda de crema; en oscuro la banda es una noche un poco más clara que el fondo.
        arena: '#EDE4CF',
        pie: '#0E2A2F',
        // Neutros con un hilo de verde marino (el del turquesa de la marca), no azul-gris genérico.
        // Del 50 al 300 son las superficies y bordes de la tienda de día; del 600 al 950 son la «noche de
        // mercado» (tema oscuro): ya no un azul-gris neutro sino el fondo de un puesto a la luz de un bombillo.
        // 200 = borde, 500 = texto secundario, 900 = tinta.
        slate: {
          50: '#F8F9F6',
          100: '#EEF1EC',
          200: '#DCE2D8',
          300: '#C3CCC0',
          400: '#A3B4AD',
          500: '#4F6663',
          600: '#41666A',
          700: '#31585D',
          800: '#214449',
          900: '#133136',
          950: '#0A1D21',
        },
      },
      fontFamily: {
        sans: ['"Figtree Variable"', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        // Rótulo de puesto: solo titulares de la tienda (hero, secciones, citas). Un solo peso: sin negrita falsa.
        display: ['"Young Serif"', 'Georgia', 'Cambria', 'serif'],
      },
      borderRadius: {
        lg: '8px',
        xl: '10px',
        '2xl': '10px',
      },
      boxShadow: {
        // Las sombras aparecen solo al pasar el cursor (tarjetas) o en elementos flotantes.
        // En reposo: una línea de contacto y una sombra corta, lo justo para que la tarjeta se separe del papel.
        reposo: '0 1px 0 rgba(10, 29, 33, 0.04), 0 2px 8px rgba(10, 29, 33, 0.07)',
        hover: '0 7px 20px rgba(10, 29, 33, 0.16)',
        flota: '0 3px 12px rgba(10, 29, 33, 0.12)',
        menu: '0 8px 22px rgba(10, 29, 33, 0.22)',
      },
      keyframes: {
        fadeout: { to: { opacity: '0' } },
        zoomout: { to: { opacity: '0', transform: 'scale(.97)' } },
        sheetsale: { to: { opacity: '0', transform: 'translateY(16px)' } },
        asienta: { from: { opacity: '0', transform: 'scale(.7)' }, to: { opacity: '1', transform: 'none' } },
        pop: { '0%': { transform: 'scale(.6)' }, '60%': { transform: 'scale(1.35)' }, '100%': { transform: 'scale(1)' } },
        rise: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'none' } },
        fadein: { from: { opacity: '0' }, to: { opacity: '1' } },
        fadezoom: { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'none' } },
        slidein: { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        sheet: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        fill: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        grow: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        crece: { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        deriva: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'deriva-inversa': { from: { transform: 'translateX(-50%)' }, to: { transform: 'translateX(0)' } },
        timbre: {
          '0%, 100%': { transform: 'rotate(0)' },
          '15%': { transform: 'rotate(16deg)' },
          '30%': { transform: 'rotate(-14deg)' },
          '45%': { transform: 'rotate(10deg)' },
          '60%': { transform: 'rotate(-6deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        anillo: { '0%': { boxShadow: '0 0 0 0 rgba(11,122,62,.55)' }, '100%': { boxShadow: '0 0 0 18px rgba(11,122,62,0)' } },
        pulsepaso: { '0%': { boxShadow: '0 0 0 0 rgba(0,98,109,.45)' }, '100%': { boxShadow: '0 0 0 10px rgba(0,98,109,0)' } },
      },
      animation: {
        asienta: 'asienta .32s cubic-bezier(.16,1,.3,1)',
        pop: 'pop .42s cubic-bezier(.2,1.6,.4,1)',
        rise: 'rise .28s cubic-bezier(.2,.9,.3,1)',
        fadein: 'fadein .2s ease',
        fadeout: 'fadeout .17s ease forwards',
        zoomout: 'zoomout .17s cubic-bezier(.4,0,1,1) forwards',
        'sheet-sale': 'sheetsale .17s cubic-bezier(.4,0,1,1) forwards',
        fadezoom: 'fadezoom .2s cubic-bezier(.2,.9,.3,1)',
        slidein: 'slidein .24s cubic-bezier(.2,.9,.3,1)',
        sheet: 'sheet .28s cubic-bezier(.2,.9,.3,1)',
        crece: 'crece .6s cubic-bezier(.2,.8,.2,1)',
        grow: 'grow .7s cubic-bezier(.2,.8,.2,1)',
        pulsepaso: 'pulsepaso 1.6s ease-out infinite',
        timbre: 'timbre .9s ease-in-out',
        anillo: 'anillo 1.1s ease-out .6s 1 backwards',
        deriva: 'deriva 26s linear infinite',
        'deriva-inversa': 'deriva-inversa 38s linear infinite',
      },
    },
  },
  plugins: [],
};
