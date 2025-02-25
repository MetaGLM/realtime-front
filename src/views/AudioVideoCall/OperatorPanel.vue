<template>
  <div class="operator-panel tl">
    <el-form
      :model="panelParams"
      ref="ruleForm"
      label-width="200px"
      class="operator-panel__ruleForm"
    >
      <el-form-item>
        <template #label>
          <div class="flex flex-x-start flex-y-center">
            <h4>APIKEY</h4>
            <el-tooltip
              effect="light"
              :visible-arrow="false"
              popper-class="popper-class-text-tip"
              placement="right"
            >
              <!-- 使用具名插槽传递内容 -->
              <template #content>
                用于调用模型的APIKEY，请前往
                <a
                  href="https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys"
                  target="_blank"
                  >开放平台</a
                >
                申请
              </template>
              <i class="iconfont icon-info1 pointer"></i>
            </el-tooltip>
          </div>
        </template>
        <el-input v-model="apiKey" placeholder="请输入APIKEY" :disabled="isConnected" />
      </el-form-item>
      <el-form-item label="模型" prop="media_type">
        <el-select v-model="modelId" placeholder="请选择" :disabled="isConnected">
          <el-option
            v-for="item in modelList"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item prop="video_chunck">
        <template #label>
          <div class="flex flex-x-start flex-y-center">
            <h4>视频画面</h4>
            <el-tooltip
              effect="light"
              :visible-arrow="false"
              popper-class="popper-class-text-tip"
              placement="right"
            >
              <!-- 使用具名插槽传递内容 -->
              <template #content>
                当前实时的视频画面，发送音频时会将视频的片段通过图片帧发送给模型进行推理
              </template>
              <i class="iconfont icon-info1 pointer"></i>
            </el-tooltip>
          </div>
        </template>
        <VideoBox v-bind="$attrs" :extractFrameRate="500" />
      </el-form-item>
      <el-form-item prop="instructions">
        <SystemPrompt
          :instructions="panelParams.instructions"
          :disabled="isConnected"
          @onUpdateInstructions="updateInstructions"
        />
      </el-form-item>
      <el-form-item prop="beta_fields.chat_mode">
        <template #label>
          <div class="flex flex-x-start flex-y-center">
            <h4>输入类型</h4>
            <el-tooltip
              effect="light"
              :visible-arrow="false"
              popper-class="popper-class-text-tip"
              placement="right"
            >
              <!-- 使用具名插槽传递内容 -->
              <template #content>
                <div
                  v-html="
                    '自动发送：未检测到语音输入或关闭麦克风时发送音频<br />智能判断：模型自动进行说话检测、打断判断，自动发送音视频内容'
                  "
                ></div>
              </template>
              <i class="iconfont icon-info1 pointer"></i>
            </el-tooltip>
          </div>
        </template>
        <el-radio-group
          class="base-radio-group"
          v-model="panelParams.turn_detection.type"
          :disabled="isConnected"
        >
          <el-radio value="client_vad">自动发送</el-radio>
          <el-radio value="server_vad">智能判断</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item prop="responseType">
        <template #label>
          <div class="flex flex-x-start flex-y-center">
            <h4>输出格式</h4>
            <el-tooltip
              effect="light"
              :visible-arrow="false"
              popper-class="popper-class-text-tip"
              placement="right"
            >
              <!-- 使用具名插槽传递内容 -->
              <template #content>
                <div
                  v-html="
                    '音频：会输出音频和音频对应的文本结果<br />文本：仅输出音频对应的文本结果'
                  "
                ></div>
              </template>
              <i class="iconfont icon-info1 pointer"></i>
            </el-tooltip>
          </div>
        </template>
        <el-radio-group
          class="base-radio-group"
          v-model="responseType"
          :disabled="isConnected"
        >
          <el-radio :value="RESPONSE_TYPE.AUDIO">音频</el-radio>
          <el-radio :value="RESPONSE_TYPE.TEXT">文本</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="模型工具" prop="tools">
        <ModelTools
          :showTools="showTools"
          :disableOperate="isConnected"
          @onChooseTool="onChooseTool"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import SystemPrompt from "@/components/SystemPrompt.vue";
import VideoBox from "@/components/VideoBox";
import ModelTools from "@/components/ModelParams/ModelTools.vue";
import { TOOLS_TYPE } from "@/constants/modules/audioVideoCall";
import { RESPONSE_TYPE } from "@/constants/modules/audioVideoCall";

export default {
  name: "OperatorPanel",
  inheritAttrs: false,
  props: {
    // 右侧面板参数集合对象
    panelParams: {
      type: Object,
      default: () => {},
    },
    // 是否已连接
    isConnected: {
      type: Boolean,
      default: false,
    },
  },
  components: {
    SystemPrompt,
    VideoBox,
    ModelTools,
  },
  watch: {
    // 服务响应返回输出方式
    responseType: {
      handler(val) {
        this.$emit("onResponseTypeChange", val);
      },
      immediate: true,
    },
    apiKey: {
      handler(val) {
        this.$emit("onApiKeyChange", val);
      },
      immediate: true,
    },
  },
  data() {
    return {
      apiKey: "", // api key
      RESPONSE_TYPE, // 响应类型
      showTools: [TOOLS_TYPE.WEB_SEARCH],
      modelId: "glm_realtime", // 模型id
      modelList: [
        // 模型列表
        {
          label: "GLM-Realtime",
          value: "glm_realtime",
        },
      ],
      responseType: RESPONSE_TYPE.AUDIO, // 字段未定义，自定义字段，目前后端没用到输出格式是音频还是文本，会同时返回音频和文本，需要前端根据此字段是否滤掉文本
    };
  },
  methods: {
    // 更新系统提示
    updateInstructions(val) {
      this.panelParams.instructions = val;
    },
    // 更新模型工具
    onChooseTool(val) {
      this.panelParams.tools = [];
      this.panelParams.beta_fields.auto_search = false;
      if (val === TOOLS_TYPE.WEB_SEARCH) {
        this.panelParams.beta_fields.auto_search = true;
      }
      console.log("--ModelTrialCenter--currentTool--", val);
    },
  },
};
</script>

<style scoped lang="less">
.operator-panel {
  width: 362px;
  height: 100%;
  overflow-y: auto;
  border-left: 1px solid rgba(224, 224, 224, 0.6);
  padding: 24px;
  box-sizing: border-box;
  :deep(h4),
  :deep(.el-form-item__label) {
    color: #131212;
    font-size: 14px;
    font-weight: 600;
    height: 24px;
    line-height: 24px;
  }
  :deep(.el-form-item__label) {
    margin-bottom: 10px;
    i {
      font-weight: 400;
    }
  }
  &__ruleForm {
    .el-form-item {
      display: grid;
      margin-bottom: 24px;
      .icon-info1 {
        display: block;
        width: 20px;
        height: 20px;
        text-align: center;
        line-height: 20px;
        border-radius: 4px;
        color: #757575;
        font-size: 16px;
        margin-left: 6px;
        &:hover {
          background-color: rgba(19, 18, 18, 0.05);
        }
      }
      :deep(.el-form-item__label) {
        display: flex;
        justify-content: start;
      }
      :deep(.el-form-item__content) {
        margin-left: 0 !important;
        line-height: 22px;
      }
      .el-select {
        width: 100%;
        line-height: 32px;
        display: block;
      }
      .params-option {
        margin-top: 12px;
        margin-bottom: 24px;
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
}
</style>
