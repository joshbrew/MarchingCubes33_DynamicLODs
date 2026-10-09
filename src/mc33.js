import table from "./mc33Tables.js";

// Same corner order, mask bits, face/interior tests and winding as the cloud shader.
const corners = [
  [0, 0, 0],
  [0, 1, 0],
  [0, 1, 1],
  [0, 0, 1],
  [1, 0, 0],
  [1, 1, 0],
  [1, 1, 1],
  [1, 0, 1],
];
const edges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];
class Polygonizer {
  constructor() {
    this.table = table;
    this.f_test_results = new Int32Array(6);
  }
  signbf(value) {
    return value < 0;
  }
  face_tests(i) {
    const v = this.v;
    const f = this.f_test_results;
    f.fill(0);

    if (i & 0x80) {
      f[0] = (i & 0xcc) === 0x84 ? (v[0] * v[5] < v[1] * v[4] ? -1 : 1) : 0;
      f[3] = (i & 0x99) === 0x81 ? (v[0] * v[7] < v[3] * v[4] ? -1 : 1) : 0;
      f[4] = (i & 0xf0) === 0xa0 ? (v[0] * v[2] < v[1] * v[3] ? -1 : 1) : 0;
    } else {
      f[0] = (i & 0xcc) === 0x48 ? (v[0] * v[5] < v[1] * v[4] ? 1 : -1) : 0;
      f[3] = (i & 0x99) === 0x18 ? (v[0] * v[7] < v[3] * v[4] ? 1 : -1) : 0;
      f[4] = (i & 0xf0) === 0x50 ? (v[0] * v[2] < v[1] * v[3] ? 1 : -1) : 0;
    }

    if (i & 0x02) {
      f[1] = (i & 0x66) === 0x42 ? (v[1] * v[6] < v[2] * v[5] ? -1 : 1) : 0;
      f[2] = (i & 0x33) === 0x12 ? (v[3] * v[6] < v[2] * v[7] ? -1 : 1) : 0;
      f[5] = (i & 0x0f) === 0x0a ? (v[4] * v[6] < v[5] * v[7] ? -1 : 1) : 0;
    } else {
      f[1] = (i & 0x66) === 0x24 ? (v[1] * v[6] < v[2] * v[5] ? 1 : -1) : 0;
      f[2] = (i & 0x33) === 0x21 ? (v[3] * v[6] < v[2] * v[7] ? 1 : -1) : 0;
      f[5] = (i & 0x0f) === 0x05 ? (v[4] * v[6] < v[5] * v[7] ? 1 : -1) : 0;
    }

    return f[0] + f[1] + f[2] + f[3] + f[4] + f[5];
  }

  face_test1(face) {
    const v = this.v;
    switch (face) {
      case 0:
        return v[0] * v[5] < v[1] * v[4] ? 0x48 : 0x84;
      case 1:
        return v[1] * v[6] < v[2] * v[5] ? 0x24 : 0x42;
      case 2:
        return v[3] * v[6] < v[2] * v[7] ? 0x21 : 0x12;
      case 3:
        return v[0] * v[7] < v[3] * v[4] ? 0x18 : 0x81;
      case 4:
        return v[0] * v[2] < v[1] * v[3] ? 0x50 : 0xa0;
      default:
        return v[4] * v[6] < v[5] * v[7] ? 0x05 : 0x0a;
    }
  }

  interior_test(i, flag13) {
    const v = this.v;
    const tiny = 1e-9;

    const At = v[4] - v[0];
    const Bt = v[5] - v[1];
    const Ct = v[6] - v[2];
    const Dt = v[7] - v[3];
    const denom = At * Ct - Bt * Dt;

    if (this.signbf(denom)) {
      if (i & 1) return 0;
    } else if (!(i & 1) || Math.abs(denom) < tiny) {
      return 0;
    }

    const t = (0.5 * (v[3] * Bt + v[1] * Dt - v[2] * At - v[0] * Ct)) / denom;
    if (t <= tiny || t >= 1 - tiny) return 0;

    const a = v[0] + At * t;
    const b = v[1] + Bt * t;
    const c = v[2] + Ct * t;
    const d = v[3] + Dt * t;
    const ac = c * a;
    const bd = d * b;

    if (i & 1) {
      if (ac < bd && !this.signbf(bd)) {
        return (this.signbf(b) === this.signbf(v[i])) + flag13;
      }
    } else if (ac > bd && !this.signbf(ac)) {
      return (this.signbf(a) === this.signbf(v[i])) + flag13;
    }

    return 0;
  }

