fn cell_triangles(v: CubeVals, mask: u32) -> TriangleCodes {
  let info = pattern_info(mask, v);
  var pcase = info.pcase;
  var result: TriangleCodes;
  loop {
    if (pcase >= 2310u || result.count >= 12u) { break; }
    let word = table[pcase];
    let a = word & 0xFu;
    let b = (word >> 4u) & 0xFu;
    let c = (word >> 8u) & 0xFu;
    if (a <= 12u && b <= 12u && c <= 12u && a != b && b != c && a != c) {
      result.codes[result.count] = select(vec3<u32>(a,b,c), vec3<u32>(a,c,b), info.reverse);
      result.count += 1u;
    }
    if ((word & 0x1000u) == 0u) { break; }
    pcase += 1u;
  }
  return result;
}
