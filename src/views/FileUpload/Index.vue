<template>
    <div class="file-upload">
      <div class="file-upload__header">
        <h3>文件上传处理</h3>
      </div>
      <div class="file-upload__content">
        <!-- 上传区域 -->
        <div class="upload-section">
          <div class="upload-box">
            <h4>视频文件</h4>
            <input 
              type="file" 
              accept="video/*"
              @change="handleVideoUpload"
            >
            <div v-if="videoFile" class="file-info">
              已选择: {{ videoFile.name }}
            </div>
          </div>
          <div class="upload-box">
            <h4>音频文件</h4>
            <input 
              type="file"
              accept="audio/*" 
              @change="handleAudioUpload"
            >
            <div v-if="audioFile" class="file-info">
              已选择: {{ audioFile.name }}
            </div>
          </div>
        </div>
  
        <!-- 处理状态和进度显示 -->
        <div class="process-status">
          <div v-if="processing || currentStep" class="process-progress">
            {{ currentStep }}: {{ progress }}%
          </div>
  
          <!-- 日志显示区域 -->
          <div v-if="debugLogs.length" class="debug-logs">
            <div v-for="(log, index) in debugLogs" 
                 :key="index" 
                 :class="['log-entry', log.type]">
              <span class="log-time">{{ log.timestamp }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
  
          <!-- 消息列表 -->
          <div v-if="messageList.length" class="message-list">
            <div v-for="(msg, index) in messageList" 
                 :key="msg.id || index"
                 class="message-item"
                 :class="msg.type">
              <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
              <div v-if="msg.textContent?.length" class="message-content">
                <div v-for="(text, i) in msg.textContent" 
                     :key="i"
                     class="message-text">
                  {{ text }}
                </div>
              </div>
              <div v-if="msg.audioUrl" class="audio-player">
                <audio :src="msg.audioUrl" controls></audio>
              </div>
            </div>
          </div>
        </div>
  
        <!-- 操作按钮 -->
        <el-button 
          type="primary"
          :loading="processing"
          @click="processFiles"
          :disabled="!videoFile || !audioFile"
        >
          开始处理
        </el-button>
      </div>
    </div>
  </template>
  
  <script>
  import { processVideoFrames, readFileAsBase64 } from './videoProcessor'
  import { MSG_TYPE, SOCKET_STATUS, VAD_TYPE, CALL_MODE_TYPE } from "@/constants/modules/audioVideoCall"
  
  export default {
    name: 'FileUpload',
    data() {
      return {
        videoFile: null,
        audioFile: null,
        processing: false,
        progress: 0,
        currentStep: '',
        messageList: [],
        wsConnection: null,
        currentRequestId: '',
        currentResponseId: '',
        debugLogs: []
      }
    },
    methods: {
      // 添加时间格式化方法
      formatTime(timestamp) {
        if (!timestamp) return ''
        const date = new Date(timestamp)
        return date.toLocaleTimeString()
      },
      // 添加日志函数
      addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString()
        this.debugLogs.push({ timestamp, message, type })
        console.log(`${type.toUpperCase()}: ${message}`)
      },
      // 处理视频文件选择
      handleVideoUpload(event) {
        const file = event.target.files[0]
        if (file && file.type.startsWith('video/')) {
          this.videoFile = file
          this.addLog(`选择视频文件: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`)
        }
      },
  
      // 处理音频文件选择  
      handleAudioUpload(event) {
        const file = event.target.files[0]
        if (file && file.type.startsWith('audio/')) {
          this.audioFile = file
          this.addLog(`选择音频文件: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`)
        }
      },
  
      // 处理WebSocket消息
      handleWsMessage(event) {
        try {
          const data = JSON.parse(event.data)
          // 不显示心跳消息
          if (data.type !== 'heartbeat') {
            this.addLog(`收到WebSocket消息: ${data.type}`)
          }          
  
          switch (data.type) {
            case SOCKET_STATUS.SESSION_CREATED:
              this.currentStep = '会话已创建'
              this.addLog('会话创建成功，开始更新会话配置')
              this.sendSessionUpdate()
              break
              
            case SOCKET_STATUS.SESSION_UPDATED:
              this.currentStep = '开始处理音视频'
              this.addLog('会话配置更新成功，开始处理文件')
              this.startProcessingFiles()
              break
              
            case SOCKET_STATUS.COMMITED:
            this.currentRequestId = data.item_id
                this.addLog(`服务器已接收数据，请求ID: ${data.item_id}`)
                // 发送响应创建请求
                this.wsConnection.send(JSON.stringify({
                    type: SOCKET_STATUS.RESPONSE_CREATE,
                    client_timestamp: Date.now()
                }))
                this.addLog('已请求创建AI响应')
                break

              
            case SOCKET_STATUS.RESPONSE_CREATED:
                this.currentResponseId = data.response.id
                    this.currentStep = 'AI处理中'
                    this.addLog(`AI开始处理，响应ID: ${data.response.id}`)
                    break
              
            case SOCKET_STATUS.ASR_COMPLETED:
              if (data.transcript) {
                this.addLog(`语音识别完成: ${data.transcript}`)
                const msgIndex = this.messageList.findIndex(m => m.id === this.currentRequestId)
                if (msgIndex !== -1) {
                  this.messageList[msgIndex].textContent = [data.transcript]
                }
              }
              break
              
            case SOCKET_STATUS.RESPONSE_AUDIO_TXT:
            case SOCKET_STATUS.RESPONSE_TEXT:  // 添加文本响应类型的处理
            this.addLog(`收到AI响应: ${data.delta}`)
                const responseMsg = {
                    id: this.currentResponseId,
                    type: MSG_TYPE.SERVER,
                    textContent: [data.delta],
                    timestamp: Date.now()
                }
                
                const existingIndex = this.messageList.findIndex(msg => msg.id === this.currentResponseId)
                if (existingIndex === -1) {
                    this.messageList.push(responseMsg)
                } else {
                    const existing = this.messageList[existingIndex]
                    existing.textContent = [...existing.textContent, data.delta]
                    this.$set(this.messageList, existingIndex, { ...existing })
                }
                
                // 保存到 localStorage
                this.saveMessages()
                break
              
            case SOCKET_STATUS.RESPONSE_AUDIO:
              this.addLog('收到AI音频响应')
              this.addOrUpdateMessage(this.currentResponseId, MSG_TYPE.SERVER, {
                audioData: [{ data: data.delta }]
              })
              break
              
            case SOCKET_STATUS.RESPONSE_AUDIO_DONE:
                this.addLog('AI处理完成', 'success')
                this.currentStep = '处理完成'
                
                // 延迟关闭处理状态
                setTimeout(() => {
                    this.processing = false
                    // 保存最终状态
                    this.saveState()
                }, 2000)
                break
  
            case SOCKET_STATUS.ERROR:
                const errorMsg = data.error?.message || '未知错误'
                this.currentStep = '处理失败: ' + errorMsg
                this.addLog(`处理失败: ${errorMsg}`, 'error')
                // 延迟关闭处理状态
                setTimeout(() => {
                    this.processing = false
                    this.saveState()
                }, 2000)
                break
  
            default:
              this.addLog(`未处理的消息类型: ${data.type}`, 'warning')
              break
          }
        } catch (err) {
          this.addLog(`处理WebSocket消息错误: ${err.message}`, 'error')
          console.error('完整错误:', err)
        }
      },
  
      // 添加或更新消息列表
      addOrUpdateMessage(id, type, data) {
        const index = this.messageList.findIndex(m => m.id === id)
        if (index !== -1) {
          const msg = this.messageList[index]
          if (data.textContent) {
            msg.textContent = [...(msg.textContent || []), ...data.textContent]
          }
          if (data.audioData) {
            msg.audioData = [...(msg.audioData || []), ...data.audioData]
            // 将base64音频数据转换为Blob URL
            const audioBlob = this.base64ToBlob(data.audioData[0].data, 'audio/mp3')
            msg.audioUrl = URL.createObjectURL(audioBlob)
          }
          this.messageList.splice(index, 1, { ...msg })
        } else {
          this.messageList.push({
            id,
            type,
            ...data,
          })
        }
      },
  
      // 发送会话更新
      sendSessionUpdate() {
        const sessionConfig = {
          turn_detection: {
            type: VAD_TYPE.CLIENT_VAD,
          },
          beta_fields: {
            chat_mode: CALL_MODE_TYPE.VIDEO_PASSIVE,
          },
          output_audio_format: "mp3",
          input_audio_format: "wav",
        }
        
        this.wsConnection.send(JSON.stringify({
          type: SOCKET_STATUS.SESSION_UPDATE,
          session: sessionConfig
        }))
      },
  
      // base64转Blob
      base64ToBlob(base64, type) {
        const binStr = atob(base64)
        const len = binStr.length
        const arr = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = binStr.charCodeAt(i)
        }
        return new Blob([arr], { type })
      },
  
      // 开始处理文件
      async startProcessingFiles() {
        try {
          // 1. 处理视频帧
          this.currentStep = '提取视频帧'
          this.addLog('开始提取视频帧')
          const videoFrames = await processVideoFrames(this.videoFile, (p) => {
              this.progress = p
          })
          this.addLog(`视频帧提取完成，共 ${videoFrames.length} 帧`)
  
          // 修改 startProcessingFiles 方法中发送视频帧的部分
          // 2. 发送视频帧
          this.currentStep = '发送视频数据'
          this.addLog('开始发送视频帧数据')
          try {
            for (let i = 0; i < videoFrames.length; i++) {
            if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
                throw new Error('WebSocket连接已断开')
            }
        
            // 添加延时，避免发送过快
            await new Promise(resolve => setTimeout(resolve, 50))
        
            this.wsConnection.send(JSON.stringify({
                type: SOCKET_STATUS.VIDEO_APPEND,
                client_timestamp: Date.now(),
                video_frame: videoFrames[i]
            }))
        
            // 确保进度不会超过100%
            this.progress = Math.min(Math.floor((i + 1) / videoFrames.length * 100), 100)
        
            if (i % 10 === 0) {
                this.addLog(`已发送 ${i + 1}/${videoFrames.length} 帧`)
            }
          }
          this.addLog('视频帧发送完成')
        } catch (err) {
          this.addLog(`发送视频帧失败: ${err.message}`, 'error')
          throw err
        }
  
          // 3. 发送音频
          this.currentStep = '发送音频数据'
          this.addLog('开始发送音频数据')
          this.progress = 0
          const audioData = await readFileAsBase64(this.audioFile, (p) => {
            this.progress = p
          })
            this.addLog(`音频数据准备完成，大小: ${Math.round(audioData.length * 3 / 4 / 1024)}KB`)

          if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket连接已断开')
          }
        
          await new Promise(resolve => setTimeout(resolve, 500)) // 添加短暂延时
        
          this.wsConnection.send(JSON.stringify({
            type: SOCKET_STATUS.AUDIO_APPEND,
            client_timestamp: Date.now(),
            audio: audioData
          }))
          this.addLog('音频数据发送完成')
  
          // 4. 发送提交指令
          await new Promise(resolve => setTimeout(resolve, 1000)) // 确保音频数据已被接收
        
          this.addLog('发送提交指令')
          if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket连接已断开')
          }
          this.wsConnection.send(JSON.stringify({
            type: SOCKET_STATUS.COMMIT,
            client_timestamp: Date.now(),
            response_type: "text" // 明确要求文本响应
          }))
          this.addLog('提交指令发送完成，等待AI响应...')
          this.currentStep = '等待AI响应'
  
        } catch (err) {
          this.addLog(`处理文件错误: ${err.message}`, 'error')
          console.error('完整错误:', err)
          this.processing = false
          this.currentStep = '处理失败: ' + err.message
        }
      },
  
      // 处理文件并发送到AI接口
      async processFiles() {
        if (!this.videoFile || !this.audioFile) {
          this.addLog('请选择视频和音频文件', 'error')
          return
        }
  
        try {
          this.processing = true
          this.progress = 0
          this.currentStep = '建立连接'
          this.messageList = []
          this.debugLogs = []
  
          // 创建WebSocket连接
          const domain = import.meta.env.VITE_APP_DOMAIN
          const proxyPath = import.meta.env.VITE_APP_PROXY_PATH
          const apiKey = "d20c08612ef746beb7038a326131d475.cv71sxB0l7w8yOAO"
          const wsUrl = `${domain}${proxyPath}/v4/realtime?Authorization=${apiKey}`
          
          this.addLog(`开始建立WebSocket连接: ${domain}${proxyPath}/v4/realtime`)
          // 修改 processFiles 方法中的 WebSocket 初始化部分
          // 修改 processFiles 方法中的 WebSocket 初始化部分
          this.wsConnection = new WebSocket(wsUrl)

          this.wsConnection.onopen = () => {
            this.addLog('WebSocket连接已建立', 'success')
          }

          this.wsConnection.onmessage = (event) => {
            // 添加心跳消息的处理，避免显示在日志中
            if (event.data === 'heartbeat') {
                return
            }
            this.handleWsMessage(event)
          }

          this.wsConnection.onerror = (error) => {
            this.addLog(`WebSocket错误: ${error}`, 'error')
            console.error('WebSocket错误:', error)
            // 不要立即设置 processing 为 false，等待 onclose 事件处理
          }

          this.wsConnection.onclose = (event) => {
            // 添加更详细的关闭原因
            let closeReason = '未知原因'
            if (event.code === 1000) {
                closeReason = '正常关闭'
            } else if (event.code === 1006) {
                closeReason = '异常关闭'
            }
    
            this.addLog(`WebSocket连接已关闭 (code: ${event.code}, reason: ${closeReason})`, 
                this.processing ? 'error' : 'info')
    
            if (this.processing) {
                this.processing = false
                this.currentStep = `连接已关闭: ${closeReason}`
            }
          }  
        } catch (err) {
            this.addLog(`初始化错误: ${err.message}`, 'error')
            console.error('完整错误:', err)
            this.processing = false
            this.currentStep = '初始化失败: ' + err.message                     
        }
      },
          // 保存消息列表和日志
      saveMessages() {
        localStorage.setItem('fileUpload_messages', JSON.stringify(this.messageList))
        localStorage.setItem('fileUpload_logs', JSON.stringify(this.debugLogs))
      },

      // 保存整个状态
      saveState() {
        const state = {
            messages: this.messageList,
            logs: this.debugLogs,
            currentStep: this.currentStep,
            processing: this.processing
        }
        localStorage.setItem('fileUpload_state', JSON.stringify(state))
      },

      // 恢复状态
      restoreState() {
        try {
            const state = localStorage.getItem('fileUpload_state')
            if (state) {
                const parsed = JSON.parse(state)
                this.messageList = parsed.messages || []
                this.debugLogs = parsed.logs || []
                this.currentStep = parsed.currentStep || ''
                this.processing = parsed.processing || false
            }
        } catch (err) {
            console.error('恢复状态失败:', err)
        }
      },

      // 修改添加日志方法
      addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString()
        const logEntry = { timestamp, message, type }
        this.debugLogs.push(logEntry)
        console.log(`${type.toUpperCase()}: ${message}`)
        
        // 保存日志
        this.saveMessages()
      }
    
    },
    // 添加组件销毁前的处理
    beforeDestroy() {
      this.saveState()
        if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
            this.wsConnection.close()
        }
    },
  
    // 修改生命周期钩子
    created() {
      this.restoreState()
    },
  }
  </script>
  
  <style lang="less" scoped>
