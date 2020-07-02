<template>
  <div class="d3-wrap" :id="id" :style="`width:${width}px;height:${height}px`" />
</template>

<script>
import * as d3 from 'd3';
import { validator, strictValidator, AnimationGenerator, Filter } from '@/utils/chartTools';

const OUTLINE = 'd3-ring-outline';
const RINGLINE = 'd3-ring-line';
const INNERLINE = 'd3-ring-innerline';
const LEGEND = 'd3-ring-legend';
const TITLE = 'd3-ring-title';
const defaultConfig = {
  global: {
    fontSize: 14,
    color: '#333',
  },
  grid: {
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
  },
  axis: {
    // 3个环的宽度
    d1: 10,
    d2: 25,
    d3: 20,
    // 刻度的长度
    tickHeight: 10,
  },
  legend: {
    super: {
      text: '',
      fontSize: 16,
    },
    value: {
      fontSize: 40,
    },
    sub: {
      text: '',
      fontSize: 16,
    },
    title: {
      text: '',
    },
  },
};

// 可以输入特殊标签来较为正确地显示某些单位符号。
// 例如 'm<super>3</super>' 转换为  text = m, tag = super, unit = 3, position = 1;
// 会在页面上渲染为【立方米】的单位；
// super表示上标，sub表示下标
const parseText = arr => arr.map(d => {
  if (!d && d !== 0) return {
    text: '',
    unit: null,
    tag: null,
    position: -1,
  };
  const position = d.search(/(<\w+>)\s*\S+\s*(<\/\w+>)/g);
  const text = d.replace(
    /(<\w+>)\s*\S+\s*(<\/\w+>)/g,
    ''
  );
  const unitArr = d.match(/(<\w+>)\s*\S+\s*(<\/\w+>)/g);
  const unit = unitArr
    ? unitArr[0].replace(/(<\/?\w+>)|\s*/g, '')
    : null;
  const tag = unitArr
    ? unitArr[0].match(/<\w+>/)[0].replace(/<|>/g, '')
    : null;
  return {
    text,
    unit,
    tag,
    position,
  }
})

const strigifyStyle = style => {
  let str = '';
  const keys = Object.keys(style);
  const props = ['fontSize', 'width', 'height', 'top', 'bottom', 'left', 'right'];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = props.includes(key) ? `${style[key]}px` : style[key];
    const attr = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    str += `${attr}: ${value};`;
  }
  return str;
};

const renderLegendText = (selection, content) => {
  if (!content.tag) {
    selection.text(content.text);
  } else if (content.position > 0) {
    selection.text(content.text);
    selection
    .selectAll('span')
    .data([content.unit])
    .join(
      enter => enter
        .append('span')
        .attr('style', `vertical-align:${content.tag};font-size: 0.8em`)
        .text(content.unit),
      update => update.selectAll('span').text(content.unit),
      exit => exit.remove()
    );
  } else {
    selection
    .selectAll('span')
    .data([content.unit])
    .join(
      enter => enter
        .append('span')
        .attr('style', `vertical-align:${content.tag};font-size: 0.8em`)
        .text(content.unit),
      update => update.selectAll('span').text(content.unit),
      exit => exit.remove()
    );
    selection.text(content.text);
  }
};

const colorGeneratorFactory = (begain ,end, safeLine = 0, warnLine = 1) => {
  const [r0, g0, b0] = begain;
  const [r1, g1, b1] = end;
  return function (val, [min, max]) {
    const value = Math.min(val, max);
    const rate = (value - min) / (max - min);
    if (rate <= safeLine) {
      return [r0, g0, b0];
    } else if (rate >= warnLine) {
      return [
        r1,
        g1,
        b1,
      ];
    } else {
      return [
        Math.round(r0 + (rate - safeLine) / (warnLine - safeLine) * (r1 - r0) ),
        Math.round(g0 + (rate - safeLine) / (warnLine - safeLine) * (g1 - g0)),
        Math.round(b0 + (rate - safeLine) / (warnLine - safeLine) * (b1 - b0)),
      ];
    }
  }
};

