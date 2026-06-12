{ *** Breaker Constans and Types include file *** }

type
  bricktype = record
    x, y: byte;
    btype, color: byte;
  end;

  bombtype = record
    kx, ky, y, x, bm: shortint;
    exist, normal: boolean;
  end;

  droptype = record
    x, y: byte;
    t: char;
    exist: boolean;
    up1, up2: byte;
  end;

  firetype = record
    x, y: byte;
    can, exist: boolean;
  end;

  ghosttype = record
    x, y: byte;
    exist: boolean;
  end;

  megashoottype = record
    x, y: byte;
    exist: boolean;
  end;

  topone = record
    name: string[10];
    score: word;
    range: byte;
  end;

  keystype = record
    left, rigth,
    fire,
    pause,
    sound,
    music,
    suicide,
    next,
    exit: byte;
  end;

  keystypearray = array [1..9] of byte;

  optionstype = record
    skill: byte;
    players: byte;
    sd, ms, prmode: boolean;
    gs, sln: word;
    k: keystype;
  end;

  topten = array [1..10] of topone;

  extension = string[3];

  shoottype = (normal, glue, big, megashoot);

  playersarray = array [1..4] of word;

const
  maxghost = 256;

  rangestr :  array [1..12] of string [9] =
  ('Beginner', 'Weak', 'Amateur', 'Very Poor', 'Poor', 'Average',
  'Smart', 'Advanced', 'Master', 'Excellent', 'Elite', 'Breaker');

  bns: array [1..8] of integer = (5, 10, 20, 30, 50, 75, 150, 300);
  switch1: array [1..2] of string[3] = ('Off', ' On');
  switch2: array [1..2] of string[3] = (' No', 'Yes');
  no :  boolean = false;
  yes :  boolean = true;

  normalkeys: keystypearray = (75, 77, 57, 25, 31, 50, 30, 49, 1);

  ctrls: array [1..10] of string[15] =
 ('Left', 'Right',
  'Fire', 'Pause',
  'Sound', 'Music',
  'Suicide', 'Next Level',
  'Quit', 'Exit to DOS');


  brstr: array [1..5] of string [40] =
    (' …ÕÕª  …ÕÕª …ÕÕÕ …ÕÕÕª À  … …ÕÕÕ …ÕÕª ',
     ' ∫  ∫  ∫  ∫ ∫    ∫   ∫ ∫ …º ∫    ∫  ∫ ',
     ' ÃÕÕ ª ÃÕÀº ÃÕÕ  ÃÕÕÕπ ÃÕπ  ÃÕÕ  ÃÕÀº ',
     ' ∫   ∫ ∫ »ª ∫    ∫   ∫ ∫ »ª ∫    ∫ »ª ',
     ' »ÕÕÕº      »ÕÕÕ          » »ÕÕÕ      ');

const
  musiclength = 576;
  musicdata: array [1..musiclength] of integer = (

  _c, e, e, _c, g, 0, _e, c_, c_, _e, e, 0, _g, g, g, _g, c_, 0, _a, e, e, _a, g, 0,
  _b, c_, c_, _b, e, 0, _a, g, 0, _a, c_, c_, _g, 0, 0, _g, e_, e_, _e, 0, 0, _e, e_, e_,
  _c, e, e, _c, g, 0, _e, c_, c_, _e, e, 0, _g, g, g, _g, c_, 0, _a, e, e, _a, g, 0,
  _b, c_, c_, _b, e, 0, _a, g, 0, _a, c_, c_, _g, 0, 0, _g, e_, e_, _e, 0, 0, _e, e_, e_,

  _f, f, f, _f, a, 0, _a, c_, c_, _a, f, 0, c, a, a, c, c_, 0, d, f, f, d, a, 0,
  dis, c_, c_, dis, f, 0, d, a, 0, d, c_, c_, c, 0, 0, c, f_, f_, _a, 0, 0, _a, f_, f_,
  _c, e, e, _c, g, 0, _e, c_, c_, _e, e, 0, _g, g, g, _g, c_, 0, _a, e, e, _a, g, 0,
  _b, c_, c_, _b, e, 0, _a, g, 0, _a, c_, c_, _g, 0, 0, _g, e_, e_, _e, 0, 0, _e, e_, e_,

  _g, g, g, _g, h, 0, _h, d_, d_, _h, g, 0, d, h, h, d, d_, 0, e, g, g, e, h, 0,
   f, d_, d_,  f, g, 0,  e, h, 0,  e, d_, d_, d, 0, 0, d, d_, d_, _h, 0, 0, _h, d_, d_,

  _c, c_, c_, _c, g, 0, _e, g, g, _e, g, 0, _g, fis, fis, _g, g, 0, _a, a, a, _a, h, h,
  _b, c_, c_, _b, e, 0, _a, g, 0, _a, c_, c_, _g, 0, 0, _g, 0, 0, _e, 0, 0, _e, 0, 0,

  _c, c_, c_, _c, 0, 0, _e, a, a, _e, c_, c_, _g, 0, 0, _g, 0, 0, _a, dis_, dis_, _a, d_, d_,
  _b, 0, 0, _b, g, 0, _a, a, 0, _a, c_, 0, _g, e_, e_, _g, 0, 0, _e, e_, e_, _e, 0, 0,

  _c, c_, c_, _c, 0, 0, _e, a, a, _e, c_, c_, _g, 0, 0, _g, 0, 0, _a, dis_, dis_, _a, d_, d_,
  _b, 0, 0, _b, g, 0, _a, a, 0, _a, c_, 0, _g, e_, e_, _g, 0, 0, _e, e_, e_, _e, 0, 0,

  _f, c_, c_, _f, 0, 0, _a, a, a, _a, c_, c_,  c, 0, 0,  c, 0, 0,  d, dis_, dis_,  d, d_, d_,
  dis, 0, 0, dis, g, 0,  d, a, 0,  d, c_, 0, c, e_, e_, c, 0, 0, _a, e_, e_, _a, 0, 0,

  _c, c_, c_, _c, 0, 0, _e, a, a, _e, c_, c_, _g, 0, 0, _g, 0, 0, _a, dis_, dis_, _a, d_, d_,
  _b, 0, 0, _b, g, 0, _a, a, 0, _a, c_, 0, _g, e_, e_, _g, 0, 0, _e, e_, e_, _e, 0, 0,

  _g, c_, c_, _g, 0, 0, _h, a, a, _h, c_, c_, d, 0, 0, d, 0, 0, e, dis_, dis_, e, d_, d_,
   f, 0, 0,  f, g, 0,  e, a, 0,  e, c_, 0, d, e_, e_, d, 0, 0, _h, e_, e_, _h, 0, 0,

  _c, c_, c_, _c, 0, 0, _e, a, a, _e, c_, c_, _g, 0, 0, _g, 0, 0, _a, dis_, dis_, _a, d_, d_,
  _b, 0, 0, _b, g, 0, _a, a, 0, _a, c_, 0, _g, e_, e_, _g, 0, 0, _e, e_, e_, _e, 0, 0

  );

{ *** End *** }
