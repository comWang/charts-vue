// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'

Vue.config.productionTip = false
Vue.prototype.$ratio = window.innerWidth / 1920;
new Vue({
  el: '#app',
  render: h => h(App)
})
