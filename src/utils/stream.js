/**
 * 获取 getUserMedia 对象的兼容写法
 * @param {Object} constraints - 视频和音频的约束条件。
 * @returns {Promise} 返回一个Promise对象，解析为 getUserMedia 对象。
 */
export function getUserMedia(constraints) {
  if (navigator?.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints)
  } else if (navigator.getUserMedia) {
    return navigator.getUserMedia(constraints)
  } else if (navigator.webkitGetUserMedia) {
    // 针对旧版Chrome和Opera
    return navigator.webkitGetUserMedia(constraints)
  } else if (navigator.mozGetUserMedia) {
    // 针对旧版Firefox
    return navigator.mozGetUserMedia(constraints)
  } else if (navigator.msGetUserMedia) {
    // 针对旧版IE
    return navigator.msGetUserMedia(constraints)
  } else {
    return Promise.reject(new Error('当前浏览器不支持getUserMedia！'))
  }
}

/**
 * 获取 getDisplayMedia 对象的兼容写法
 * @param {Object} constraints - 视频和音频的约束条件。
 * @returns {Promise} 返回一个Promise对象，解析为 getDisplayMedia 对象。
 */
export function getDisplayMedia(constraints) {
  if (navigator.mediaDevices.getDisplayMedia) {
    return navigator.mediaDevices.getDisplayMedia(constraints)
  } else if (navigator.getDisplayMedia) {
    return navigator.getDisplayMedia(constraints)
  } else if (navigator.webkitGetDisplayMedia) {
    // 针对旧版Chrome和Opera
    return navigator.webkitGetDisplayMedia(constraints)
  } else if (navigator.mozGetDisplayMedia) {
    // 针对旧版Firefox
    return navigator.mozGetDisplayMedia(constraints)
  } else if (navigator.msGetDisplayMedia) {
    // 针对旧版IE
    return navigator.msGetDisplayMedia(constraints)
  } else {
    return Promise.reject(new Error('当前浏览器不支持getDisplayMedia！'))
  }
}

/**
 * 将ArrayBuffer转换回Base64的字符串。
 * @param {ArrayBuffer} buffer - 要转换的ArrayBuffer对象。
 * @returns {string} 返回Base64编码的字符串。
 */
export function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.length
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * 将Base64的字符串转换为ArrayBuffer
 * @param {string} base64 - 要转换的Base64字符串。
 * @returns {ArrayBuffer} 返回ArrayBuffer对象。
 */
export function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64)
  const len = binary_string.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 将Base64编码的字符串转换为Blob对象。
 * @param {string} base64 - 需要转换的Base64编码字符串
 * @param {string} mimeType - Blob对象的MIME类型，例如'image/jpeg'或'image/png'。
 * @returns {Blob} 返回一个Blob对象
 */
export function base64ToBlob(base64, mimeType) {
  // 分割Base64字符串以获取数据部分，通常Base64字符串以"data:image/...,"开头
  const byteString = atob(base64)
  // 创建一个ArrayBuffer，其大小与解码后的字符串长度相同
  const ab = new ArrayBuffer(byteString.length)
  // 创建一个Uint8Array视图，将ArrayBuffer的内容初始化为8位无符号整数值
  const ia = new Uint8Array(ab)
  // 遍历解码后的字符串，并将每个字符的Unicode编码存入Uint8Array数组
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  // 使用ArrayBuffer和MIME类型创建Blob对象
  const blob = new Blob([ab], { type: mimeType })
  // 返回Blob对象
  return blob
}

/**
 * 将Blob对象转换为Base64编码的字符串。
 * @param {Blob} blob - 要转换的Blob对象。
 * @returns {Promise<string>} 返回一个Promise，解析为Base64编码的字符串。
 */
