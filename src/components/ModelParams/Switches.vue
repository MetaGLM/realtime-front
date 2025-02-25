<template>
  <div class="fs12 ft_grey3 flex flex-x-between flex-y-center multiwheel">
    <div class="info flex flex-x-start">
      <span>{{ paramName }}</span>
      <el-tooltip
        effect="light"
        :visible-arrow="false"
        popper-class="switches popper-class-text-tip"
        placement="right"
      >
        <template #content>
          <!-- 使用具名插槽传递内容 -->
          {{ desc }}
        </template>
        <!-- 触发元素 -->
        <i v-if="desc" class="iconfont icon-info1 pointer"></i>
      </el-tooltip>
    </div>
    <el-switch
      :disabled="disabled"
      v-model="switchValue"
      @change="setValue"
      active-color="#134CFF"
      inactive-color="#C0C6CF"
    >
    </el-switch>
  </div>
</template>

<script>
export default {
  name: "Switches",
  props: {
    paramName: {
      type: String,
      default: "",
    },
    desc: {
      type: String,
      default: "",
    },
    value: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      switchValue: false,
    };
  },
  methods: {
    setValue(val) {
      this.$emit("setValue", val);
    },
  },
  watch: {
    value: {
      handler(val) {
        this.switchValue = val;
      },
      immediate: true,
    },
  },
};
</script>
<style>
body .el-tooltip__popper.switches {
  max-width: 230px;
}
</style>
<style scoped lang="less">
.info {
  color: #212121;
  line-height: 20px;
  font-size: 14px;
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
}
</style>
