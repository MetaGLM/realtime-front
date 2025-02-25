<template>
  <div class="params-comps">
    <Switches
      v-if="showTools.includes(TOOLS_TYPE.WEB_SEARCH)"
      :paramName="webSearch.paramName"
      :desc="webSearch.desc"
      :value="webSearch.switchValue"
      :disabled="disableOperate"
      @setValue="(val) => setSwitchValue(TOOLS_TYPE.WEB_SEARCH, val)"
    ></Switches>
  </div>
</template>

<script>
import Switches from "./Switches.vue";
import { TOOLS_TYPE } from "@/constants/modules/audioVideoCall";

export default {
  name: "ModelTools",
  props: {
    disableOperate: {
      type: Boolean,
      default: false,
    },
    showTools: {
      type: Array,
      default: () => [TOOLS_TYPE.WEB_SEARCH],
    },
    defaultOpenedTools: {
      type: Array,
      default: () => [],
    },
  },
  components: {
    Switches,
  },
  computed: {
    webSearch() {
      return this.toolData[TOOLS_TYPE.WEB_SEARCH];
    },
  },
  data() {
    return {
      TOOLS_TYPE, // 工具类型
      multiwheel: false,
      toolData: {
        [TOOLS_TYPE.WEB_SEARCH]: {
          switchValue: false,
          paramName: "网页检索",
          desc: "可以进行网页搜索，然后将搜索结果传递给大模型进行进一步的生成和处理",
        },
      },
    };
  },
  mounted() {
    this.defaultOpenedTools.forEach((item) => {
      this.setSwitchValue(item, true);
    });
  },
  destroyed() {
    this.$emit("onChooseTool", "");
  },
  methods: {
    setSwitchValue(key, val) {
      // 处理互斥并选中当前项目
      const targetKey = Object.keys(this.toolData).find(
        (key) => this.toolData[key].switchValue
      );
      if (targetKey) {
        this.toolData[targetKey].switchValue = false;
      }
      this.$nextTick(() => {
        this.toolData[key].switchValue = val;
      });
      // 向外抛出当前打开的组件名
      this.$emit("onChooseTool", val ? key : "");
    },
  },
};
</script>

<style lang="less">
.knowledge-dropdown {
  .empty-msg {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 168px;
    font-size: 14px;
    color: #b0b1b8;

    p {
      margin-top: 10px;
    }

    a {
      margin-left: 4px;
    }

    i {
      font-size: 32px;
    }
  }
}
</style>
<style scoped lang="less">
.params-comps {
  width: 100%;
  .el-select {
    width: 100%;
    margin-bottom: 24px;
  }
  .multiwheel:not(:last-child) {
    margin-bottom: 12px;
  }
}
</style>
