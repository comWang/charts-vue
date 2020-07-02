<template>
  <div class="d3-wrap" :id="id" :style="`width:${width}px;height:${height}px`" />
</template>

<script>
import * as d3 from 'd3';
import { throttleFrame } from '@/utils/common';
import {
  Tooltip,
  Toolline,
  Filter,
  intelligenceArea,
  validator,
  strictValidator,
} from '@/utils/chartTools';

const findMoreIndFrom = (val, arr) => {
  let ind = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] >= val) {
      ind = i;
      break;
    }
  }
  return ind;
};

const defaultConfig = {
  grid: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 30,
  },
  global: {
    fontSize: 14,
  }
};

export default {
  props: {
    dataset: {
      validator,
    },
    id: [Number, String],
    width: {
      type: [Number, String],
      default: 600,
    },
    height: {
      type: [Number, String],
      default: 200,
    },
    option: Object,
  },
  data() {
    return {
      bootstrap: null,
      tooltip: null,
      toolline: null,
      filter: null,
    };
  },
  watch: {
    dataset() {
      this.renderChart();
    },
  },
  computed: {
    config() {
      return Object.assign({}, defaultConfig, this.option);
    },
    useful() {
      if (!validator(this.dataset)) return {};
      const {
        width,
        height,
        dataset: [xSeries, ySeries],
        config: {
          grid: { top: top, bottom: bottom, left: left, right: right },
        },
      } = this;
      const fx = d3
        .scaleLinear()
        .domain([d3.min(xSeries), d3.max(xSeries)])
        .range([left, width - right]);
      const fy = d3
        .scaleLinear()
        .domain([d3.min(ySeries), d3.max(ySeries)])
        .range([height - bottom, top]);

      return {
        width: parseFloat(width),
        height: parseFloat(height),
        top: parseFloat(top),
        bottom: parseFloat(bottom),
        left: parseFloat(left),
        right: parseFloat(right),
        fx,
        fy,
      };
    },
  },
  created() {
    // 节流提升性能
    this.onMousemove = throttleFrame(this.onMousemove, this);
  },
  mounted() {
    this.initBootStrap();
    this.renderChart();
    this.mountChart();
  },
  beforeDestroy() {
    this.bootstrap.node().removeEventListener('mousemove', this.onMousemove);
    this.bootstrap.node().removeEventListener('mouseleave', this.onMouseleave);
  },
  methods: {
    initBootStrap() {
      this.bootstrap = d3
        .create('svg')
        .attr('width', this.width)
        .attr('height', this.height)
        .attr('viewbox', '0, 0, 800, 200');
      
      this.filter = new Filter();
      this.filter.mount(this.bootstrap.node());
    },
    drawAxis() {
      const { width, height, bottom, left, right, fx, fy } = this.useful;
      const xAxis = d3.axisBottom(fx).ticks(12);
      const yAxis = d3.axisLeft(fy).ticks(5);
      // 打d3-x-axis标记方便更新
      const gx = this.bootstrap.select('.d3-x-axis').node()
        ? this.bootstrap.select('.d3-x-axis')
        : this.bootstrap.append('g').attr('class', 'd3-x-axis');

      const gy = this.bootstrap.select('.d3-y-axis').node()
        ? this.bootstrap.select('.d3-y-axis')
        : this.bootstrap.append('g').attr('class', 'd3-y-axis');
      // 画x轴
      gx.attr('transform', `translate(0,${height - bottom})`)
        .call(xAxis)
        .call(gx => gx
          .call(gx => gx
            .select('.domain')
            .attr('stroke', '#6076AD')
          )
          .call(gx => gx
            .selectAll('.tick text')
            .attr('fill', '#6076AD')
          )
          .selectAll('.tick line')
          .attr('stroke', '#6076AD')
      );
      // 画y轴
      gy.attr('transform', `translate(${left},0)`)
        .call(yAxis)
        .call(g => {
          g.select('.domain').attr('style', 'display:none');
        })
        .call(g => {
          g
            .call(gy => gy
              .selectAll('.tick text')
              .attr('fill', '#6076AD')
          )
            .selectAll('.tick line')
            .attr('stroke', 'rgba(14, 252, 255, 0.6)')
            .attr('x2', width - right - left)
            .attr('stroke-dasharray', [4, 2])
            .attr('stroke-width', 1)
            .attr('stroke-linecap', 'butt');
        });
    },
    drawArea() {
      const { height, bottom, fx, fy } = this.useful;
      const {
        dataset: [xSeries, ySeries],
      } = this;
      const pairs = ySeries.map((a, i) => [xSeries[i], a]);

      const areaFn = d3
        .area()
        .x(d => fx(d))
        .y0(() => height - bottom)
        .y1((d, i) => fy(pairs[i][1]));

      const area = d3.select('.d3-area').node()
        ? d3.select('.d3-area')
        : this.bootstrap
            .call(svg => {
              svg
                .append('defs')
                .append('linearGradient')
                .attr('id', 'gradient-fade-in')
                .attr('x1', '0%')
                .attr('y1', '100%')
                .attr('x2', '0%')
                .attr('y2', '0%')
                .call(lg => {
                  lg.append('stop')
                    .attr('offset', '0%')
                    .attr('stop-color', 'RGBA(50, 112, 135, 0.4)');
                })
                .call(lg => {
                  lg.append('stop')
                    .attr('offset', '100%')
                    .attr('stop-color', 'RGBA(0, 255, 255, 1)');
                });
            })
            .append('path')
            .attr('class', 'd3-area')
            .call(area => this.filter.track(area.node()));

      area.attr('d', areaFn(xSeries.slice(0, pairs.length))).attr('fill', 'url(#gradient-fade-in)');
    },
    drawTools() {
      const { fontSize, padding = 0 } = this.config.tooltip || this.config.global;
      const { height, bottom, top } = this.useful;
      this.tooltip = new Tooltip({ fontSize, padding });
      this.toolline = new Toolline({
        x1: 0,
        y1: height - bottom,
        x2: 0,
        y2: top,
      });
      this.bootstrap.node().appendChild(this.tooltip.node());
      this.bootstrap.node().appendChild(this.toolline.node());
      this.bootstrap.node().addEventListener('mousemove', this.onMousemove);
      this.bootstrap.node().addEventListener('mouseleave', this.onMouseleave);
    },
    onMousemove(e) {
      if (!this.tooltip || !strictValidator(this.dataset)) {
        this.$tooltip && this.$tooltip.hide();
        this.$toolline && this.$toolline.hide();
        return;
      }
      const { fx, width, height, left, right, top, bottom } = this.useful;
      // 避免tooltip与边界碰撞
      const aviodImpact = intelligenceArea(
        left,
        width - right,
        top,
        height - bottom,
        50 * this.$ratio
      );
      const { offsetX, offsetY } = e;
      const [xSeries, ySeries] = this.dataset;
      const rightInd = findMoreIndFrom(fx.invert(offsetX), xSeries);
      const leftInd = rightInd > 0 ? rightInd - 1 : 0;
      const nearestInd =
        offsetX - fx(xSeries[leftInd]) <= fx(xSeries[rightInd]) - offsetX
          ? leftInd
          : rightInd;
      this.toolline.show();
      this.toolline.move(fx(xSeries[nearestInd]), 0);
      this.tooltip.show();
      this.tooltip.move(
        ...aviodImpact(
          this.tooltip.autoStyle.width,
          this.tooltip.autoStyle.height,
          offsetX,
          offsetY
        )
      );
      this.tooltip.setText(
        `时刻：${xSeries[nearestInd]}`,
        `空气质量：${Math.round(ySeries[nearestInd]) || '--'}`
      );
    },
    onMouseleave() {
      this.toolline.hide();
      this.tooltip.hide();
    },
    renderChart() {
      if (!this.bootstrap) {
        console.log(
          'Root element [bootstrap] was not found and already returned.'
        );
        return;
      }
      if (!strictValidator(this.dataset)) {
        console.log('Empty or wrong dataset, rendering aborted.');
        this.filter.show();
        return;
      }
      this.filter.hide();
      console.log('rendering Area!');
      this.drawAxis();
      this.drawArea();
      // 画一次就行了
      if (this.tooltip || this.toolline) return;
      this.drawTools();
    },
    mountChart() {
      if (!this.bootstrap) {
        console.log('指定的svg元素不存在，无法挂载图表');
        return;
      }
      document.getElementById(this.id).append(this.bootstrap.node());
    },
  },
};
</script>

<style lang="less" scoped>
</style>