program breaker;

{$i-,s-,r-,d+}

uses
  crt, sajat, zene, keyint;

{$i tc.pas}

var
  tp: topten;
  levels: array [1..999] of byte;
  player, pl, skill: byte;
  delay, nextrange, life, score: playersarray;
  range: array [1..4] of byte;
  loadlevel, lvn, level, db: integer;
  demo, pki, exitdos, normquit, sd, entlife: boolean;
  sln, gs: word;
  k: keystype;
  kt: keystypearray absolute k;
  onestr: extension;

procedure snd(x, d: word; ns: boolean);

begin
  if sd then sound(x);
  wait(d);
  if sd and ns then nosound;
end;

procedure getstr(gx, gy: byte; var s: string);

var
  lk: byte;

begin
  fillline(gx, gy, 1, 3, 32);
  textattr:=112;
  gotoxy(gx, gy);
  write(s);
  repeat
    repeat
      lk:=lastkey;
    until (lk in [1..11, 14, 28]);
    lastkey:=0;
    case lk of
      14:
        begin
          if length(s)>0 then
            s:=copy(s, 1, length(s)-1);
          gotoxy(gx+length(s), gy); write(' ');
        end;
      28: ;
      1: s:='';
    else
      if lk=11 then
      begin
        if length(s)<3 then
          s:=s+'0'
      end
      else
        if length(s)<3 then
          s:=s+char(lk+47);
    end;
    gotoxy(gx, gy);
    write(s);
  until (lk=28);
  textattr:=7;
end;

procedure load(var st);

var
  i: integer;
  tg: bricktype;
  s: string[3] absolute st;
  f: file of bricktype;

begin
  assign(f, 'BREAKER.'+s);
  reset(f);
  if ioresult = 0 then
  begin
    db:=0;
    for i:=1 to filesize(f) do
    begin
      read(f, tg);
      with tg do
      begin
        fillline(x, y, 1, 4, btype);
        fillline(x, y, 2, 4, color);
      end;
      if not (tg.btype in [30, 219, 24]) then inc(db);
    end;
    close(f);
  end;
end;

procedure viewbests;

var
  i: byte;

begin
  window(5, 12, 40, 25);
  textattr:=7; clrscr;
  window(1, 1, 80, 25);
  rectangle(5, 12, 40, 25, 2, 7);
  gotoxy(16, 12); write('[ Top  Ten ]');
  textattr:=15;
  for i:=1 to 10 do
  begin
    gotoxy(9, 13+i);
    write(tp[i].name);
    gotoxy(20, 13+i);
    write(tp[i].score: 5);
    gotoxy(29, 13+i);
    write(rangestr[tp[i].range]);
    textattr:=7;
  end;
end;

procedure createbs(mode: boolean);

var
  i: byte;
  r: file of topten;

begin
  assign(r, 'Breaker.Hsc');
  reset(r);
  if (ioresult <> 0) or mode then
  begin
    rewrite(r);
    for i:=1 to 10 do
    begin
      tp[i].name:='No Name';
      tp[i].score:=(11-i);
      tp[i].range:=1;
    end;
    write(r, tp);
    seek(r, 0);
    close(r);
    reset(r);
  end;
  read(r, tp);
  close(r);
end;

procedure searchlevel;

var
  i: integer;
  s: string[3];
  f: file of bricktype;

