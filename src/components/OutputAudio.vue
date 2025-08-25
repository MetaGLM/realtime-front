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
import { base64ToArrayBuffer, base64ToBlob, convertPCMBase64ToUrl } from "@/utils/stream";
import AudioBox from "@/components/AudioBox.vue";
import {
  ANSWER_STATUS, // 回答结果状态
  OUTPUT_TYPE, // 输出音频格式
} from "@/constants/modules/audioVideoCall";
import AudioManagerClass from "@/utils/audio/index";

export default {
  name: "OutputAudio",
  components: { AudioBox },
  props: {
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
    outputType: {
      type: String,
      default: OUTPUT_TYPE.PCM,
    },
  },
  data() {
    return {
      cacheChunkSize: 200000, // 缓存音频数据的大小 (单位：字节)
      cacheChunkArr: [], // 缓存音频数据数组
      audioDataList: [], // 音频数据列表
      sampleRate: 24000, // 采样率
      totalUrl: "",
      currentIndex: 0,
      playedEnd: true,
      isPlaying: false,
      queueList: [],
      playIndex: 0,
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
        if (this.outputType === OUTPUT_TYPE.MP3) {
          this.audioDataList = val;
        } else if (this.outputType === OUTPUT_TYPE.PCM) {
          if (val?.length > 0) {
            this.cacheChunkArr.push(val[val.length - 1].data);
            if (this.cacheChunkArr.join(",").length >= this.cacheChunkSize) {
              this.audioDataList.push({ data: this.cacheChunkArr });
              this.cacheChunkArr = [];
            }
            console.log("options", this.cacheChunkArr);
          }
        }
      },
      immediate: true,
      deep: true,
    },
    audioDataList: {
      handler(val) {
        console.log("audioDataList", val);
        if (val?.length > 0) {
          // 设置了自动播放，且满足播放条件，则开始播放
          if (this.autoplay && val[this.playIndex]?.data && !this.isPlaying) {
            this.isPlaying = true;
            this.playAudio(val[this.playIndex].data);
          }
        }
      },
      immediate: true,
      deep: true,
    },
    canConnect(val) {
      if (val) {
        // 追加末尾的音频数据
        if (this.cacheChunkArr.length > 0 && this.outputType === OUTPUT_TYPE.PCM) {
          this.audioDataList.push({ data: this.cacheChunkArr });
          this.cacheChunkArr = [];
        }

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
    if (this.totalUrl) {
      URL.revokeObjectURL(this.totalUrl);
    }
  },
  methods: {
    // 合成音频
    concatAudios() {
      if (this.outputType === OUTPUT_TYPE.MP3) {
        let buffersPromise = [];
        this.audioDataList.forEach((item) => {
          if (item.data) {
            const buffer = base64ToArrayBuffer(item.data);
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
            this.synthesisError(); // 合成失败
          });
      } else if (this.outputType === OUTPUT_TYPE.PCM) {
        try {
          const audioBase64Arr = this.audioDataList.map((item) => item.data);
          this.totalUrl = convertPCMBase64ToUrl(audioBase64Arr.flat(), this.sampleRate);
        } catch (err) {
          console.log("合成失败", err);
          this.synthesisError(); // 合成失败
        }
      }
    },
    // 合成失败
    synthesisError() {
      if (this.totalUrl) {
        URL.revokeObjectURL(this.totalUrl);
      }
      this.errorText = this.$t("model_trial.request_info.audio_fail");
      this.currentUrl = "";
      this.totalUrl = "";
      this.playedEnd = true;
    },
    // 停止播放
    stopAudio() {
      this.$refs.audoplayAudioRef && this.$refs.audoplayAudioRef.endedPlay();
      this.cacheChunkArr = []; // 重置临时音频数据
      this.resetStatus(); // 重置状态
    },
    // 播放音频
    playAudio(data) {
      try {
        if (this.outputType === OUTPUT_TYPE.MP3) {
          const blob = base64ToBlob(data);
          this.currentUrl = URL.createObjectURL(blob);
        } else if (this.outputType === OUTPUT_TYPE.PCM) {
          this.currentUrl = convertPCMBase64ToUrl(data, this.sampleRate);
        }
        this.playIndex++;
      } catch (error) {
        console.log(error);
        this.stopAudio();
      }
    },
    // 播放结束
    onFinish() {
      const nextData = this.audioDataList[this.playIndex];
      if (nextData?.data) {
        this.playAudio(nextData.data);
      } else {
        if (this.canConnect) {
          // 全返回完成能拼接的状态，则重置所有状态
          this.resetStatus();
        } else {
          // 没有全返回完成，只返回一段或几段音频，后面音频段则延迟比较久返回的情况，就要重置播放状态，等待option监听后继续触发播放
          this.isPlaying = false; // 重置播放状态
        }
      }
    },
    // 播放进度
    audioprocess(time) {
      // 特殊处理： 针对自动播放时，发现音频时长为大于0，则判断为该浏览器支持自动播放
      if (this.playIndex === 1 && !this.canAutoPlay && this.autoplay && time > 0) {
        this.canAutoPlay = true;
        this.playedEnd = false;
      }
    },
    togglePlay() {
      this.isPlaying = !this.isPlaying;
    },
    // 重置相关状态
    resetStatus() {
      this.isPlaying = false; // 重置播放状态
      this.currentUrl = ""; // 重置播放地址
      this.playedEnd = true; // 重置播放结束状态
      this.playIndex = 0; // 重置播放索引
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
  ::v-deep .audio-box.output {
    background: #efefef;
  }
}
.auto-play-audio {
  display: none;
}
.audio-loading {
  height: 24px;
  margin-right: 8px;
  user-select: none;
  appearance: none;
  -webkit-user-drag: none;
  user-drag: none;
}
</style>
