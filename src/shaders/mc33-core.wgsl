struct CubeVals {
  v0: f32,
  v1: f32,
  v2: f32,
  v3: f32,
  v4: f32,
  v5: f32,
  v6: f32,
  v7: f32,
}

struct FaceTests {
  sum: i32,
  f0: i32,
  f1: i32,
  f2: i32,
  f3: i32,
  f4: i32,
  f5: i32,
}

struct PatternInfo {
  pcase: u32,
  reverse: bool,
}

fn signbit(v: f32) -> bool {
  return v < 0.0;
}

fn corner_offset(c: u32) -> vec3<u32> {
  switch c {
    case 0u: { return vec3<u32>(0u, 0u, 0u); }
    case 1u: { return vec3<u32>(0u, 1u, 0u); }
    case 2u: { return vec3<u32>(0u, 1u, 1u); }
    case 3u: { return vec3<u32>(0u, 0u, 1u); }
    case 4u: { return vec3<u32>(1u, 0u, 0u); }
    case 5u: { return vec3<u32>(1u, 1u, 0u); }
    case 6u: { return vec3<u32>(1u, 1u, 1u); }
    default: { return vec3<u32>(1u, 0u, 1u); }
  }
}

fn corner_bit(c: u32) -> u32 {
  switch c {
    case 0u: { return 0x80u; }
    case 1u: { return 0x40u; }
    case 2u: { return 0x20u; }
    case 3u: { return 0x10u; }
    case 4u: { return 0x08u; }
    case 5u: { return 0x04u; }
    case 6u: { return 0x02u; }
    default: { return 0x01u; }
  }
}

fn edge_corner_a(edge: u32) -> u32 {
  switch edge {
    case 0u: { return 0u; }
    case 1u: { return 1u; }
    case 2u: { return 2u; }
    case 3u: { return 3u; }
    case 4u: { return 4u; }
    case 5u: { return 5u; }
    case 6u: { return 6u; }
    case 7u: { return 7u; }
    case 8u: { return 0u; }
    case 9u: { return 1u; }
    case 10u: { return 2u; }
    default: { return 3u; }
  }
}

fn edge_corner_b(edge: u32) -> u32 {
  switch edge {
    case 0u: { return 1u; }
    case 1u: { return 2u; }
    case 2u: { return 3u; }
    case 3u: { return 0u; }
    case 4u: { return 5u; }
    case 5u: { return 6u; }
    case 6u: { return 7u; }
    case 7u: { return 4u; }
    case 8u: { return 4u; }
    case 9u: { return 5u; }
    case 10u: { return 6u; }
    default: { return 7u; }
  }
}

fn getv(v: CubeVals, i: u32) -> f32 {
  switch i {
    case 0u: { return v.v0; }
    case 1u: { return v.v1; }
    case 2u: { return v.v2; }
    case 3u: { return v.v3; }
    case 4u: { return v.v4; }
    case 5u: { return v.v5; }
    case 6u: { return v.v6; }
    default: { return v.v7; }
  }
}

fn face_test1(face: u32, v: CubeVals) -> u32 {
  switch face {
    case 0u: { return select(0x84u, 0x48u, v.v0 * v.v5 < v.v1 * v.v4); }
    case 1u: { return select(0x42u, 0x24u, v.v1 * v.v6 < v.v2 * v.v5); }
    case 2u: { return select(0x12u, 0x21u, v.v3 * v.v6 < v.v2 * v.v7); }
    case 3u: { return select(0x81u, 0x18u, v.v0 * v.v7 < v.v3 * v.v4); }
    case 4u: { return select(0xA0u, 0x50u, v.v0 * v.v2 < v.v1 * v.v3); }
    default: { return select(0x0Au, 0x05u, v.v4 * v.v6 < v.v5 * v.v7); }
  }
}