export default {
  props: {
    id: [Number, String],
    width: {
      type: [Number, String],
      default: 488,
    },
    height: {
      type: [Number, String],
      default: 422,
    },
    dataset: {
      validator,
    },
    option: Object,
    size: String,
  },
  computed: {
    config() {
      return Object.assign({}, defaultConfig, this.option);
    },
    useful() {
      if (!validator(this.dataset)) return {};
      const {
        axis: { d1, d2, d3, tickHeight },
      } = this.config;
      const {
        width,
        height,
        config: {
          grid: { top: top, bottom: bottom, left: left, right: right },
        },
      } = this;
      // 剔除边距后实际可以用的宽高
      const wid = width - left - right;
      const hei = height - top - bottom;
      const r0 = wid / 2;
      const h = r0 - (wid - hei);
      // 整个图形是一个宽度大于高度的方框，内部圆的下半部分被方框底部截断。
      // 据此，在笛卡尔坐标系第一象限上，以坐标 (r, h)为圆心，r为半径画外环；
      // 圆形平面方程为 (x - r)^2 + (y - h)^2 = r^2;
      // y = 0 ... => (x - r)^2 + h^2 = r^2
      // x = sqrt(r^2 - h^2) + r
      // 转换为svg坐标系为：x(svg) = x, y(svg) = height - y。
      // 最后画图时补上预留的left,top等值
      const x0 = r0 * (1 - Math.sin(Math.PI / 4));
      const y0 = r0 * (1 + Math.cos(Math.PI / 4));
      // 根据偏转弧度和偏移长度计算坐标点；
      // offset理解为从(x0,yo)向(xn,yn)出发，经过的直线距离
      const x = (radian, offset = 10) => x0 + offset * Math.sin(radian);
      const y = (radian, offset = 10) => y0 - offset * Math.cos(radian);
      const r = (x, y) => Math.sqrt(Math.pow(x - x0, 2) + Math.pow(y - y0, 2));
      const generatePath = (x, y, r, relativeRadian = Math.PI * 3 / 2) =>{
        // 采用极坐标标记起始位置
        const startAngle = Math.PI * 5 / 4;
        // 防止数值可能溢出
        const endAngle = startAngle - Math.min(relativeRadian, Math.PI * 3 / 2);
        return `M${left + x} ${top + y} A${r} ${r}, 0, ${relativeRadian < Math.PI ? 0 : 1}, 1, ${
        left + r0 + r * Math.cos(endAngle)
        } ${top + r0 - r * Math.sin(endAngle)}`;
      }
      // 被刻度包裹的圆形半径
      const contentRadius = r0 - (d1 + d2 + d3) - tickHeight - 2;
      const calcPoints = radian => {
        return [
          [r0 + (contentRadius + tickHeight) * Math.cos(radian), h + (contentRadius + tickHeight) * Math.sin(radian)],
          [
            r0 + contentRadius * Math.cos(radian),
            h + contentRadius * Math.sin(radian),
          ],
        ];
      };
      const generateTick = radian => {
        const [[x1, y1], [x2, y2]] = calcPoints(radian);
        return {
          x1: x1 + left,
          y1: height - bottom - y1,
          x2: x2 + left,
          y2: height - bottom - y2,
        };
      };

      return {
        x0,
        y0,
        r0,
        x,
        y,
        r,
        contentRadius,
        generatePath,
        generateTick,
        width: parseFloat(width),
        height: parseFloat(height),
        top: parseFloat(top),
        bottom: parseFloat(bottom),
        left: parseFloat(left),
        right: parseFloat(right),
      };
    },
  },
  data() {
    return {
      bootstrap: null,
      animationRunner: null,
      oldDataset: null,
      filter: null,
    };
  },
  watch: {
    dataset(newVal, old) {
      this.oldDataset = JSON.parse(JSON.stringify(old));
      this.renderChart();
    },
  },
  mounted() {
    this.initBootstrap();
    this.renderChart();
    this.mountChart();
  },
  methods: {
    initBootstrap() {
      this.bootstrap = d3
        .create('svg')
        .attr('width', this.width)
        .attr('height', this.height)
        .attr('viewbox', '0, 0, 488, 422');

      this.filter = new Filter({
        parent: this.bootstrap.node()
      });
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
      console.log('rendering Ring!');
      this.drawAxis();
      this.drawLegend();
      this.drawRing();
      this.drawTitle();
    },
    mountChart() {
      if (!this.bootstrap) {
        console.log('指定的svg元素不存在，无法挂载图表');
        return;
      }
      document.getElementById(this.id).append(this.bootstrap.node());
    },
    drawAxis() {
      if (this.width < this.height) {
        console.log('该宽高比可能导致渲染不符预设');
      }
      const {
        axis: { d1, d2, d3 },
      } = this.config;
      const { x0, y0, r0, x, y, r, generatePath, generateTick } = this.useful;
      // 画外环
      const outline = this.bootstrap.select(`.${OUTLINE}`).node()
        ? this.bootstrap.select(`.${OUTLINE}`)
        : this.bootstrap
          .append('path')
          .attr('class', OUTLINE)
          .attr('stroke', '#2ACAFF')
          .attr('fill', 'transparent');
      outline
          .attr('d', generatePath(x0, y0, r0));

      // 画刻度环
      const x2 = x(Math.PI / 4, d1 + d2 + d3);
      const y2 = y(Math.PI / 4, d1 + d2 + d3);
      const r2 = r0 - r(x2, y2);
      const innerline = this.bootstrap.select(`.${INNERLINE}`).node()
        ? this.bootstrap.select(`.${INNERLINE}`)
        : this.bootstrap
          .append('g')
          .attr('class', INNERLINE);
      innerline
        .call(g => {
          g.selectAll('line')
            .data([1, 2, 3, 4, 5, 6, 8])
            .join('line')
            .attr('stroke', '#2ACAFF')
            .attr('x1', d => generateTick((Math.PI / 4) * (d - 1)).x1)
            .attr('y1', d => generateTick((Math.PI / 4) * (d - 1)).y1)
            .attr('x2', d => generateTick((Math.PI / 4) * (d - 1)).x2)
            .attr('y2', d => generateTick((Math.PI / 4) * (d - 1)).y2);
        })
        .selectAll('path')
        .data([[x2, y2, r2]])
        .join(
          enter => enter
            .append('path')
            .attr('stroke', '#2ACAFF')
            .attr('stroke-width', '1')
            .attr('fill', 'transparent')
            .attr('d', d => generatePath(...d)),
          update => update
            .attr('d', d => generatePath(...d)),
          exit => exit.remove()
        )
    },
    drawRing() {
      const [[originVal], [originMin, originMax]] = this.dataset;
      const value = parseFloat(originVal),
        min = parseFloat(originMin),
        max = parseFloat(originMax);
      if (isNaN(min) || isNaN(max)) {
        console.error(`domain must be Number, but got ${[originMin, originMax]}.`);
      }
      const { r0, x, y, r, generatePath } = this.useful;
      const {
        axis: { d1, d2, d3 },
      } = this.config;
      const oldValue = this.oldDataset ? this.oldDataset[0][0] : min;
      const x1 = x(Math.PI / 4, d1 + d2 / 2);
      const y1 = y(Math.PI / 4, d1 + d2 / 2);
      const r1 = r0 - r(x1, y1);
      const colorGenerator = colorGeneratorFactory([42, 202, 255], [239, 10, 106], 0.4, 0.9);
      const ring = this.bootstrap.select(`.${RINGLINE}`).node()
        ? this.bootstrap.select(`.${RINGLINE}`).selectAll('path')
        : this.bootstrap
          .append('g')
          .call(g => this.filter.track(g.node()))
          .attr('class', RINGLINE)
          .call(g => g
            .append('path')
            .attr('stroke', 'rgba(125,125,125,0.3)')
            .attr('stroke-width', `${d2}`)
            .attr('stroke-linecap', 'round')
            .attr('fill', 'transparent')
            .attr('d', generatePath(x1, y1, r1, Math.PI * 3 / 2)),
          )
          .append('path')
            .attr('stroke-width', `${d2}`)
            .attr('stroke-linecap', 'round')
            .attr('fill', 'transparent');
      // 中止上一次可能正在进行中的执行
      this.animationRunner && this.animationRunner.abort();

      if (isNaN(value)) {
        console.log(`Animation canceled!Because value must be Number, but got ${originVal}.`);
        return;
      }
      this.animationRunner = new AnimationGenerator(
      {
        duration: 1000,
        timingFunc: 'linear',
      },
      {
        primary: [Math.min(oldValue, max)],
        target: [Math.min(value, max)],
      },
      ([value]) => {
        const [r, g, b] = colorGenerator(value, [min, max]);
        ring
          .attr('d', generatePath(x1, y1, r1, value / max * Math.PI * 3 / 2))
          .attr('stroke', `rgba(${r}, ${g}, ${b}, 0.6)`);
      });
      this.animationRunner.run();
    },
    drawLegend() {
      const [[originValue]] = this.dataset;
      const { legend, global } = this.config;
      const { r0, top, contentRadius } = this.useful;
      // 不使用原始文本，因为要特殊处理一些语法
      const [ contentSuper, contentSub ] = parseText([
        legend.super && legend.super.text,
        legend.sub && legend.sub.text
      ]);
      const legendStyle = {
        position: 'absolute',
        left: 0,
        right: 0,
        top: top + r0 - contentRadius,
        width: 2 * contentRadius,
        height: contentRadius * (1 + Math.cos(Math.PI / 4)),
        margin: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        alignItems: 'center',
      };
      const ld = d3.select(`#${this.id}`).select(`.${LEGEND}`).node()
        ? d3.select(`#${this.id}`).select(`.${LEGEND}`)
        : d3.select(`#${this.id}`)
            .append('div')
            .attr('class', LEGEND)
            .attr('style', strigifyStyle(legendStyle));
      ld
        .selectAll('p')
        .data(['super', 'value', 'sub'])
        .join(enter =>
          enter
            .append('p')
            .attr('class', d => d)
            // 文本的所有样式在此配置
            .attr('style', d => {
              const style = Object.assign({}, global, legend[d]);
              // 删除非css属性
              delete style.text;
              return strigifyStyle(style);
            }),
        );
      ld.select('.super').call(p => renderLegendText(p, contentSuper));
      ld.select('.value').call(p => renderLegendText(p, { text: parseFloat(originValue) }));
      ld.select('.sub').call(p => renderLegendText(p, contentSub));
    },
    drawTitle() {
      const { r0, top, bottom, left, height, contentRadius } = this.useful;
      const { text } = this.config.legend && this.config.legend.title || {};
      const { tickHeight } = this.config.axis;
      const titleFormatter = typeof text === 'function'
        ? text
        : () => text;
      const titleStyle = {
        backgroundColor: '#1b225b',
        color: '#2acaff',
        border: '1px solid #0090ff',
        borderRadius: '10PX',
      };
      const renderText = titleFormatter(this.dataset) || '--';
      // 最小预留的字数位
      const baseLength = 5;
      // 假设ASCII之外的字宽是英文2倍
      const textLength = [...renderText].reduce((accu, el) => (accu += el.charCodeAt(0) <= 128 ? 0.5 : 1), 0)
      // titleWidth为最下面2个刻度间的距离。
      // 根据字数计算每个字理论最大多宽
      // 左右留1%总宽度的边距
      // remainHeight为最下面2刻度连线和bottom线的距离
      const titleWidth = 2 * (contentRadius + tickHeight) * Math.sin(Math.PI / 4) * 0.9;
      const unitWidth = titleWidth / Math.max(textLength, baseLength);
      const fontSize = unitWidth * 0.8;
      const remainHeight = height - bottom - (top + r0 + (contentRadius + tickHeight) * Math.cos(Math.PI / 4));
      const rectHeight = remainHeight >= unitWidth ? remainHeight : unitWidth;
      const verticalPadding = (rectHeight - fontSize) / 2;
      const tl = this.bootstrap.select(`.${TITLE}`).node()
        ? this.bootstrap.select(`.${TITLE}`)
        : this.bootstrap
          .append('g')
          .attr('class', TITLE);
        tl
          .attr('transform', `translate(${left + r0 - titleWidth / 2 }, ${height - bottom})`)
          .selectAll('rect')
          .data([1])
          .join(
            enter => enter
              .append('rect')
              .attr('width', titleWidth)
              .attr('height', rectHeight)
              .attr('y', -fontSize)
              .attr('rx', verticalPadding)
              .attr('ry', verticalPadding)
              .attr('fill', titleStyle.backgroundColor)
              .attr('stroke', '#0090FF'),
            update => update,
            exit => exit.remove()
          );
        tl
          .selectAll('text')
          .data([renderText])
          .join(
            enter => enter
              .append('text')
              .attr('font-size', fontSize)
              .text(d => d)
              .attr('fill', '#2acaff')
              .attr('x', (titleWidth - textLength * fontSize) / 2),
            update => update.text(d => d)
          );
    }
  },
};
</script>

<style lang="less">
.d3-wrap {
  position: relative;
  top: 0;
  left: 0;
}
</style>