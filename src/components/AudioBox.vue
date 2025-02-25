<!--

BSD 3-Clause License

wavesurfer.js - Copyright (c) 2012-2023, katspaugh and contributors
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
-->
<template>
  <div class="audio-box" :class="{ output: audioType === 'output' }">
    <div class="audio-box__wave">
      <div class="audio-box__wave-inner">
        <div class="audio-box__wave-box" ref="audioRef"></div>
        <div class="audio-box__wave-hover" ref="hoverRef" v-show="readyState"></div>
      </div>
      <div
        class="audio-box__wave-btns flex flex-x-between flex-y-center"
        v-show="readyState"
      >
        <div class="flex gap-8">
          <i
            :class="['iconfont pointer', playState ? 'icon-pause' : 'icon-play']"
            @click="playPause"
          />
          <i class="icon-stop iconfont pointer" @click="endedPlay" />
          <i class="icon-download iconfont pointer" @click="downloadAudio" />
        </div>
        <div class="fs14 lh16">
          <label class="audio-box__wave-time" ref="timeRef" v-show="readyState"
            >0:00</label
          >/<label class="audio-box__wave-duration" ref="durationRef" v-show="readyState"
            >0:00</label
          >
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import playIcon from "@/assets/images/play.png";
import pauseIcon from "@/assets/images/pause.png";
import stopIcon from "@/assets/images/stop.png";
import downloadIcon from "@/assets/images/download.png";
import WaveSurfer from "wavesurfer.js";
import Hover from "wavesurfer.js/dist/plugins/hover.esm.js";
import ZoomPlugin from "wavesurfer.js/dist/plugins/zoom.esm.js";
import { downloadFile } from "@/utils/tools";

