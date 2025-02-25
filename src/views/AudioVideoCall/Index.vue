<template>
  <div class="experience">
    <div class="experience__header flex flex-between">
      <h3>互动体验</h3>
    </div>
    <div class="experience__content flex flex-x-between">
      <div class="experience__content__left">
        <!--对话消息框-->
        <MessageBox
          ref="refMessageBox"
          :class="{ 'show-tool-bar': isShowToolBar }"
          :messageList="messageList"
          :isConnecting="isConnecting"
          :isShowWelcome="!isShowToolBar"
          @onClickMedia="clickMedia"
        />
        <!--底部多媒体工具条-->
        <ToolBar
          v-show="isShowToolBar"
          ref="refToolBar"
          :isConnected="isConnected"
          :vadType="vadType"
          :enableVideo="enableVideo"
          @onPermissionError="audioPermisError"
          @onOpenVideoOrScreen="openVideoOrScreen"
          @onCloseVideoOrScreen="enableVideo = false"
          @onDisconnect="closeWS"
          @onClearAndConnect="clearAndConnect"
          @onAudioData="audioData"
          @onListenAudioData="listenAudioData"
          @onVadStatus="vadStatus"
          @onOpenAudio="enableAudio = true"
          @onCloseAudio="enableAudio = false"
        />
      </div>
      <!--右侧参数配置面板-->
      <OperatorPanel
        :panelParams="panelParams"
        :isConnected="isConnected"
        :enableVideo="enableVideo"
        :videoType="videoType"
        @onOpenVideoSuccess="openVideoOrScreenSuccess"
        @onOpenVideoError="openVideoError"
        @onOpenScreenSuccess="openVideoOrScreenSuccess"
        @onOpenScreenError="openScreenError"
        @onVideoImage="videoImage"
        @onVideoData="vedioData"
        @onVideoTrackEnded="videoTrackEnded"
        @onResponseTypeChange="responseTypeChange"
        @onApiKeyChange="(value) => (apiKey = value)"
      />
    </div>
  </div>
</template>

<script>
import MessageBox from "./MessageBox.vue";
import ToolBar from "./ToolBar.vue";
import OperatorPanel from "./OperatorPanel.vue";
import {
  MEDIA_TYPE,
  MSG_TYPE,
  SOCKET_STATUS,
  VAD_TYPE,
  CALL_MODE_TYPE,
  RESPONSE_TYPE,
} from "@/constants/modules/audioVideoCall";
import {
  blobToBase64, // blob转base64
} from "@/utils/stream";
import {
  ANSWER_STATUS, // 回答结果状态
} from "@/constants/modules/audioVideoCall";
import emitter from "@/utils/event";

