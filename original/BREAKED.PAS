program breaker_editor;

{$m $4000, 0, 0}
{$r-,i-,s-,d-}

uses
  crt, sajat, dos;

type
  tegla = record
    x, y: byte;
    tipus, szin: byte;
  end;

var
  f: file of tegla;
  tdb, i, db: integer;
  x, y: byte;
  cl, bk: byte;
  s: string[3];

const
  tg: string[12] = '∞±≤€';
  szov: array [1..12] of string[15] =
       ('cÇltÇgla', 'tîrik', '2 ÅtÇstîl tîrik',
        '3 ÅtÇstîl tîrik', 'lîvÇst ad', 'tîrhetetlen',
        'bomb†t dob', 'pontot ad', 'szîrnyÇ v†lik',
        'meglepetÇs', 'lîvÇst ad + ', 'tîrhetetlen');


  segit: array [1..10] of string [20] = ('Lerak : Space, Enter',
  'Tîrîl : Delete', 'KilÇp : Esc, F10', 'Sz°n  : 1, 2, 3 ', 'Elment  : F2',
  'Betîlt  : F3', 'KÇp tîrlÇs  : Ctrl+N', 'Pr¢baj†tÇk  : Ctrl+G',
  'Besz£r†s    : Ctrl '+#26, 'Visszah£z†s : Ctrl '+#27);

{}

procedure szerkeszt;

var
  i, tipus, x, y: byte;
  ch2, ch: char;
  sch, sbk: string[4];
  modosit, kilep: boolean;
  bl, b, cl, at: byte;

function biztos: boolean;

var
  ch: char;

begin
  repeat
    ch:=upcase(readkey);
  until ch in ['I', 'N'];
  if ch='I' then biztos:=true else biztos:=false;
end;

procedure save(var st; var db: integer);

var
  x, y: byte;
  tg: tegla;
  s: string[3] absolute st;

begin
  assign(f, 'BREAKER.'+s);
  reset(f);
  if (ioresult = 0) and (s<>'0') then
  begin
    winwrite(10, 5, 40, 8, 2, 7, 7);
    gotoxy(14, 6);
    textattr:=15;
    write('Ez a szint m†r lÇtezik.');
    gotoxy(17, 7);
    write('FelÅl°rjam (I/N) ?');
    textattr:=7;
    if not biztos then
    begin
      winclose;
      exit;
    end;
    winclose;
  end;
  rewrite(f);
  if ioresult <> 0 then
  begin
    winwrite(10, 5, 51, 7, 2, 7, 7);
    gotoxy(12, 6);
    textattr:=15;
    write('Hiba a file megnyit†s†n†n');
    textattr:=7;
    winclose;
    exit
  end;
  db:=0;
  for y:=2 to 20 do
  begin
    x:=2;
    repeat
      if gscr(y, x, 1)<>32 then
      begin
        tg.x:=x; tg.y:=y;
        tg.szin:=gscr(y, x, 2); tg.tipus:=gscr(y, x, 1);
        write(f, tg);
        inc(x, 4);
        if not (tg.tipus in [219, 24, 30]) then inc(db);
      end
      else
        inc(x);
    until x=50;
  end;
  close(f);
  if s<>'0' then modosit:=false;
end;

procedure load(var st);

var
  i: integer;
  tg: tegla;
  s: string[3] absolute st;

begin
  assign(f, 'BREAKER.'+s);
  reset(f);
  if ioresult <> 0 then
  begin
    winwrite(10, 5, 39, 7, 2, 7, 7);
    gotoxy(12, 6);
    textattr:=15;
    write('Ez a p†lya mÇg nem lÇtezik');
    textattr:=7;
    delay(1000);
    winclose;
    exit;
  end;
  window(2, 2, 49, 20); 
  textattr:=7; 
  clrscr; 
  window(1, 1, 80, 25);
  for i:=1 to filesize(f) do
  begin
    read(f, tg);
    with tg do
    begin
      fillline(x, y, 1, 4, tipus);
      fillline(x, y, 2, 4, szin);
    end;
  end;
  close(f);
  if s<>'0' then
  begin
    gotoxy(5, 25); write('Utols¢ BetîltÇs : ', s, '  ');
    modosit:=false;
  end;
end;

procedure help;

var
  i:integer;

begin
  winwrite(6, 3, 33, 18, 2, 7, 7);
  for i:=1 to 10 do
  begin
    gotoxy(9, 4+i); write(segit[i]);
  end;
  textattr:=135;
  gotoxy(9, 16); write('Nyomd le az Entert !');
  textattr:=7;
  repeat until readkey=#13;
  winclose;
end;

procedure szabalyir;

var
  i:byte;

begin
  rectangle(53, 8, 77, 21, 2, 7);
  for i:=1 to 12 do
  begin
    if i<12 then
    begin
      gotoxy(55, 8+i); write(char(i+64));
      fillline(57, 8+i, 1, 18-length(szov[i]), byte('.'));
    end;
    gotoxy(76-length(szov[i]), 8+i); write(szov[i]);
  end;
  rectangle(53, 22, 77, 25, 2, 7);
  textcolor(7); gotoxy(55, 23); writeln('Aktu†lis:');
  textcolor(7); gotoxy(60, 24); writeln(szov[2]);
  gotoxy(5, 23); write('V:', bl:2, ' H:', bk:2, ' Sz:', cl:2); ;
  fillline(23, 23, 1, 4, byte(tg[tipus]));
  fillline(23, 23, 2, 4, at);
end;

procedure kezdir;

begin
  rectangle(1, 1, 50, 25, 2, 7);
  fillline(2, 25, 1, 48, 32);
  sscr(21, 1, 1, 199); sscr(21, 50, 1, 182);
  fillline(2, 21, 1, 48, 196);
  rectangle(53, 1, 77, 4, 2, 7);
  gotoxy(56, 2); write('Breaker Editor V1.4');
  gotoxy(61, 3); write('by T†ty¢');
  rectangle(53, 5, 77, 7, 2, 7);
  gotoxy(59, 6); write('Seg°tsÇg : F1');
  sscr(21, 1, 1, 199); sscr(21, 50, 1, 182);
  fillline(2, 21, 1, 48, 196);
  gotoxy(34, 23); write('x,  y = ', x:2, ', ', y:2);
  szabalyir;
end;

procedure billkezel;

var
  z:string[3];
  su:boolean;
  szam, c:integer;
  shift:shortint;

begin
  if ch2=#59 then help;
  if ch=#14 then
  begin
    su:=true;
    if modosit then
    begin
      winwrite(10, 5, 60, 8, 2, 7, 7);
      gotoxy(14, 6);
      textattr:=15;
      write('A p†lya az utols¢ mentÇs ¢ta m¢dos°tva van.');
      gotoxy(28, 7);
      write('TîrlÇs (I/N) ?');
      textattr:=7;
      su:=biztos;
      winclose;
    end;
    if su then
    begin
      window(2, 2, 49, 20);
      textattr:=7;
      clrscr;
      window(1, 1, 80, 25);
      modosit:=false;
    end;
  end;
  if (ch = #7) then
  begin
    z:=s;
    s:='0';
    save(s, tdb);
    if tdb>0 then
    begin
      swapvectors;
      exec('BREAKER.EXE', '/p:0');
      swapvectors;
      kezdir;
      load(s);
    end
    else write(#7);
    assign(f, 'BREAKER.0'); erase(f);
    kurzor_ki;
    if z<>'0' then
    begin
      gotoxy(5, 25); write('Utols¢ betîltÇs : ', z);
      s:=z;
    end;
  end;
  if upcase(ch) in ['A'..'L'] then
  begin
    tipus:=byte(upcase(ch))-64;
    fillline(60, 24, 1, 15, 32);
    textcolor(7); gotoxy(60, 24);
    if ch<'K' then write(szov[tipus])
    else write('lîv.+tîrh.');
    fillline(23, 23, 1, 4, byte(tg[tipus]));
  end;
  if ch in[#32, #13] then
  begin
    if (gscr(y, x, 1)=32) and (gscr(y, x+1, 1)=32) and (gscr(y, x+2, 1)=32)
       and (gscr(y, x+3, 1)=32) then
    begin
      fillline(x, y, 1, 4, byte(tg[tipus]));
      fillline(x, y, 2, 4, at);
      modosit:=true;
    end;
  end;
  if (ch2=#115) then
  begin
    if (gscr(y, x, 1)=32) then
    begin
      i:=x;
      while i<49 do
      begin
        sscr(y, i, 1, gscr(y, i+1, 1)); sscr(y, i, 2, gscr(y, i+1, 2));
        inc(i);
      end;
      sscr(y, 49, 1, 32); sscr(y, 49, 2, 7);
      modosit:=true;
    end
  end;
  if (ch2=#116) then
  begin
    i:=2;
    while i<x do
      if gscr(y, i, 1)<>32 then inc(i, 4) else inc(i);
    if (gscr(y, 49, 1)=32) and ((x=i) or (gscr(y, x, 1)=32)) then
    begin
      i:=49;
      while i>x do
      begin
        sscr(y, i, 1, gscr(y, i-1, 1)); sscr(y, i, 2, gscr(y, i-1, 2));
        dec(i);
      end;
      sscr(y, x, 1, 32); sscr(y, x, 2, 7);
      modosit:=true;
    end
  end;
  if (ch2=#83) then
  begin
    i:=2;
    while i<x do
      if gscr(y, i, 1)<>32 then inc(i, 4) else inc(i);
    if (i=x) and (gscr(y, x, 1)<>32) then
    begin
      fillline(x, y, 1, 4, 32);
      fillline(x, y, 2, 4, 7);
      modosit:=true;
    end;
  end;
  if ch in ['1'..'3'] then
  begin
    case ch of
      '1':inc(bl);
      '2':inc(bk);
      '3':inc(cl);
    end;
    bl:=bl mod 2; bk:=bk mod 8; cl:=cl mod 16;
    at:=bl*128+bk*16+cl;
    gotoxy(5, 23); write('V:', bl:2, ' H:', bk:2, ' Sz:', cl:2);
    fillline(23, 23, 1, 4, byte(tg[tipus]));
    fillline(23, 23, 2, 4, at);
  end;
  if ch2 in [#60, #61] then
  begin
    su:=true;
    if modosit and (ch2>#60) then
    begin
      winwrite(10, 5, 60, 8, 2, 7, 7);
      gotoxy(14, 6);
      textattr:=15;
      write('A p†lya az utols¢ mentÇs ¢ta m¢dos°tva van.');
      gotoxy(27, 7);
      write('betîltÇs (I/N) ?');
      textattr:=7;
      su:=biztos;
    end;
    winclose;
    if su then
    begin;
      repeat
        winwrite(10, 5, 30, 8, 2, 7, 7);
        textattr:=15;
        gotoxy(12, 6); write('P†lya ');
        if ch2=#60 then write('mentÇse.') else write('betîltÇse.');
        gotoxy(12, 7); write('Szint : ');
        s:=''; leditmin(20, 7, 3, s);
        textattr:=7;
        val(s, szam, c);
        winclose;
        if (s='') or (szam=0) then exit;
      until (s[1] in ['1'..'9']);
      if su then
      begin
        if ch2=#60 then save(s, tdb) else load(s);
      end;
    end;
  end;
  if modosit and kilep then
  begin
    winwrite(10, 5, 60, 8, 2, 7, 7);
    gotoxy(14, 6);
    textattr:=15;
    write('A p†lya az utols¢ mentÇs ¢ta m¢dos°tva van.');
    gotoxy(26, 7);
    write('Ki akarsz lÇpni (I/N) ?');
    textattr:=7;
    if not biztos then kilep:=false;
    winclose;
  end;
end;

begin
  x:=2; y:=2; tipus:=2; modosit:=false;
  at:=7; bk:=0; bl:=0; cl:=7;
  kezdir;
  repeat
    readline(x, y, 1, 4, sch);
    sscr(y, x, 1, byte('[')); sscr(y, x+3, 1, byte(']'));
    ch:=upcase(readkey);
    if ch=#0 then ch2:=readkey else ch2:=#1;
    writeline(x, y, 1, 4, sch);
    case byte(ch2) of
      75:dec(x);
      77:inc(x);
      72:dec(y);
      80:inc(y);
    end;
    if y<2 then y:=20; if y>20 then y:=2;
    if x<2 then x:=46; if x>46 then x:=2;
    gotoxy(34, 23); write('x,  y = ', x:2, ', ', y:2);
    kilep:=(ch=#27) or (ch2=#68);
    billkezel;
  until kilep;
end;

{}

begin
  textattr:=7; clrscr;
  kurzor_ki;
  s:='0';
  szerkeszt;
  kurzor_be;
  textattr:=7; clrscr;
end.
