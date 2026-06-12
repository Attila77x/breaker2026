// Original BREAKER music data, transcribed 1:1 from TC.PAS / ZENE.PAS (1993).
// Note constants are PC-speaker frequencies in Hz (Hungarian solmization: h = B, b = Bb).
// The original played one entry per 18.2065 Hz timer tick (~54.93 ms per entry),
// alternating bass/melody entries to fake two voices on the PC speaker.

(function () {
  const _c = 131, _cis = 138, _d = 146, _dis = 156,
    _e = 165, _f = 175, _fis = 185, _g = 196,
    _gis = 208, _a = 220, _b = 233, _h = 247,
    c = 262, cis = 277, d = 294, dis = 311,
    e = 330, f = 349, fis = 370, g = 392,
    gis = 415, a = 440, b = 466, h = 494,
    c_ = 523, cis_ = 554, d_ = 587, dis_ = 622,
    e_ = 659, f_ = 698, fis_ = 740, g_ = 784,
    gis_ = 831, a_ = 880, h_ = 932;

  window.BREAKER_MUSIC = [
    _c, e, e, _c, g, 0, _e, c_, c_, _e, e, 0, _g, g, g, _g, c_, 0, _a, e, e, _a, g, 0,
    _b, c_, c_, _b, e, 0, _a, g, 0, _a, c_, c_, _g, 0, 0, _g, e_, e_, _e, 0, 0, _e, e_, e_,
    _c, e, e, _c, g, 0, _e, c_, c_, _e, e, 0, _g, g, g, _g, c_, 0, _a, e, e, _a, g, 0,
    _b, c_, c_, _b, e, 0, _a, g, 0, _a, c_, c_, _g, 0, 0, _g, e_, e_, _e, 0, 0, _e, e_, e_,

    _f, f, f, _f, a, 0, _a, c_, c_, _a, f, 0, c, a, a, c, c_, 0, d, f, f, d, a, 0,
    dis, c_, c_, dis, f, 0, d, a, 0, d, c_, c_, c, 0, 0, c, f_, f_, _a, 0, 0, _a, f_, f_,
    _c, e, e, _c, g, 0, _e, c_, c_, _e, e, 0, _g, g, g, _g, c_, 0, _a, e, e, _a, g, 0,
    _b, c_, c_, _b, e, 0, _a, g, 0, _a, c_, c_, _g, 0, 0, _g, e_, e_, _e, 0, 0, _e, e_, e_,

    _g, g, g, _g, h, 0, _h, d_, d_, _h, g, 0, d, h, h, d, d_, 0, e, g, g, e, h, 0,
    f, d_, d_, f, g, 0, e, h, 0, e, d_, d_, d, 0, 0, d, d_, d_, _h, 0, 0, _h, d_, d_,

    _c, c_, c_, _c, g, 0, _e, g, g, _e, g, 0, _g, fis, fis, _g, g, 0, _a, a, a, _a, h, h,
    _b, c_, c_, _b, e, 0, _a, g, 0, _a, c_, c_, _g, 0, 0, _g, 0, 0, _e, 0, 0, _e, 0, 0,

    _c, c_, c_, _c, 0, 0, _e, a, a, _e, c_, c_, _g, 0, 0, _g, 0, 0, _a, dis_, dis_, _a, d_, d_,
    _b, 0, 0, _b, g, 0, _a, a, 0, _a, c_, 0, _g, e_, e_, _g, 0, 0, _e, e_, e_, _e, 0, 0,

    _c, c_, c_, _c, 0, 0, _e, a, a, _e, c_, c_, _g, 0, 0, _g, 0, 0, _a, dis_, dis_, _a, d_, d_,
    _b, 0, 0, _b, g, 0, _a, a, 0, _a, c_, 0, _g, e_, e_, _g, 0, 0, _e, e_, e_, _e, 0, 0,

    _f, c_, c_, _f, 0, 0, _a, a, a, _a, c_, c_, c, 0, 0, c, 0, 0, d, dis_, dis_, d, d_, d_,
    dis, 0, 0, dis, g, 0, d, a, 0, d, c_, 0, c, e_, e_, c, 0, 0, _a, e_, e_, _a, 0, 0,

    _c, c_, c_, _c, 0, 0, _e, a, a, _e, c_, c_, _g, 0, 0, _g, 0, 0, _a, dis_, dis_, _a, d_, d_,
    _b, 0, 0, _b, g, 0, _a, a, 0, _a, c_, 0, _g, e_, e_, _g, 0, 0, _e, e_, e_, _e, 0, 0,

    _g, c_, c_, _g, 0, 0, _h, a, a, _h, c_, c_, d, 0, 0, d, 0, 0, e, dis_, dis_, e, d_, d_,
    f, 0, 0, f, g, 0, e, a, 0, e, c_, 0, d, e_, e_, d, 0, 0, _h, e_, e_, _h, 0, 0,

    _c, c_, c_, _c, 0, 0, _e, a, a, _e, c_, c_, _g, 0, 0, _g, 0, 0, _a, dis_, dis_, _a, d_, d_,
    _b, 0, 0, _b, g, 0, _a, a, 0, _a, c_, 0, _g, e_, e_, _g, 0, 0, _e, e_, e_, _e, 0, 0
  ];
})();