export function blobToBase64(blob, isKeepHeader = false) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = function() {
      const base64String = reader.result
      if (isKeepHeader) {
        resolve(base64String)
      } else {
        resolve(base64String.split(',')[1])
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 将blob对象转换为ArrayBuffer。
 * @param {Blob} file - 要转换的Blob对象。
 * @returns {ArrayBuffer} 返回ArrayBuffer对象。
 */
export function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function concatFloat32Array(a, b) {
  const newArr = new Float32Array(a.length + b.length)
  newArr.set(a, 0)
  newArr.set(b, a.length)
  return newArr
}

export function createWavFile(audioData, sampleRate) {
  function float32ToPCM(input, output) {
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]))
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
  }

  function writeUTFBytes(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  const numOfChannels = 1 // 单声道
  const bitDepth = 16
  const byteRate = (sampleRate * numOfChannels * bitDepth) / 8
  const blockAlign = (numOfChannels * bitDepth) / 8
  const wavHeaderSize = 44

  const wavBuffer = new ArrayBuffer(wavHeaderSize + audioData.length * 2)
  const view = new DataView(wavBuffer)

  // RIFF chunk descriptor
  writeUTFBytes(view, 0, 'RIFF')
  view.setUint32(4, 36 + audioData.length * 2, true)
  writeUTFBytes(view, 8, 'WAVE')

  // fmt sub-chunk
  writeUTFBytes(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true) // AudioFormat (1 for PCM)
  view.setUint16(22, numOfChannels, true) // NumChannels
  view.setUint32(24, sampleRate, true) // SampleRate
  view.setUint32(28, byteRate, true) // ByteRate
  view.setUint16(32, blockAlign, true) // BlockAlign
  view.setUint16(34, bitDepth, true) // BitsPerSample

  // data sub-chunk
  writeUTFBytes(view, 36, 'data')
  view.setUint32(40, audioData.length * 2, true) // Subchunk2Size

  // PCM data
  const pcmData = new Int16Array(audioData.length)
  float32ToPCM(audioData, pcmData)
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(44 + i * 2, pcmData[i], true)
  }

  return new Blob([view], { type: 'audio/wav' })
}

export function mergeFloat32Arrays(arrays) {
  // 计算总长度
  let totalLength = 0
  for (const arr of arrays) {
    totalLength += arr.length
  }

  // 创建新的 Float32Array
  const result = new Float32Array(totalLength)

  // 拷贝每个 Float32Array 到新的 Float32Array
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }

  return result
}

/**
 * 从文件中提取pcm数据
 * @param {Blob} file - 要转换的Blob对象。
 * @returns {Uint8Array} 返回Uint8Array对象。
 */
export function getFilePcmData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      resolve(new Uint8Array(e.target.result))
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 从文件中提取pcm数据
 * @param {Blob} pcmData -  要转换的Blob对象。
 * @returns {blob} 返回blob对象。
 */
export function pcmDataToWavBlob(pcmData, channels, sampleRate) {
  const wavHeader = generateFileHeader(channels, sampleRate, pcmData.length)
  const rawData = new Uint8Array(wavHeader.length + pcmData.length)
  rawData.set(wavHeader)
  rawData.set(pcmData, wavHeader.length)
  const wavBlob = new Blob([rawData], { type: 'audio/wav' })
  return wavBlob
}

/**
 * 将解码后的audioBuffer音频数据转换为PCM格式
 * @param {AudioBuffer} audioBuffer - 解码后的音频数据
 * @returns {Object} { pcm, sampleRate } - PCM格式数据及采样率
 */
// 将解码后的音频数据转换为PCM格式
export function audioBufferToPCM(audioBuffer) {
  const channels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const length = audioBuffer.length * channels
  const buffer = new Float32Array(length)
  // 将音频数据复制到Float32Array中
  for (let channel = 0; channel < channels; channel++) {
    const channelData = audioBuffer.getChannelData(channel)
    buffer.set(channelData, channel * audioBuffer.length)
  }
  // 将Float32Array转换为Int16Array，模拟PCM 16位格式
  const pcm = new Int16Array(length)
  for (let i = 0; i < length; i++) {
    // 将浮点数缩放到16位整数范围
    pcm[i] = buffer[i] * 0x7fff
  }
  return { pcm, sampleRate }
}

/**
 * 将PCMBase64转换为Float32Array
 * @param {String} base64 - 音频流base64字符串
 * @returns {Float32Array} 返回一个数组。
 */
export function convertPCMBase64ToFloat32Array(base64) {
  // Decode Base64 to ArrayBuffer
  const arrayBuffer = base64ToArrayBuffer(base64)

  // Create DataView for reading PCM data
  const dataView = new DataView(arrayBuffer)

  // Calculate the number of samples
  const numSamples = dataView.byteLength / 2 // 16-bit PCM

  // Create Float32Array to hold the output
  const float32Array = new Float32Array(numSamples)

  // Iterate through the PCM data and convert to float
  for (let i = 0; i < numSamples; i++) {
    const int16Sample = dataView.getInt16(i * 2, true) // little-endian
    float32Array[i] = int16Sample / 32768 // Normalize to [-1, 1]
  }

  return float32Array
}

/**
 * 将PCMBase64字符串数组转换为一个url可播放对象
 * @param {Array} data - 音频流PCMbase64字符串数组
 * @param {Number} sampleRate - 采样率
 * @returns {string} 返回一个url字符串。
 */
export function convertPCMBase64ToUrl(data, sampleRate) {
  let result = null
  if (Array.isArray(data) && data.length > 0) {
    const audioBuffers = []
    data.forEach(e => {
      if (e) audioBuffers.push(convertPCMBase64ToFloat32Array(e))
    })
    const allF32Array = mergeFloat32Arrays(audioBuffers)
    const wav = createWavFile(allF32Array, sampleRate)
    result = URL.createObjectURL(wav)
  }
  return result
}

