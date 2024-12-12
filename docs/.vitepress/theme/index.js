import DefaultTheme from 'vitepress/theme'
import TeamMember from './TeamMember.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('TeamMember', TeamMember)
  }
}