export default {
  name: "AudioBox",
  props: {
    // 音频唯一标识
    uniqueIndex: {
      type: [String, Number],
      default: "",
    },
    // 音频文件
    audioUrl: {
      type: String,
      default: "",
    },
    // 音频类型，input: 输入，output: 输出
    audioType: {
      type: String,
      default: "input",
    },
    // 音频配置
    options: {
      type: Object,
      default: () => ({}),
    },
    width: {
      type: String,
      default: "",
    },
    height: {
      type: String,
      default: "",
    },
    zoomable: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      playIcon,
      pauseIcon,
      stopIcon,
      downloadIcon,
      waveSurfer: null,
      playState: false,
      readyState: false,
      defaultOptions: {
        /** The height of the waveform in pixels */
        height: this.height,
        /** The width of the waveform in pixels or any CSS value; defaults to 100% */
        width: this.width,
        /** Render each audio channel as a separate waveform */
        splitChannels: false,
        /** Stretch the waveform to the full height */
        normalize: false,
        /** The color of the playpack cursor */
        cursorColor: "#ddd5e9",
        /** The cursor width */
        cursorWidth: 1,
        /** Render the waveform with bars like this: ▁ ▂ ▇ ▃ ▅ ▂ */
        barWidth: 1,
        /** Spacing between bars in pixels */
        barGap: 1,
        /** Rounded borders for bars */
        barRadius: 1,
        /** A vertical scaling factor for the waveform */
        barHeight: 1,
        /** Vertical bar alignment **/
        barAlign: "",
        /** Minimum pixels per second of audio (i.e. zoom level) */
        minPxPerSec: 100,
        /** Stretch the waveform to fill the container, true by default */
        fillParent: true,
        /** Audio URL */
        url: this.audioUrl,
        /** Whether to show default audio element controls */
        mediaControls: false,
        /** Play the audio on load */
        autoplay: false,
        /** Pass false to disable clicks on the waveform */
        interact: true,
        /** Allow to drag the cursor to seek to a new position */
        dragToSeek: false,
        /** Hide the scrollbar */
        hideScrollbar: true,
        /** Audio rate */
        audioRate: 1,
        /** Automatically scroll the container to keep the current position in viewport */
        autoScroll: true,
        /** If autoScroll is enabled, keep the cursor in the center of the waveform during playback */
        autoCenter: true,
        /** Decoding sample rate. Doesn't affect the playback. Defaults to 8000 */
        sampleRate: 8000,
      },
    };
  },
  mounted() {
    this.initWaveSurfer();
  },
  watch: {
    audioUrl(val) {
      if (val) {
        this.waveSurfer.setOptions({
          url: val,
        });
      }
    },
  },
  methods: {
    waveGradient() {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Define the waveform gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 1.2);
      gradient.addColorStop(0, "#8EA7FF"); // Top color
      gradient.addColorStop((canvas.height * 0.7) / canvas.height, "#131212"); // Top color
      gradient.addColorStop((canvas.height * 0.7 + 1) / canvas.height, "#ffffff"); // White line
      gradient.addColorStop((canvas.height * 0.7 + 2) / canvas.height, "#ffffff"); // White line
      gradient.addColorStop((canvas.height * 0.7 + 3) / canvas.height, "#B1B1B1"); // Bottom color
      gradient.addColorStop(1, "#B1B1B1"); // Bottom color

      // Define the progress gradient
      const progressGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 1.2);
      progressGradient.addColorStop(0, "#E33FE6"); // Top color
      progressGradient.addColorStop((canvas.height * 0.7) / canvas.height, "#134cff"); // Top color
      progressGradient.addColorStop((canvas.height * 0.7 + 1) / canvas.height, "#ffffff"); // White line
      progressGradient.addColorStop((canvas.height * 0.7 + 2) / canvas.height, "#ffffff"); // White line
      progressGradient.addColorStop((canvas.height * 0.7 + 3) / canvas.height, "#007aff"); // Bottom color
      progressGradient.addColorStop(1, "#007aff"); // Bottom color
      return {
        gradient,
        progressGradient,
      };
    },
    formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const secondsRemainder = Math.round(seconds) % 60;
      const paddedSeconds = `0${secondsRemainder}`.slice(-2);
      return `${minutes}:${paddedSeconds}`;
    },
    hoverFn(e) {
      const { audioRef = {}, hoverRef = {} } = this.$refs;
      hoverRef.style.width = `${e.offsetX}px`;
    },
    initWaveSurfer() {
      this.$nextTick(() => {
        const { audioRef = {}, timeRef = {}, durationRef = {} } = this.$refs;
        const { gradient, progressGradient } = this.waveGradient();
        const optionsParams = {
          container: audioRef,
          ...this.defaultOptions,
          /** The color of the waveform */
          waveColor: gradient,
          /** The color of the progress mask */
          progressColor: progressGradient,
          plugins: [
            Hover.create({
              lineColor: "#134cff",
              lineWidth: 2,
              labelBackground: "#000000bf",
              labelColor: "#fff",
              labelSize: "11px",
            }),
          ],
          ...this.options,
        };

        this.waveSurfer = WaveSurfer.create(optionsParams);

        if (this.zoomable) {
          this.waveSurfer.registerPlugin(
            ZoomPlugin.create({
              // the amount of zoom per wheel step, e.g. 0.5 means a 50% magnification per scroll
              scale: 0.5,
              // Optionally, specify the maximum pixels-per-second factor while zooming
              maxZoom: 100,
            })
          );
        }

        audioRef.addEventListener("pointermove", this.hoverFn);
        this.waveSurfer.on("load", (url) => {
          this.$emit("load", url);
        });
        this.waveSurfer.on("ready", (duration) => {
          this.readyState = true;
          this.$emit("ready", duration);
        });
        this.waveSurfer.on("play", () => {
          this.playState = true;
          this.$emit("play");
        });
        this.waveSurfer.on("pause", () => {
          this.playState = false;
          this.$emit("pause");
        });
        this.waveSurfer.on("finish", () => {
          this.playState = false;
          this.$emit("finish");
        });
        this.waveSurfer.on("interaction", () => {
          this.waveSurfer.playPause();
          // 交互只播放不暂停
          // if (!this.playState) {
          //   this.waveSurfer.play()
          // }
        });
        this.waveSurfer.on("decode", (duration) => {
          durationRef.textContent = this.formatTime(duration);
        });
        this.waveSurfer.on("timeupdate", (currentTime) => {
          timeRef.textContent = this.formatTime(currentTime);
          this.$emit("timeupdate", currentTime);
        });

        this.waveSurfer.on("audioprocess", (currentTime) => {
          this.$emit("audioprocess", currentTime);
        });

        this.waveSurfer.on("error", () => {
          this.$emit("error");
        });

        // this.waveSurfer.on('zoom', () => {
        //   console.log('Zoom')
        // })
      });
    },
    getWaveSUrfer() {
      return this.waveSurfer;
    },
    playPause() {
      this.waveSurfer.playPause();
    },
    endedPlay() {
      this.waveSurfer.stop();
    },
    downloadAudio() {
      downloadFile(this.audioUrl, "audio.wav");
    },
  },
  beforeDestroy() {
    const { audioRef = {} } = this.$refs;
    audioRef.removeEventListener("pointermove", this.hoverFn);
    this.waveSurfer && this.waveSurfer.destroy();
  },
};
</script>
<style lang="less" scoped>
.audio-box {
  box-sizing: border-box;
  width: 100%;
  padding: 8px;
  background-color: #d1e3ff;
  border-radius: 8px;
  &__wave {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    &-inner {
      cursor: pointer;
      position: relative;
      width: 100%;
      min-height: 36px;
      border-radius: 4px;
      background-color: rgba(255, 255, 255, 0.28);
      &:hover {
        .audio-box__wave-hover {
          opacity: 1;
        }
      }
    }
    &-btns {
      margin-top: 2px;
    }
    &-box {
      ::part(hover-label):before {
        content: "⏱️ ";
      }
    }
    &-hover {
      position: absolute;
      left: 0;
      top: 0;
      z-index: 10;
      pointer-events: none;
      height: 100%;
      width: 0;
      mix-blend-mode: overlay;
      background-color: rgba(255, 255, 255, 0.5);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .iconfont {
      font-size: 17px;
      color: #555;
      &.icon-download {
        font-size: 16.5px;
      }
    }
  }
  &.output {
    background-color: #f7f8fa;
    .audio-box__wave-inner {
      background-color: rgba(224, 224, 224, 0.4);
    }
    .audio-box__wave-hover {
      background-color: rgba(0, 0, 0, 0.5);
    }
  }
}
</style>
