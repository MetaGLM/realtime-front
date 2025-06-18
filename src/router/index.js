import { createRouter, createWebHistory } from 'vue-router';
import AudioVideoCall from '../views/AudioVideoCall/Index.vue';
import FileUpload from '@/views/FileUpload/Index.vue'; // 2025-04-21

// 定义路由
const routes = [
  {
    path: '/',
    name: 'Home',
    component: AudioVideoCall
  },
  {
    path: '/upload',
    component: FileUpload
  }
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;