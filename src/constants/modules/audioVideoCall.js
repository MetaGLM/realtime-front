export const MEDIA_TYPE = {
  AUDIO: 'audio', // 语音类型，默认语音通话
  VIDEO: 'video', // 视频类型
  SCREEN: 'screen' // 屏幕共享
}

export const MODEL_TIMBRE = {
  XIAOCHEN: 'xiaochen', // 小陈
  TONGTONG: 'tongtong', // 彤彤
  TIANMEINVXING: 'female-tianmei',
  QINGNIANDAXUESHENG: 'male-qn-daxuesheng',
  JINGYIGNQINGNIAN: 'male-qn-jingying',
  MENGMENGNVTONG: 'lovely_girl',
  SHAONV: 'female-shaonv'
}

export const RESPONSE_TYPE = {
  AUDIO: 'audio', // 语音回复
  TEXT: 'text' // 文本回复
}

export const MSG_TYPE = {
  CLIENT: 'client', // 客户端
  SERVER: 'server' // 服务端
}

export const VAD_TYPE = {
  CLIENT_VAD: 'client_vad', // 客户端vad
  SERVER_VAD: 'server_vad' // 服务端vad
}

export const CALL_MODE_TYPE = {
  AUDIO: 'audio', // 音频模式
  VIDEO_PROACTIVE: 'video_proactive', // 主动说话模式
  VIDEO_PASSIVE: 'video_passive' // 非主动说话模式
}

// 回答结果状态
export const ANSWER_STATUS = {
  WAITTING: 'waitting', // 等待中
  OUTPUT: 'output', // 输出
  STOP: 'stop', // 停止
  CONTINUE: 'continue', // 继续
  COMPLETE: 'complete', // 完成
  SENSITIVE: 'sensitive', // 遇敏感词
  FAIL: 'fail' // 失败
}

// 输出音频格式
export const OUTPUT_TYPE = {
  MP3: 'mp3', // mp3格式
  PCM: 'pcm' // pcm格式
}

// 工具类型
export const TOOLS_TYPE = {
  WEB_SEARCH: 'web_search', // 网页检索
  FUNCTION_CALL: 'function' // 函数调用
}

export const SOCKET_STATUS = {
  SESSION_CREATED: 'session.created', // 创建会话完成
  SESSION_UPDATE: 'session.update', // 设置会话信息 ----- 推
  SESSION_UPDATED: 'session.updated', // 会话信息已设置
  AUDIO_APPEND: 'input_audio_buffer.append', // 追加音频数据 ----- 推
  VIDEO_APPEND: 'input_audio_buffer.append_video_frame', // 追加视频数据 ----- 推
  SPEECH_STARTED: 'input_audio_buffer.speech_started', // 开始说话
  SPEECH_STOPPED: 'input_audio_buffer.speech_stopped', // 结束说话
  COMMIT: 'input_audio_buffer.commit', // 提交音频，告诉服务端说完话了 -----（client_vad专属） ----- 推
  COMMITED: 'input_audio_buffer.committed', // 服务端收到提交的音频数据
  RESPONSE_CREATE: 'response.create', // 创建模型回复，视频通话时，以这个时间点的视频帧 + 音频给模型 -----（client_vad专属）----- 推
  RESPONSE_CANCEL: 'response.cancel', // 取消模型调用 -----（client_vad专属）----- 推
  RESPONSE_CREATED: 'response.created', // 回复已创建（开始调用模型）
  ASR_COMPLETED: 'conversation.item.input_audio_transcription.completed', // 用户输入音频的 asr 文本（异步返回）
  RESPONSE_AUDIO_TXT: 'response.audio_transcript.delta', // 返回模型音频对应文本
  RESPONSE_AUDIO_TXT_DONE: 'response.text.done', // 模型文本返回结束
  RESPONSE_AUDIO: 'response.audio.delta', // 返回模型音频（delta 是一个 mp3 格式base64 编码的音频块）
  RESPONSE_AUDIO_DONE: 'response.done', // 结束回复（status字段表示response的状态completed, cancelled分别对应完成、取消）
  ERROR: 'error' // 发生错误
}
