<template>
  <div class="message-box">
    <template v-if="!isConnecting">
      <div v-if="isShowWelcome" class="message-box__content grid place-items-center">
        <div class="message-box__content__ready">
          <img src="@/assets/images/realtime.svg" class="mb10" alt="realtime" />
          <h3>欢迎体验 Realtime 实时音视频互动</h3>
          <span>开始使用文本、语音、视频、屏幕共享的实时互动</span>
          <ul class="tl">
            <li
              class="flex flex-x-start flex-y-center pointer"
              @click="handlerClick(MEDIA_TYPE.AUDIO)"
            >
              <i class="iconfont icon-voicecall"></i>
              <div>
                <h4>语音通话</h4>
                <span>支持一对一、多人语音通话</span>
              </div>
            </li>
            <li
              class="flex flex-x-start flex-y-center pointer"
              @click="handlerClick(MEDIA_TYPE.VIDEO)"
            >
              <i class="iconfont icon-videocall"></i>
              <div>
                <h4>视频通话</h4>
                <span>使用摄像头分享实时画面，开启视频对话</span>
              </div>
            </li>
            <li
              class="flex flex-x-start flex-y-center pointer"
              @click="handlerClick(MEDIA_TYPE.SCREEN)"
            >
              <i class="iconfont icon-sharecall"></i>
              <div>
                <h4>共享屏幕</h4>
                <span>共享你的屏幕，展示你当前的工作</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <div
        v-else
        class="message-box__content__talk scroll-display-none"
        ref="refMsgBox"
        id="msgBox"
      >
        <div
          v-for="(item, index) in messageList"
          :key="index"
          :class="[item.type]"
          class="message-box__content__talk__item flex flex-x-start flex-y-start"
        >
          <template v-if="item.type === MSG_TYPE.CLIENT">
            <el-image :src="userAvatar" class="avatar" />
            <!-- <audio :src="item.audioUrl" controls preload="auto" /> -->
            <div class="flex1">
              <video
                v-if="item.videoUrlContent"
                class="mb10"
                :src="item.videoUrlContent"
                controls
                preload="auto"
              />
              <AudioBox
                :audioUrl="item.audioUrl"
                width="300"
                height="36"
                :uniqueIndex="index"
              />
              <p v-if="item.textContent && item.textContent.length > 0">
                {{ item.textContent.join("") }}
              </p>
            </div>
          </template>
          <template v-else>
            <el-image :src="robotAvatar" class="avatar" />
            <div class="flex1 tl">
              <!-- <audio :src="item.audioUrl" controls preload="auto" /> -->
              <!-- <AudioBox :audioUrl="item.audioUrl" width="300" height="36" :uniqueIndex="index" /> -->
              <OutputAudio
                v-if="item.responseType === RESPONSE_TYPE.AUDIO"
                ref="refOutputAudio"
                :readonly="true"
                :options="item.audioData"
                :status="item.answerStatus"
                @onStopped="audioStopped"
              />

              <p
                v-if="item.textContent && item.textContent.length > 0"
                :class="{ 'only-text': item.responseType !== RESPONSE_TYPE.AUDIO }"
              >
                {{ item.textContent.join("") }}
              </p>

              <!-- <TextPrint
                v-show="item.textContent && item.textContent.length > 0"
                :content="item.textContent.join('')"
                :typeSpeed="200"
                :showCursor="true"
                :isAppendPrint="true"
                :isType="true"
                :status="item.answerStatus"
              /> -->
            </div>
          </template>
        </div>
      </div>
    </template>
    <div v-else class="message-box__content flex flex-center">
      <Loading />
    </div>
  </div>
</template>

<script>
import Loading from "@/components/Loading.vue";
import AudioBox from "@/components/AudioBox.vue";
import OutputAudio from "@/components/OutputAudio.vue";
import userAvatar from "@/assets/images/user.svg";
import robotAvatar from "@/assets/images/robot_color.png";
import { MEDIA_TYPE, MSG_TYPE, RESPONSE_TYPE } from "@/constants/modules/audioVideoCall";
import { sleep } from "@/utils/tools";
import {
  listenWheel,
  removeListenWheel,
  scrollBottom,
  clearScrollBottomTimer,
} from "@/utils/autoScroll";
import emitter from "@/utils/event";