export default {
  name: "AudioVideoCall",
  data() {
    return {
      apiKey: "", // api key
      clearSseTimer: null,
      resetSseTimer: null,
      videoType: MEDIA_TYPE.VIDEO, // 视频类型，VIDEO:视频，SCREEN:屏幕共享
      isFirstOpenMedia: true, // 是否第一次打开媒体
      isShowToolBar: false, // 是否显示工具栏
      enableAudio: false, // 是否开启音频
      enableVideo: false, // 是否开启视频
      messageList: [], // 消息列表
      isConnecting: false, // 是否正在连接
      isConnected: false, // 是否已连接
      // 右侧参数面板参数对象
      panelParams: {
        turn_detection: {
          type: VAD_TYPE.CLIENT_VAD, // 服务端VAD: server_vad，客户端VAD: client_vad
        },
        instructions: "", // system prompt
        beta_fields: {
          chat_mode: "audio", // 通话模式，三个枚举值：音频模式 audio，主动说话 video_proactive、非主动说话 video_passive
          tts_source: "e2e", // TTS源，三个枚举值zhipu、huoshan、e2e
          auto_search: false, // 是否打开内置的自动搜索(为 true,会在服务端内置搜索工具,无需上游传入) ,  仅在 audio 模式下生效
        },
        output_audio_format: "mp3", // 音频输出格式，支持mp3、pcm
        input_audio_format: "wav", // 音频输入格式，支持wav；
        tools: [],
      },
      vadType: VAD_TYPE.CLIENT_VAD, // VAD类型，server_vad:服务端VAD，client_vad:客户端VAD
      responseType: "", // 返回类型，text:文本，audio:音频
      currentAudioBlob: null, // 当前音频blob
      currentVideoBlob: null, // 当前视频blob
      responseId: "", // 服务端返回消息的id
      requestId: "", // 客户端请求消息的id
      resFinished: true, // 服务端是否返回完成
      sendAudioLimit: 10000, // 发送音频大小限制
    };
  },
  watch: {
    // vad模式
    "panelParams.turn_detection.type": {
      handler(newVal) {
        this.vadType = newVal;
      },
      immediate: true,
    },
    // 通话模式
    "panelParams.beta_fields.chat_mode": {
      handler() {
        if (this.isConnected) {
          this.sessionUpdate(); // 切换通话模式，更新session
        }
      },
    },
    // 启用视频
    enableVideo(newVal) {
      this.panelParams.beta_fields.chat_mode = newVal
        ? CALL_MODE_TYPE.VIDEO_PASSIVE // 非主动说话视频通话模式
        : CALL_MODE_TYPE.AUDIO; // 语音通话模式
    },
  },
  methods: {
    // 服务响应返回输出方式
    responseTypeChange(value) {
      this.responseType = value;
    },
    /** ********************************************** WebSocket通信 ******************************************/
    clickMedia(mediaType) {
      const chatMode =
        mediaType === MEDIA_TYPE.AUDIO
          ? CALL_MODE_TYPE.AUDIO
          : CALL_MODE_TYPE.VIDEO_PASSIVE;
      this.panelParams.beta_fields.chat_mode = chatMode;
      this.openWS(mediaType);
    },
    // 初始化websocket连接
    openWS(mediaType = MEDIA_TYPE.AUDIO) {
      // 创建 SockJS 连接
      if (!this.apiKey) {
        this.$message.warning("请输入APIKEY！");
        return;
      }
      if (this.sock && this.sock.readyState !== WebSocket.CLOSED) {
        console.log("WebSocket 连接已经打开");
        return;
      }
      this.isConnecting = true;
      this.isConnected = false;

      const url = `wss://open.bigmodel.cn/api/paas/v4/realtime?Authorization=${this.apiKey}`;
      // 创建 WebSocket 连接
      this.sock = new WebSocket(url);

      // 监听连接打开事件
      this.sock.onopen = () => {
        this.isConnecting = false;
        this.isConnected = true;
        this.isShowToolBar = true; // 显示工具栏
        console.log("%c Connection opened", "color: #ff59ff");
      };
      // 监听收到消息事件
      this.sock.onmessage = (e) => {
        // console.log('%c 收到消息：', 'color: #ff59ff', e.data)
        this.handleWsResponse(e.data, mediaType); // 处理返回消息
      };
      // 监听连接关闭事件
      this.sock.onclose = () => {
        this.isConnected = false;
        this.currentAudioBlob = null;
        this.currentVideoBlob = null;
        console.log("%c Connection closed", "color: #ff59ff");
      };
      // 监听连接错误事件
      this.sock.onerror = (e) => {
        this.isConnecting = false;
        this.isConnected = false;
        this.$message.error("连接出错！");
        console.log("%c Connection onerror", "color: #ff59ff");
      };
    },
    // 断开websocket连接
    closeWS() {
      // 关闭连接
      if (this.sock && this.sock.readyState === WebSocket.OPEN) {
        this.sock.close();
        this.sock = null;
      }
    },
    handleWsResponse(res, mediaType) {
      try {
        const data = JSON.parse(res);
        switch (data.type) {
          case SOCKET_STATUS.SESSION_CREATED: // 创建会话完成
            this.sessionUpdate(); // 设置会话信息
            // console.log('%c 响应事件-创建会话完成', 'color: green')
            break;
          case SOCKET_STATUS.SESSION_UPDATED: // 会话信息已设置
            if (!this.isFirstOpenMedia) return;
            this.firstOpenMedia(mediaType); // 打开媒体
            this.isFirstOpenMedia = false;
            // console.log('%c 响应事件-会话信息已设置', 'color: green')
            break;
          case SOCKET_STATUS.SPEECH_STARTED: // 说话开始
            if (this.vadType === VAD_TYPE.SERVER_VAD) {
              this.$refs.refToolBar.handleVadStatus(true);
            }
            console.log("%c 响应事件-说话开始", "color: green");
            break;
          case SOCKET_STATUS.SPEECH_STOPPED: // 说话结束
            if (this.vadType === VAD_TYPE.SERVER_VAD) {
              this.$refs.refToolBar.handleVadStatus(false);
            }
            console.log("%c 响应事件-说话结束", "color: green");
            break;
          case SOCKET_STATUS.COMMITED: // 服务端收到提交的音频数据
            this.requestId = data.item_id;
            this.addAudioVideoToList(
              this.requestId,
              this.currentAudioBlob,
              MSG_TYPE.CLIENT
            ); // 将音频数据追加到列表
            if (this.vadType === VAD_TYPE.CLIENT_VAD) {
              this.sendResponseCreate(); // 创建模型回复
            }
            console.log("%c 响应事件-服务端收到提交的音频数据", "color: green");
            break;
          case SOCKET_STATUS.RESPONSE_CREATED: // 回复已创建（开始调用模型）
            this.responseId = data.response.id;
            this.loopScrollToBotton(); // 开始启动滚动到底部
            console.log("%c 响应事件-回复已创建（开始调用模型）", "color: green");
            break;
          case SOCKET_STATUS.ASR_COMPLETED: // 用户输入音频的asr文本（异步返回）
            this.addAudioTextToList(this.requestId, data.transcript, MSG_TYPE.CLIENT); // 将音频文本追加到列表
            console.log(
              "%c 响应事件-用户输入音频的asr文本（异步返回）：" + data.transcript,
              "color: green"
            );
            break;
          case SOCKET_STATUS.RESPONSE_AUDIO_TXT: // 返回模型音频对应文本
            this.addAudioTextToList(this.responseId, data.delta, MSG_TYPE.SERVER); // 将音频文本追加到列表
            // console.log('%c 响应事件-返回模型音频对应文本', 'color: green')
            break;
          case SOCKET_STATUS.RESPONSE_AUDIO_TXT_DONE: // 模型文本返回结束
            // console.log('%c 响应事件-模型文本返回结束', 'color: green')
            break;
          case SOCKET_STATUS.RESPONSE_AUDIO: // 返回模型音频（delta 是一个 mp3 格式base64 编码的音频块）
            this.addAudioVideoToList(this.responseId, data.delta, MSG_TYPE.SERVER); // 将音频数据追加到列表
            this.resFinished = false;
            console.log(
              "%c 响应事件-返回模型音频（delta 是一个 mp3 格式base64 编码的音频块）",
              "color: green"
            );
            break;
          case SOCKET_STATUS.RESPONSE_AUDIO_DONE: // 结束回复（status字段表示response的状态completed, cancelled分别对应完成、取消）
            this.updateResponsStatus(this.responseId, ANSWER_STATUS.COMPLETE);
            this.resFinished = true;
            console.log(
              "%c 响应事件-结束回复（status字段表示response的状态completed, cancelled分别对应完成、取消）",
              "color: green"
            );
            break;
          case SOCKET_STATUS.ERROR: // 发生错误
            this.updateResponsStatus(this.responseId, ANSWER_STATUS.FAIL);
            if (data.error) {
              if (data.error.code === "1220") {
                // 无权限提示
                this.$message.error(data.error?.message);
              }
            }
            console.log("%c 响应事件-发生错误" + res, "color: red");
            break;
          default:
            break;
        }
      } catch (e) {
        console.log("---handleWsResponse-error---:", e);
      }
    },
    /** ********************************************** 对话数据处理 ******************************************/
    vadStatus(isSpeaking) {
      // 每次开始说话，都检查是否有正在回复的，如果有则取消回复
      if (isSpeaking) {
        if (!this.resFinished && this.vadType === VAD_TYPE.CLIENT_VAD) {
          this.sendResponseCancel(); // 如果当前有正在回复的，则取消回复
        }
        emitter.emit("onStopAudio"); // 停止音频
      }
    },
    // 实时监听音频数据并推送到服务器
    async listenAudioData(blob) {
      if (blob && blob.size > 0) {
        const audioBase64 = await blobToBase64(blob);
        // 推送音频数据到服务端
        this.pushAudioData(audioBase64);
        // console.log('---向服务器推送了--audioBlob---:', URL.createObjectURL(blob))
      }
    },
    // 收集一段音频数据
    async audioData(blob) {
      if (blob && blob.size > this.sendAudioLimit) {
        this.currentAudioBlob = blob;
        this.resFinished = false;
        emitter.emit("onStopAudio"); // 停止音频
        if (this.vadType === VAD_TYPE.CLIENT_VAD) {
          this.sendCommit(); // 客户端vad模式，需要手动发送commit
        }
      }
    },
    // 收集一段视频数据
    vedioData(blob) {
      if (blob && blob.size > 0) {
        this.currentVideoBlob = new Blob([blob], { type: "video/mp4" });
      }
    },
    // 实时视频抽帧图片并推送到服务器
    async videoImage(blob) {
      if (blob && blob.size > 0) {
        const videoBase64 = await blobToBase64(blob);
        // 推送视频数据到服务端
        this.pushVideoData(videoBase64);
        // console.log('---向服务器推送了--videoImage---:', URL.createObjectURL(blob))
      }
    },
    // 添加音频或视频数据到对话框
    addAudioVideoToList(id, data, type) {
      if (type === MSG_TYPE.SERVER) {
        if (this.responseType === RESPONSE_TYPE.TEXT) return;
        const resIndex = this.messageList.findIndex((item) => item.id === id);
        if (resIndex !== -1) {
          const target = this.messageList[resIndex];
          target.audioData.push({ data });
          this.messageList.splice(resIndex, 1, { ...target });
        } else {
          this.messageList.push({
            id,
            type,
            responseType: this.responseType,
            answerStatus: ANSWER_STATUS.OUTPUT,
            audioData: [{ data }],
            textContent: [],
          });
          this.scrollToBottom();
        }
        // console.log('---添加服务返回的音频到对话框--addAudioVideoToList---')
      } else {
        if (data && data.size > this.sendAudioLimit) {
          this.messageList.push({
            id,
            type,
            videoUrlContent: this.currentVideoBlob
              ? URL.createObjectURL(this.currentVideoBlob)
              : null,
            audioUrl: URL.createObjectURL(data),
            textContent: [],
          });
          this.currentVideoBlob = null;
          this.scrollToBottom();
          console.log("---添加用户发送的音频到对话框--data?.size---:", data?.size);
        }
      }
    },
    // 添加语音的文本到对话框
    addAudioTextToList(id, data, type) {
      if (!data) return;
      const index = this.messageList.findIndex((item) => item.id === id);
      if (index !== -1) {
        const target = this.messageList[index];
        target.textContent.push(data);
        this.messageList.splice(index, 1, { ...target });
      } else {
        if (type === MSG_TYPE.SERVER) {
          this.messageList.push({
            id,
            type,
            responseType: this.responseType,
            answerStatus: ANSWER_STATUS.OUTPUT,
            audioData: [],
            textContent: [data],
          });
        } else {
          this.messageList.push({
            id,
            type,
            audioUrl: "",
            textContent: [data],
          });
        }
        this.scrollToBottom();
      }
    },
    // 更新响应状态
    updateResponsStatus(id, data) {
      const resIndex = this.messageList.findIndex((item) => item.id === id);
      if (resIndex !== -1) {
        const target = this.messageList[resIndex];
        target.answerStatus = data;
        this.messageList.splice(resIndex, 1, { ...target });
      }
    },
    /** ********************************************** 事件推送 ******************************************/
    // 推送提交事件
    sendCommit() {
      const params = {
        type: SOCKET_STATUS.COMMIT,
        client_timestamp: Date.now(),
      };
      // 发送消息
      this.sendMessage(params);
      console.log("%c 推送事件-提交音频，标明说完话了。", "color: green");
    },
    // 推送创建模型回复事件
    sendResponseCreate() {
      const params = {
        type: SOCKET_STATUS.RESPONSE_CREATE,
        client_timestamp: Date.now(),
      };
      // 发送消息
      this.sendMessage(params);
      console.log("%c 推送事件-创建模型回复", "color: green");
    },
    // 推送取消模型调用事件
    sendResponseCancel() {
      const params = {
        type: SOCKET_STATUS.RESPONSE_CANCEL,
        client_timestamp: Date.now(),
      };
      // 发送消息
      this.sendMessage(params);
      console.log("%c 推送事件-取消模型调用", "color: green");
    },
    // 设置会话信息
    sessionUpdate() {
      const params = {
        event_id: "evt_fakeId",
        type: SOCKET_STATUS.SESSION_UPDATE,
        session: this.panelParams,
      };
      // 发送消息
      this.sendMessage(params);
      console.log("%c 推送事件-设置会话信息" + JSON.stringify(params), "color: green");
    },
    // 推送音频数据
    pushAudioData(value) {
      const params = {
        type: SOCKET_STATUS.AUDIO_APPEND,
        client_timestamp: Date.now(),
        audio: value,
      };
      // 发送消息
      this.sendMessage(params);
    },
    // 推送视频数据
    pushVideoData(value) {
      const params = {
        type: SOCKET_STATUS.VIDEO_APPEND,
        client_timestamp: Date.now(),
        video_frame: value,
      };
      // 发送消息
      this.sendMessage(params);
    },
    // 发送消息
    sendMessage(params) {
      if (this.sock && this.isConnected) {
        this.sock.send(JSON.stringify(params));
      }
    },
    /** ********************************************** 媒体交互 ******************************************/
    // 首次打开对应的媒体
    firstOpenMedia(mediaType) {
      if (mediaType === MEDIA_TYPE.AUDIO) {
        this.$refs.refToolBar.handleAudio();
      } else {
        this.openVideoOrScreen(mediaType);
      }
    },
    // 工具条发起，打开视频或打开屏幕共享
    openVideoOrScreen(videoType) {
      this.videoType = videoType; // 设置视频类型
      this.enableVideo = true; // 开启视频
    },
    // 工具条发起，清空消息并重新连接
    clearAndConnect() {
      this.isFirstOpenMedia = true; // 重置首次打开媒体
      this.clearObjectURL(); // 清空残留对象url
      this.messageList = []; // 清空消息
      this.openWS(); // 从快捷键打开，初始化websocket连接
    },
    // 视频组件发起，打开视频或屏幕共享成功
    openVideoOrScreenSuccess() {
      this.$refs.refToolBar.openVideoOrScreenSuccess(); // 触发工具栏相应行为
    },
    // 视频组件发起，关闭视频或屏幕共享
    videoTrackEnded() {
      this.$refs.refToolBar.closeVideoOrScreen(); // 触发工具栏相应行为
    },
    // 音频权限错误
    audioPermisError() {
      this.$message.error("请检查音频权限是否已打开！");
      this.$refs.refToolBar.closeVideoOrScreen(); // 关闭视频
      this.enableAudio = false; // 关闭音频
      this.closeWS(); // 关闭websocket连接
    },
    // 视频权限错误
    openVideoError() {
      this.$message.error("请检查视频权限是否已打开！");
      this.handlePermisError();
    },
    // 屏幕共享权限错误
    openScreenError() {
      this.handlePermisError();
    },
    // 处理权限错误
    handlePermisError() {
      this.$refs.refToolBar.closeVideoOrScreen(); // 关闭视频
      if (!this.enableAudio) {
        this.closeWS(); // 关闭websocket连接
      }
    },
    // 清空残留对象url
    clearObjectURL() {
      if (Array.isArray(this.messageList)) {
        this.messageList.forEach((item) => {
          if (item.audioUrl) {
            URL.revokeObjectURL(item.audioUrl);
          }
          if (item.videoUrlContent) {
            URL.revokeObjectURL(item.videoUrlContent);
          }
        });
      }
    },
    // 循环滚动到底部
    loopScrollToBotton() {
      this.$refs.refMessageBox.loopScrollToBotton();
    },
    // 滚动到底部
    scrollToBottom() {
      this.$refs.refMessageBox.scrollToBottom();
    },
  },
  beforeDestroy() {
    this.clearObjectURL(); // 清空残留对象url
    this.closeWS(); // 关闭websocket连接
  },
  components: {
    MessageBox,
    ToolBar,
    OperatorPanel,
  },
};
</script>

<style scoped lang="less">
.experience {
  background-color: #fff;
  height: 100%;
  &__header {
    height: 59px;
    border-bottom: 1px solid rgba(224, 224, 224, 0.6);
    padding: 0 24px;
    font-size: 14px;
    h3 {
      color: #131212;
      font-size: 20px;
      font-weight: 500;
      margin-right: 12px;
    }
    .usage-guide {
      color: #5e5e66;
      i {
        margin-right: 8px;
      }
    }
  }
  &__content {
    height: calc(100% - 60px);
    &__left {
      flex: 1;
      box-sizing: border-box;
    }
    .show-tool-bar {
      height: calc(100% - 100px);
    }
    .tool-bar {
      margin: 24px;
    }
  }
}
</style>
