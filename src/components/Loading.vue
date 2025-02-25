<template>
  <div class="loading">
    <div class="loading__dot"></div>
    <div class="loading__dot" style="animation-delay: 0.2s"></div>
    <div class="loading__dot" style="animation-delay: 0.4s"></div>
    <div class="loading__dot" style="animation-delay: 0.6s"></div>
    <div class="loading__dot" style="animation-delay: 0.8s"></div>
    <p class="mt10">连接中，请稍后...</p>
  </div>
</template>

<style lang="less" scoped>
.loading {
  p {
    color: #8d8e99;
    font-size: 14px;
    line-height: 22px;
  }
  &__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
    animation: bounce 2s infinite;
    margin: 0 2px;
  }
  /* 定义关键帧动画 */
  @keyframes bounce {
    0%,
    100% {
      transform: scale(0.5);
      background-color: #abc7f9;
    }
    50% {
      transform: scale(1);
      background-color: #134cff;
    }
  }
}
</style>