export default {
  name: "MessageBox",
  props: {
    // 消息列表
    messageList: {
      type: Array,
      default: () => [],
    },
    // 是否正在连接
    isConnecting: {
      type: Boolean,
      default: false,
    },
    // 是否显示欢迎页
    isShowWelcome: {
      type: Boolean,
      default: true,
    },
  },
  components: {
    Loading,
    AudioBox,
    OutputAudio,
    // TextPrint
  },
  data() {
    return {
      RESPONSE_TYPE, // 响应类型
      MSG_TYPE, // 消息类型
      MEDIA_TYPE, // 媒体类型
      userAvatar,
      robotAvatar,
    };
  },
  mounted() {
    emitter.on("onStopAudio", this.stopAudio);
  },
  methods: {
    // 点击媒体类型
    handlerClick(type) {
      this.$emit("onClickMedia", type);
    },
    // 当音频播放停止时
    async audioStopped() {
      await sleep(1000);
      this.stopScrollToBotton();
    },
    // 循环滚动到最底部
    loopScrollToBotton() {
      scrollBottom("msgBox");
      listenWheel("msgBox", false, 2);
    },
    // 停止循环滚动到底部
    stopScrollToBotton() {
      clearScrollBottomTimer();
      removeListenWheel("msgBox", false, 2);
    },
    // 滚动条在最底部
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.refMsgBox;
        if (container) {
          container.scrollTop = container.scrollHeight - container.offsetHeight;
        }
      });
    },
    // 停止所有音频播放
    stopAudio() {
      if (this.$refs.refOutputAudio && this.$refs.refOutputAudio.length > 0) {
        this.$refs.refOutputAudio.forEach((item) => {
          if (item.isPlaying) {
            item.stopAudio();
          }
        });
      }
    },
  },
  beforeDestroy() {
    emitter.off("onStopAudio", this.stopAudio);
  },
};
</script>

<style scoped lang="less">
.message-box {
  height: 100%;
  overflow: hidden;
  &__content {
    height: 100%;
    overflow-y: auto;
    &__talk {
      margin: 24px 24px 0 24px;
      height: calc(100% - 24px);
      overflow-y: auto;
      &__item {
        min-height: 72px;
        &:not(:last-child) {
          margin-bottom: 32px;
        }
        .el-image {
          :deep(.el-image__inner) {
            width: 24px;
            height: 24px;
            margin-right: 12px;
            margin-top: 6px;
          }
        }
        video {
          width: 316px;
          border-radius: 8px;
          display: block;
        }
        :deep(.audio-box) {
          width: 300px;
        }
        p {
          margin-top: 8px;
          border-radius: 8px;
          background: #f7f8fa;
          color: #5e5e66;
          font-size: 14px;
          line-height: 24px;
          padding: 8px 12px;
          text-align: left;
          &.only-text {
            color: #131212;
            padding: 0;
            font-size: 16px;
            background: transparent;
          }
        }
      }
    }
    &__ready {
      .realtime-icon {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }
      h3 {
        color: #000;
        font-size: 20px;
        font-weight: 600;
        line-height: 28px;
        margin-bottom: 8px;
      }
      span {
        color: #8d8e99;
        font-size: 14px;
        line-height: 22px;
      }
      ul {
        margin-top: 40px;
        li {
          width: 364px;
          height: 90px;
          margin: 0 auto;
          border-radius: 10px;
          border: 1px solid var(--boxBorderColor-1);
          &:not(:last-child) {
            margin-bottom: 16px;
          }
          h4 {
            color: #131212;
            font-size: 16px;
            font-weight: 500;
            line-height: 28px;
          }
          i {
            font-size: 32px;
            margin-left: 20px;
            margin-right: 16px;
          }
          .icon-voicecall {
            color: #7364fa;
          }
          .icon-videocall {
            color: #ff8e42;
          }
          .icon-sharecall {
            color: #4bd1a3;
          }
          &:hover {
            border: 1px solid #134cff;
          }
        }
      }
    }
  }
}
</style>
