import awaitTo from '@/utils/await-to-js'
import { getUserMedia, concatFloat32Array, createWavFile, mergeFloat32Arrays } from '@/utils/stream'
import { FixedQueue } from '@/utils/queue'

/**
 *
 * @param {object} #options 实例化实例时传入的参数
 *
 */

class SoundVadClass {
  _options

  _average // 灵敏度阈值
  _analyserRate // 分析器频率
  _sampleRate // 采样率

  _mediaStreamSource = null // 录音流源
  _streamAnalyser = null // 分析器
  _audioContext = null // 音频上下文
  _analyserTimer = null // 分析器定时器
  _isSpeeching = false // 是否在说话
  _recordPCMData = new Float32Array([]) // 录音数据
  _delayFrameCount = 0 // 延迟帧计数
  _delayFrameLimit = 20 // 延迟帧限制

  constructor({ average, analyserRate, sampleRate, ...options } = {}) {
    this._options = options
    this._sampleRate = sampleRate || 16000
    this._average = average || 35
    this._analyserRate = analyserRate || 50
  }

  get isSpeeching() {
    // 通过getter访问私有字段
    return this._isSpeeching
  }

  set isSpeeching(newName) {
    // 通过setter修改私有字段
    this._isSpeeching = newName
  }

  // 获取权限失败
  _handlePermissionError() {
    if (typeof this._options?.onPermissionError === 'function') {
      this._options.onPermissionError()
    }
  }

  // vad状态回调
  _handleVadStatus(data) {
    if (typeof this._options?.onVadStatus === 'function') {
      this._options.onVadStatus(data)
    }
  }

  // 监听音频数据
  _handleListenAudioData(data) {
    if (typeof this._options?.onListenAudioData === 'function') {
      this._options.onListenAudioData(data)
    }
  }

  // 清理录音数据
  clearRecordPCMData() {
    this._recordPCMData = new Float32Array([])
  }

  // 获取录音数据
  getRecordWavData() {
    return createWavFile(this._recordPCMData, this._sampleRate)
  }

  // 开启声音监听
  async startListen({ isClientVad = true }) {
    // 获取用户媒体流
    const [err, stream] = await awaitTo(
      getUserMedia({
        audio: true
      })
    )
    if (err) {
      this._handlePermissionError() // 获取权限失败
      return
    }
    let inputBuffer = null // 原始通道数据
    const bufferSize = isClientVad ? 4096 : 2048 // 缓冲区大小
    const vadFrame = isClientVad ? 3 : 6 // 帧，每帧4 * 1536 byte，约为100ms，用于VAD检测的有效片段
    const aheadChunks = new FixedQueue(vadFrame) // 队列，用于缓存音频数据
    this._audioContext = new (window.AudioContext ||
      window.webkitAudioContext ||
      window.mozAudioContext)({ sampleRate: this._sampleRate })
    // 创建脚本处理节点
    this._scriptProcessorNode = this._audioContext.createScriptProcessor(bufferSize, 1, 1)
    // 当音频数据可用时执行的回调函数
    this._scriptProcessorNode.onaudioprocess = async ev => {
      inputBuffer = ev.inputBuffer.getChannelData(0)
      if (inputBuffer && inputBuffer.length > 0) {
        if (isClientVad) {
          if (this._isSpeeching) {
            if (aheadChunks.length > 0) {
              // 处理预制的音频数据
              const aheadChunksData = aheadChunks.getQueue().reduce((a, b) => {
                return concatFloat32Array(a, b)
              }, new Float32Array([]))
              inputBuffer = concatFloat32Array(aheadChunksData, inputBuffer)
              aheadChunks.clear()
            }
            this._recordPCMData = concatFloat32Array(this._recordPCMData, inputBuffer)
            const wavBlob = createWavFile(inputBuffer, this._sampleRate)
            this._handleListenAudioData(wavBlob)
          } else {
            aheadChunks.append(new Float32Array(inputBuffer))
          }
        } else {
          if (this._isSpeeching) {
            if (aheadChunks.length) {
              const aheadChunksData = mergeFloat32Arrays(aheadChunks.getQueue())
              this._recordPCMData = concatFloat32Array(aheadChunksData, this._recordPCMData)
              aheadChunks.clear()
            }
            this._recordPCMData = concatFloat32Array(this._recordPCMData, inputBuffer)
          } else {
            aheadChunks.append(new Float32Array(inputBuffer))
          }
          const wavBlob = createWavFile(inputBuffer, this._sampleRate)
          this._handleListenAudioData(wavBlob)
        }
      }
    }

    // 创建录音媒体流源
    this._mediaStreamSource = this._audioContext.createMediaStreamSource(stream)
    // 创建音频增益节点
    this._gainNode = this._audioContext.createGain()
    // 创建音频输出节点
    this._destAudioNode = this._audioContext.createMediaStreamDestination()
    // 增益节点连接脚本处理节点，连接音频输出节点
    this._gainNode.connect(this._scriptProcessorNode).connect(this._destAudioNode)

    // 媒体流源连接增益节点
    this._mediaStreamSource.connect(this._gainNode)
    // // 增益节点连接输出节点
    // audioNode.connect(this._destAudioNode)

    if (isClientVad) {
      // 启用vad
      // 创建分析器节点
      this._streamAnalyser = this._audioContext.createAnalyser()
      // 媒体流源连接分析器
      this._mediaStreamSource.connect(this._streamAnalyser)
      // 设定分析器参数
      this._streamAnalyser.fftSize = 2048
      const bufferLength = this._streamAnalyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      // 定时检测音频数据
      this._analyserTimer = setInterval(() => {
        this._streamAnalyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i]
        }
        const average = sum / bufferLength
        if (average > this._average) {
          // 简单阈值判断，可根据实际调整
          this._isSpeeching = true
          this._delayFrameCount = 0
        } else if (average < this._average) {
          this._delayFrameCount++
          if (this._delayFrameCount > this._delayFrameLimit) {
            this._isSpeeching = false
          }
        }
        this._handleVadStatus(this._isSpeeching)
        // console.log('--average--', average)
      }, this._analyserRate)
    }
  }

  // 停止声音监听
  closeListen() {
    // 释放VAD相关资源
    if (this._analyserTimer) {
      clearInterval(this._analyserTimer)
    }
    try {
      if (this._gainNode && this._scriptProcessorNode && this._destAudioNode) {
        // this._gainNode.disconnect(this._scriptProcessorNode)
        // this._gainNode.disconnect(this._destAudioNode)
        this._scriptProcessorNode.onaudioprocess = null
        this._scriptProcessorNode = null
        this._destAudioNode = null
      }
      if (this._mediaStreamSource && this._streamAnalyser && this._gainNode) {
        this._mediaStreamSource.disconnect(this._gainNode)
        this._mediaStreamSource.disconnect(this._streamAnalyser)
        // 释放MediaStream
        const tracks = this._mediaStreamSource.mediaStream.getTracks()
        tracks.forEach(track => track.stop())
        this._mediaStreamSource = null
        this._streamAnalyser = null
        this._gainNode = null
      }
    } catch (e) {
      console.error('closeListen', e)
    }
    this._audioContext = null
    this._isSpeeching = false
    this._recordPCMData = new Float32Array([])
    this._delayFrameCount = 0
    this._handleVadStatus(false)
  }
}

export default SoundVadClass
