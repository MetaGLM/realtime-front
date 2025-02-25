import { createRouter, createWebHistory } from 'vue-router';
import AudioVideoCall from '../views/AudioVideoCall/Index.vue';

// 定义路由
const routes = [
  {
    path: '/',
    name: 'Home',
    component: AudioVideoCall
  }
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;