fn face_tests(i: u32, v: CubeVals) -> FaceTests {
  var f0 = 0i;
  var f1 = 0i;
  var f2 = 0i;
  var f3 = 0i;
  var f4 = 0i;
  var f5 = 0i;

  if ((i & 0x80u) != 0u) {
    if ((i & 0xCCu) == 0x84u) { f0 = select(1i, -1i, v.v0 * v.v5 < v.v1 * v.v4); }
    if ((i & 0x99u) == 0x81u) { f3 = select(1i, -1i, v.v0 * v.v7 < v.v3 * v.v4); }
    if ((i & 0xF0u) == 0xA0u) { f4 = select(1i, -1i, v.v0 * v.v2 < v.v1 * v.v3); }
  } else {
    if ((i & 0xCCu) == 0x48u) { f0 = select(-1i, 1i, v.v0 * v.v5 < v.v1 * v.v4); }
    if ((i & 0x99u) == 0x18u) { f3 = select(-1i, 1i, v.v0 * v.v7 < v.v3 * v.v4); }
    if ((i & 0xF0u) == 0x50u) { f4 = select(-1i, 1i, v.v0 * v.v2 < v.v1 * v.v3); }
  }

  if ((i & 0x02u) != 0u) {
    if ((i & 0x66u) == 0x42u) { f1 = select(1i, -1i, v.v1 * v.v6 < v.v2 * v.v5); }
    if ((i & 0x33u) == 0x12u) { f2 = select(1i, -1i, v.v3 * v.v6 < v.v2 * v.v7); }
    if ((i & 0x0Fu) == 0x0Au) { f5 = select(1i, -1i, v.v4 * v.v6 < v.v5 * v.v7); }
  } else {
    if ((i & 0x66u) == 0x24u) { f1 = select(-1i, 1i, v.v1 * v.v6 < v.v2 * v.v5); }
    if ((i & 0x33u) == 0x21u) { f2 = select(-1i, 1i, v.v3 * v.v6 < v.v2 * v.v7); }
    if ((i & 0x0Fu) == 0x05u) { f5 = select(-1i, 1i, v.v4 * v.v6 < v.v5 * v.v7); }
  }

  return FaceTests(f0 + f1 + f2 + f3 + f4 + f5, f0, f1, f2, f3, f4, f5);
}

fn interior_test(i: u32, flag13: u32, v: CubeVals) -> u32 {
  let tiny = 1e-9;
  let At = v.v4 - v.v0;
  let Bt = v.v5 - v.v1;
  let Ct = v.v6 - v.v2;
  let Dt = v.v7 - v.v3;
  let denom = At * Ct - Bt * Dt;

  if (signbit(denom)) {
    if ((i & 1u) != 0u) {
      return 0u;
    }
  } else if (((i & 1u) == 0u) || abs(denom) < tiny) {
    return 0u;
  }

  let t = 0.5 * (v.v3 * Bt + v.v1 * Dt - v.v2 * At - v.v0 * Ct) / denom;
  if (t <= tiny || t >= 1.0 - tiny) {
    return 0u;
  }

  let a = v.v0 + At * t;
  let b = v.v1 + Bt * t;
  let c = v.v2 + Ct * t;
  let d = v.v3 + Dt * t;
  let ac = c * a;
  let bd = d * b;

  if ((i & 1u) != 0u) {
    if (ac < bd && !signbit(bd)) {
      return select(0u, 1u, signbit(b) == signbit(getv(v, i))) + flag13;
    }
  } else if (ac > bd && !signbit(ac)) {
    return select(0u, 1u, signbit(a) == signbit(getv(v, i))) + flag13;
  }

  return 0u;
}