.file-upload {
  background-color: #fff;
  height: 100%;
  
  &__header {
    height: 59px;
    border-bottom: 1px solid rgba(224, 224, 224, 0.6);
    padding: 0 24px;
    
    h3 {
      color: #131212;
      font-size: 20px;
      font-weight: 500;
      line-height: 59px;
      margin: 0;
    }
  }
  
  &__content {
    padding: 24px;
    
    .upload-section {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
    }
    
    .upload-box {
      flex: 1;
      padding: 16px;
      border: 1px dashed #dcdfe6;
      border-radius: 8px;
      
      h4 {
        margin: 0 0 12px;
      }
      
      .file-info {
        margin-top: 8px;
        color: #409eff;
      }
    }
  }

  .process-status {
    margin-top: 20px;
    
    .debug-logs {
      margin: 16px 0;
      padding: 12px;
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
      
      .log-entry {
        display: flex;
        margin: 4px 0;
        font-family: monospace;
        font-size: 12px;
        
        .log-time {
          min-width: 100px;
          color: #666;
        }
        
        .log-message {
          flex: 1;
        }
        
        &.error { color: #dc3545; }
        &.warning { color: #ffc107; }
        &.success { color: #28a745; }
        &.info { color: #17a2b8; }
      }
    }
    
    .message-list {
      margin-top: 16px;
      
      .message-item {
        margin-bottom: 16px;
        padding: 12px;
        border-radius: 4px;
        
        &.client {
          background-color: #f5f7fa;
        }
        
        &.server {
          background-color: #ecf5ff;
        }

        .message-time {
          font-size: 12px;
          color: #999;
          margin-bottom: 4px;
        }

        .message-content {
          margin: 8px 0;
        }

        .audio-player {
          margin-top: 8px;
          
          audio {
            width: 100%;
          }
        }
      }
    }
  }
}
</style>