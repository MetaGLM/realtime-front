<template>
  <div class="output-audio">
    <AudioBox
      v-if="totalUrl && playedEnd"
      :audioUrl="totalUrl"
      audioType="output"
      width="100%"
      height="36"
      :options="{
        normalize: false,
        autoplay: false,
      }"
      :zoomable="false"
    />
    <span v-if="errorText" class="error-text">{{ errorText }}</span>
    <img
      v-if="showLoading && !errorText"
      class="audio-loading"
      src="@/assets/images/output-loading.gif"
      alt=""
    />
    <AudioBox
      class="auto-play-audio"
      v-if="currentUrl"
      ref="audoplayAudioRef"
      :key="currentUrl"
      audioType="output"
      :options="{
        normalize: false,
        autoplay: true,
        backend: 'WebAudio',
      }"
      :audioUrl="currentUrl"
      :zoomable="false"
      @finish="onFinish"
      @audioprocess="audioprocess"
    />
  </div>
</template>

<script>
import { base64ToArrayBuffer, base64ToBlob } from "@/utils/stream";
import AudioBox from "./AudioBox.vue";
import {
  ANSWER_STATUS, // 回答结果状态
} from "@/constants/modules/audioVideoCall";
import AudioManagerClass from "@/utils/audio/index";

export default {
  name: "OutputAudio",
  components: { AudioBox },
  props: {
    readonly: {
      type: Boolean,
      default: false,
    },
    options: {
      type: Array,
      default: undefined,
    },
    status: {
      type: String,
      default: "",
    },
    autoplay: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      isStopAudio: false,
      totalUrl: "",
      currentIndex: 0,
      playedEnd: true,
      isPlaying: false,
      queueList: [],
      urlList: [],
      errorText: "",
      currentUrl: "",
      canAutoPlay: false, // 是否可以自动播放
    };
  },
  computed: {
    showLoading() {
      return !(this.totalUrl && this.playedEnd);
    },
    canConnect() {
      return this.status === ANSWER_STATUS.COMPLETE || this.status === ANSWER_STATUS.STOP;
    },
  },
  watch: {
    options: {
      handler(val) {
        if (val?.length > 0) {
          if (this.autoplay) {
            const nextIndex = this.urlList.length || 0;
            if (val[nextIndex]?.data) {
              this.playAudio(val[nextIndex].data);
            }
          }
        }
      },
      immediate: true,
      deep: true,
    },
    canConnect(val) {
      if (val) {
        this.$nextTick(() => {
          this.concatAudios();
        });
      }
    },
    playedEnd(val) {
      if (val) {
        this.$emit("onStopped");
      } else {
        this.$emit("onPlayed");
      }
    },
  },
  created() {
    if (!this.audioManager) {
      this.audioManager = new AudioManagerClass();
    }
    this.$cacheTimes = [];
  },
  beforeDestroy() {
    if (this.audioManager) {
      this.audioManager.close();
      this.audioManager = null;
    }
  },
  methods: {
    concatAudios() {
      let buffersPromise = [];
      this.options.forEach((item) => {
        if (item.data) {
          const buffer = base64ToArrayBuffer(item.data);
          if (!this.audioManager) {
            this.audioManager = new AudioManagerClass();
          }
          buffersPromise.push(this.audioManager.decodeAudioData(buffer));
        }
      });
      Promise.all(buffersPromise)
        .then((audioBuffers) => {
          if (audioBuffers?.length > 0) {
            const output = this.audioManager.concatAudio(audioBuffers);
            const { url } = this.audioManager.export(output, "audio/mp3");
            this.totalUrl = url;
            buffersPromise = [];
          }
        })
        .catch((err) => {
          console.log("合成失败", err);
          this.errorText = "音频生成失败，请重新尝试";
          this.currentUrl = "";
          this.totalUrl = "";
          this.playedEnd = true;
        });
    },
    stopAudio() {
      this.$refs.audoplayAudioRef && this.$refs.audoplayAudioRef.endedPlay();
      this.concatAudios();
      this.isPlaying = false;
      this.currentUrl = "";
      this.playedEnd = true;
      this.isStopAudio = true;
    },
    playAudio(data) {
      if (this.isPlaying || this.isStopAudio) return;
      try {
        this.isPlaying = true;
        const blob = base64ToBlob(data);
        const url = URL.createObjectURL(blob);
        this.currentUrl = url;
        this.urlList.push(url);
      } catch (error) {
        console.log(error);
        this.playedEnd = true;
        this.isPlaying = false;
      }
    },
    onFinish() {
      if (this.isStopAudio) return;
      this.isPlaying = false;
      const nextData = this.options[this.urlList.length];
      if (nextData?.data) {
        this.playAudio(nextData.data);
      } else {
        if (this.canConnect) {
          this.currentUrl = "";
          this.playedEnd = true;
        }
      }
    },
    audioprocess(time) {
      // 特殊处理： 针对自动播放时，发现音频时长为大于0，则判断为该浏览器支持自动播放
      if (this.urlList?.length === 1 && !this.canAutoPlay && this.autoplay && time > 0) {
        this.canAutoPlay = true;
        this.playedEnd = false;
      }
    },
  },
};
</script>
<style lang="less" scoped>
.output-audio {
  min-width: 280px;
  max-width: 300px;
  width: 100%;
  .error-text {
    margin: 2px 0;
    font-size: 12px;
    line-height: 22px;
    color: #f01d24;
  }
  :deep(.audio-box.output) {
    background: #efefef;
  }
}
.auto-play-audio {
  display: none;
}
.audio-loading {
  height: 24px;
  user-select: none;
  appearance: none;
  -webkit-user-drag: none;
  user-drag: none;
}
</style>
