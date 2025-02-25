<template>
  <div class="video-box flex flex-center" :class="{ disable: !enableVideo }">
    <video ref="videoElement" autoplay></video>
    <canvas ref="canvas" style="display: none"></canvas>
    <div v-if="!enableVideo" class="media-placeholder flex flex-center">
      <i class="iconfont icon-wdcamera_closed"></i>
      <span>摄像头未开启</span>
    </div>
  </div>
</template>

<script>
import { getUserMedia, getDisplayMedia } from "@/utils/stream";
import { MEDIA_TYPE } from "@/constants/modules/audioVideoCall";
import emitter from "@/utils/event";
import { sleep } from "@/utils/tools";
import awaitTo from "@/utils/await-to-js";

export default {
  name: "VideoBox",
  props: {
    // 是否开启视频
    enableVideo: {
      type: Boolean,
      default: false,
    },
    // 视频类型
    videoType: {
      type: String,
      default: MEDIA_TYPE.VIDEO,
    },
    // 视频流推送跳动频率 单位ms
    beatRate: {
      type: Number,
      default: 0,
    },
    // 截取视频录屏片段的跳动频率 单位ms
    extractFrameRate: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      targetStream: null, // 目标流
      videoMediaRecorder: null,
      videoStreamTimer: null, // 截取视频录屏片段的定时器
      extractFrameTimer: null, // 视频抽帧片段的定时器
    };
  },
  watch: {
    enableVideo: {
      handler(val) {
        if (val) {
          // 请求摄像头权限并打开摄像头
          this.openCamera();
        } else {
          // 在需要关闭摄像头时调用closeCamera函数
          this.closeCamera();
        }
      },
      immediate: true,
    },
  },
  mounted() {
    emitter.on("onStopVideoRecorder", this.stopVideoRecorder);
  },
  methods: {
    // 打开摄像头
    async openCamera() {
      let [err = null, stream = null] = [];
      if (this.videoType === MEDIA_TYPE.VIDEO) {
        // 获取摄像头流
        [err, stream] = await awaitTo(
          getUserMedia({
            video: true, // 设置为 true 以请求视频流
          })
        );
        if (err) {
          this.$emit("onOpenVideoError");
          return;
        }
        this.$emit("onOpenVideoSuccess");
      } else if (this.videoType === MEDIA_TYPE.SCREEN) {
        // 获取屏幕流
        // 使用getDisplayMedia请求屏幕捕获
        [err, stream] = await awaitTo(
          getDisplayMedia({
            video: true,
          })
        );
        if (err) {
          this.$emit("onOpenScreenError");
          return;
        }
        this.$emit("onOpenScreenSuccess");
      }

      this.targetStream = stream;
      if (!this.$refs.videoElement) {
        this.closeCamera();
        return;
      }

      // 将捕获的屏幕流设置到video元素上，这样用户能看到屏幕分享的视频
      this.$refs.videoElement.srcObject = this.targetStream;

      // 监听每个轨道的 ended 事件
      this.targetStream.getTracks().forEach((track) => {
        track.addEventListener("ended", this.videoTrackEnded);
      });

      // 获取视频流
      this.getVideoStream(this.targetStream);
      // 视频抽帧
      this.$nextTick(() => {
        this.extractFrame();
      });
    },
    // 视频轨道结束
    videoTrackEnded() {
      this.$emit("onVideoTrackEnded");
    },
    // 视频抽帧
    extractFrame() {
      // 视频抽帧推送
      const refVideo = this.$refs.videoElement;
      if (this.extractFrameRate && refVideo) {
        refVideo.onloadedmetadata = () => {
          const refCanvas = this.$refs.canvas;
          const ctx = refCanvas.getContext("2d");
          refCanvas.width = refVideo.videoWidth;
          refCanvas.height = refVideo.videoHeight;
          this.extractFrameTimer = setInterval(() => {
            ctx.drawImage(refVideo, 0, 0, refCanvas.width, refCanvas.height);
            refCanvas.toBlob((blob) => {
              if (blob) {
                this.$emit("onVideoImage", blob);
              }
            }, "image/jpeg");
          }, this.extractFrameRate);
        };
      }
    },
    // 获取视频流
    async getVideoStream(stream) {
      // 创建一个新的MediaStream，将屏幕视频轨道抽离出来
      if (stream.getVideoTracks().length > 0) {
        const mediaStream = new MediaStream();
        stream.getVideoTracks().forEach((track) => mediaStream.addTrack(track));
        await sleep(200); // 解决黑屏问题
        // 初始化视频录制
        this.initVideoRecorder(mediaStream);
      }
    },
    // 初始化视频录制
    initVideoRecorder(stream) {
      // 创建视频 MediaRecorder
      this.videoMediaRecorder = new MediaRecorder(
        stream, // 音、视频混合流
        { mimeType: "video/webm" }
      );
      // 有可用数据片段时触发
      this.videoMediaRecorder.ondataavailable = (event) => {
        if (this.enableVideo && event.data && event.data.size > 0) {
          // 将片段数据发送给父组件
          this.$emit("onVideoData", event.data);
        }
      };
      // 停止录制时触发
      this.videoMediaRecorder.onstop = () => {
        if (
          this.enableVideo &&
          this.videoMediaRecorder &&
          this.videoMediaRecorder.state !== "recording"
        ) {
          // 重新启动 MediaRecorder 录制
          this.videoMediaRecorder.start();
        }
      };
      // 启动视频录制
      this.startVideoRecorder();
    },
    // 启动视频录制
    startVideoRecorder() {
      // 如果处于关闭状态 则开启录制
      if (this.videoMediaRecorder && this.videoMediaRecorder.state !== "recording") {
        // recording 录制中
        this.videoMediaRecorder.start();
      }
      if (this.beatRate) {
        // 定时触发stop事件，利用ondataavailable事件截取录制数据
        this.videoStreamTimer = setInterval(() => {
          // 停止 MediaRecorder 录制
          this.stopVideoRecorder();
        }, this.beatRate);
      }
    },
    // 停止视频录制
    stopVideoRecorder() {
      // 停止 MediaRecorder 录制
      if (
        this.enableVideo &&
        this.videoMediaRecorder &&
        this.videoMediaRecorder.state !== "inactive"
      ) {
        // inactive 非活动状态（未录制或已停止）
        this.videoMediaRecorder.stop();
      }
    },
    // 关闭摄像头
    closeCamera() {
      // 如果存在媒体流，则停止它
      if (this.targetStream) {
        // 获取媒体流中的所有轨道
        const tracks = this.targetStream.getTracks();
        // 停止所有轨道，并移除事件监听器
        tracks.forEach((track) => {
          track.removeEventListener("ended", this.videoTrackEnded);
          track.stop();
        });
        // 移除video元素的srcObject属性
        if (this.$refs.videoElement) {
          this.$refs.videoElement.srcObject = null;
        }
        this.targetStream = null; // 清空媒体流
      }
      this.videoMediaRecorder = null; // 清空录制对象
      this.videoStreamTimer && clearInterval(this.videoStreamTimer); // 清除定时器
      this.extractFrameTimer && clearInterval(this.extractFrameTimer); // 清除定时器
    },
  },
  beforeDestroy() {
    this.closeCamera();
    event.$off("onStopVideoRecorder", this.stopVideoRecorder);
  },
};
</script>

<style lang="less" scoped>
.video-box {
  width: 100%;
  height: 235px;
  overflow: hidden;
  position: relative;
  border-radius: 8px;
  background-color: #f7f8fa;
  &.disable {
    height: 32px;
  }
  :deep(.media-placeholder) {
    position: absolute;
    z-index: 2;
    color: #8d8e99;
    font-size: 12px;
    i {
      margin-right: 4px;
      font-size: 20px;
    }
  }
  video {
    position: absolute;
    z-index: 1;
    width: 100%;
    height: 235px;
  }
}
</style>