fn pattern_info(cubeIdx: u32, v: CubeVals) -> PatternInfo {
  let inverted = (cubeIdx & 0x80u) != 0u;
  let li = select(cubeIdx, cubeIdx ^ 0xFFu, inverted);
  let e0 = table[li];
  let reverseBit = (e0 & 0x800u) != 0u;
  let m = select(reverseBit, !reverseBit, inverted);
  let activeIndex = select(cubeIdx ^ 0xFFu, cubeIdx, m);
  let k = e0 & 0x7FFu;
  let caseId = e0 >> 12u;
  var pcase = 0u;

  switch caseId {
    case 0u: {
      pcase = k;
    }
    case 1u: {
      if ((activeIndex & face_test1(k >> 2u, v)) != 0u) {
        pcase = 183u + (k << 1u);
      } else {
        pcase = 159u + k;
      }
    }
    case 2u: {
      if (interior_test(k, 0u, v) != 0u) {
        pcase = 239u + 6u * k;
      } else {
        pcase = 231u + (k << 1u);
      }
    }
    case 3u: {
      if ((activeIndex & face_test1(k % 6u, v)) != 0u) {
        pcase = 575u + 5u * k;
      } else if (interior_test(k / 6u, 0u, v) != 0u) {
        pcase = 407u + 7u * k;
      } else {
        pcase = 335u + 3u * k;
      }
    }
    case 4u: {
      let ft = face_tests(activeIndex, v);
      if (ft.sum == -3i) {
        pcase = 695u + 3u * k;
      } else if (ft.sum == -1i) {
        if (ft.f4 + ft.f5 < 0i) {
          pcase = select(799u, 759u, ft.f0 + ft.f2 < 0i) + 5u * k;
        } else {
          pcase = 719u + 5u * k;
        }
      } else if (ft.sum == 1i) {
        if (ft.f4 + ft.f5 < 0i) {
          pcase = 983u + 9u * k;
        } else {
          pcase = select(911u, 839u, ft.f0 + ft.f2 < 0i) + 9u * k;
        }
      } else if (interior_test(k >> 1u, 0u, v) != 0u) {
        pcase = 1095u + 9u * k;
      } else {
        pcase = 1055u + 5u * k;
      }
    }
    case 5u: {
      let ft = face_tests(activeIndex, v);
      if (ft.sum == -2i) {
        var cond = false;
        if ((k & 2u) != 0u) {
          cond = interior_test(0u, 0u, v) != 0u;
        } else {
          cond = (interior_test(0u, 0u, v) != 0u) || (interior_test(select(3u, 1u, k != 0u), 0u, v) != 0u);
        }
        pcase = select(1189u + (k << 2u), 1213u + (k << 3u), cond);
      } else if (ft.sum == 0i) {
        pcase = select(1285u, 1261u, get_face_result(ft, 2u + k) < 0i) + (k << 3u);
      } else {
        var cond = false;
        if ((k & 2u) != 0u) {
          cond = interior_test(1u, 0u, v) != 0u;
        } else {
          cond = (interior_test(2u, 0u, v) != 0u) || (interior_test(select(1u, 3u, k != 0u), 0u, v) != 0u);
        }
        pcase = select(1201u + (k << 2u), 1237u + (k << 3u), cond);
      }
    }
    case 6u: {
      let ft = face_tests(activeIndex, v);
      if (ft.sum == -2i) {
        let arg = (0xDA010Cu >> (k << 1u)) & 3u;
        pcase = select(1357u + (k << 2u), 1453u + (k << 3u), interior_test(arg, 0u, v) != 0u);
      } else if (ft.sum == 0i) {
        pcase = select(1741u, 1645u, get_face_result(ft, k >> 1u) < 0i) + (k << 3u);
      } else {
        let arg = (0xA7B7E5u >> (k << 1u)) & 3u;
        pcase = select(1405u + (k << 2u), 1549u + (k << 3u), interior_test(arg, 0u, v) != 0u);
      }
    }
    default: {
      let ft = face_tests(activeIndex, v);
      let ftAbs = abs(ft.sum);
      if (ftAbs == 0i) {
        let kk = select(0u, 2u, ft.f1 < 0i) | select(0u, 1u, ft.f5 < 0i);
        if (ft.f0 * ft.f1 == ft.f5) {
          pcase = 2157u + 12u * kk;
        } else {
          let c = interior_test(kk, 1u, v);
          if (c != 0u) {
            pcase = u32(2285i + 10i * i32(kk) - 40i * i32(c));
          } else {
            pcase = 2285u + 6u * kk;
          }
        }
      } else if (ftAbs == 2i) {
        var idx = 0u;
        if (ft.f0 < 0i) {
          idx += select(0u, 1u, ft.f2 > 0i);
        } else {
          idx += 12u + select(0u, 1u, ft.f2 < 0i);
        }

        if (ft.f1 < 0i) {
          idx += select(0u, 1u, ft.f3 < 0i);
        } else {
          idx += 6u + select(0u, 1u, ft.f3 > 0i);
        }

        pcase = 1917u + 10u * idx;
        if (ft.f4 > 0i) {
          pcase += 30u;
        }
      } else if (ftAbs == 4i) {
        var kk = 21i + 11i * ft.f0 + 4i * ft.f1 + 3i * ft.f2 + 2i * ft.f3 + ft.f4;
        if (kk < 0i || kk >= 16i) {
          if ((kk & 32i) != 0i) {
            kk -= 20i;
          } else {
            kk -= 10i;
          }
        }
        pcase = u32(1845i + 3i * kk);
      } else {
        pcase = u32(1839i + 2i * ft.f0);
      }
    }
  }

  return PatternInfo(pcase + 1u, m);
}

fn get_face_result(ft: FaceTests, idx: u32) -> i32 {
  switch idx {
    case 0u: { return ft.f0; }
    case 1u: { return ft.f1; }
    case 2u: { return ft.f2; }
    case 3u: { return ft.f3; }
    case 4u: { return ft.f4; }
    default: { return ft.f5; }
  }
}
