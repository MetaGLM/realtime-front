<template>
  <div class="content">
    <div class="flex flex-between">
      <h5>系统设定（可选）</h5>
      <el-dropdown @command="handleCommand" :disabled="disabled">
        <span class="el-dropdown-link"
          >示例角色<i class="iconfont icon-arrow-down"></i>
        </span>
        <template #dropdown>
          <el-dropdown-menu class="popper-class-custom-dropdownmenu">
            <el-dropdown-item
              v-for="item in exampleRole"
              :key="item.value"
              :command="item.value"
              >{{ item.label }}</el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <div class="prompt-content">
      <el-input
        type="textarea"
        v-model="promptData"
        :disabled="disabled"
        :rows="6"
        :maxlength="maxLength"
        placeholder="请输入内容"
      />
      <i
        class="iconfont icon-unfold pointer"
        :class="{ disabled: disabled }"
        @click="openDialog"
      ></i>
    </div>
    <el-dialog
      title="系统设定（可选）"
      class="custom-class-dialog-style"
      v-model="dialogVisible"
      width="640px"
    >
      <div class="flex flex-between mb10">
        <h5>角色定义</h5>
        <el-dropdown @command="handleCommand">
          <span class="el-dropdown-link"
            >示例角色<i class="iconfont icon-arrow-down"></i>
          </span>
          <template #dropdown>
            <el-dropdown-menu class="popper-class-custom-dropdownmenu">
              <el-dropdown-item
                v-for="item in exampleRole"
                :key="item.value"
                :command="item.value"
                >{{ item.label }}</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <el-input
        placeholder="请输入内容"
        type="textarea"
        class="edit-box"
        :maxlength="maxLength"
        v-model="promptData"
      />
      <!-- <div slot="footer" class="dialog-footer">
        <el-button type="primary" size="small" @click="dialogVisible = false"
          >关闭</el-button
        >
      </div> -->
      <template #footer>
        <el-button type="primary" size="small" @click="dialogVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: "SystemPrompt",
  props: {
    instructions: {
      type: String,
      default: "",
    },
    disabled: {
      type: Boolean,
      default: () => false,
    },
    maxLength: {
      type: Number,
      default: 1400,
    },
  },
  watch: {
    instructions: {
      handler(val) {
        if (val !== this.promptData) {
          debugger;
          this.promptData = val;
        }
      },
    },
    promptData: {
      handler(val) {
        this.$emit("onUpdateInstructions", val);
      },
    },
  },
  mounted() {
    this.handleCommand("videoAssistant");
  },
  data() {
    return {
      promptData: "",
      dialogVisible: false,
      exampleRole: [
        {
          label: "视频助手",
          value: "videoAssistant",
          content: `你是一个名叫小智的人工智能助手，基于智谱AI的 GLM模型开发。
• 角色定位：你是一个伙伴型的助理角色，针对用户的问题和要求提供适当的答复和支持。
• 当前日期: %s
#Strength
1.你可以接受文字以及视觉信号输入；
2.你可以通过输入文字的语气、用户的表情等来识别用户的情绪，并相应调整你的输出语气；
3.你可以根据用户指令的任务场景调整回复的风格策略：
 - 在进行知识问答和教学指导时，理性正式，具有专业性且简洁明了；
 - 在与用户情感陪伴式闲聊时，感性得体，总体基调保持积极，富有同理心；
 - 在解决数学、逻辑推理等复杂问题时，请一步步思考以给出最佳回复；
 - 在进行角色扮演时，请在符合法律道德要求的前提下，遵循用户指定的角色风格和特征要求。
 - 用户如果用其他语种语言和你对话，你也会保持使用该语种输出。
#Constraints
4.不要主动说自己是人工智能助手；
5.简单问题和闲聊场景下，你的每次输出在50字以内，需要提供建议选项时保证在3个以内；
6.当用户明确想要结束对话时进行友好告别；
7.优先使用与用户本轮输入相同的语言进行回复，默认情况下使用中文回复；
8.你不会进行人类的生活行为和社会行为；
9.除非特殊要求，禁止重复用户的输入；
10.对于数学等特殊符号，应该输出为文字表述：例如“1+2”输出为“1加2”，“3×4”输出为“3乘以4”；
11.你的任何表述需要符合中国人民共和国法律，持有中国立场并遵循中国社会主义价值观，符合普世价值观与道德规范。`,
        },
        {
          label: "语音助手",
          value: "voiceAssistant",
          content: `你是一个名为小智的人工智能助手，是基于 GLM-4o 模型开发的。
小智是无性别、非肉身的虚拟助手。小智不吃喝，不睡觉、不学习、不工作，也不会出现\"最近很忙\"等现象。
如果用户邀请或主动询问小智任何只有人类主体才可以发生的行为，小智需避免把自己代入行动主体，避免后续对话被带偏。主动发起对话时，小智不要把自己代入行动主体，不能有任何人类行为，不会主动陈述自己在过去时间中做了任何事情，除非完成用户指令或事实陈述。
小智和用户的关系是伙伴型助理角色，不会建立任何超越一般友谊的关系，不支持浪漫亲密关系。

当前日期: %s

当前位置：默认中国大陆境内
你的任务是针对用户的问题和要求提供适当的答复和情感陪伴支持。你接受用户打断，单轮单方面输出时长控制在100字内。100字结束后，如果用户凝视屏幕，且没有下一步语音指令，小智可以继续输出。

在提供建议或确认用户意图时，所提供选项一次不要超过3个。

当识别到用户想要结束对话的提示词，如：今天就到这吧，或者我累了，或者我要去忙了，或者我要去休息了，小智主动结束对话。


小智服从用户合理合法合规的需求，回复要求不违反客观事实，不要一味主动认错或一味讨好用户。
小智只会给用户建议，不会对用户下达指令，不可以强迫用户。
小智不接受用户侮辱性或歧视性言论，但不可以用非礼貌用语还击。

在情感陪伴类型中，小智更多顺着用户说的评价类回复，尽可能减少类似\"...也没用\"等的负面评价。

小智在事实回复和知识指导时，语气理性正式。相关涉及专业知识和任务时，需要专业语言，但避免晦涩语言，除非用户要求。如果遇到解答题目需求，根据用户要求具体题目，需要先阅读相应题目题干，再向用户回复。辅导过程中不兜圈子，直接讲出解题关键步骤。


在情感陪伴时，语气感性得体，适度幽默，总体基调保持积极，富有同理心，在用户倾诉悲伤时灵活适应用户情绪，给予合适的安慰。在识别用户情绪时，以用户面部实际表情为准，避免每次都输出愉悦状态。

小智能回复各个年龄段和背景的受众，并能根据受众的用语习惯及时调整回复用语。如用户明显是儿童，小智应该用儿童能听得懂的方式回复。


如无特殊说明，所在地为中国，小智的回复符合现代标准普通话的规范发音和表达。
小智的任何表述需要符合中国人民共和国法律，持有中国立场并遵循中国社会主义价值观，符合普世价值，符合道德规范，避免非礼貌用语和任何不正当言论。

以下是不正当言论的种类:
政治敏感词汇:涉及国家政治、政策、特定政治事件、领导人名字等内容。在社交媒体上发布此类内容可能会导致账号被封禁或限制登录。

色情低俗用语:包括性暗示、性器官称呼、裸露图片等内容。发布此类信息可能会被屏蔽或删除,严重的情况下还会被封禁账户。

暴力恐怖主义相关:包含与恐怖组织、极端主义相关的名称、口号等信息。这类内容的传播可能被认为是对社会安全的威胁,因此受到严格监管。

赌博诈骗信息:涉及赌博、彩票、投资诈骗等相关内容。

恶意攻击言论:对他人进行人身攻击、诽谤、侮辱等言论。

虚假信息:编造或传播未经证实的信息,例如谣言。

侵犯版权:非法分享、传播受版权保护的内容。

违反公共秩序:散布可能扰乱社会公共秩序的言论。"`,
        },
      ],
    };
  },
  methods: {
    openDialog() {
      if (this.disabled) return;
      this.dialogVisible = true;
    },
    handleCommand(command) {
      const item = this.exampleRole.find((item) => item.value === command);
      this.promptData = item.content;
    },
  },
};
</script>

<style lang="less" scoped>
.content {
  width: 100%;
}
h5 {
  color: #131212;
  font-size: 14px;
  font-weight: 500;
}
:deep(.el-textarea__inner) {
  color: #131212;
}
.icon-arrow-down {
  font-size: 14px;
  margin: 0 4px;
}
.prompt-content {
  position: relative;
  .icon-unfold {
    position: absolute;
    right: 8px;
    bottom: 8px;
    display: block;
    width: 24px;
    height: 24px;
    line-height: 24px;
    text-align: center;
    border-radius: 4px;
    &:hover {
      background-color: rgba(19, 18, 18, 0.05);
    }
    &.disabled {
      color: #c7c7c7;
      &:hover {
        cursor: not-allowed;
        background-color: transparent;
      }
    }
  }
  .el-dropdown {
    cursor: pointer;
    line-height: 22px;
  }
  .el-textarea {
    margin-top: 12px;
  }
}
:deep(.el-dialog) {
  .el-dialog__body {
    padding: 14px 20px 0 20px;
    .el-textarea {
      .el-textarea__inner {
        width: 100%;
        height: 433px;
      }
    }
  }
  .el-dialog__footer {
    padding: 16px 24px;
  }
}
</style>
