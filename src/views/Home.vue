<template>
  <div class="container">
    <h1 class="header">Charts by d3</h1>
    <Area
      id="area"
      :width="500 * $ratio"
      :height="300 * $ratio"
      :dataset="area.dataset"
      :option="area.option"
    />
    <Ring
      id="ring"
      :width="500 * $ratio"
      :height="420 * $ratio"
      :dataset="ring.dataset"
      :option="ring.option"
    />
  </div>
</template>

<script>
import Area from '@/components/Area';
import Ring from '@/components/Ring';

const createDataset = (x, y) => {
  const xSeries = Array.apply(null, { length: x }).map((a, i) => i + 1);
  return [
    xSeries,
    xSeries.map(
      (a, i) =>
        y / 2 +
        (y / 2) * Math.sin((i * Math.PI) / parseInt(Math.random() * 10 + 20))
    ),
  ];
};

export default {
  components: {
    Area,
    Ring,
  },
  data() {
    return {
      area: {
        dataset: null,
        option: null,
      },
      ring: {
        dataset: null,
        option: {
          legend: {
            super: {
              text: 'CO<sub>2</sub>',
              fontSize: 16 * this.$ratio,
            },
            value: {
              fontSize: 40 * this.$ratio,
            },
            sub: {
              text: 'μg/m<super>3</super>',
              fontSize: 16 * this.$ratio,
            },
            title: {
              text: '室外空气质量',
            },
          },
        },
      },
    };
  },
  mounted() {
    setInterval(() => {
      this.setAreaValue();
      this.setRingValue();
    }, 1000 * 3);
    this.setAreaValue();
    this.setRingValue();
  },
  methods: {
    setAreaValue() {
      this.area.dataset = createDataset(30, 50);
    },
    setRingValue() {
      this.ring.dataset = [[Math.round(Math.random() * 100)], [0, 100]];
    },
  },
};
</script>

<style lang="less" scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.header {
  text-align: center;
}
</style>
