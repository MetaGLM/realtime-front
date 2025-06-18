<template>
    <div class="file-processor">
      <!-- 这里可以添加上传进度等UI组件 -->
    </div>
  </template>
  
  <script>
  import { getUserMedia, getDisplayMedia, float32ArrayToBlob } from "@/utils/stream";
  import { MEDIA_TYPE } from "@/constants/modules/audioVideoCall";
  import emitter from "@/utils/event";
  import { sleep } from "@/utils/tools";
  import awaitTo from "@/utils/await-to-js";
  import AudioManagerClass from "@/utils/audio";
  
  export default {
    name: "FileProcessor",
    data() {
      return {
        videoContext: null,
        audioContext: null,
        extractFrameTimer: null,
        audioManager: null,
        isProcessing: false
      };
    },
    methods: {
      // 处理上传的文件
      async processFiles(videoFile, audioFile) {
        this.isProcessing = true;
        
        try {
          // 1. 处理视频文件
          await this.processVideo(videoFile);
          
          // 2. 处理音频文件 
          await this.processAudio(audioFile);
          
          return { success: true };
        } catch (error) {
          console.error('File processing failed:', error);
          return { success: false, error };
        } finally {
          this.isProcessing = false;
        }
      },
  
      // 处理视频文件并抽帧
      async processVideo(videoFile) {
        // 创建视频元素
        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoFile);
        
        await new Promise((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
  
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置canvas尺寸为视频尺寸
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
  
        // 开始播放视频
        await video.play();
        
        // 每隔指定时间抽取一帧
        const extractFrameRate = 1000; // 每秒抽一帧，可以根据需要调整
        
        return new Promise((resolve) => {
          this.extractFrameTimer = setInterval(() => {
            // 绘制当前帧到canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 将帧转换为blob并发送
            canvas.toBlob((blob) => {
              if (blob) {
                this.sendVideoFrame(blob);
              }
            }, 'image/jpeg');
  
            // 如果视频播放结束，停止抽帧
            if(video.ended) {
              clearInterval(this.extractFrameTimer);
              resolve();
            }
          }, extractFrameRate);
        });
      },
  
      // 处理音频文件
      async processAudio(audioFile) {
        // 创建音频管理实例
        this.audioManager = new AudioManagerClass({
          sampleRate: 16000,
          average: 35,
          analyserRate: 50
        });
  
        // 读取音频文件并转换为AudioBuffer
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
        // 将AudioBuffer转换为Float32Array
        const channelData = audioBuffer.getChannelData(0);
        
        // 分段处理音频数据
        const chunkSize = 4096; // 每个块的大小
        for(let i = 0; i < channelData.length; i += chunkSize) {
          const chunk = channelData.slice(i, i + chunkSize);
          const audioBlob = float32ArrayToBlob('audio/wav', chunk, audioBuffer.sampleRate);
          await this.sendAudioData(audioBlob);
        }
      },
  
      // 发送视频帧数据
      async sendVideoFrame(blob) {
        const base64 = await this.blobToBase64(blob);
        this.$emit('onVideoFrame', base64);
      },
  
      // 发送音频数据
      async sendAudioData(blob) {
        const base64 = await this.blobToBase64(blob);
        this.$emit('onAudioData', base64);
      },
  
      // Blob转Base64
      blobToBase64(blob) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      },
  
      // 清理资源
      cleanup() {
        if(this.extractFrameTimer) {
          clearInterval(this.extractFrameTimer);
        }
        if(this.audioContext) {
          this.audioContext.close();
        }
      }
    },
    
    beforeDestroy() {
      this.cleanup();
    }
  };
  </script>