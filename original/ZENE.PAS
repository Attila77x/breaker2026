unit zene;

{$r-,d-,s-,i-}

interface

uses
  crt, dos;

type
  musicarraytype = array [1..1] of word;

var
  mc, ct: integer;
  intvec1c, vec1c: pointer;
  musicok, musicold: boolean;
  md: ^musicarraytype;
  sp: word;
  musiclen: word;

const
  _c         = 131; _cis       = 138; _d         = 146; _dis       = 156;
  _e         = 165; _f         = 175; _fis       = 185; _g         = 196;
  _gis       = 208; _a         = 220; _b         = 233; _h         = 247;
  c          = 262; cis        = 277; d          = 294; dis        = 311;
  e          = 330; f          = 349; fis        = 370; g          = 392;
  gis        = 415; a          = 440; b          = 466; h          = 494;
  c_         = 523; cis_       = 554; d_         = 587; dis_       = 622;
  e_         = 659; f_         = 698; fis_       = 740; g_         = 784;
  gis_       = 831; a_         = 880; h_         = 932;

procedure residentmusic; interrupt;
procedure musicon(var musicarray; t, len: word);
procedure musicoff;

implementation

procedure residentmusic;

begin
  inc(ct);
  if musicold and not musicok then nosound;
  if md^[mc] = 0 then
  begin
    if musicold then
      nosound;
  end
  else
  begin
    if musicok then
      sound (md^[mc]);
  end;
  if ct > sp then
  begin
    inc ( mc );
    ct := 1;
  end;
  if mc > musiclen then
    mc := 1;
  musicold:=musicok;
end;


procedure musicon;

var
  i: integer;

begin
  getintvec ( $1c, vec1c );
  if vec1c <> @residentmusic then
  begin
    getintvec( $1c, intvec1c  );
    setintvec( $1c, @residentmusic );
    ct  := 1; mc := 1; sp:=t;
    musiclen:=len;
    md:=@musicarray;
  end;
end;

procedure musicoff;

begin
   getintvec ( $1c, vec1c );
   if vec1c = @residentmusic then
      setintvec( $1c, intvec1c );
   nosound;
end;

begin
  musicok:=false;
end.
