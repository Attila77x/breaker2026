unit sajat;

interface

uses
  crt;

procedure kpnull;
procedure wait(v: word);
procedure rectangle(bx, by, jx, jy, m, color: byte);
procedure fillline(x, y, j, db, m: byte);
procedure writeline(x, y, j, db: byte; var v);
procedure readline(x, y, j, db: byte; var v);
procedure winopen(x1, y1, x2, y2: byte);
procedure winwrite(x1, y1, x2, y2, recmode, reccolor, wincolor: byte);
procedure winclose;
procedure kurzor_be;
procedure kurzor_ki;
procedure setcursorlines(a, b: byte);
procedure ledit(gx, gy, hossz: byte; var st);
procedure leditmin(gx, gy, hossz: byte; var st);
procedure setbaseaddress;
procedure sscr(y, x, z, m: byte);
function  gscr(y, x, z: byte): byte;

type
  screentype = array[1..25, 1..80, 1..2] of byte;
  pagenum = record
    kx1, ky1, kx2, ky2: byte;
  end;

var
  page: array [1..$1000] of byte;
  pagemempointer: word;
  pagepointer: byte;
  pagen: array [1..8] of pagenum;
  baseaddress: word;

implementation

{}

procedure sscr(y, x, z, m: byte);

begin
  mem[baseaddress: (y-1)*160+(x-1)*2+(z-1)]:=m;
end;


function gscr;

begin
  gscr:=mem[baseaddress: (y-1)*160+(x-1)*2+(z-1)];
end;

{}

procedure rectangle;

var
  c: shortint;
  s: array[1..7] of string;

const
  k: array[1..3, 1..6] of byte=(
  (218, 192, 191, 217, 196, 179),
  (201, 200, 187, 188, 205, 186),
  (219, 219, 219, 219, 219, 219));

begin

  sscr(by, bx, 1, k[m, 1]);
  sscr(jy, bx, 1, k[m, 2]);
  sscr(by, jx, 1, k[m, 3]);
  sscr(jy, jx, 1, k[m, 4]);

  sscr(by, bx, 2, color);
  sscr(jy, bx, 2, color);
  sscr(by, jx, 2, color);
  sscr(jy, jx, 2, color);

  for c:=bx+1 to jx-1 do
  begin
    sscr(by, c, 1, k[m, 5]);
    sscr(jy, c, 1, k[m, 5]);
    sscr(by, c, 2, color);
    sscr(jy, c, 2, color);
  end;
  for c:=by+1 to jy-1 do
  begin
    sscr(c, bx, 1, k[m, 6]);
    sscr(c, jx, 1, k[m, 6]);
    sscr(c, bx, 2, color);
    sscr(c, jx, 2, color);
  end;

end;

procedure fillline;

var
  i: shortint;

begin
  for i:=0 to db-1 do
  begin
    sscr(y, x+i, j, m);
  end;
end;

procedure writeline;

var
  i: byte;
  s: string absolute v;

begin
  for i:=0 to db-1 do
    sscr(y, x+i, j, byte(s[i+1]));
end;

procedure readline;

var
  i: byte;
  s: string absolute v;

begin
  for i:=0 to db-1 do
    s[i+1]:=char(gscr(y, x+i, j));
end;

procedure setcursorlines;

begin
  asm
    mov ah, 01h
    mov ch, a
    mov cl, b
    int 10h
  end;
end;

procedure kurzor_ki;

begin
  setcursorlines(1, 0);
end;

procedure kurzor_be;

begin
  setcursorlines(12, 13);
end;

procedure winopen(x1, y1, x2, y2: byte);
var
  kxx, kyy: byte;

begin
  if pagemempointer+(x2-x1+1)*(y2-y1+1)*2>12383 then exit;
  inc(pagepointer);
  with pagen[pagepointer] do
  begin
    kx1:=x1; kx2:=x2; ky1:=y1; ky2:=y2;
  end;
  for kxx:=x1 to x2 do
  begin
    for kyy:=y1 to y2 do
    begin
      inc(pagemempointer);
      page[pagemempointer]:=gscr(kyy, kxx, 1);
      inc(pagemempointer);
      page[pagemempointer]:=gscr(kyy, kxx, 2);
    end;
  end;
end;

procedure winclose;
var
  kxx, kyy: byte;
  x1, x2, y1, y2: byte;
  sz: word;

