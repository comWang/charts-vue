export class Tooltip {
  constructor(option) {
    this.option = Object.assign({
      width: null,
      height: null,
      padding: 6,
      fontSize: 14,
      borderRadius: 6,
    }, option);
    // 不显式指定下自动计算的样式信息
    this.autoStyle = {};
    this.$g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    this.$box = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
    this.$g.appendChild(this.$box);
    this.createTextGroup();
    this.initStyle();
    this.setBoxSize();
    this.hide();
  }
  createTextGroup() {
    this.$textGroup = this.$g.cloneNode();
    this.$text = document.createElementNS("http://www.w3.org/2000/svg", 'text');
    this.$text2 = this.$text.cloneNode();
    this.$textContent = document.createTextNode('');
    this.$textContent2 = this.$textContent.cloneNode('');
    this.$text.appendChild(this.$textContent);
    this.$text2.appendChild(this.$textContent2);
    this.$textGroup.appendChild(this.$text);
    this.$textGroup.appendChild(this.$text2);
    this.$g.appendChild(this.$textGroup);
  }
  initStyle() {
    const { padding, fontSize } = this.option;
    this.$g.setAttribute('style', 'transition: transform 0.4s');
    this.$text.setAttribute('font-size', `${fontSize}`);
    this.$text.setAttribute('fill', '#9fceff');
    this.$text2.setAttribute('font-size', `${fontSize}`);
    this.$text2.setAttribute('fill', '#9fceff');
    this.$text2.setAttribute('transform', `translate(0, ${fontSize * 1.5})`);
    this.$textGroup.setAttribute('transform', `translate(${padding},0)`)
  }
  setText(str1, str2) {
    const { data: oldStr1 } = this.$textContent;
    const { data: oldStr2 } = this.$textContent2;
    const newContent1 = document.createTextNode(str1);
    this.$text.replaceChild(newContent1, this.$textContent);
    this.$textContent = newContent1;
    if (str2) {
      const newContent2 = document.createTextNode(str2);
      this.$text2.replaceChild(newContent2, this.$textContent2);
      this.$textContent2 = newContent2;
    }
    if (Math.max(str1.length, str2.length) > Math.max(oldStr1.length, oldStr2.length)) {
      this.setBoxSize();
    }
  }
  setTextAttribute(...styles) {
    styles.forEach((style, ind) => {
      if (Object.prototype.toString.call(style) !== '[object Object]') return;
      const keys = Object.keys(style);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const prop = `$text${ind === 0 ? '' : ind + 1}`;
        this[prop] && this[prop]
          .setAttribute(
            key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
            style[key]
          );
      }
    })
  }
  setBoxSize() {
    const { width, height, padding, fontSize, borderRadius } = this.option;
    const { data: str1 = '' } = this.$textContent;
    const { data: str2 = '' } = this.$textContent2;
    // 双字节字视为双倍宽度（暂时全按1处理）
    const len1 = str1.split('').reduce((len, char) => (len += (char.charCodeAt(0) <= 128 ? 1 : 1)), 0);
    const len2 = str2.split('').reduce((len, char) => (len += (char.charCodeAt(0) <= 128 ? 1 : 1)), 0);
    const unit1 = this.$text.getAttribute('font-size') || fontSize;
    const unit2 = this.$text2.getAttribute('font-size') || fontSize;
    this.autoStyle.width = Math.max(len1 * unit1, len2 * unit2) + 2 * padding;
    this.autoStyle.height = (unit1 * 1 + unit2 * 1) * 1.5 + 2 * padding;
    this.$box.setAttribute('x', 0);
    this.$box.setAttribute('y', 0);
    this.$box.setAttribute('width', width || this.autoStyle.width);
    this.$box.setAttribute('height', height || this.autoStyle.height);
    this.$box.setAttribute('rx', borderRadius);
    this.$box.setAttribute('ry', borderRadius);
    this.$box.setAttribute('fill', 'rgba(0, 0, 0, 0.6)');
    this.$box.setAttribute('transform', `translate(0, ${-(height | this.autoStyle.height) / 2})`);
  }
  show() {
    this.$g.removeAttribute('display');
  }
  hide() {
    this.$g.setAttribute('display', 'none');
  }
  move(x, y) {
    this.$g.setAttribute('transform', `translate(${x},${y})`);
  }
  node() {
    return this.$g;
  }
}


