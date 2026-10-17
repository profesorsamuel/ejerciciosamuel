
/*
 * PROYECTO: CIENCIAS IA
 * CODIGO: CIA
 * ARCHIVO: index.css
 * DISEÑO: React + Tailwind CSS 4
 */

/* Activar Tailwind CSS */
@import "tailwindcss";

/* Configuración general */
:root {
  font-family: system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", Arial, sans-serif;

  color: #14233a;
  background-color: #f4f7fb;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

/* Ajustes de pantalla */
* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

/* Contenedor principal */
#root {
  min-height: 100vh;
}

/* Formularios */
button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Accesibilidad */
:focus-visible {
  outline: 3px solid #0891b2;
  outline-offset: 2px;
}

/* Tablas */
table {
  border-collapse: collapse;
}

/* Adaptación a celulares */
@media (max-width: 640px) {
  body {
    font-size: 14px;
  }

  input,
  select,
  textarea {
    max-width: 100%;
  }
}
