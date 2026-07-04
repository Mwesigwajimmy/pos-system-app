// Correct ES Module syntax for a .mjs file
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    /* 
       In Version 4, 'tailwindcss' was RENAMED to '@tailwindcss/postcss'.
       To fix the build crash, we use the new name. 
    */
    '@tailwindcss/postcss': {}, 
    autoprefixer: {},
  },
};

export default config;