  pattern(cubeIdx) {
    const tbl = this.table;
    const inverted = (cubeIdx & 0x80) !== 0;
    const li = inverted ? cubeIdx ^ 0xff : cubeIdx;
    const e0 = tbl[li];
    if (e0 === undefined) throw new Error(`MC33 lookup miss: ${li}`);

    const reverseBit = (e0 & 0x800) !== 0;
    const m = inverted ? !reverseBit : reverseBit;
    const activeIndex = m ? cubeIdx : cubeIdx ^ 0xff;
    const k = e0 & 0x7ff;
    const caseId = e0 >>> 12;
    let pcase;

    switch (caseId) {
      case 0:
        pcase = k;
        break;
      case 1:
        pcase =
          activeIndex & this.face_test1(k >> 2) ? 183 + (k << 1) : 159 + k;
        break;
      case 2:
        pcase = this.interior_test(k, 0) ? 239 + 6 * k : 231 + (k << 1);
        break;
      case 3:
        if (activeIndex & this.face_test1(k % 6)) {
          pcase = 575 + 5 * k;
        } else {
          pcase = this.interior_test(Math.floor(k / 6), 0)
            ? 407 + 7 * k
            : 335 + 3 * k;
        }
        break;
      case 4: {
        const ft = this.face_tests(activeIndex);
        if (ft === -3) {
          pcase = 695 + 3 * k;
        } else if (ft === -1) {
          pcase =
            (this.f_test_results[4] + this.f_test_results[5] < 0
              ? this.f_test_results[0] + this.f_test_results[2] < 0
                ? 759
                : 799
              : 719) +
            5 * k;
        } else if (ft === 1) {
          pcase =
            (this.f_test_results[4] + this.f_test_results[5] < 0
              ? 983
              : this.f_test_results[0] + this.f_test_results[2] < 0
                ? 839
                : 911) +
            9 * k;
        } else {
          pcase = this.interior_test(k >> 1, 0) ? 1095 + 9 * k : 1055 + 5 * k;
        }
        break;
      }
      case 5: {
        const ft = this.face_tests(activeIndex);
        if (ft === -2) {
          const cond =
            k & 2
              ? this.interior_test(0, 0)
              : this.interior_test(0, 0) || this.interior_test(k ? 1 : 3, 0);
          pcase = cond ? 1213 + (k << 3) : 1189 + (k << 2);
        } else if (ft === 0) {
          pcase = (this.f_test_results[2 + k] < 0 ? 1261 : 1285) + (k << 3);
        } else {
          const cond =
            k & 2
              ? this.interior_test(1, 0)
              : this.interior_test(2, 0) || this.interior_test(k ? 3 : 1, 0);
          pcase = cond ? 1237 + (k << 3) : 1201 + (k << 2);
        }
        break;
      }
      case 6: {
        const ft = this.face_tests(activeIndex);
        if (ft === -2) {
          pcase = this.interior_test((0xda010c >> (k << 1)) & 3, 0)
            ? 1453 + (k << 3)
            : 1357 + (k << 2);
        } else if (ft === 0) {
          pcase = (this.f_test_results[k >> 1] < 0 ? 1645 : 1741) + (k << 3);
        } else {
          pcase = this.interior_test((0xa7b7e5 >> (k << 1)) & 3, 0)
            ? 1549 + (k << 3)
            : 1405 + (k << 2);
        }
        break;
      }
      default: {
        const ftAbs = Math.abs(this.face_tests(activeIndex));
        if (ftAbs === 0) {
          const kk =
            ((this.f_test_results[1] < 0) << 1) | (this.f_test_results[5] < 0);
          if (
            this.f_test_results[0] * this.f_test_results[1] ===
            this.f_test_results[5]
          ) {
            pcase = 2157 + 12 * kk;
          } else {
            const c = this.interior_test(kk, 1);
            pcase = 2285 + (c ? 10 * kk - 40 * c : 6 * kk);
          }
        } else if (ftAbs === 2) {
          const idx =
            (this.f_test_results[0] < 0
              ? this.f_test_results[2] > 0
              : 12 + (this.f_test_results[2] < 0)) +
            (this.f_test_results[1] < 0
              ? this.f_test_results[3] < 0
              : 6 + (this.f_test_results[3] > 0));
          pcase = 1917 + 10 * idx;
          if (this.f_test_results[4] > 0) pcase += 30;
        } else if (ftAbs === 4) {
          let kk =
            21 +
            11 * this.f_test_results[0] +
            4 * this.f_test_results[1] +
            3 * this.f_test_results[2] +
            2 * this.f_test_results[3] +
            this.f_test_results[4];
          if (kk >> 4) kk -= kk & 32 ? 20 : 10;
          pcase = 1845 + 3 * kk;
        } else {
          pcase = 1839 + 2 * this.f_test_results[0];
        }
      }
    }

    return { offset: pcase + 1, reverse: m };
  }
  triangles(values, mask, codes) {
    this.v = values;
    if (mask === 0 || mask === 255) return 0;
    const info = this.pattern(mask);
    let count = 0;
    for (let p = info.offset; p < table.length; p++) {
      const word = table[p];
      const a = word & 15,
        b = (word >> 4) & 15,
        c = (word >> 8) & 15;
      if (a <= 12 && b <= 12 && c <= 12 && a !== b && b !== c && a !== c) {
        if (count + 3 > codes.length)
          throw new Error("MC33 cell exceeds output capacity");
        codes[count++] = a;
        codes[count++] = info.reverse ? c : b;
        codes[count++] = info.reverse ? b : c;
      }
      if (!(word & 0x1000)) return count;
    }
    throw new Error("MC33 pattern exceeds lookup table");
  }
}
const MC33 = {
  name: "MC33",
  corners,
  edges,
  maxVertices: 36,
  table,
  cornerBit: (c) => 0x80 >> c,
  createPolygonizer() {
    const p = new Polygonizer();
    return p.triangles.bind(p);
  },
};

export { corners, edges, table };
export default MC33;