begin
  if pagepointer=0 then exit;
  with pagen[pagepointer] do
  begin
    x1:=kx1; y1:=ky1; x2:=kx2; y2:=ky2;
  end;
  for kxx:=x2 downto x1 do
  begin
    for kyy:=y2 downto y1 do
    begin
      sscr(kyy, kxx, 2, page[pagemempointer]);
      dec(pagemempointer);
      sscr(kyy, kxx, 1, page[pagemempointer]);
      dec(pagemempointer);
    end;
  end;
  dec(pagepointer);
end;

procedure leditmin;

var
  ch: char;
  s: string absolute st;

begin
  gotoxy(gx, gy);
  write(s);
  repeat
    ch:=readkey;
    case ch of
      #8: if length(s)>0 then s:=copy(s, 1, length(s)-1);
      #7, #13, #10: ;
      #27: s:='';
    else
     if length(s)<hossz then s:=s+ch;
    end;
    gotoxy(gx, gy);
    write(s);
    fillline(gx+length(s), gy, 1, hossz-length(s), 32);
  until (ch=#13) or (ch=#27);
  if ch=#27 then s:=#27;
end;

procedure ledit;

var
  x, ls: byte;
  g: byte;
  ch, c1: char;
  ins: boolean;
  s: string absolute st;

begin
  x:=0;
  ins:=false;
  gotoxy(gx, gy);
  write(s);
  x:=length(s);
  gotoxy(x+gx, gy);
  setcursorlines(12, 13);
  repeat
    ls:=length(s);
    ch:=readkey;
    if ch=#0 then c1:=readkey;
    case ord(c1) of
      82: begin
           ins:=not ins;
           if ins then setcursorlines(7, 13) else setcursorlines(12, 13);
         end;
      83: delete(s, x+1, 1);
      75: if x>=1 then x:=x-1;
      77: if x<length(s) then x:=x+1;
      71: x:=0;
      79: x:=length(s);
    end;
    c1:=#0;
    case ch of
      #8: begin
           if x>0 then
           begin
             s:=copy(s, 1, x-1)+copy(s, x+1, length(s));
             x:=x-1;
           end;
         end;
      #27: begin
            s:='';
            x:=0;
          end;
      #7, #10, #13: ;
    else
      if ch<>#0 then
      begin
        if ins and (length(s)<hossz) then
        begin
          x:=x+1;
          s:=copy(s, 1, x-1)+ch+copy(s, x, length(s));
        end;
        if not ins and (x<hossz) then
        begin
          x:=x+1;
          s:=copy(s, 1, x-1)+ch+copy(s, x+1, length(s));
        end;
      end;
    end;
    if ls>length(s) then
    begin
      for g:=x to ls do
      begin
        gotoxy(g+gx, gy);
        write(' ');
      end;
    end;
    gotoxy(gx, gy);
    write(s);
    gotoxy(x+gx, gy);
    if ch=#27 then s:=#27;
  until (ch=#13) or (ch=#27);
  setcursorlines(12, 13);
end;

procedure winwrite;

var
  i: byte;

begin
  winopen(x1, y1, x2, y2);
  for i:=y1+1 to y2-1 do
  begin
    fillline(x1+1, i, 1, x2-x1-1, 32);
    fillline(x1+1, i, 2, x2-x1-1, wincolor);
  end;
  rectangle(x1, y1, x2, y2, recmode, reccolor);
end;

procedure wait;

var
  c: longint;
  a, b: word;

begin
  c:=v; c:=(c*1000) div $ffff; a:=c;
  c:=v; c:=(c*1000) mod $ffff; b:=c;
  asm
    mov ah, 86h
    mov cx, a
    mov dx, b
    int 15h
  end;
end;

procedure kpnull;

var
  ch: char;

begin
  while keypressed do
    ch:=readkey;
end;

procedure setbaseaddress;

var
  mode: byte;

begin
  mode:=mem[$40: $49];
  case mode of
    2, 3: baseaddress:=$b800;
       7: baseaddress:=$b000;
  else
    textmode(co80);
    case mode of
      2, 3: baseaddress:=$b800;
         7: baseaddress:=$b000;
    else
      runerror(0);
    end;
  end;
end;

{}

begin
  pagepointer:=0;
  pagemempointer:=0;
  setbaseaddress;
end.
