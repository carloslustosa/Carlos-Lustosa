/** Configuração do Tailwind da OSC.
 *  Gera assets/css/tailwind.css — o arquivo que o site carrega de verdade.
 *  Para reconstruir depois de editar o HTML:  npm run build:css
 */
module.exports = {
  content: ['./*.html'],

  // Classes que podem entrar depois, ao editar o HTML sem reconstruir o CSS.
  // Um pouco mais de arquivo em troca de o site não quebrar numa edição rápida.
  safelist: [
    { pattern: /^(mt|mb|ml|mr|mx|my|pt|pb|pl|pr|px|py|p|m)-(0|1|2|3|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|40)$/ },
    { pattern: /^gap(-x|-y)?-(0|1|2|3|4|5|6|8|10|12|14|16)$/ },
    { pattern: /^(text|bg|border)-(deep|deeper|mid|growth|cream|creamdim|rule)(\/(10|12|20|30|40|45|50|55|60|65|68|70|72|75|80|85|90))?$/ },
    { pattern: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)$/ },
    { pattern: /^(grid-cols|sm:grid-cols|md:grid-cols|lg:grid-cols)-(1|2|3|4|5|6)$/ },
    { pattern: /^(flex|grid|block|inline-flex|inline-block|hidden)$/, variants: ['sm', 'md', 'lg', 'xl'] },
    { pattern: /^(items|justify)-(start|center|end|between|baseline|stretch)$/ },
    { pattern: /^max-w-(xs|sm|md|lg|xl|2xl|3xl|4xl|shell)$/ },
    { pattern: /^(w|h)-full$/ },
    'sr-only', 'relative', 'absolute', 'fixed', 'sticky', 'overflow-hidden', 'space-y-3', 'space-y-4', 'space-y-5'
  ],

  theme: {
    extend: {
      colors: {
        deep:     '#12301F',  /* Verde profundo    */
        deeper:   '#0F1F14',  /* Verde profundo +  */
        mid:      '#3F8A4B',  /* Verde médio       */
        growth:   '#87D06A',  /* Verde crescimento */
        cream:    '#F2EFE4',  /* Creme documento   */
        creamdim: '#E3DFD0',
        rule:     '#CFD3C5'
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      maxWidth: { shell: '1240px' }
    }
  },

  plugins: []
};
