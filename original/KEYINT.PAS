unit keyint;

{$i-,s-,r-,d-,f+}

interface

uses dos;

type
  keynamestr = string[11];

var
  key: array [0..85] of boolean;
  kp: array [0..85] of boolean;
  keyboardvector: pointer;
  lastkey: byte;
  extended: boolean;

const
  keynames: array [1..84] of keynamestr =(

  'Esc','1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=',
  'BackSpace', 'Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O' ,
  'P', '[', ']', 'Enter', 'Ctrl', 'A', 'S', 'D', 'F', 'G', 'H', 'J',
  'K', 'L', ';', '''' ,'`', 'Left Shift', '\', 'Z', 'X', 'C' ,'V',
  'B', 'N', 'M', ',', '.', '/', 'Rigth Shift', '*', 'Alt', 'Space',
  'Caps Lock', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9',
  'F10', 'Num Lock', 'Scroll Lock', 'Home', 'Up Arrow', 'Page Up',
  'Gray -', 'Left Arrow', 'Gray 5', 'Rigth Arrow', 'Gray +', 'End',
  'Down Arrow', 'Page Down', 'Insert', 'Delete', 'SysRq'

  );

procedure initkey;
procedure endkey;
procedure resetkeys;
function pressedkey : boolean;
function hitkey(keycode: byte): boolean;
function keyname(keycode: byte): keynamestr;

implementation

procedure resetkeys;

begin
  lastkey:=0;
  fillchar(key, sizeof(key), false);
  fillchar(kp, sizeof(key), false);
end;

procedure endkey;

begin
  setintvec($9, keyboardvector);
end;

procedure mainkeyproc; interrupt;

var
  pkey, in61, in61store : byte;

begin
   pkey:=port[$60];
   in61:=port[$61];
   in61store:=in61;
   in61:=in61 or $80;
   port[$61]:=in61;
   port[$61]:=in61store;
   port[$20]:=$20;
   if pkey = $e0 then
     extended:=true
   else
     if extended then
     begin
       if (pkey < 86) and (pkey <> 42) then
       begin
         key[0]:=true;
         key[pkey]:=true;
         kp[pkey]:=true;
         lastkey:=pkey;
       end
       else
         if (pkey <> 170) then
         begin
           pkey:=pkey and 127;
           key[pkey]:=false;
         end;
       extended:=false;
     end
     else
     begin
       if pkey < 86 then
       begin
         key[0]:=true;
         key[pkey]:=true;
         kp[pkey]:=true;
         lastkey:=pkey;
       end
       else
       begin
         pkey:=pkey and 127;
         key[pkey]:=false;
       end;
     end;
   if key[29] and key[46] then endkey;
end;

procedure initkey;

var
  pp : pointer;

begin
  getintvec($9, pp);
  if pp <> @mainkeyproc then
    getintvec($9, keyboardvector);
  resetkeys;
  setintvec($9, @mainkeyproc  );
end;

function pressedkey;

begin
  pressedkey := key[0];
  key[0]     := false;
end;

function hitkey;

begin
  hitkey:=kp[keycode];
  kp[keycode]:=false;
end;

function keyname;

begin
  keyname:=keynames[keycode];
end;

begin
end.