export class Toolline {
  // 2点确定一条直线
  constructor(option) {
    this.option = Object.assign({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    }, option);
    this.$g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    this.$line = document.createElementNS("http://www.w3.org/2000/svg", 'line');
    this.$line.setAttribute('x1', this.option.x1);
    this.$line.setAttribute('y1', this.option.y1);
    this.$line.setAttribute('x2', this.option.x2);
    this.$line.setAttribute('y2', this.option.y2);
    this.initStyle();
    this.$g.appendChild(this.$line);
    this.hide();
  }
  initStyle() {
    this.$g.setAttribute('style', 'transition: transform 0.2s ease-out');
    this.$line.setAttribute('stroke', '#888');
    this.$line.setAttribute('stroke-width', 1);
    this.$line.setAttribute('stroke-dasharray', [4, 2]);
  }
  show() {
    this.$g.removeAttribute('display');
  }
  hide() {
    this.$g.setAttribute('display', 'none');
  }
  move(x, y) {
    this.$g.setAttribute('transform', `translate(${x},${y})`);
  }
  setAttribute(obj) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const attr = keys[i].replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      this.$g.setAttribute(attr, obj[key])
    }
  }
  node() {
    return this.$g;
  }
}

export class Filter {
  constructor(option) {
    this.option = Object.assign({
      width: 200,
      height: 200,
    }, option);
    this.timer = null;
    this.filterId = 'filter-blur';
    this.$filter = this.createFilter();
  }
  createFilter() {
    const g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    const filter = document.createElementNS("http://www.w3.org/2000/svg", 'filter');
    const blur = document.createElementNS("http://www.w3.org/2000/svg", 'feGaussianBlur');
    blur.setAttribute('in', 'SourceGraphic');
    blur.setAttribute('stdDeviation', 5);
    filter.setAttribute('id', this.filterId);
    filter.appendChild(blur);
    g.appendChild(filter);
    return g;
  }
  mount(dom) {
    if (!dom || this.option.parent) return;
    this.option.parent = dom;
    dom.appendChild(this.$filter);
  }
  track(dom) {
    if (!dom || this.option.el) return;
    this.option.el = dom;
  }
  show() {
    const { el } = this.option;
    el && el.setAttribute('filter',`url(#${this.filterId})`);
  }
  hide() {
    const { el } = this.option;
    el && el.removeAttribute('filter');
  }
  id() {
    return this.filterId;
  }
  node() {
    return this.$filter;
  }
}

export class AnimationGenerator {
  constructor(option, domain, fn) {
    // 起始状态 ...> 最终状态
    if (domain.target.length !== domain.primary.length) throw Error('系列变量必须一一配对');
    this.option = option;
    this.domain = domain;
    this.fn = fn;
    this.timer = null;
    this.createAnimationQueue();
  }
  createAnimationQueue() {
    const {primary, target} = this.domain;
    const { duration, timingFunc } = this.option;
    const ticks = Math.ceil(duration / 16);
    let queue = [];
    if (timingFunc === 'linear') {
      primary.forEach((origin, i) => {
        const end = target[i];
        if (isNaN(parseFloat(origin)) || isNaN(parseFloat(end))) {
          console.error(
            `Expected Number, but got primary:${JSON.stringify(origin)},target:${JSON.stringify(end)}.`
          );
          return;
      }
        const frames = Array.apply(null, { length: ticks })
          .map((a, ind) => origin + (end - origin) * (ind + 1) / ticks);
        queue.push(frames);
      })
    }
    this.queue = queue;
  }
  abort() {
    cancelAnimationFrame(this.timer);
    this.queue = [];
  }
  run() {
    const run = () => requestAnimationFrame(() => {
      console.log('animating...')
      const currentFrameList = [];
      this.queue.forEach(frames => {
        currentFrameList.push(frames.shift());
      });
      currentFrameList.length && this.fn(currentFrameList);
      // 队列未清空
      if (this.queue && this.queue.length && this.queue.flat().length) {
        this.timer = run();
      }
    });
    this.timer = run();
  }
}

// left, right, top, bottom边界坐标
const intelligenceArea = (l, r, t, b, margin = 0) => {
  return function (...paras) {
    if (paras.length < 4) throw Error(`Expected 4 parameters but got ${paras.length}`);
    const [width, height, x0, y0] = paras;
    let x = x0 + margin;
    let y = y0 + margin;
    if (x < l + width) x = x0 + margin;
    else if (x > r - width) x = x0 - width - margin;

    if (y < t + height) y = y0 + height + margin;
    else if (y > b - height) y = y0 - height - margin;
    return [x, y]
  }
}

const validator = function (value) {
  if (Array.isArray(value)
    && value.length > 1
    && Array.isArray(value[0])
    && Array.isArray(value[1])
  ) {
    return true;
  }
  return false;
}

// 在结构一致的情况下，内部数组也不能为空
const strictValidator = function (value) {
  if (validator(value) && value[0].length && value[1].length) {
    return true;
  }
  return false;
}

export {
  intelligenceArea,
  validator,
  strictValidator,
}