/**
 * 将音频二进制数据流，按照指定时长切割成多个base64字符串数组
 * @param {Array} arrayBuffer - 音频流二进制数据流
 * @param {Number} sliceDuration - 切割时长
 * @param {Number} sampleRate - 采样率
 * @param {Number} bitDepth - 位深度
 * @param {Number} channels - 通道数
 * @returns {Array} 返回一个base64字符串数组。
 */
export async function slicePcmBuffer(
  arrayBuffer,
  sliceDuration = 0.09,
  sampleRate = 16000,
  bitDepth = 16,
  channels = 1
) {
  const bytesPerSample = bitDepth / 8
  const samplesPerSlice = Math.floor(sliceDuration * sampleRate)
  const bytesPerSlice = samplesPerSlice * bytesPerSample * channels

  const base64Arr = []
  for (let start = 0; start < arrayBuffer.byteLength; start += bytesPerSlice) {
    const end = Math.min(start + bytesPerSlice, arrayBuffer.byteLength)
    const slicedArrayBuffer = arrayBuffer.slice(start, end)
    const pcmBlob = new Blob([slicedArrayBuffer], { type: 'audio/pcm' })
    const blobBase64 = await blobToBase64(pcmBlob)
    base64Arr.push(blobBase64)
  }
  return base64Arr
}

/**
 * 将音频流，按照指定时长切割成多个base64字符串数组
 * @param {Object} audioContext - 音频上下文
 * @param {Array} audioBuffer - 音频样本数据
 * @param {Number} sliceDuration - 切割时长
 * @returns {Array} 返回一个base64字符串数组。
 */
export async function sliceAudioBuffer(audioContext, audioBuffer, sliceDuration = 0.09) {
  const sampleRate = audioBuffer.sampleRate
  const sliceLength = Math.floor(sliceDuration * sampleRate)
  const numberOfChannels = audioBuffer.numberOfChannels
  const totalLength = audioBuffer.length

  const base64Arr = []
  for (let start = 0; start < totalLength; start += sliceLength) {
    const end = Math.min(start + sliceLength, totalLength)
    const slicedAudioBuffer = await createSlicedAudioBuffer(audioContext, audioBuffer, start, end)
    const wavBlob = await audioBufferToBlob(slicedAudioBuffer)
    const blobBase64 = await blobToBase64(wavBlob)
    base64Arr.push(blobBase64)
  }
  return base64Arr
}

/**
 * audioBuffer转blob
 * @param {Array} audioBuffer - 音频流PCMbase64字符串数组
 * @param {String} type - 音频类型
 * @returns {Blob} 返回一个blob对象
 */
export function audioBufferToBlob(audioBuffer, type = 'audio/wav') {
  const numberOfChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const length = audioBuffer.length

  const wavHeader = generateFileHeader(numberOfChannels, sampleRate, length)
  const channelData = []
  for (let i = 0; i < numberOfChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i))
  }

  const interleavedData = interleave(channelData)
  const rawData = new Uint8Array(wavHeader.length + interleavedData.length * 2)
  rawData.set(wavHeader)
  for (let i = 0; i < interleavedData.length; i++) {
    const offset = wavHeader.length + i * 2
    const sample = Math.max(-1, Math.min(1, interleavedData[i]))
    rawData[offset] = sample * 0x7fff
    rawData[offset + 1] = (sample * 0x7fff) >> 8
  }

  return new Blob([rawData], { type })
}

function createSlicedAudioBuffer(audioContext, audioBuffer, start, end) {
  const numberOfChannels = audioBuffer.numberOfChannels
  const length = end - start
  const slicedAudioBuffer = audioContext.createBuffer(
    numberOfChannels,
    length,
    audioBuffer.sampleRate
  )

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel)
    const slicedChannelData = channelData.slice(start, end)
    slicedAudioBuffer.copyToChannel(slicedChannelData, channel)
  }
  return slicedAudioBuffer
}

export function generateFileHeader(numChannels, sampleRate, length) {
  const buffer = new ArrayBuffer(44)
  const view = new DataView(buffer)

  // 写入 RIFF 头
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + length * numChannels * 2, true)
  writeString(view, 8, 'WAVE')

  // 写入 fmt 块
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)

  // 写入 data 块
  writeString(view, 36, 'data')
  view.setUint32(40, length * numChannels * 2, true)

  return new Uint8Array(buffer)
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

function interleave(channelData) {
  const numChannels = channelData.length
  const length = channelData[0].length
  const result = new Float32Array(length * numChannels)

  for (let i = 0; i < length; i++) {
    for (let j = 0; j < numChannels; j++) {
      result[i * numChannels + j] = channelData[j][i]
    }
  }

  return result
}
