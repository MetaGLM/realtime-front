<template>
  <div class="file-processing">
    <div class="upload-section">
      <div class="file-input">
        <label>视频文件：</label>
        <input type="file" accept="video/*" @change="handleVideoUpload" />
        <span v-if="videoFile">已选择: {{ videoFile.name }}</span>
      </div>
      
      <div class="file-input">
        <label>音频文件：</label>
        <input type="file" accept="audio/*" @change="handleAudioUpload" />
        <span v-if="audioFile">已选择: {{ audioFile.name }}</span>
      </div>

      <div class="process-button">
        <button 
          class="start-button" 
          @click="startProcessing" 
          :disabled="!canProcess"
          :class="{ 'button-disabled': !canProcess }"
        >
          {{ isProcessing ? '处理中...' : '开始处理' }}
        </button>
      </div>
      
      <div v-if="isProcessing" class="processing-status">
        <div class="status-text">正在处理文件...</div>
        <div v-if="processStats.videoFrames || processStats.audioChunks">
          处理进度：
          <div>视频帧：{{ processStats.videoFrames }}</div>
          <div>音频块：{{ processStats.audioChunks }}</div>
        </div>
      </div>
    </div>
    
    <FileProcessor 
      ref="fileProcessor"
      @onVideoFrame="handleVideoFrame"
      @onAudioData="handleAudioData"
    />
  </div>
</template>

<script>
import FileProcessor from '@/components/FileProcessor.vue';
import { SOCKET_STATUS } from '@/constants/modules/audioVideoCall';

export default {
  name: 'FileProcessing',
  components: {
    FileProcessor
  },
  
  data() {
    return {
      videoFile: null,
      audioFile: null,
      sock: null,
      isConnected: false,
      isProcessing: false,
      processStats: {
        videoFrames: 0,
        audioChunks: 0
      },
      wsUrl: `wss://open.bigmodel.cn/api/paas/v4/realtime?Authorization=f2fa9dda05124b6a89a2eebb7c7396db.fsGVk256VE2hWHtW}` // 替换为实际的WebSocket服务器地址
    };
  },
  
  computed: {
    canProcess() {
      return this.videoFile && this.audioFile && !this.isProcessing;
    }
  },
  
  methods: {
    handleVideoUpload(event) {
      const file = event.target.files[0];
      if (file) {
        console.log('Selected video file:', file.name);
        this.videoFile = file;
      }
    },
    
    handleAudioUpload(event) {
      const file = event.target.files[0];
      if (file) {
        console.log('Selected audio file:', file.name);
        this.audioFile = file;
      }
    },
    
    // 初始化WebSocket连接
    async initWebSocket() {
      return new Promise((resolve, reject) => {
        try {
          this.sock = new WebSocket(this.wsUrl);
          
          this.sock.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.sessionUpdate();
            resolve();
          };
          
          this.sock.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
          };
          
          this.sock.onerror = (error) => {
            console.error('WebSocket error:', error);
            reject(error);
          };
          
          this.sock.onmessage = (event) => {
            this.handleWsResponse(event.data);
          };
        } catch (error) {
          reject(error);
        }
      });
    },
    
    // 处理视频帧数据
    handleVideoFrame(base64Data) {
      if (!this.isConnected) {
        console.warn('WebSocket not connected');
        return;
      }
      
      const params = {
        type: SOCKET_STATUS.VIDEO_APPEND,
        client_timestamp: Date.now(),
        video_frame: base64Data
      };
      
      this.sendMessage(params);
      this.processStats.videoFrames++;
    },
    
    // 处理音频数据
    handleAudioData(base64Data) {
      if (!this.isConnected) {
        console.warn('WebSocket not connected');
        return;
      }
      
      const params = {
        type: SOCKET_STATUS.AUDIO_APPEND,
        client_timestamp: Date.now(),
        audio: base64Data
      };
      
      this.sendMessage(params);
      this.processStats.audioChunks++;
    },
    
    // 发送WebSocket消息
    sendMessage(params) {
      if (this.sock && this.isConnected) {
        this.sock.send(JSON.stringify(params));
      }
    },
    
    // 设置会话信息
    sessionUpdate() {
      const params = {
        event_id: "evt_" + Date.now(),
        type: SOCKET_STATUS.SESSION_UPDATE,
        session: {
          // 设置会话参数，根据实际需要配置
          model: "default",
          temperature: 0.7,
          // ... 其他参数
        }
      };
      this.sendMessage(params);
    },
    
    // 处理WebSocket响应
    handleWsResponse(data) {
      try {
        const res = JSON.parse(data);
        console.log('Received WebSocket response:', res);
        
        switch (res.type) {
          case SOCKET_STATUS.SESSION_CREATED:
            console.log('Session created');
            break;
            
          case SOCKET_STATUS.RESPONSE_AUDIO:
            console.log('Received audio response');
            break;
            
          case SOCKET_STATUS.ERROR:
            console.error('Server error:', res.error);
            break;
            
          // ... 处理其他响应类型
        }
      } catch (e) {
        console.error('Failed to parse WebSocket response:', e);
      }
    },
    
    async startProcessing() {
      if (!this.canProcess) {
        console.log('Cannot process: missing files or already processing');
        return;
      }
      
      this.isProcessing = true;
      this.processStats = { videoFrames: 0, audioChunks: 0 };
      
      try {
        console.log('Starting processing...');
        
        // 1. 建立WebSocket连接
        await this.initWebSocket();
        
        // 2. 开始处理文件
        await this.$refs.fileProcessor.processFiles(this.videoFile, this.audioFile);
        
        console.log('Processing completed successfully');
      } catch (error) {
        console.error('Processing failed:', error);
        alert('处理失败，请重试');
      } finally {
        this.isProcessing = false;
      }
    }
  },
  
  beforeUnmount() {
    if (this.sock) {
      this.sock.close();
    }
  }
};
</script>

<style lang="less">
// ... 保持原有样式不变
</style>