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
  SESSION_UPDATE: 'session.update', // 设置会话信息 ----- 推
  RESPONSE_CREATE: 'response.create', // 创建模型回复，视频通话时，以这个时间点的视频帧 + 音频给模型 -----（client_vad专属）----- 推
  RESPONSE_CANCEL: 'response.cancel', // 取消模型调用 -----（client_vad专属）----- 推

  /** *********************音视频数据传输阶段***********************/
  AUDIO_APPEND: 'input_audio_buffer.append', // 追加音频数据 ----- 推
  VIDEO_APPEND: 'input_audio_buffer.append_video_frame', // 追加视频数据 ----- 推
  COMMIT: 'input_audio_buffer.commit', // 提交音频，告诉服务端说完话了 -----（client_vad专属） ----- 推
  INPUT_AUDIO_BUFFER_CLEAR: 'input_audio_buffer.clear', // 客户端使用 input_audio_buffer.clear 清除输入音频缓冲区  ----- 推
  CONVERSATION_ITEM_CREATE: 'conversation.item.create', // 向对话上下文中添加一个item，包含消息、函数调用响应结果，可以将此部分结果放入对话历史（session context/history）。如果传入文本为空或function.call.item为空时，会发送一个错误事件 ----- 推
  CONVERSATION_ITEM_DELETE: 'conversation.item.delete', // 删除对话上下文历史中的一轮对话，要删多轮可以发送多次事件 ----- 推
  TRANSCRIPTION_SESSION_UPDATE: 'transcription_session.update', // 当转录会话通过转录会话更新事件（transcription_session.update）进行更新时返回，除非发生错误。 ----- 推


  /** *********************响应处理阶段***********************/
  SESSION_UPDATED: 'session.updated', // 会话信息已设置
  SESSION_CREATED: 'session.created', // 创建会话完成
  CONVERSATION_CREATED: 'conversation.created', // 在创建会话后会立即返回服务器 conversation.created 事件。 每个会话创建一个对话。
  TRANSCRIPTION_SESSION_UPDATED: 'transcription_session.updated', // 当转录会话通过转录会话更新事件（transcription_session.update）进行更新时返回，除非发生错误。
  COMMITED: 'input_audio_buffer.committed', // 服务端收到提交的音频数据
  INPUT_AUDIO_BUFFER_CLEARED: 'input_audio_buffer.cleared', // 客户端使用 input_audio_buffer.clear 事件清除输入音频缓冲区时，系统会返回服务器；

  SPEECH_STARTED: 'input_audio_buffer.speech_started', // 开始说话
  SPEECH_STOPPED: 'input_audio_buffer.speech_stopped', // 结束说话

  RESPONSE_CREATED: 'response.created', // 回复已创建（开始调用模型）
  RESPONSE_CANCELLED: 'response.cancelled', // 回复已取消
  RATE_LIMITS_CREATE: 'rate_limits.updated', // 速率限制已更新
  RESPONSE_OUTPUT_ITEM_ADDED: 'response.output_item.added', // 在响应生成过程中创建新项时，系统会返回服务器 response.output_item.added 事件
  RESPONSE_OUTPUT_ITEM_DONE: 'response.output_item.done', // 当项完成流式处理时返回此事件，当响应中断、不完整或取消时，系统也会返回此事件。
  RESPONSE_CONTENT_PART_ADDED: 'response.content_part.added', // 在响应生成期间将新的内容部分添加到助手消息项时返回此事件

  CONVERSATION_ITEM_CREATED: 'conversation.item.created', // 在创建会话后会立即返回服务器 conversation.created 事件。 每个会话创建一个对话。
  CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED:
    'conversation.item.input_audio_transcription.completed', // 用户输入音频的 asr 文本（异步返回）写入音频缓冲区的语音转文本的结果。语音转文本与响应创建异步运行，该事件可能发生在响应事件之前或者之后；
  CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_FAILED:
    'conversation.item.input_audio_transcription.failed', // 用户输入音频的 asr 文本（异步返回）错误
  CONVERSATION_ITEM_DELETED: 'conversation.item.deleted', // 响应conversation.item.delete的服务端事件，通知客户端通过 conversation.item.delete 事件删除了会话中的项
  RESPONSE_FUNCTION_CALL_SIMPLE_BROWSER: 'response.function_call.simple_browser', // 此事件在response.created事件之后，在response.audio_transcript.delta之前，如搜索结果报错，会返回错误事件
  RESPONSE_AUDIO_TEXT: 'response.audio_transcript.delta', // 返回模型音频对应文本
  RESPONSE_AUDIO_TEXT_DONE: 'response.audio_transcript.done', // 返回模型音频对应文本结束
  RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE: 'response.function_call_arguments.done', // 模型生成的函数调用时，系统会返回服务器 response.function_call_arguments.done 事件
  RESPONSE_TEXT_DELTA: 'response.text.delta', // 文本响应流式返回
  RESPONSE_TEXT_DONE: 'response.text.done', // 模型文本返回结束
  RESPONSE_AUDIO: 'response.audio.delta', // 返回模型音频（delta 是一个 mp3 格式base64 编码的音频块）
  RESPONSE_AUDIO_DONE: 'response.audio.done', // 模型音频返回结束
  RESPONSE_DONE: 'response.done', // 结束回复（status字段表示response的状态completed, cancelled分别对应完成、取消）
  HEARTBEAT: 'heartbeat', // 心跳
  ERROR: 'error' // 发生错误
}