begin
  winwrite(30, 11, 50, 13, 2, 7, 130);
  textattr:=143;
  gotoxy(35, 12); write('Please Wait');
  textattr:=7; lvn:=0;
  for i:=1 to sln do
  begin
    str(i, s);
    assign(f, 'BREAKER.'+s);
    reset(f);
    if ioresult=0 then
    begin
      inc(lvn);
      levels[lvn]:=i;
      close(f);
    end;
  end;
  winclose;
  if lvn=0 then
  begin
    write(#7);
    winwrite(25, 9, 55, 15, 2, 7, 135);
    gotoxy(29, 11); write('Breaker.??? not found');
    gotoxy(34, 13); writeln('Press any key');
    key[0]:=false;
    repeat until pressedkey;
    winclose;
    clrscr;
    kurzor_be;
    endkey;
    halt;
  end;
end;

procedure saveoptions;

var
  f: file of optionstype;
  o: optionstype;

begin
  o.skill:=skill;
  o.players:=pl;
  o.prmode:=entlife;
  o.sd:=sd;
  o.ms:=musicok;
  o.gs:=gs;
  o.k:=k;
  o.sln:=sln;
  assign(f, 'BREAKER.CFG');
  rewrite(f);
  write(f, o);
  close(f);
  snd(1000, 10, yes);
end;

procedure loadoptions(mode: boolean);

var
  f: file of optionstype;
  o: optionstype;

begin
  assign(f, 'BREAKER.CFG');
  reset(f);
  if (ioresult = 0) and mode then
  begin
    read(f, o);
    close(f);
    skill:=o.skill;
    pl:=o.players;
    entlife:=o.prmode;
    sd:=o.sd;
    musicok:=o.ms;
    gs:=o.gs;
    k:=o.k;
    sln:=o.sln;
  end
  else
  begin
    skill:=5;
    pl:=1;
    sln:=200;
    entlife:=false;
    sd:=true;
    musicok:=false;
    gs:=sln div 2;
    kt:=normalkeys;
    if mode then saveoptions;
  end;
end;

function sure: boolean;

begin
  winwrite(20, 14, 62, 18, 2, 7, 15);
  textattr:=15;
  gotoxy(24, 16);
  write('Are you sure want to do it (Y/N) ?');
  textattr:=7;
  snd(2000, 5, yes);
  repeat
  until key[21] or key[49];
  winclose;
  if hitkey(21) then
    sure:=true
  else
    sure:=false;
  resetkeys;
end;

procedure rightwrite(s: string);

var
  x, y: byte;

begin
  x:=wherex; y:=wherey;
  dec(x, length(s)-1);
  gotoxy(x, y);
  write(s);
end;

procedure viewcontrol(y: byte);

begin
  gotoxy(49, 13+y);
  write(ctrls[y]);
  fillline(wherex+1, 13+y, 1, 70-wherex, byte('.'));
  gotoxy(71, 13+y);
  if (y < 10) then rightwrite(' '+keyname(kt[y]))
  else rightwrite(' Ctrl+Q');
end;

procedure redefiniekeys;

var
  i, c, lk: byte;
  m, ok: boolean;

begin
  resetkeys;
  m:=musicok;
  musicok:=false;
  winwrite(34, 2, 75, 10, 2, 7, 7);
  gotoxy(50, 2); write('[ Warning ]');
  gotoxy(40, 4); write('Please do not use this keys:');
  gotoxy(56, 6); write('Ctrl');
  gotoxy(56, 7); write('Pause');
  gotoxy(56, 8); write('Print Screen');
  snd(100, 500, yes);
  for i:=1 to 9 do
  begin
    fillline(48, 13+i, 2, 25, 112);
    ok:=false;
    repeat
      lk:=lastkey;
      if lk > 0 then
      begin
        ok:=true;
        kt[i]:=0;
        for c:=1 to i do
          if kt[c]=lk then ok:=false;
        kt[i]:=lk;
      end;
    until ok;
    lastkey:=0;
    snd(3000, 10, yes);
    fillline(48, 13+i, 2, 25, 7);
    viewcontrol(i);
  end;
  winclose;
  musicok:=m;
end;

procedure options;

const
  mp: array [1..11] of string [16] = ('Skill Level:    ', 'Players:        ',
  'Practice Mode:', 'Music:', 'Sound:', 'Group Size:', 'Max. Level:',
  'Redefinie Keys', 'Save Options', 'Set Defaults', 'Main Menu');

  equal: array [1..2,1..2] of byte =((6, 8), (5 ,9));

var
  lk, i, vi, c: byte;
  quitmenu: boolean;
  s: string;
  code: integer;

procedure writemenupoints;

var
  i: byte;

begin
  for i:=1 to 11 do
  begin
    gotoxy(10, 4+i);
    write(mp[i]);
    case i of
      1: write(skill: 3);
      2: write(pl: 3);
      3: write(switch2[byte(entlife)+1]: 5);
      4: write(switch1[byte(musicok)+1]: 13);
      5: write(switch1[byte(sd)+1]: 13);
      6: write(gs: 8);
      7: write(sln: 8);
    end;
  end;
end;

begin
  winwrite(7, 3, 31, 17, 2, 7, 7);
  rectangle(7, 3, 31, 17, 2, 7);
  sscr(10, 7, 1, byte('¹'));
  sscr(3, 29, 1, byte('Ê'));
  writemenupoints;
  i:=5;
  fillline(9, i, 2, 21, 112);
  quitmenu:=false;
  if (gs > sln) then gs:=sln;
  repeat
    vi:=i;
    lk:=lastkey;
    lastkey:=0;
    if (key[29]) and (key[16]) then
    begin
      i:=5;
      lk:=28;
    end;
    for c:=1 to 2 do
      if lk=kt[equal[c, 1]] then
      begin
        lk:=28;
        i:=equal[c, 2];
      end;
    if lk=1 then
    begin
      lk:=28;
      i:=15;
    end;
    if lk=80 then inc(i);
    if lk=72 then dec(i);
    if i=16 then i:=5;
    if i=4 then i:=15;
    if (lk in [28, 75, 77]) then
    begin
      case i of
       15: if lk=28 then quitmenu:=true;
        5: begin
             if lk=75 then
             begin
               dec(skill);
               if skill=0 then skill:=8;
             end
             else
             begin
               inc(skill);
               if skill=9 then skill:=1;
             end;
             sscr(i, 28, 1, skill+48);
           end;
        6: begin
             if lk=75 then
             begin
               dec(pl);
               if pl=0 then pl:=4;
             end
             else
             begin
               inc(pl);
               if pl=5 then pl:=1;
             end;
             sscr(i, 28, 1, pl+48);
           end;
        7: begin
             entlife:=not entlife;
             gotoxy(26, i);
             write(switch2[byte(entlife)+1]:3);
             fillline(26, i, 2, 3, 112);
           end;
        8: begin
             musicok:=not musicok;
             gotoxy(26,i);
             write(switch1[byte(musicok)+1]:3);
             fillline(26, i, 2, 3, 112);
           end;
        9: begin
             sd:=not sd;
             gotoxy(26,i);
             write(switch1[byte(sd)+1]:3);
             fillline(26, i, 2, 3, 112);
           end;
       10: begin
             if lk=75 then
             begin
               dec(gs);
               if gs = 0 then gs:=sln;
             end
             else
             if lk=77 then
             begin
               inc(gs);
               if (gs > sln) then gs:=1;
             end
             else
             begin
               s:='';
               kurzor_be;
               snd(500, 5, yes);
               repeat
                 getstr(26, i, s);
                 val(s, gs, code);
               until (gs > 0) and (gs <= sln);
               snd(2000, 5, yes);
               kurzor_ki;
             end;
             gotoxy(26, i);
             write(gs: 3);
             fillline(26, i, 2, 3, 112);
           end;
       11: begin
             if lk=75 then
             begin
               dec(sln);
               if (sln = 0) then sln:=999;
             end
             else
             if lk=77 then
             begin
               inc(sln);
               if (sln > 999) then sln:=1;
             end
             else
             begin
               s:='';
               kurzor_be;
               snd(500, 5, yes);
               repeat
                 getstr(26, i, s);
                 val(s, sln, code);
               until (sln > 0) and (sln <= sln);
               snd(2000, 5, yes);
               kurzor_ki;
             end;
             gotoxy(26, i);
             write(sln: 3);
             fillline(26, i, 2, 3, 112);
           end;
       12: if lk=28 then
           begin
             if sure then
               redefiniekeys;
           end;
       13: begin
             if sure then
               saveoptions;
           end;
       14: begin
             if sure then
             begin
               loadoptions(false);
               writemenupoints;
               fillline(9, i, 2, 21, 112);
               for c:=1 to 9 do
                 viewcontrol(c);
             end;
           end;
      end;
    end;
    if (i<>vi) then
    begin
      fillline(9, i, 2, 21, 112);
      fillline(9, vi, 2, 21, 7);
    end;
    wait(10);
  until quitmenu;
  winclose;
end;

procedure menu;

const
  mp: array [1..5] of string [20] = ('Start Game', 'Exit to Dos',
  'Demo Mode', 'Game Options', 'Reset High Scores');

var
  lk, i, vi: byte;
  quitmenu: boolean;

begin
  textattr:=7; clrscr;
  rectangle(5, 2, 29, 10, 2, 7);
  rectangle(45, 12, 75, 25, 2, 7);
  rectangle(34, 2, 75, 10, 2, 7);
  textattr:=15;
  for i:=1 to 5 do
  begin
    gotoxy(36, 3+i);
    write(brstr[i]);
  end;
  textattr:=7;
  gotoxy(55, 12);
  write('[ Control ]');
  for i:=1 to 10 do
  begin
    viewcontrol(i);
  end;
  viewbests;
  for i:=1 to 5 do
  begin
    gotoxy(9, 3+i);
    write(mp[i]);
  end;
  i:=4;
  fillline(7, i, 2, 21, 112);
  quitmenu:=false;
  demo:=false;
  repeat
    vi:=i;
    lk:=lastkey;
    lastkey:=0;
    if (key[29]) and (key[16]) then
    begin
      i:=5;
      lk:=28;
    end;
    if lk=80 then inc(i);
    if lk=72 then dec(i);
    if lk=k.music then musicok:=not musicok;
    if i=9 then i:=4;
    if i=3 then i:=8;
    if lk=28 then
    begin
      case i of
        4: quitmenu:=true;
        5: begin
             exitdos:=true;
             quitmenu:=true;
           end;
        6: begin
             demo:=true;
             quitmenu:=true;
           end;
        7: begin
             options;
             i:=4;
           end;
        8: begin
             winwrite(14, 14, 67, 18, 2, 7, 15);
             textattr:=15;
             gotoxy(18, 16);
             write('Are you sure want to clear high scores (Y/N) ?');
             textattr:=7;
             snd(70, 500, yes);
             repeat
             until key[21] or key[49];
             winclose;
             if hitkey(21) then
             begin
               createbs(true);
               viewbests;
             end;
             resetkeys;
           end;
      end;
    end;
    if (i<>vi) then
    begin
      fillline(7, i, 2, 21, 112);
      fillline(7, vi, 2, 21, 7);
    end;
    wait(10);
  until quitmenu;
  for i:=1 to pl do
    delay[i]:=(10-skill)*5;
  resetkeys;
end;

procedure playgame;

const
  jt: string [4] = #3#8#176#1;
  bt: string [10] = #250#249#7#254#42#15#15#7#250#32;
  dt: string [7] = 'LGEMXPF';

var
  ur, ux, lx, ly, ix, iy: shortint;
  vux, vlx, vly: shortint;
  nextlevel, normexit, gameover: boolean;
  shsize, x: byte;

  g: array [1..maxghost] of ghosttype;
  b: bombtype;
  d: droptype;
  s: shoottype;
  f: firetype;
  m: megashoottype;

{}

procedure movetostart; forward;

procedure clearthing(x, y: byte);

begin
  sscr(y, x, 1, 32);
  sscr(y, x, 2, 7);
end;

procedure clearletter;

begin
  if d.exist then
  begin
    sscr(d.y, d.x, 1, d.up1);
    sscr(d.y, d.x, 2, d.up2);
  end;
end;

procedure viewletter;

begin
  if d.exist then
  begin
    sscr(d.y, d.x, 1, byte(d.t));
    sscr(d.y, d.x, 2, 14);
  end;
end;

procedure writesound;

begin
  gotoxy(57, 21); write('Sound  : ', switch1[byte(sd)+1]: 7);
end;

procedure writemusic;

begin
  gotoxy(57, 23);
  write('Music  : ', switch1[byte(musicok)+1]: 7);
end;

procedure writelives;

begin
  gotoxy(57, 7);
  if entlife then write('Lives  :  Etr. Life')
  else write('Lives  : ', life[player]: 7);
end;

procedure declives;

var
  i: byte;

begin
  if not gameover then
  begin
    if not entlife then dec(life[player]);
    gameover:=true;
    for i:=79 downto 0 do
    begin
      snd(i*30, 4, no);
      sscr(ly, lx, 1, byte(bt[10-(i div 8)]));
    end;
    if sd then nosound;
    writelives;
  end;
end;

procedure writescore;

begin
  if db < 0 then db:=0;
  if db = 0 then gameover:=true;
  gotoxy(57, 9); write('Brick  : ', db: 7);
  gotoxy(57, 11); write('Score  : ', score[player]: 7);
end;

procedure writerange;

var
  s: byte;

begin
  gotoxy(57, 19);
  s:=71-length(rangestr[range[player]]) div 2;
  write('Range  : ',  '': 10);
  gotoxy(s, 19);
  write(rangestr[range[player]]);
end;

procedure writeshoot;

begin
  gotoxy(57, 17); write('Shoot  :');
  write(switch2[byte(f.can)+1]: 8);
end;

procedure negmusic;

begin
  musicok:=not musicok;
  writemusic;
end;

procedure negsound;

begin
  sd:=not sd;
  writesound;
end;

procedure nextbomb(var b: bombtype);

begin
  with b do
    if normal then
    begin
      inc(bm);
      if bm > 3 then bm:=0;
      if gscr(y, x, 1)<>30 then
      begin
        x:=kx+bm;
        y:=ky;
      end;
    end
    else
    begin
      exist:=false;
    end;
end;

procedure viewshoot;

var
  x: byte;

begin
  if (ux < vux) then sscr(25, ux+shsize, 1, 32)
  else if (ux > vux) then sscr(25, ux-1, 1, 32);
  sscr(25, ux, 1, byte('Ü'));
  sscr(25, ux+1, 1, byte('Û'));
  for x:=ux+2 to ux+shsize-3 do
    sscr(25, x, 1, byte('ß'));
  sscr(25, ux+shsize-2, 1, byte('Û'));
  sscr(25, ux+shsize-1, 1, byte('Ü'));
  if (s = megashoot) then
    sscr(25, ux+shsize div 2, 1, byte('Û'));
  fillline(ux, 25, 2, shsize, 7);
end;

function searchbrick(y, mx: shortint): shortint;

var
  k, i: shortint;

begin
  i:=2;
  k:=0;
  repeat
    if (gscr(y, i, 1) = gscr(y, mx, 1)) then
    begin
      if (i > mx-4) then k:=i else inc(i, 4);
    end
    else inc(i);
  until (k > 0);
  searchbrick:=k;
end;

procedure keybtest;

begin
  if hitkey(k.suicide) then
  begin
    declives;
  end;
  if key[16] and key[29] then
  begin
    for player:=1 to pl do life[player]:=0;
      normquit:=false;
      exitdos:=true;
      gameover:=true;
  end;
  if hitkey(k.exit) then
  begin
    winwrite(6, 4, 45, 8, 2, 7, 15);
    textattr:=15;
    gotoxy(9, 6);
    write('Do you really wish to quit (Y/N) ?');
    textattr:=7;
    repeat
    until key[21] or key[49];
    if hitkey(21) then
    begin
      for player:=1 to pl do
        life[player]:=0;
      gameover:=true;
      normexit:=false;
    end;
    winclose;
    resetkeys;
  end;
  if hitkey(k.pause) then
  begin
    winwrite(9, 5, 41, 10, 2, 7, 15);
    textattr:=15;
    gotoxy(20, 7);
    write('Game Paused');
    gotoxy(13, 8);
    textattr:=135;
    write('Press any key to continue');
    lastkey:=0;
    repeat
    until lastkey>0;
    winclose;
    textattr:=7;
  end;
  if hitkey(k.music) then
  begin
    negmusic;
  end;
  if hitkey(k.sound) then
  begin
    negsound;
  end;
  if demo then
  begin
    if (f.can) and (not f.exist) and (random < 0.5) then
    begin
      f.exist:=true;
      f.x:=ux+shsize div 2;
      f.y:=24;
    end
    else
    if (s = megashoot) and not (m.exist) then
    begin
      m.x:=ux+(shsize div 2);
      m.exist:=true;
      m.y:=24;
      s:=normal;
    end;
  end
  else
  begin
    if (hitkey(k.fire) or key[k.fire]) then
    begin
      if (f.can) and (not f.exist) then
      begin
        f.exist:=true;
        f.x:=ux+shsize div 2;
        f.y:=24;
      end
      else
      if (s = megashoot) and not (m.exist) then
      begin
        m.exist:=true;
        m.x:=ux+(shsize div 2);
        m.y:=24;
        s:=normal;
      end;
    end;
  end;
  if key[k.next] then nextlevel:=true;
end;

procedure movebreaker;

var
  x: byte;

begin
  vux:=ux;
  if demo then
  begin
    if (b.exist) and (b.y > 16) and (b.x > ux-2) and (b.x < ux+shsize+1) and
       ((ly < 23) or (iy = -1)) then
    begin
      if (b.x+7 < 49) and (ux < 43) and (b.x < ux+(shsize div 2)) then
      begin
        inc(ux);
      end
      else
      if (ux > 2) and (b.x > shsize+1) then
        dec(ux)
      else
        inc(ux);
    end
    else
    begin
      if (ux < 50-shsize) and (ux+1 < lx) then inc(ux);
      if (ux > 2) and (ux+shsize-2 > lx) then dec(ux);
    end;
  end
  else
  begin
    if (key[k.left] or hitkey(k.left)) then
    begin
      if (ux > 2) then dec(ux);
    end;
    if (key[k.rigth] or hitkey(k.rigth)) then
    begin
      if (ux < 50-shsize) then inc(ux);
    end;
  end;
  viewshoot;
end;

procedure fillbrick(x, y: shortint; t, c: byte);

var
  i: byte;

begin
  for i:=0 to 3 do
  begin
    sscr(y, x+i, 1, t);
    sscr(y, x+i, 2, c);
    if d.exist and (y = d.y) and (x+i = d.x) then
    begin
      d.up1:=t; d.up2:=c;
    end;
  end;
end;

procedure startletter(tx, ty: byte);

begin
  with d do
  begin
    x:=tx+random(4); y:=ty;
    t:=dt[random(length(dt))+1];
    exist:=true; up1:=32; up2:=7;
    sscr(y, x, 1, byte(t));
    sscr(y, x, 2, 14);
  end;
end;

function letter(x, y: byte): boolean;

begin
  letter:=(d.exist and (x = d.x) and (y = d.y));
end;

procedure brick(ty, tx: shortint);

var
  j, tt: byte;
  i: integer;

begin
  tt:=gscr(ty, tx, 1);
  if (tt <> 2) then
  begin
    tx:=searchbrick(ty, tx);
    case tt of
     4: if not gameover then
        begin
           inc(score[player], 10);
           db:=0;
           fillbrick(tx, ty, 32, 7);
        end;
   176: begin
          fillbrick(tx, ty, 32, 7);
          inc(score[player], 1);
          dec(db);
          if not d.exist and (random < 0.1) then
            startletter(tx, ty);
        end;
    15: begin
          case random(20) of
            0..3:
                begin
                  fillbrick(tx, ty, byte(jt[random(length(jt))+1]), gscr(ty, tx, 2));
                end;
            4..19:
                if d.exist then
                begin
                  fillbrick(tx, ty, byte(jt[random(length(jt))+1]), gscr(ty, tx, 2));
                end
                else
                begin
                  dec(db);
                  fillbrick(tx, ty, 32, 7);
                  startletter(tx, ty);
                end;
          else
           inc(score[player], 1);
          end;
        end;
   177: begin
          fillbrick(tx, ty, 176, gscr(ty, tx, 2));
          inc(score[player], 1);
        end;
   178: begin
          fillbrick(tx, ty, 177, gscr(ty, tx, 2));
          inc(score[player], 2);
        end;
 24, 8: begin
          if tt=8 then
          begin
            fillbrick(tx, ty, 32, 7);
            dec(db);
            inc(score[player]);
          end;
          if (s <> megashoot) then f.can:=true;
          writeshoot;
        end;
    30: with b do
        begin
          if b.exist and ((tx <> kx) or (ty <> ky)) then
          begin
            if (gscr(y, x, 1) = 31) then
            begin
              clearthing(b.x, b.y);
            end;
            exist:=false;
          end;
          if not exist then
          begin
            kx:=tx; ky:=ty; y:=ty;
            x:=tx; bm:=0; exist:=true;
            normal:=true;
          end;
        end;
     3: begin
          inc(score[player], trunc(random*10)+5);
          fillbrick(tx, ty, 32, 7);
          dec(db);
        end;
     1: begin
          j:=0; dec(db);
          for i:=1 to maxghost do
          with g[i] do
          begin
            if not exist then
            begin
              x:=tx+j; y:=ty; exist:=true;
              sscr(ty, tx+j, 2, 7);
              inc(j);
              if j=4 then i:=maxghost;
            end;
          end;
          fillbrick(tx, ty, 2, 7);
        end;
    end;
    writescore;
  end;
end;

function isbrick(x, y: byte): boolean;

begin
  isbrick:=not (gscr(y, x, 1) in [7, 9, 31, 32, 234]);
end;

procedure moveball;

var
  i, vix, viy: shortint;

procedure balltest;

begin
  clearletter;
  if isbrick(lx, ly) then
  begin
    brick(ly, lx);
    ix:=-ix;
    iy:=-iy;
    inc(lx, ix);
    inc(ly, iy);
  end;
  if (lx>5) then
  begin
    if isbrick(lx-1, ly) then
    begin
      brick(ly, lx-1);
      ix:=+1;
    end;
  end;
  if (lx<46) then
  begin
    if isbrick(lx+1, ly) then
    begin
      brick(ly, lx+1);
      ix:=-1;
    end;
  end;
  if (ly>2) then
  begin
    if isbrick(lx, ly-1) then
    begin
      brick(ly-1, lx);
      iy:=+1;
    end;
  end;
  if (iy=1) then
  begin
    if isbrick(lx, ly+1) then
    begin
      brick(ly+1, lx);
      iy:=-1;
    end;
  end;
  viewletter;
end;

procedure breakertest;

begin
  if (ly > 23) then
  begin
    if ((ix=+1) and (lx in [ux-1, ux])) or
       ((ix=-1) and (lx in [ux+shsize, ux+shsize-1])) then
    begin
      ix:=-ix;
      iy:=-1;
    end;
    if (lx > ux) and (lx < ux+shsize-1) then iy:=-1;
    if (s = glue) and ((lx in [ux+1..ux+shsize-2]) or
                      ((lx = ux) and (ix = 1)) or
                      ((lx = shsize-1) and (ix = -1))) then
    begin
      ur:=(lx-ux);
      if f.exist then
      begin
        f.exist:=false;
        clearthing(f.x, f.y);
      end;
      movetostart;
      if (ur < 3) then ix:=-1
      else if (ur > 3) then ix:=1
      else ix:=1-trunc((random*2))*2;
    end;
  end;
end;

procedure alltest;

begin
  if (ly+iy>24) then breakertest;
  if (lx=2) then ix:=1;
  if (lx=49) then ix:=-1;
  if (ly=2) then iy:=1;
  inc(lx, ix); inc(ly, iy);
  if (ly > 24) then
  begin
    sscr(vly, vlx, 1, 32);
    sscr(vly, vlx, 2, 7);
    declives;
  end
  else
    if (ly < 22) then
    begin
      balltest;
    end;
  if (lx=2) then ix:=1;
  if (lx=49) then ix:=-1;
  if (ly=2) then iy:=1;
end;

begin
  vlx:=lx; vly:=ly;
  vix:=ix; viy:=iy;
  alltest;
  sscr(vly, vlx, 1, 32);
  sscr(vly, vlx, 2, 7);
  if not gameover then
  begin
    sscr(ly, lx, 1, 9);
    sscr(ly, lx, 2, 15);
  end;
  if (ix <> vix) or (iy <> viy) then
  begin
    snd(800, 2, no);
    snd(1000, 2, yes);
  end;
end;

procedure moveb(i: shortint);

begin
  if (not (gscr(ly+i, lx, 1) in [31, 7])) and (ly > 2) and (ly < 25) then
  begin
    clearthing(lx, ly);
    if (gscr(ly+i, lx, 1) <> 32) then
    begin
      clearletter;
      brick(ly+i, lx);
      viewletter;
      snd(800, 3, yes);
    end
    else
    begin
      iy:=i;
      inc(ly, i);
      snd(2000, 3, yes);
    end;
    sscr(ly, lx, 1, 9);
    sscr(ly, lx, 2, 15);
  end;
  if (i = -1) then f.exist:=false;
end;

procedure bangtest;

begin
  if (b.exist) and (f.exist) and (f.x = b.x) and ((f.y = b.y)) then
  begin
    snd(2000, 5, yes);
    clearthing(f.x, f.y);
    nextbomb(b);
    f.exist:=false;
  end;
end;

procedure moveshoot;

var
  i: integer;

begin
  clearthing(f.x, f.y);
  dec(f.y);
  bangtest;
  if (gscr(f.y, f.x, 1) = 9) then moveb(-1);
  if (gscr(f.y, f.x, 1) = 2) then
    for i:=1 to maxghost do
    with g[i] do
      if exist and (f.x = x) and (f.y = y) then
      begin
        exist:=false; f.exist:=exist;
        sscr(y, x, 1, 32);
        snd(2000, 3, yes);
        inc(score[player]);
        writescore;
      end;
  if isbrick(f.x, f.y) and not letter(f.x, f.y) then
  begin
    clearletter;
    brick(f.y, f.x);
    viewletter;
    snd(3000, 2, yes);
    f.exist:=false;
  end;
  if (f.y = 1) then f.exist:=false;
  if f.exist then
  begin
    sscr(f.y, f.x, 1, 7);
    sscr(f.y, f.x, 2, 15);
  end;
end;

procedure movemegashoot;

var
  i: integer;
  gs: byte;

begin
  clearthing(m.x, m.y);
  dec(m.y);
  clearletter;
  gs:=gscr(m.y, m.x, 1);
  case gs of
    31:
      if (gscr(b.y, b.x, 1) = 31) then
      begin
        clearthing(b.x, b.y);
        b.exist:=false;
      end;
    9: moveb(-1);
    2:
      for i:=1 to maxghost do
      with g[i] do
        if exist and (m.x = x) and (m.y = y) then
        begin
          exist:=false;
          snd(2000, 3, yes);
          inc(score[player]);
          writescore;
        end;
    1, 3, 4, 8, 15, 24, 30, 176, 177, 178, 219:
      begin
        snd(2000, 5, yes);
        case gs of
          4, 176, 3, 8, 24:
          begin
            brick(m.y, m.x);
          end;
          177, 178, 1, 15:
          begin
            dec(db);
          end;
          30:
          begin
            if b.exist and (b.ky = m.y) and (searchbrick(m.y, m.x) = b.kx) then
            begin
              b.normal:=false;
            end;
          end;
        end;
        if (gscr(m.y, m.x, 1) <> 32) then
          fillbrick(searchbrick(m.y, m.x), m.y, 32, 7);
        writescore;
      end;
  end;
  if (m.y=1) then m.exist:=false;
  if m.exist then
  begin
    sscr(m.y, m.x, 1, 234);
    sscr(m.y, m.x, 2, 12);
  end
  else
    writeshoot;
  viewletter;
end;

procedure movebomb;

var
  i: integer;
  gs: byte;

begin
  with b do
  begin
    if (gscr(y, x, 1) = 31) then
    begin
      clearthing(b.x, b.y);
    end;
    inc(y);
    if (y = 25) and (x < ux+shsize) and (x >= ux) then
    begin
      sscr(y, x, 1, 31);
      sscr(y, x, 2, 7);
      declives;
      clearthing(lx, ly);
    end;
  end;
  gs:=gscr(b.y, b.x, 1);
  case gs of
    9:
    begin
      nextbomb(b);
      moveb(+1);
    end;
    2:
    for i:=1 to maxghost do
    with g[i] do
      if exist and (b.x = x) and (b.y = y) then
      begin
        exist:=false;
        nextbomb(b);
        sscr(y, x, 1, 32);
        snd(2000, 3, yes);
        inc(score[player]);
        writescore;
      end;
    234:
    begin
      b.exist:=false;
      snd(2000, 5, yes);
    end;
  end;
  bangtest;
  if (b.y < 22) and isbrick(b.x, b.y) then
  begin
    clearletter;
    brick(b.y, b.x);
    viewletter;
    snd(5000, 2, yes);
    nextbomb(b);
  end;
  if (b.y = 25) then
  begin
    nextbomb(b);
  end;
  if b.exist and (gscr(b.y, b.x, 1) = 32) then
  begin
    sscr(b.y, b.x, 1, 31);
    sscr(b.y, b.x, 2, 7);
  end;
end;

procedure droppingthing;

var
  i: byte;
  olds: shoottype;

begin
  with d do
  begin
    clearletter;
    inc(y);
    if (y = 25) and (x >= ux) and (x < ux+shsize) then
    begin
      exist:=false;
      olds:=s;
      case t of
        'L':
        begin
          inc(life[player], 1);
          writelives;
          snd(500, 5, no);
          snd(1000, 8, yes);
          s:=normal;
        end;
        'G':
        if (s <> glue) then
        begin
          snd(1000, 5, yes);
          snd(4000, 3, yes);
          s:=glue;
        end;
        'E':
        begin
          if (s = big) then
            snd(800, 5, yes)
          else
            s:=big;
        end;
        'X':
        begin
          snd(300, 5, yes);
          s:=normal;
        end;
        'M':
        begin
          snd(3000, 8, yes);
          s:=megashoot;
          f.can:=false;
          writeshoot;
          if f.exist then
          begin
            clearthing(f.x, f.y);
            f.exist:=false;
          end;
        end;
        'F':
        begin
          s:=normal;
          f.can:=true;
          writeshoot;
          snd(2400, 3, yes);
        end;
        'P':
        begin
          inc(score[player], random(60)+40);
          writescore;
          s:=normal;
          snd(2000, 3, yes);
          snd(1000, 4, yes);
          snd(3000, 2, yes);
        end;
      end;
      if (s = big) and (olds <> big) then
      begin
        for i:=2 to 7 do
          snd(x*100, 2, yes);
        shsize:=9;
        if (ux > 2) then dec(ux);
        if (ux+shsize > 50) then
        begin
          ux:=50-shsize;
          vux:=ux;
        end;
        fillline(2, 25, 1, 48, 32);
        viewshoot;
      end;
      if (s <> big) and (olds = big) then
      begin
        shsize:=7;
        inc(ux);
        fillline(2, 25, 1, 48, 32);
        viewshoot;
      end;
    end
    else
    if (y = 26) then
    begin
      exist:=false;
      snd(400, 5, yes);
      snd(200, 5, yes);
    end
    else
    begin
      up1:=gscr(y, x, 1);
      up2:=gscr(y, x, 2);
      if up1 in [2, 7, 31, 9, 234] then
      begin
        up1:=32;
        up2:=7;
      end;
      viewletter;
    end;
  end;
end;

procedure moveghost;

var
  vx, vy, r: shortint;
  i: integer;

procedure xnear;

begin
  with g[i] do
  begin
    if (x < lx) then inc(x);
    if (x > lx) then dec(x);
  end;
end;

procedure ynear;

begin
  with g[i] do
  begin
    if (y < ly) and (ly < 23) then inc(y);
    if (y > ly) then dec(y);
  end;
end;

begin
  for i:=1 to maxghost do
    with g[i] do
      if exist then
      begin
        vx:=x; vy:=y;
        r:=random(4+(range[player]-1) div 2);
        case r of
          0: inc(x);
          1: dec(x);
          2: if (y < 23) then inc(y);
          3: dec(y);
        else
          begin
            if (random(2) = 0) then
            begin
              ynear;
              if (vx = x) and (vy = y) then xnear;
            end
            else
            begin
              xnear;
              if (vx = x) and (vy = y) then ynear;
            end;
          end;
        end;
        if (gscr(y, x, 1) = 32) then
        begin
          sscr(vy, vx, 1, 32);
          sscr(y, x, 1, 2);
        end
        else
        begin
          x:=vx; y:=vy;
        end;
        if not (b.exist) and (y < 19) and (random < range[player]/200) then
        begin
          b.exist:=true; b.bm:=0;
          b.x:=x; b.y:=y;
          b.kx:=x; b.ky:=y;
          b.normal:=false;
        end;
      end;
end;

procedure lookatscore;

var
  nd: word;

begin
  if nextrange[player]<=score[player] then
  begin
    if range[player]<12 then inc(range[player]);
    nextrange[player]:=trunc(((nextrange[player])+250)*1.15);
    writerange;
    if range[player]>2 then
    begin
      nd:=(9-((range[player]+1) div 2))*5;
      if (nd < delay[player]) then delay[player]:=nd;
    end;
  end;
end;

procedure moveall(ball: byte);

var
  i: shortint;

procedure movethings;

begin
  movebreaker;
  if (ball = 0) then
  begin
    lx:=ux+ur;
    sscr(24, vux+ur, 1, 32);
    sscr(24, vux+ur, 2, 7);
    sscr(24, lx, 1, 9);
    sscr(24, lx, 2, 15);
  end;
end;

begin
  keybtest;
  if nextlevel and entlife then
  begin
    gameover:=true;
    db:=0;
    pki:=true;
  end;
  if (life[player] > 0) and not gameover then
  begin
    for i:=1 to 3 do
    begin
      if not gameover then
      begin
        if f.exist and (ball = 1) then moveshoot;
        movethings;
      end;
      wait(delay[player]);
    end;
    if m.exist and (ball = 1) then movemegashoot;
    if not gameover then
    begin
      if d.exist then droppingthing;
      if b.exist then movebomb;
    end;
    if not gameover and (ball = 1) then moveball;
    moveghost;
    lookatscore;
  end;
end;

procedure movetostart;

var
  i: byte;
  fire: boolean;
  olds: shoottype;

begin
  ly:=24; fire:=f.can; f.can:=false; olds:=s;
  repeat
    moveall(0);
  until (nextlevel and entlife) or hitkey(k.fire) or gameover or
        demo or ((olds = glue) and (s <> glue));
  if key[k.fire] then key[k.fire]:=false;
  f.can:=fire;
  clearthing(lx, ly);
end;

procedure startlevel;

var
  s: string[3];
  i: integer;

begin
  textattr:=7; clrscr;
  rectangle(1, 1, 50, 25, 2, 7);
  fillline(2, 25, 1, 48, 32);
  rectangle(53, 1, 77, 3, 2, 7);
  gotoxy(57, 2); write('Program by T ty¢');
  if (onestr = 'XYZ') then
    str(levels[loadlevel], s)
  else str(loadlevel, s);
  load(s);
  rectangle(53, 5, 77, 25, 2, 7);
  writelives;
  writescore;
  gotoxy(57, 13); write('Level  : ', level: 7);
  gotoxy(57, 15); write('Player : ', player: 7);
  writemusic;
  writesound;
  writeshoot;
  writerange;
  if pl > 1 then
  begin
    winwrite(10, 11, 22, 13, 2, 7, 7);
    gotoxy(12, 12); write('Player ', player);
    wait(1000);
    winclose;
  end;
  for i:=1 to maxghost do
    g[i].exist:=false;
end;

procedure endlevel;

var
  lk: byte;
  i: integer;

begin
  winwrite(15, 8, 35, 16, 2, 7, 15);
  if (db <> 0) then
  begin
    gotoxy(20, 13); write(' Player  ', player);
    for i:=10 downto 1 do
    begin
      gotoxy(21, 11);
      textattr:=textattr xor 8;
      write('Game Over');
      snd(i*50, 20, yes);
      snd(i*30, 20, yes);
    end;
    wait(2000);
  end
  else
  begin
    gotoxy(20, 11);
    if not pki then
    begin
      write(#8, 'Bonus', bns[skill]: 4, ' Pts');
      gotoxy(24,13);
      write(bns[skill]:3);
      wait(300);
      i:=bns[skill];
      lastkey:=0;
      repeat
        inc(score[player], 1);
        lookatscore;
        gotoxy(66, 11);
        write(score[player]: 7);
        gotoxy(24,13);
        write(i-1:3);
        snd(1900, 1, yes);
        wait(900 div bns[skill]);
        dec(i);
        lk:=lastkey;
      until (i = 0) or (lk > 0);
      if (lk > 0) then
      begin
        inc(score[player], i);
        lookatscore;
        gotoxy(66, 11);
        write(score[player]: 7);
        i:=1;
        gotoxy(24,13);
        write(i-1:3);
        resetkeys;
      end;
      wait(200);
      gotoxy(21, 13);
    end
    else
      gotoxy(21, 12);
    write('Next Level');
    for i:=300 downto 220 do
    begin
      snd(i*10, 2, no);
    end;
    if sd then nosound;
  end;
  wait(1000);
  winclose;
  textattr:=7; clrscr;
end;

procedure endtest;

begin
  if (db < 1) then gameover:=true;
  if gameover then
   begin
    if (gscr(b.y, b.x, 1) = 31) then
    begin
      clearthing(b.x, b.y);
    end;
    if f.exist then
      clearthing(f.x, f.y);
    clearletter;
    if m.exist then
      clearthing(m.x, m.y);
    fillline(2, 25, 1, 48, 32);
    writeshoot;
  end;
end;

begin
  musicon(musicdata, 1, musiclength);
  ux:=2; f.can:=false;
  startlevel;
  repeat
    b.exist:=false; d.exist:=false; f.exist:=false; m.exist:=false;
    nextlevel:=false; gameover:=false;  pki:=false; s:=normal;
    f.can:=false; shsize:=7; ur:=(shsize div 2); normexit:=true;
    lx:=5; iy:=-1; ix:=1-trunc((random*2))*2;
    writeshoot;
    movetostart;
    if not gameover then
    musicoff;
    begin
      repeat
        moveall(1);
        endtest;
      until gameover;
    end;
  until (life[player]=0) or (db=0) or not normquit;
  if normquit and normexit then endlevel;
  musicon(musicdata, 1, musiclength);
end;

procedure bestscore;

var
  j, i: byte;
  s: string[30];
  r: file of topten;
  m: boolean;

const
  numstr: array [1..4] of string[5] = ('One', 'Two', 'Three', 'Four');

begin
  textattr:=7;
  clrscr;
  assign(r, 'Breaker.Hsc');
  reset(r);
  read(r, tp);
  seek(r, 0);
  for i:=1 to 10 do
  begin
    if (score[player]>tp[i].score) and (not entlife) then
    begin
      rectangle(15, 2, 65, 7, 2, 7);
      gotoxy(18, 4);
      write('Congratulation Player ', numstr[player],' !');
      gotoxy(32, 5);
      write('You have achived a ');
      if (i = 1) then
      begin
        textattr:=15;
        write('best');
        textattr:=7;
      end
      else
      begin
        write('high');
      end;
      write( ' score !');
      m:=musicok;
      musicok:=false;
      snd(300, 50, yes);
      snd(600, 50, yes);
      snd(900, 50, yes);
      musicok:=m;
      rectangle(27, 10, 53, 18, 2, 7);
      gotoxy(34, 10); write('[ ');
      if (i = 1) then write('Best') else write('High');
      write(' score ]');
      gotoxy(32, 12); write('Player ', player);
      gotoxy(32, 14); write('Enter Your Name ');
      textattr:=135; write('!'); textattr:=15;
      sscr(16, 33, 1, byte('>'));
      sscr(16, 46, 1, byte('<'));
      fillline(35, 16, 2, 10, 15);
      kurzor_be;
      s:='';
      endkey;
      ledit(35, 16, 10, s);
      textattr:=7;
      initkey;
      kurzor_ki;
      if (s <> #27) then
      begin
        for j:=9 downto i do
        begin
          tp[j+1]:=tp[j];
        end;
        tp[i].score:=score[player];
        tp[i].name:=s;
        tp[i].range:=range[player];
      end;
      i:=10;
    end;
  end;
  write(r, tp);
  close(r);
end;

procedure game;

var
  go: boolean;
  vl: array[0..999] of integer;

function ll: integer;

var
  n, lv, lm, ld, i: byte;
  k: boolean;

begin
  n:=gs;
  if ((lvn div gs)*gs < level) then
    n:=lvn mod gs;
  lv:=level-1;
  ld:=(lv div gs)*gs;
  lm:=lv mod gs;
  repeat
    k:=true;
    lv:=random(n);
    vl[lm]:=n;
    for i:=0 to lm do
    begin
      if (vl[i]=lv) then k:=false;
    end;
  until k;
  vl[lm]:=lv;
  ll:=ld+lv+1;
end;

begin
  exitdos:=false;
  kurzor_ki;
  textattr:=7;
  clrscr;
  randomize;
  searchlevel;
  createbs(false);
  repeat
    menu;
    if not exitdos then
    begin
      for player:=1 to pl do
      begin
        score[player]:=0;
        life[player]:=8;
        nextrange[player]:=200;
        range[player]:=1;
      end;
      level:=0;
      repeat
        normquit:=true;
        inc(level);
        loadlevel:=ll;
        for player:=1 to pl do
        begin
          if (life[player] > 0) then playgame;
          if (level mod 5 = 0) and (life[player]>0) then inc(life[player]);
        end;
        go:=true;
        for player:=1 to pl do
        begin
          if (life[player] > 0) then go:=false;
        end;
        if (level = lvn) then level:=0;
      until go;
      if normquit and not demo then
      begin
        for player:=1 to pl do
          bestscore;
      end;
    end;
  until exitdos;
  textattr:=7; clrscr;
  kurzor_be;
end;

procedure onlyonelevel;

var
  f: file of bricktype;
  code: integer;

begin
  assign(f, 'BREAKER.'+onestr);
  reset(f);
  exitdos:=false;
  if ioresult<>0 then
  begin
    writeln('Can''t open the file: BREAKER.'+onestr);
  end
  else
  begin
    close(f);
    kurzor_ki;
    createbs(false);
    randomize;
    repeat
      menu;
      if not exitdos then
      begin
        for player:=1 to pl do
        begin
          life[player]:=8;
          nextrange[player]:=200;
          range[player]:=1;
          score[player]:=0;
        end;
        level:=0;
        val(onestr, loadlevel, code);
        repeat
          normquit:=true;
          for player:=1 to pl do
          begin
            if (life[player] > 0) then playgame;
          end;
        until (life[player] = 0);
      end;
    until exitdos;
    textattr:=7; clrscr;
    kurzor_be;
  end;
end;

function lookparameters: boolean;

var
  s: string;
  x, code: integer;

begin
  lookparameters:=true;
  onestr:='XYZ';
  if (paramcount > 0) then
  begin
    s:=paramstr(1);
    s[2]:=char(upcase(s[2]));
    s[3]:=char(upcase(s[3]));
    s[4]:=char(upcase(s[4]));
    if (copy(s, 1, 3) = '/P:') then
    begin
      lookparameters:=false;
      onestr:=copy(s, 4, length(s)-3);
    end
    else
    if (copy(s, 1, 5) = '/MAX:') then
    begin
      s:=copy(s, 6, length(s)-5);
      val(s, x, code);
      if (x > 0 ) and (x < 1000) then
        sln:=x;
    end;
  end;
end;

begin
  initkey;
  musicon(musicdata, 1, musiclength);
  loadoptions(true);
  if lookparameters then
    game
  else
    onlyonelevel;
  musicoff;
  endkey;
end.
