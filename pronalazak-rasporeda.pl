:- encoding(utf8).	% omogućuje nesmetano korištenje nestandardnih znakova poput onih iz hrvatske abecede

:- use_module(library(http/http_open)). % treba biti uključeno da bi predikat open_any/5 mogao pročitati udaljenu datoteku (u pozadini zapravo rabi predikat http_open/3, no za nju nije moguće postaviti encoding)
:- use_module(library(http/json)).

:- op(600, xfy, \\+).
:- op(600, xfy, \\-).
:- op(700, xfx, \\=).
:- op(800, xfy, \\<).
:- op(800, xfy, \\<=).
:- op(800, xfy, \\>).
:- op(800, xfy, \\>=).

% operator za zbrajanje vremenskih trajanja, odnosno termova trajanje/2
Rezultat \\= Trajanje1 \\+ Trajanje2 :- dajZbrojTrajanja(Trajanje1, Trajanje2, Rezultat).

% operator za računanje razlike između 2 vremenskih termina, odnosno za oduzimanje termova vrijeme/2
Rezultat \\= Vrijeme1 \\- Vrijeme2 :- dajRazlikuVremena(Vrijeme1, Vrijeme2, Rezultat).

% operatori uspoređivanja termova vrijeme/2 ili pak trajanje/2
VrijemeIliTrajanje1 \\< VrijemeIliTrajanje2 :- jestManje(VrijemeIliTrajanje1, VrijemeIliTrajanje2).
VrijemeIliTrajanje1 \\<= VrijemeIliTrajanje2 :- VrijemeIliTrajanje1==VrijemeIliTrajanje2 | VrijemeIliTrajanje1 \\< VrijemeIliTrajanje2.
VrijemeIliTrajanje1 \\> VrijemeIliTrajanje2 :- not(VrijemeIliTrajanje1 \\<= VrijemeIliTrajanje2).
VrijemeIliTrajanje1 \\>= VrijemeIliTrajanje2 :- not(VrijemeIliTrajanje1 \\< VrijemeIliTrajanje2).

/*	// prikaz ručnog definiranja činjenica o terminima i obveznostima nastave u slučaju da ne postoji datoteka s izvorom podataka iz kojeg bi se baza znanja napunila potrebnim činjenicama za daljnji rad
upisano('Baze znanja i semantički Web').
upisano('Logičko programiranje').

obveznost('Baze znanja i semantički Web', p).
obveznost('Baze znanja i semantički Web', s).
obveznost('Baze znanja i semantički Web',lv).
obveznost('Logičko programiranje', s).
obveznost('Logičko programiranje', lv).

raspored('Baze znanja i semantički Web', p, termin('utorak', 8, 30, 10, 0), lokacija('FOI1', 'D 3')).
raspored('Baze znanja i semantički Web', s, termin('srijeda', 10, 15, 11, 45), lokacija('FOI1', 'D 6')).
raspored('Baze znanja i semantički Web', lv, termin('utorak', 14, 30, 16, 00), lokacija('FOI1', 'D 13')).
raspored('Baze znanja i semantički Web', lv, termin('utorak', 16, 00, 17, 30), lokacija('FOI1', 'D 13')).
raspored('Baze znanja i semantički Web', lv, termin('utorak', 17, 30, 19, 00), lokacija('FOI1', 'D 13')).
raspored('Baze znanja i semantički Web', lv, termin('utorak', 19, 00, 20, 30), lokacija('FOI1', 'D 13')).
raspored('Logičko programiranje', p, termin('utorak', 15, 00, 18, 00), lokacija('FOI1', 'D 2')).
raspored('Logičko programiranje', lv, termin('srijeda', 13, 00, 15, 00), lokacija('FOI1', 'D 5')).
raspored('Logičko programiranje', lv, termin('srijeda', 19, 00, 21, 00), lokacija('FOI1', 'D 5')).
raspored('Logičko programiranje', lv, termin('petak', 14, 00, 16, 00), lokacija('FOI1', 'D 6')).

odrzavanje('Baze znanja i semantički Web', p, 1, 17).
odrzavanje('Baze znanja i semantički Web', s, 7, 17).
odrzavanje('Baze znanja i semantički Web', lv, 10, 16).
odrzavanje('Logičko programiranje', p, 1, 11).
odrzavanje('Logičko programiranje', lv, 1, 11).
odrzavanje('Logičko programiranje', s, 1, 16).
*/

/**
 * dohvatiCinjenice(+UriResursa:atom) is failure.
 * 
 * Predikat čita podatke o terminima održavanja predmeta iz resursa koji je identificiran preko proslijeđenog =|UriResursa|=, vrši se deserijalizacija tih podataka koji su izraženi kao JSON znakovni niz te se pretvaraju u odgovarajuće tipove podataka. Pritom se za svaki termin održavanja predmeta u bazu znanja pohranjuju razdoblje održavanja (od kojeg do kojeg tjedna se održava nastava) i osnovne informacije o terminu nastave (o kojem je predmetu riječ i o kakvoj vrsti nastave, koji dan u tjednu se održava, od kad do kad te na kojoj lokaciji). Kod pohrane u bazu znanja se izbjegava nastanak redundancije podataka te se rascijepana razdoblja održavanja nastave združuju (potencijalno razdoblje neodržavanja koje se nalazi između se ignorira).
 * 
 * @param UriResursa	URI resursa u kojem su sadržani podaci o terminima održavanja predmetā u JSON formatu. Resurs može biti lokalni, ali i udaljeni!
 */
dohvatiCinjenice(UriResursa) :-
	setup_call_cleanup(
		open_any(UriResursa, read, Stream, Close, [encoding(utf8)]),
		json_read(Stream, Sadrzaj),
		close_any(Close)
	),
	member(json(Clan), Sadrzaj),
	member('predmet' = Predmet, Clan),
	member('vrsta' = Vrsta, Clan),
	member('obveznost' = Obveznost, Clan),
	member('razdoblje' = json(Razdoblje), Clan),
	member('start' = PocTjedan, Razdoblje),
	member('kraj' = ZavTjedan, Razdoblje),
	member('termin' = json(Termin), Clan),
	member('dan' = Dan, Termin),
	member('start' = PocVrijeme, Termin),
	member('kraj' = ZavVrijeme, Termin),
	member('lokacija' = json(Lokacija), Clan),
	member('zgrada' = Zgrada, Lokacija),
	member('prostorija' = Prostorija, Lokacija),
	atomic_list_concat([HpocetakStr,MpocetakStr|_], ':', PocVrijeme),
	atom_number(HpocetakStr, Hpocetak),
	atom_number(MpocetakStr, Mpocetak),
	atomic_list_concat([HkrajStr, MkrajStr|_], ':', ZavVrijeme),
	atom_number(HkrajStr, Hkraj),
	atom_number(MkrajStr, Mkraj),
	Obveznost = @(ObveznostVal),
	(
	ObveznostVal == true, not(obveznost(Predmet, Vrsta)) ->
		asserta(obveznost(Predmet, Vrsta))
		;
		true
	),
	(
	/*	% 'Baze znanja i semantički Web' je primjer kolegija koji se održava u 9. tjednu i od 11. pa 17. - cilj je učiniti da održavanje onda bude zabilježeno kao 9-17
	not(odrzavanje(Predmet, Vrsta, PocTjedan, ZavTjedan)) ->
		asserta(odrzavanje(Predmet, Vrsta, PocTjedan, ZavTjedan))
		;
		true
	*/
	odrzavanje(Predmet, Vrsta, PocTjedan2, ZavTjedan2) ->
		(
		PocTjedan == PocTjedan2, ZavTjedan == ZavTjedan2 ->
			true
			;
			retract(odrzavanje(Predmet, Vrsta, PocTjedan2, ZavTjedan2)),
			NoviPocTjedan is min(PocTjedan, PocTjedan2),
			NoviZavTjedan is max(ZavTjedan, ZavTjedan2),
			asserta(odrzavanje(Predmet, Vrsta, NoviPocTjedan, NoviZavTjedan))
		)
		;
		asserta(odrzavanje(Predmet, Vrsta, PocTjedan, ZavTjedan))
	),
	dan(Dan, NazivDana, _),
	(
	not(raspored(Predmet, Vrsta, termin(NazivDana, vrijeme(Hpocetak, Mpocetak), vrijeme(Hkraj, Mkraj)), lokacija(Zgrada, Prostorija))) ->
		asserta(raspored(Predmet, Vrsta, termin(NazivDana, vrijeme(Hpocetak, Mpocetak), vrijeme(Hkraj, Mkraj)), lokacija(Zgrada, Prostorija)))
		;
		true
	),
	false
.

:- dynamic
	obveznost/2,									% obveznost(NazivPredmeta:atom, VrstaNastave:atom)
	raspored/4,										% raspored(NazivPredmeta:atom, VrstaNastave:atom, Termin:termin/3, Lokacija:lokacija/2)
	odrzavanje/4,									% odrzavanje(NazivPredmeta:atom, VrstaNastave:atom, TjedanPocetka:integer, TjedanZavrsetka:integer)
	generiraniRaspored/4,							% generiraniRaspored(NazivPredmeta:atom, VrstaNastave:atom, Termin:termin/3, Lokacija:lokacija/2)
	pocetciPoDanima/2,								% pocetciPoDanima(NazivDana:atom, VrijemePocetkaNastave:vrijeme/2)
	zavrsetciPoDanima/2,							% zavrsetciPoDanima(NazivDana:atom, VrijemeZavrsetkaNastave:vrijeme/2)
	trajanjeNastavePoDanima/2,						% trajanjeNastavePoDanima(NazivDana:atom, TrajanjeNastave:trajanje/2)
	trajanjePredmetaPoDanima/3,						% trajanjePredmetaPoDanima(NazivDana:atom, NazivPredmeta:atom, TrajanjePredmeta:trajanje/2)
	najranijiPocetak/2,								% najranijiPocetak(NazivDana:atom, NajranijeDozvoljeniPocetakNastave:vrijeme/2)
	najkasnijiZavrsetak/2,							% najkasnijiZavrsetak(NazivDana:atom, NajkasnijeDozvoljeniZavrsetakNastave:vrijeme/2)
	maxTrajanjeRupe/2,								% maxTrajanjeRupe(NazivDana:atom, NajveceDozvoljenoTrajanjeRazmaka:trajanje/2)
	definicijaRupe/2,								% definicijaRupe(NazivDana:atom, MinimalnoTrajanjeRupe:trajanje/2)
	maxBrojRupa/2,									% maxBrojRupa(NazivDana:atom, NajveciDozvoljeniBrojRupa:integer)
	maxTrajanjeNastave/2,							% maxTrajanjeNastave(NazivDana:atom, NajduzeDozvoljenoTrajanjeNastave:trajanje/2)
	minTrajanjeNastave/2,							% minTrajanjeNastave(NazivDana:atom, NajkraceDozvoljenoTrajanjeNastave:trajanje/2)
	maxTrajanjeBoravkaNaFaksu/2,					% maxTrajanjeBoravkaNaFaksu(NazivDana:atom, NajduzeDozvoljeniRazmakIzmedjuPocetkaIZavrsetkaNastave:trajanje/2)
	maxSatiPredmeta/2,								% maxSatiPredmeta(NazivPredmeta:atom, NajveceTjednoTrajanjeNastavePredmeta:trajanje/2)
	maxBrojDanaRaniPocetak/2,						% maxBrojDanaRaniPocetak(NajveciDozvoljeniBrojDana:integer, RaniPocetakNastave:vrijeme/2)
	maxBrojDanaDugoTrajanjeNastave/2,				% maxBrojDanaDugoTrajanjeNastave(NajveciDozvoljeniBrojDana:integer, DugoTrajanjeNastave:trajanje/2)
	maxBrojUzastopnihDanaRaniPocetak/2,				% maxBrojUzastopnihDanaRaniPocetak(NajveciDozvoljeniBrojUzastopnihDana:integer, RaniPocetakNastave:vrijeme/2)
	maxBrojUzastopnihDanaDugoTrajanjeNastave/2,		% maxBrojUzastopnihDanaDugoTrajanjeNastave(NajveciDozvoljeniBrojUzastopnihDana:integer, DugoTrajanjeNastave:trajanje/2)
	minBrojDanaBezNastave/1,						% minBrojDanaBezNastave(BrojDanaBezNastave:integer)		% postoji i istoimeni predikat arnosti 2 koji definira činjenicu s ovim termom
	bezNastaveNaDan/1,								% bezNastaveNaDan(NazivDanaBezNastave:atom)
	ukupniBrojDana/1,								% ukupniBrojDana(UkupniBrojDanaUTjednu:integer)
	trajanjePutovanjaDoDrugeZgrade/1,				% trajanjePutovanjaDoDrugeZgrade(TrajanjePuta:trajanje/2)
	upisano/1										% upisano(NazivPredmeta:atom)
.

/**
 * inicijalizirajTrajanjaNastavePoDanima() is failure.
 * 
 * Predikat koji u bazu znanja pohranjuje da svakog dana nastava traje 0 sati - taj broj se kasnije povećava kako se dodaju termini nastave u raspored.
 */
inicijalizirajTrajanjaNastavePoDanima() :-	%time se dobiva fleksibilnost u slučaju da se nastava počinje izvoditi i subotom, a ne inicijaliziramo prije pokretanja da je trajanje nastave subotom 0
	dan(_, NazivDana, _),
	asserta(trajanjeNastavePoDanima(NazivDana, trajanje(0, 0))),
	false
.

/**
 * inicijalizirajTrajanjaPredmetaPoDanima() is failure.
 * 
 * Predikat koji u bazu znanja pohranjuje da svakog dana nastava iz svakog pojedinog upisanog predmeta traje 0 sati - taj broj se kasnije povećava kako se dodaju termini nastave u raspored.
 */ 
inicijalizirajTrajanjaPredmetaPoDanima() :-
	upisano(Predmet),	% koristi se ako i samo ako se u PHP skripti Prolog interpreteru prvo proslijeđuju upisani predmeti pa tek onda vrši poziv ovog predikata
	%raspored(Predmet, _, _, _),	% radi uvijek, ali uzrokuje lošije performanse od gornje linije
	dan(_, NazivDana, _),
	not(trajanjePredmetaPoDanima(NazivDana, Predmet, _)),	% ova provjera je potrebna ako se predmeti inicijaliziraju iz baze znanja u termu raspored, a ne u termu upisano
	asserta(trajanjePredmetaPoDanima(NazivDana, Predmet, trajanje(0, 0))),
	false
.

% dan(RedniBrojDanaUTjednu:integer, NazivDana:atom, JestRadniDan:atom) is a fact.
dan(1, 'ponedjeljak', true).
dan(2, 'utorak', true).
dan(3, 'srijeda', true).
dan(4, 'četvrtak', true).
dan(5, 'petak', true).
dan(6, 'subota', false).
dan(7, 'nedjelja', false).

/**
 * dohvatiRaspored(+OsnovniRaspored:atom) is failure.
 * 
 * Predikat ovisno o vrijednosti =|OsnovniRaspored|= parametra poziva pripadajući predikat za generiranje određene vrste rasporedā (=|dohvatiOsnovniRaspored/0|= ako je vrijednost parametra =|true|=, inače =|dohvatiProsireniRaspored/0|=).
 * 
 * @param OsnovniRaspored	Binarna vrijednost ovisno o kojoj se poziva predikat za generiranje određene vrste rasporedā
 */
dohvatiRaspored(OsnovniRaspored) :-
	OsnovniRaspored ->
		dohvatiOsnovniRaspored()
		;
		dohvatiProsireniRaspored()
.

/**
 * obvezniUpisaniPredmetiPoVrstama(?Predmet:atom, ?Vrsta:atom) is nondet.
 * 
 * Predikat koji vraća nazive predmetā i pripadajuću vrstu nastave na kojima je redovni student obvezan prisustvovati.
 *
 * @param Predmet	Naziv predmeta
 * @param Vrsta		Vrsta nastave (=|p|= - predavanje, =|s|= - seminar, =|av|= - auditorne vježbe, =|lv|= - laboratorijske vježbe, =|v|= - vježbe)
 */
obvezniUpisaniPredmetiPoVrstama(Predmet, Vrsta) :-
	upisano(Predmet),
	obveznost(Predmet, Vrsta)
.

/**
 * dohvatiOsnovniRaspored() is failure.
 *
 * Predikat koji iz upisanih predmeta generira i ispisuje valjane _osnovne_ rasporede nastave - _Osnovni_ rasporedi su oni koji sadržavaju samo obvezne termine nastave.
 */
dohvatiOsnovniRaspored() :-
	findall(stavka(Predmet, Vrsta), obvezniUpisaniPredmetiPoVrstama(Predmet, Vrsta), Lista),
	nadjiRaspored(Lista)
.

/**
 * sviPredmeti(-Predmet:atom, -Vrsta:atom) is nondet().
 * 
 * Predikat koji vraća sve nazive predmetā sa svim pripadajućim vrstama nastave.
 * @param Predmet	Naziv predmeta
 * @param Vrsta		Vrsta nastave (=|p|= - predavanje, =|s|= - seminar, =|av|= - auditorne vježbe, =|lv|= - laboratorijske vježbe, =|v|= - vježbe)
 */
sviPredmeti(Predmet, Vrsta) :-
	upisano(Predmet),
	raspored(Predmet, Vrsta, _, _)
.

/**
 * dohvatiProsireniRaspored() is failure.
 *
 * Predikat koji iz upisanih predmeta generira i ispisuje valjane _proširene_ rasporede nastave - _Prošireni_ rasporedi uz obvezne termine nastave sadržava i neobvezne termine nastave koje je po mogućnosti moguće uklopiti u raspored, a da pritom bude valjan.
 */
dohvatiProsireniRaspored() :-
	setof(stavka(Predmet, Vrsta), sviPredmeti(Predmet, Vrsta), Lista),
	nadjiRaspored(Lista)
.

/**
 * string_list_concat(+Lista:list<string>, +Separator:string, -Rezultat:string) is semidet.
 *
 * Pomoćni predikat preko kojeg se poziva string_list_concat/4 predikat, a služi za združivanje znakovnih nizova liste =|Lista|= pri čemu se između svaka 2 elementa postavlja znakovni niz sadržan u varijabli =|Separator|=
 * @param Lista		Lista znakovnih nizova koje je potrebno združiti u cjelinu
 * @param Separator	Znakovni niz kojim se _lijepe_ članovi liste =|Lista|= u cjelinu
 * @param Rezultat	Znakovni niz koji jest rezultat združivanja
 */
string_list_concat(Lista, Separator, Rezultat) :-
	string_list_concat(Lista, Separator, "", Rezultat)
.

/**
 * string_list_concat(+Lista:list<string>, +Separator:string, +Rezultat:string, -KonacniRezultat:string) is semidet.
 *
 * Predikat koji združuje znakovne nizove liste =|Lista|= pri čemu se između svaka 2 elementa postavlja znakovni niz sadržan u varijabli =|Separator|=, ekvivalent funkciji =|implode|= u jeziku PHP te =|join|= u jezicima poput Java, C# i Python.
 * @param Lista				Lista znakovnih nizova koje je još potrebno nadodati na međurezultat sadržan u varijabli =|Rezultat|=
 * @param Separator			Znakovni niz kojim se _lijepe_ članovi liste =|Lista|= u cjelinu
 * @param Rezultat			Dosadašnji rezultat združivanja koji sudjeluje kao operand u daljnjem združivanju
 * @param KonacniRezultat	Znakovni niz koji jest rezultat konačnog združivanja
 */
% Baza predikata string_list_concat/4
string_list_concat([ZadnjaStavka], _, Rezultat, KonacniRezultat) :-
	string_concat(Rezultat, ZadnjaStavka, KonacniRezultat)
.

% Korak rekurzije predikata string_list_concat/4
string_list_concat([Stavka|Preostale], Separator, Rezultat, KonacniRezultat) :-
	string_concat(Rezultat, Stavka, NoviRezultatTmp),
	string_concat(NoviRezultatTmp, Separator, NoviRezultat),
	string_list_concat(Preostale, Separator, NoviRezultat, KonacniRezultat)
.

/**
 * serijalizirajUJson(-SerijaliziraniObjekt:string) is nondet.
 *
 * Predikat koji vraća svaku pojedinu stavku valjanog generiranog rasporeda serijaliziranu u JSON format. Valjani generirani raspored se u trenutku poziva ovog predikata nalazi u bazi znanja =|generiraniRaspored/4|=.
 * @param SerijaliziraniObjekt	Stavka valjanog generiranog rasporeda iskazana u JSON formatu
 */
serijalizirajUJson(SerijaliziraniObjekt) :-
	generiraniRaspored(Predmet, Vrsta, termin(NazivDana, vrijeme(Hstart, Mstart), vrijeme(Hkraj, Mkraj)), lokacija(Zgrada, Prostorija)),
	format(string(Pocetak), "~|~`0t~d~2+:~|~`0t~d~2+", [Hstart, Mstart]),
	format(string(Kraj), "~|~`0t~d~2+:~|~`0t~d~2+", [Hkraj, Mkraj]),
	(
	obveznost(Predmet, Vrsta) ->
		Obveznost = @(true)
		;
		Obveznost = @(false)
	),
	odrzavanje(Predmet, Vrsta, Wstart, Wkraj),
	dan(RedniBrojDana, NazivDana, _),
	with_output_to(string(SerijaliziraniObjekt), json_write(current_output, json{predmet:Predmet,vrsta:Vrsta,obveznost:Obveznost,razdoblje:json{start:Wstart,kraj:Wkraj},termin:json{dan:RedniBrojDana,start:Pocetak,kraj:Kraj},lokacija:json{zgrada:Zgrada,prostorija:Prostorija}}, [width(0)]))	%bolje performanse daje korištenje terma string/1 umjesto atom/1, ali rezultat kasnije zahtijeva izradu vlastite varijante atomic_list_concat/3 predikata za stringove
.

/**
 * nadjiRaspored(+Lista:list<stavka/2>) is failure.
 *
 * Predikat koji za potencijalne stavke rasporeda (odnosno odabrane vrste nastave odabranih upisanih predmeta) generira i ispisuje sve valjane kombinacije rasporeda nastave za studenta. Svaka stavka ne mora biti dio svakog rasporeda (ako je stavka izborna, tada će raspored može sastaviti i bez nje).
 * @param Lista		Lista stavki rasporeda koja je kod svakog rekurzivnog poziva predikata (odnosno kod svakog dozvoljenog preskakanja stavke ili kod uspješnog uvrštavanja stavke u raspored) za jedan element kraća
 */

/*	% prikaz rasporeda iz prologa u tabličnom obliku
% Baza predikata nadjiRaspored/1
nadjiRaspored([]) :- %findall(stavka(Predmet, Vrsta, NazivDana, Hpocetak, Mpocetak, Hkraj, Mkraj),
	format(atom(Zaglavlje), "~n|~a~t~40||~t~a~t~4+|~t~a~t~12+|~t~a~t~8+|~t~a~t~8+|~t~a~t~12+|~n", ['naziv predmeta', 'tip', 'dan', 'pocetak', 'kraj', 'lokacija']),
	write(Zaglavlje),
	generiraniRaspored(Predmet, Vrsta, termin(NazivDana, vrijeme(Hpocetak, Mpocetak), vrijeme(Hkraj, Mkraj)), lokacija(Zgrada, Prostorija)),
	format(atom(Redak), "|~a~t~40||~t~a~t~4+|~t~a~t~12+|~t~d:~d~t~8+|~t~d:~d~t~8+|~t~a > ~a~t~12+|~n", [Predmet, Vrsta, NazivDana, Hpocetak, Mpocetak, Hkraj, Mkraj, Zgrada, Prostorija]),
	write(Redak),
	false
.
*/


% Baza predikata nadjiRaspored/1
nadjiRaspored([]) :-
	findall(Objekt, serijalizirajUJson(Objekt), NizSerijaliziranihObjekata),
	%atomic_list_concat(NizSerijaliziranihObjekata, ',', SerijaliziraniObjekti),
	string_list_concat(NizSerijaliziranihObjekata, ",", SerijaliziraniObjekti),	% boljih performansi od gornjeg
	write("["), write(SerijaliziraniObjekti), write("]"), nl()
.

% Korak rekurzije predikata nadjiRaspored/1
nadjiRaspored([stavka(Predmet, Vrsta)|Preostali]) :-
	(
	not(obveznost(Predmet, Vrsta)) ->
		ignore(nadjiRaspored(Preostali))
		;
		true
	),
	raspored(Predmet, Vrsta, Termin, Lokacija),
	odrzavanje(Predmet, Vrsta, Wpocetak, Wkraj),
	(
	not(pristajeURaspored(Termin, Wpocetak, Wkraj, Lokacija)),
	termin(NazivDana, Pocetak, Kraj) = Termin,
	trajanjeNastavePoDanima(NazivDana, DosadasnjeTrajanjeNastave),
	trajanjePredmetaPoDanima(NazivDana, Predmet, DosadasnjeTrajanjePredmeta),
	(
	pocetciPoDanima(NazivDana, DosadMinDolazak) ->
		(
		Pocetak \\< DosadMinDolazak ->
			NoviDolazak = Pocetak
			;
			NoviDolazak = DosadMinDolazak
		)
		;
		NoviDolazak = Pocetak
	),
	(
	zavrsetciPoDanima(NazivDana, DosadMaxOdlazak) ->
		(
		Kraj \\> DosadMaxOdlazak ->
			NoviOdlazak = Kraj
			;
			NoviOdlazak = DosadMaxOdlazak
		)
		;
		NoviOdlazak = Kraj
	),

	zadovoljavaIndividualneUvjete(Predmet, Termin, DosadasnjeTrajanjeNastave, DosadasnjeTrajanjePredmeta, NoviDolazak, NoviOdlazak) ->
		asserta(generiraniRaspored(Predmet, Vrsta, Termin, Lokacija)),
		ignore(nadjiRaspored(Preostali)),
		retract(generiraniRaspored(Predmet, Vrsta, Termin, Lokacija)),
		retract(trajanjeNastavePoDanima(NazivDana, _)),
		asserta(trajanjeNastavePoDanima(NazivDana, DosadasnjeTrajanjeNastave)),
		retract(trajanjePredmetaPoDanima(NazivDana, Predmet, _)),
		asserta(trajanjePredmetaPoDanima(NazivDana, Predmet, DosadasnjeTrajanjePredmeta)),
		retract(pocetciPoDanima(NazivDana, NoviDolazak)),
		(
		nonvar(DosadMinDolazak) ->
			asserta(pocetciPoDanima(NazivDana, DosadMinDolazak))
			;
			true
		),
		retract(pocetciPoDanima(NazivDana, NoviOdlazak)),
		(
		nonvar(DosadMaxOdlazak) ->
			asserta(pocetciPoDanima(NazivDana, DosadMaxOdlazak))
			;
			true
		)
		;
		true
	),
	false
.

/**
 * pristajeURaspored(+TerminNastave:termin/3, +TjedanPocetka:integer, +TjedanZavrsetka:integer, +NazivZgrade:atom) is semidet.
 *
 * Predikat koji za umetanu stavku provjerava preklapa li se s nekom od stavki koje su već umetnute u dosadašnji raspored te se održavaju na isti dan.
 * @param TerminNastave		Podaci o terminu nastave
 * @param TjedanPocetka		Tjedan semestra kada nastava stavke počinje s održavanjem
 * @param TjedanZavrsetka	Tjedan semestra kada nastava stavke završava s održavanjem
 * @param NazivZgrade		Naziv zgrade u kojoj se održava nastava
 */
pristajeURaspored(termin(NazivDana, Pocetak, Kraj), Wpocetak, Wkraj, Zgrada) :-
	generiraniRaspored(Predmet2, Vrsta2, termin(NazivDana, Pocetak2, Kraj2), lokacija(Zgrada2, _)),
	odrzavanje(Predmet2, Vrsta2, Wpocetak2, Wkraj2),
	postojiPreklapanje(termin(Pocetak, Kraj), Wpocetak, Wkraj, Zgrada, termin(Pocetak2, Kraj2), Wpocetak2, Wkraj2, Zgrada2)
.

/**
 * dajSatiIMinute(+VrijemeIliTrajanje:vrijeme/2, -Sati:integer, -Minute:integer) is det.
 * dajSatiIMinute(+VrijemeIliTrajanje:trajanje/2, -Sati:integer, -Minute:integer) is det.
 * 
 * Predikat koji iz proslijeđenog vremena ili trajanja izvlači komponente vremena: sati i minute.
 * @param VrijemeIliTrajanje	Vremenski trenutak ili trajanje
 * @param Sati					Satna komponenta vremenskog trenutka ili trajanja izraženog u satima
 * @param Minute				Minutna komponenta vremenskog trenutka ili trajanja izraženog u satima
 */
dajSatiIMinute(VrijemeIliTrajanje, H, M) :-
	arg(1, VrijemeIliTrajanje, H),
	arg(2, VrijemeIliTrajanje, M)
.

/**
 * jestManje(+Vrijeme1:vrijeme/2, +Vrijeme2:vrijeme/2) is semidet.
 * jestManje(+Trajanje1:trajanje/2, +Trajanje2:trajanje/2) is semidet.
 *
 * Predikat koji provjerava prethodi li =|VrijemeIliTrajanje1|= vremenski trenutak vremenskom trenutku =|VrijemeIliTrajanje2|=, odnosno traje li kraće. Argumenti zapravo moraju biti bilo kojeg terma arnosti 2 ili više što bi se zapravo moglo ograničiti unifikacijama, no radi očuvanja performansi je ovako.
 * @param VrijemeIliTrajanje1	Prvi uspoređivani vremenski trenutak ili trajanje
 * @param VrijemeIliTrajanje2	Drugi uspoređivani vremenski trenutak ili trajanje
 */
jestManje(VrijemeIliTrajanje1, VrijemeIliTrajanje2) :-
	dajSatiIMinute(VrijemeIliTrajanje1, H1, M1),
	dajSatiIMinute(VrijemeIliTrajanje2, H2, M2),
	(
	H1 < H2 ->
		true
		;
		H1 \== H2 ->
			false
			;
			M1 < M2 ->
				true
				;
				false
	)
.

/**
 * postojiPreklapanje(+TerminNastave1:termin/2, +TjedanPocetka1:integer, +TjedanZavrsetka1:integer, +NazivZgrade1:atom, +TerminNastave2:termin/2, +TjedanPocetka2:integer, +TjedanZavrsetka2:integer, +NazivZgrade2:atom) is semidet.
 *
 * Predikat koji provjerava preklapaju li se dva uspoređivana termina nastave pri čemu se uzima u obzir i trajanje putovanja (ako je definirano) koje je potrebno da se od jedne lokacije stigne do druge.
 * @param TerminNastave1		Podaci o prvom terminu nastave
 * @param TjedanPocetka1		Tjedan semestra kada nastava prve stavke počinje s održavanjem
 * @param TjedanZavrsetka1		Tjedan semestra kada nastava prve stavke završava s održavanjem
 * @param NazivZgrade1			Naziv zgrade u kojoj se održava nastava prvog termina
 * @param TerminNastave2		Podaci o drugom terminu nastave
 * @param TjedanPocetka2		Tjedan semestra kada nastava druge stavke počinje s održavanjem
 * @param TjedanZavrsetka2		Tjedan semestra kada nastava druge stavke završava s održavanjem
 * @param NazivZgrade2			Naziv zgrade u kojoj se održava nastava drugog termina
 */
postojiPreklapanje(termin(Pocetak1, Kraj1), Wstart1, Wkraj1, Zgrada1, termin(Pocetak2, Kraj2), Wstart2, Wkraj2, Zgrada2) :-
	Pocetak1 \\< Kraj2,
	Kraj1 \\> Pocetak2,
	Wstart1 < Wkraj2,
	Wkraj1 > Wstart2 ->
		true
		;
		Zgrada1 \== Zgrada2,
		trajanjePutovanjaDoDrugeZgrade(TrajanjePutovanja),
		Razlika1 \\= Kraj1 \\- Pocetak2,
		Razlika2 \\= Kraj2 \\- Pocetak1,
		(
		Razlika1 \\< TrajanjePutovanja
		;
		Razlika2 \\< TrajanjePutovanja
		)
.

/**
 * dajRazlikuVremena(+Vrijeme1:vrijeme/2, +Vrijeme2:vrijeme/2, -Rezultat:trajanje/2) is det.
 *
 * Predikat koji u varijablu =|Rezultat|= pohranjuje vremenski razmak između vremenskih trenutaka =|Vrijeme1|= i =|Vrijeme2|=.
 * @param Vrijeme1	Prvi vremenski trenutak
 * @param Vrijeme2	Drugi vremenski trenutak
 * @param Rezultat	Trajanje vremenskog razmaka između vremenskih trenutaka =|Vrijeme1|= i =|Vrijeme2|=
 */
dajRazlikuVremena(Vrijeme1, Vrijeme2, Rezultat) :-
	Vrijeme1 \\<= Vrijeme2 ->
		Vrijeme1 = vrijeme(H1, M1),
		Vrijeme2 = vrijeme(H2, M2),
		RazlikaMinutaTmp is M2 - M1,
		(
		RazlikaMinutaTmp < 0 ->
			RazlikaMinuta is 60 + RazlikaMinutaTmp,
			RazlikaSati is H2 - H1 - 1
			;
			RazlikaMinuta = RazlikaMinutaTmp,
			RazlikaSati is H2 - H1
		),
		Rezultat = trajanje(RazlikaSati, RazlikaMinuta)
	;
	dajRazlikuVremena(Vrijeme2, Vrijeme1, Rezultat)
.

/**
 * dajZbrojTrajanja(+Trajanje1:trajanje/2, +Trajanje2:trajanje/2, -Rezultat:trajanje/2) is det.
 *
 * Predikat koji u varijablu =|Rezultat|= pohranjuje zbroj trajanjā =|Trajanje1|= i =|Trajanje2|=.
 * @param Trajanje1		Prvo trajanje
 * @param Trajanje2		Drugo trajanje
 * @param Rezultat		Zbroj trajanjā =|Trajanje1|= i =|Trajanje2|=
 */
dajZbrojTrajanja(trajanje(H1, M1), trajanje(H2, M2), Rezultat) :-
	ZbrojMinutaTmp is M1 + M2,
	(
	ZbrojMinutaTmp >= 60 ->
		ZbrojMinuta is ZbrojMinutaTmp - 60,
		ZbrojSati is H1 + H2 + 1
		;
		ZbrojMinuta = ZbrojMinutaTmp,
		ZbrojSati is H1 + H2
	),
	Rezultat = trajanje(ZbrojSati, ZbrojMinuta)
.

/**
 * jestRanije(-Rezultat:atom, +Termin1:termin/2, +Termin2:termin/2) is det.
 *
 * Predikat koji ispituje prethodi li termin =|Termin1|= terminu =|Termin2|= kao što radi i predikat jestManje/2, no svrha ovoga jest kako bi se omogućilo sortiranje liste termina nastave (konkretno, uvrštenih u raspored) pomoću predikata =|predsort/3|= kod kojeg je prvi parametar funkcijski simbol koji predstavlja istoimeni predikat arnosti 3 (Prvi parametar jest nevezana varijabla koja bi trebala vratiti atom '<', '=' ili '>', dok preostala dva su vezane varijable koje predstavljaju uspoređivane elemente liste). Ekvivalentno je metodama za implementaciju sučelja Comparator u Javi i Comparer u C#.
 * @param Rezultat	Rezultat uspoređivanja kojeg koristi =|predsort/3|= predikat - atom '<' ako =|Termin1|= prethodi terminu =|Termin2|=, inače atom '>'
 * @param Termin1	Prvi uspoređivani element liste
 * @param Termin2	Drugi uspoređivani element liste
 */
jestRanije(Rezultat, termin(Pocetak1, _), termin(Pocetak2, _)) :-
	Pocetak1 \\< Pocetak2 ->
		Rezultat = <
		;
		Rezultat = >
.

/**
 * dajSortiranaVremenaNastaveNaDan(+NazivDana:atom, +NoviTermin:termin/2, -Rezultat:list<termin/2>) is det.
 * 
 * Predikat koji pronalazi sve termine nastave koji se nalaze u trenutnom rasporedu na dan =|NazivDana|=, sortira sve te termine (zajedno s dodajućim terminom =|NoviTermin|=) te rezultat pohranjuje u varijablu =|Rezultat|=. Svrha rezultata ovog predikata jest da se utvrdi zadovoljivost dosadašnjeg rasporeda pravilima vezanih uz trajanje i broj rupa.
 * @param NazivDana		Naziv dana u kojem se nalaze termini nastave u dosadašnjem rasporedu
 * @param NoviTermin	Vremenski podaci o terminu nastave koji se trenutno pokušava dodati u raspored
 * @param Rezultat		Uzlazno sortirana lista termina nastave dosadašnjeg rasporeda (uključujući i umetani termin) prema vremenu početka termina nastave
 */
dajSortiranaVremenaNastaveNaDan(NazivDana, NoviTermin, Rezultat) :-
	findall(termin(Pocetak, Kraj), generiraniRaspored(_, _, termin(NazivDana, Pocetak, Kraj), _), VremenaNastave),
	predsort(jestRanije, [NoviTermin|VremenaNastave], Rezultat)
.

/**
 * dajRazmakeIzmedjuPredmeta(+Termini:list<termin/2>, ?DefinicijaRupe:trajanje/2, -BrojRupa:integer, +TrajanjeNajveceRupe:trajanje/2) is semidet.
 * 
 * Pomoćni predikat preko kojeg se poziva predikat dajRazmakeIzmedjuPredmeta/5, a koji služi za računanje vremenskih razmaka između proslijeđene liste termina =|Termini|=, broji koliko njih se smatra rupom prema proslijeđenoj definiciji rupe =|DefinicijaRupe|= (opcionalno) te najduže postojano trajanje vremenskog razmaka se veže u varijablu =|TrajanjeNajveceRupe|=.
 * @param Termini							Lista termina nastave koji bi trebali biti uzlazno sortirani prema vremenu početka i između koji se računaju vremenski razmaci
 * @param DefinicijaRupe					Minimalno trajanje vremenskog razmaka između 2 susjedna termina kako bi se on tretirao rupom (nad čijim brojem se mogu definirati ograničenja)
 * @param BrojRupa							Ukupan broj rupa (ako je zadana definicija rupe varijablom =|DefinicijaRupe|=) između zadanih vremenskih termina u varijabli =|Termini|=
 * @param TrajanjeNajveceRupe				Trajanje najdužeg vremenskog razmaka koji postoji između zadanih vremenskih termina u varijabli =|Termini|=
 */
dajRazmakeIzmedjuPredmeta(Termini, DefinicijaRupe, BrojRupa, NajvecaRupa) :-
	dajRazmakeIzmedjuPredmeta(Termini, DefinicijaRupe, _, BrojRupa, NajvecaRupa)
.

/**
 * dajRazmakeIzmedjuPredmeta(+Termini:list<termin/2>, ?DefinicijaRupe:trajanje/2, -PocetakSljedecegTerminaNastave:vrijeme/2, -BrojRupa:integer, +TrajanjeNajveceRupe:trajanje/2) is semidet.
 * 
 * Predikat koji služi za računanje vremenskih razmaka između proslijeđene liste termina =|Termini|=, broji koliko njih se smatra rupom prema proslijeđenoj definiciji rupe =|DefinicijaRupe|= (opcionalno) te najduže postojano trajanje vremenskog razmaka se veže u varijablu =|TrajanjeNajveceRupe|=.
 * @param Termini							Lista termina nastave koji bi trebali biti uzlazno sortirani prema vremenu početka i između koji se računaju vremenski razmaci
 * @param DefinicijaRupe					Minimalno trajanje vremenskog razmaka između 2 susjedna termina kako bi se on tretirao rupom (nad čijim brojem se mogu definirati ograničenja)
 * @param PocetakSljedecegTerminaNastave	Početak sljedećeg termina nastave u listi =|Termini|= u odnosu na trenutno-promatranog koji služi za računanje vremenskog razmaka između njih: vremenski_razmak = vrijeme_početka_sljedećeg - vrijeme_završetka_trenutnog
 * @param BrojRupa							Broj rupa koji je izbrojan do sada (ukoliko je zadana definicija rupe varijablom =|DefinicijaRupe|=) između zadanih vremenskih termina u varijabli =|Termini|=
 * @param TrajanjeNajveceRupe				Trajanje najdužeg vremenskog razmaka do sada koja je pronađena između zadanih vremenskih termina u varijabli =|Termini|=
 */
% Baza predikata dajRazmakeIzmedjuPredmeta/5
dajRazmakeIzmedjuPredmeta([termin(Pocetak, _)], _, Pocetak, 0, trajanje(0, 0)).

% Rekurzivni korak predikata dajRazmakeIzmedjuPredmeta/5
dajRazmakeIzmedjuPredmeta([termin(Pocetak, Kraj)|Preostali], MinTrajanjeRupe, SljedeciPocetak, BrojRupa, NajvecaRupa) :-
	dajRazmakeIzmedjuPredmeta(Preostali, MinTrajanjeRupe, DosadasnjiSljedeciPocetak, DosadasnjiBrojRupa, DosadasnjaNajvecaRupa),
	Razmak \\= DosadasnjiSljedeciPocetak \\- Kraj,
	(
	nonvar(MinTrajanjeRupe), MinTrajanjeRupe \\<= Razmak ->
		BrojRupa is DosadasnjiBrojRupa + 1
		;
		BrojRupa = DosadasnjiBrojRupa
	),
	(
	DosadasnjaNajvecaRupa \\< Razmak ->
		NajvecaRupa = Razmak
		;
		NajvecaRupa = DosadasnjaNajvecaRupa
	),
	SljedeciPocetak = Pocetak
.

/**
 * zadovoljavaPravilaRupe(+Termin:termin/3) is semidet.
 * 
 * Predikat koji provjerava zadovoljava li proslijeđeni termin =|Termin|= (koji se želi umetnuti u raspored) pravila vezana uz rupe i vremenske razmake (npr. maksimalni broj dozvoljenih rupa i najdulje dozvoljeni vremenski razmak).
 * @param Termin	Termin za koji se provjerava da li zadovoljava spomenuta pravila
 */
zadovoljavaPravilaRupa(termin(NazivDana, Pocetak, Kraj)) :-
	(
	maxBrojRupa(NazivDana, MaxBrojRupa) ->
		definicijaRupe(NazivDana, MinTrajanjeRupe),
		ObradiDan = 1
		;
		true
	),
	(
	maxTrajanjeRupe(NazivDana, MaxTrajanjeRupe) ->
		ObradiDan = 1
		;
		true
	),
	(
	ObradiDan == 1 ->
		dajSortiranaVremenaNastaveNaDan(NazivDana, termin(Pocetak, Kraj), VremenaNastave),
		dajRazmakeIzmedjuPredmeta(VremenaNastave, MinTrajanjeRupe, BrojRupa, TrajanjeNajveceRupe),
		(
		nonvar(MaxBrojRupa) ->
			MaxBrojRupa >= BrojRupa
			;
			true
		),
		(
		nonvar(MaxTrajanjeRupe) ->
			TrajanjeNajveceRupe \\<= MaxTrajanjeRupe
			;
			true
		)
		;
		true
	)
.

/**
 * zadovoljavaIndividualneUvjete(+NazivPredmeta:atom, +Termin:termin/3, +StaroUkupnoTrajanje:trajanje/2, +StaroUkupnoTrajanjePredmeta:trajanje/2, +DolazakNaDan:vrijeme/2, +OdlazakNaDan:vrijeme/2) is semidet.
 *
 * Predikat koji provjerava zadovoljava li termin =|Termin|= tzv. individualne uvjete koji su zadani ograničenjima (npr. osiguranje da na dan =|NazivDana|= nema nastave, da nastava na =|NazivDana|= ne počinje ranije ili završava kasnije od definiranog vremena, ...).
 * @param NazivPredmeta					Naziv predmeta čiji se trenutno-promatrani termin nastave =|Termin|= pokušava uvrstiti u raspored
 * @param Termin						Termin za koji se provjerava da li zadovoljava spomenuta pravila
 * @param StaroUkupnoTrajanje			Dosadašnje ukupno trajanje nastave na dan na koji se odnosi termin =|Termin|=
 * @param StaroUkupnoTrajanjePredmeta	Dosadašnje ukupno trajanje predmeta =|NazivPredmeta|= na dan na koji se odnosi termin =|Termin|=
 * @param DolazakNaDan					Vrijeme dolaska na fakultet na dan na koji se odnosi termin =|Termin|= (uključujući u raspored termin nastave koji se pokušava umetnuti)
 * @param OdlazakNaDan					Vrijeme odlaska s fakulteta na dan na koji se odnosi termin =|Termin|= (uključujući u raspored termin nastave koji se pokušava umetnuti)
 */
zadovoljavaIndividualneUvjete(Predmet, termin(NazivDana, Pocetak, Kraj), StaroUkupnoTrajanje, StaroUkupnoTrajanjePredmeta, DolazakNaDan, OdlazakNaDan) :-
	not(bezNastaveNaDan(NazivDana)),
	(
	najranijiPocetak(NazivDana, MinPocetak) ->
		Pocetak \\>= MinPocetak
		;
		true
	),
	(
	najkasnijiZavrsetak(NazivDana, MaxKraj) ->
		Kraj \\<= MaxKraj
		;
		true
	),

	(
	maxTrajanjeBoravkaNaFaksu(NazivDana, MaxTrajanjeBoravka) ->
		TrajanjeBoravka \\= OdlazakNaDan \\- DolazakNaDan,
		TrajanjeBoravka \\<= MaxTrajanjeBoravka
		;
		true
	),
	%dajTrajanjeNastaveNaDan(NazivDana, StaroUkupnoTrajanje),	% nepotrebno bi se svaki put pregledavali do sada uvršeni predmet u generirani raspored te računalo njihovo ukupno trajanje što daje lošije performanse
	OvoTrajanje \\= Pocetak \\- Kraj,
	NovoUkupnoTrajanje \\= StaroUkupnoTrajanje \\+ OvoTrajanje,
	(
	maxTrajanjeNastave(NazivDana, MaxTrajanje) ->
		NovoUkupnoTrajanje \\<= MaxTrajanje
		;
		true
	),
	(
	minTrajanjeNastave(NazivDana, MinTrajanje) ->
		NovoUkupnoTrajanje \\>= MinTrajanje
		;
		true
	),
	
	%dajTrajanjePredmetaNaDan(NazivDana, Predmet, StaroUkupnoTrajanjePredmeta),	% ista stvar kao i gore
	NovoUkupnoTrajanjePredmeta \\= StaroUkupnoTrajanjePredmeta \\+ OvoTrajanje,
	(
	maxSatiPredmeta(Predmet, MaxTrajanjePredmeta) ->
		NovoUkupnoTrajanjePredmeta \\<= MaxTrajanjePredmeta
		;
		true
	),
	(
	minBrojDanaBezNastave(MinBrojDanaBezNastave) ->
		aggregate_all(count, pocetciPoDanima(_, _), BrojDanaSNastavomTmp),
		(
		pocetciPoDanima(NazivDana, _) ->
			BrojDanaSNastavom = BrojDanaSNastavomTmp
			;
			BrojDanaSNastavom is BrojDanaSNastavomTmp + 1
		),
		ukupniBrojDana(UkupniBrojDana),
		BrojDanaBezNastave is UkupniBrojDana - BrojDanaSNastavom,
		MinBrojDanaBezNastave =< BrojDanaBezNastave
		;
		true
	),
	(
	(maxBrojRupa(NazivDana, _), definicijaRupe(NazivDana, _) | maxTrajanjeRupe(NazivDana, _)) ->
		zadovoljavaPravilaRupa(termin(NazivDana, Pocetak, Kraj))
		;
		true
	)
	,
	not(pocinjePrecestoPrerano(NazivDana, Pocetak)),
	not(pocinjePrecestoPreranoUzastopno(NazivDana, Pocetak)),
	not(trajePrecestoPredugo(NazivDana, NovoUkupnoTrajanje)),
	not(trajePrecestoPredugoUzastopno(NazivDana, NovoUkupnoTrajanje)),

	(
	Pocetak == DolazakNaDan ->
		ignore(retract(pocetciPoDanima(NazivDana, _))),
		asserta(pocetciPoDanima(NazivDana, DolazakNaDan))
		;
		true
	),
	(
	Kraj == OdlazakNaDan ->
		ignore(retract(zavrsetciPoDanima(NazivDana, _))),
		asserta(zavrsetciPoDanima(NazivDana, OdlazakNaDan))
		;
		true
	),

	retract(trajanjeNastavePoDanima(NazivDana, StaroUkupnoTrajanje)),
	asserta(trajanjeNastavePoDanima(NazivDana, NovoUkupnoTrajanje)),
	retract(trajanjePredmetaPoDanima(NazivDana, Predmet, StaroUkupnoTrajanjePredmeta)),
	asserta(trajanjePredmetaPoDanima(NazivDana, Predmet, NovoUkupnoTrajanjePredmeta))
.

/**
 * minBrojDanaBezNastave(+MinBrojDanaBezNastave:integer, +IskljucujuciVikende:atom) is semidet.
 *
 * Predikat kojim se postavlja zahtjev/ograničenje o minimalnom broju dana tjedno bez nastave.
 * @param MinBrojDanaBezNastave		Minimalni broj dana u tjednu u kojima nema nastave
 * @param IskljucujuciVikende		Veže se uz vrijednost 'true' ukoliko specificirani =|MinBrojDanaBezNastave|= uključuje samo radne dane u tjednu, inače se veže u vrijednost 'false'
 */
minBrojDanaBezNastave(MinBrojDanaBezNastave, IskljucujuciVikende) :-
	aggregate_all(count, dan(_, _, false), BrojDanaVikenda),
	(
	IskljucujuciVikende == true ->
		KonacniBrojDana is MinBrojDanaBezNastave + BrojDanaVikenda
		;
		KonacniBrojDana = MinBrojDanaBezNastave
	),
	aggregate_all(count, dan(_, _, _), UkupniBrojDana),
	asserta(ukupniBrojDana(UkupniBrojDana)),
	asserta(minBrojDanaBezNastave(KonacniBrojDana))
.


%najranijiPocetak('ponedjeljak', vrijeme(8, 0)).
%najranijiPocetak('utorak', vrijeme(8, 0)).
%najranijiPocetak('srijeda', vrijeme(8, 0)).
%najkasnijiZavrsetak('utorak', vrijeme(18, 0)).
%maxTrajanjeRupe('srijeda', trajanje(1, 15)).
%definicijaRupe('srijeda', trajanje(3, 0)).
%maxBrojRupa('srijeda', 1).
%maxTrajanjeNastave('srijeda', trajanje(8, 0)).
%minTrajanjeNastave('utorak', trajanje(1, 0)).
%maxTrajanjeBoravkaNaFaksu('ponedjeljak', trajanje(5, 0)).
%maxSatiPredmeta('Uzorci dizajna', trajanje(3, 0)).
%maxBrojDanaRaniPocetak(3, vrijeme(8, 0)). 
%maxBrojDanaDugoTrajanjeNastave(2, trajanje(5, 0)).
%maxBrojUzastopnihDanaRaniPocetak(2, vrijeme(8, 0)).
%maxBrojUzastopnihDanaDugoTrajanjeNastave(2, trajanje(5, 0)).
%trajanjePutovanjaDoDrugeZgrade(trajanje(0, 7)).
%:- call(minBrojDanaBezNastave(1, true)).
%bezNastaveNaDan('petak').

/**
 * najranijiPocetak(+Vrijeme:vrijeme/2) is nondet.
 *
 * Predikat koji u bazu znanja za svaki dan u tjednu pohranjuje činjenicu da nastava ne smije početi ranije od vremena koje je vezano za varijablu =|Vrijeme|=.
 * @param Vrijeme	Vrijeme najranijeg početka nastave svakog dana u tjednu
 */
najranijiPocetak(Vrijeme) :-
	dan(_, NazivDana, _),
	not(najranijiPocetak(NazivDana, _)),
	asserta(najranijiPocetak(NazivDana, Vrijeme)),
	false
.

/**
 * najkasnijiZavrsetak(+Vrijeme:vrijeme/2) is nondet.
 *
 * Predikat koji u bazu znanja za svaki dan u tjednu pohranjuje činjenicu da nastava ne smije završiti kasnije od vremena koje je vezano za varijablu =|Vrijeme|=.
 * @param Vrijeme	Vrijeme najkasnijeg završetka nastave svakog dana u tjednu
 */
najkasnijiZavrsetak(Vrijeme) :-
	dan(_, NazivDana, _),
	not(najkasnijiZavrsetak(NazivDana, _)),
	asserta(najkasnijiZavrsetak(NazivDana, Vrijeme)),
	false
.

/**
 * maxTrajanjeRupe(+Trajanje:trajanje/2) is nondet.
 *
 * Predikat koji u bazu znanja za svaki dan u tjednu pohranjuje činjenicu da ne smije postojati vremenski razmak između termina nastave trajanja dužeg od trajanja koje je vezano za varijablu =|Trajanje|=.
 * @param Trajanje	Maksimalno dopušteno trajanje vremenskog razmaka svakog dana u tjednu
 */
maxTrajanjeRupe(Trajanje) :-
	dan(_, NazivDana, _),
	not(maxTrajanjeRupe(NazivDana, _)),
	asserta(maxTrajanjeRupe(NazivDana, Trajanje)),
	false
.

/**
 * definicijaRupe(+Trajanje:trajanje/2) is nondet.
 *
 * Predikat koji u bazu znanja za svaki dan u tjednu pohranjuje činjenicu da se vremenski razmaci između termina nastave trajanja kraćeg od trajanja vezanog za varijablu =|Trajanje|=.
 * @param Trajanje	Minimalno trajanje vremenskog razmaka svakog dana u tjednu da bi se vremenski razmak smatrao rupom
 */
definicijaRupe(Trajanje) :-
	dan(_, NazivDana, _),
	not(definicijaRupe(NazivDana, _)),
	asserta(definicijaRupe(NazivDana, Trajanje)),
	false
.

/**
 * maxBrojRupa(+Kolicina:integer) is nondet.
 *
 * Predikat koji u bazu znanja za svaki dan u tjednu pohranjuje činjenicu da ne smije postojati broj rupa (vremenskih razmaka minimalnog trajanja postavljenog preko činjenice =|definicijaRupe/2|=) veći od broja vezanog za varijablu =|Kolicina|=.
 * @param Kolicina	Maksimalni dozvoljeni broj rupa svakog dana u tjednu
 */
maxBrojRupa(Kolicina) :-
	dan(_, NazivDana, _),
	not(maxBrojRupa(NazivDana, _)),
	asserta(maxBrojRupa(NazivDana, Kolicina)),
	false
.

/**
 * maxTrajanjeNastave(+Trajanje:trajanje/2) is nondet.
 *
 * Predikat koji u bazu znanja za svaki dan u tjednu pohranjuje činjenicu da nastava ne smije trajati duže od trajanja koje je vezano za varijablu =|Trajanje|=.
 * @param Trajanje	Maksimalno dopušteno trajanje nastave svakog dana u tjednu
 */
maxTrajanjeNastave(Trajanje) :-
	dan(_, NazivDana, _),
	not(maxTrajanjeNastave(NazivDana, _)),
	asserta(maxTrajanjeNastave(NazivDana, Trajanje)),
	false
.

/**
 * minTrajanjeNastave(+Trajanje:trajanje/2) is nondet.
 *
 * Predikat koji u bazu znanja za svaki radni dan u tjednu pohranjuje činjenicu da nastava ne smije trajati kraće od trajanja koje je vezano za varijablu =|Trajanje|=.
 * @param Trajanje	Minimalno dopušteno trajanje nastave svakog dana u tjednu
 */
minTrajanjeNastave(Trajanje) :-
	dan(_, NazivDana, true),
	not(minTrajanjeNastave(NazivDana, _)),
	asserta(minTrajanjeNastave(NazivDana, Trajanje)),
	false
.

/**
 * maxTrajanjeBoravkaNaFaksu(+Trajanje:trajanje/2) is nondet.
 *
 * Predikat koji u bazu znanja za svaki dan u tjednu pohranjuje činjenicu da se na fakultetu zbog nastave ne smije boraviti duže od trajanja koje je vezano za varijablu =|Trajanje|=.
 * @param Trajanje	Maksimalno dopušteno trajanje boravka na fakultetu svakog dana u tjednu
 */
maxTrajanjeBoravkaNaFaksu(Trajanje) :-
	dan(_, NazivDana, _),
	not(maxTrajanjeBoravkaNaFaksu(NazivDana, _)),
	asserta(maxTrajanjeBoravkaNaFaksu(NazivDana, Trajanje)),
	false
.

/**
 * maxSatiPredmeta(+Trajanje:trajanje/2) is nondet.
 *
 * Predikat koji u bazu znanja za svaki upisani predmet pohranjuje činjenicu da se u rasporedu ne smije nalaziti nastave iz tog predmeta ukupnog trajanja većeg od trajanja koje je vezano za varijablu =|Trajanje|=.
 * @param Trajanje	Maksimalno dopušteno ukupno tjedno trajanje nastave predmetā u rasporedu
 */
maxSatiPredmeta(Trajanje) :-
	upisano(Predmet),
	not(maxSatiPredmeta(Predmet, _)),
	asserta(maxSatiPredmeta(Predmet, Trajanje)),
	false
.

/**
 * prebrojiPreraneDane(+DaniZaProvjeru:list<atom>, +NepreferiraniPocetak:vrijeme/2, +DanUmetaneStavke:atom, +PocetakUmetaneStavke:vrijeme/2, -BrojPreranihDana:integer, -BrojUzastopnoPreranihDana:integer, -NajveciBrojUzastopnoPreranihDana:integer) is det.
 *
 * Predikat koji za svaki dan u tjednu (odnosno za svaki element liste =|DaniZaProvjeru|=) provjerava počinje li nastava na taj dan ranije od vremenskog trenutka vezanog uz varijablu =|NepreferiraniPocetak|= i u tom slučaju se inkrementira sadržaj 5. i 6. varijable-parametra. Podaci o umetanoj stavki (=|DanUmetaneStavke|= i =|PocetakUmetaneStavke|=) se unose zato što nastava umetanog termina može početi ranije nego što je za sada evidentirano da počinje na taj dan nastava ili u slučaju da do sada na taj dan nije bila evidentirana nastava.
 * @param DaniZaProvjeru					Lista naziva dana u tjednu koja je kod svakog rekurzivnog poziva za jedan element kraća
 * @param NepreferiraniPocetak				Vremenski trenutak kojim se definira da za svaki provjeravani dan iz liste =|DaniZaProvjeru|= na koji nastava počinje ranije od tog vremenskog trenutka se inkrementira sadržaj 5. i 6. varijable-parametra
 * @param DanUmetaneStavke					Dan na koji se odnosi umetani termin nastave
 * @param PocetakUmetaneStavke				Početak nastave umetanog termina nastave
 * @param BrojPreranihDana					Do sada izbrojani broj dana kada nastava počinje prerano
 * @param BrojUzastopnoPreranihDana			Do sada izbrojani broj uzastopnih dana kada nastava počinje prerano (resetira se na 0 kada se obrađuje dan iz liste =|DaniZaProvjeru|= na koji nastava ne počnije ranije od vremenskog trenutka =|NepreferiraniPocetak|=)
 * @param NajveciBrojUzastopnoPreranihDana	Do sada najveći izbrojani broj uzastopnih dana, odnosno najveća do sada vrijednost varijable-parametra =|BrojUzastopnoPreranihDana|=
 */
% Baza predikata prebrojiPreraneDane/7
prebrojiPreraneDane([], _, _, _, 0, 0, 0).

% Rekurzivni korak predikata prebrojiPreraneDane/7
prebrojiPreraneDane([Dan|PreostaliDaniZaProvjeru], NepreferiraniPocetak, DanUmetaneStavke, PocetakUmetaneStavke, BrojPreranihDana, BrojUzastopnoPreranihDana, NajveciBrojUzastopnoPreranihDana) :-
	prebrojiPreraneDane(PreostaliDaniZaProvjeru, NepreferiraniPocetak, DanUmetaneStavke, PocetakUmetaneStavke, PrethodniBrojPreranihDana, PrethodniBrojUzastopnoPreranihDana, PrethodniNajveciBrojUzastopnoPreranihDana),
	(
	pocetciPoDanima(Dan, MoguciNajranijiPocetakDana) ->
		(
		DanUmetaneStavke == Dan, PocetakUmetaneStavke \\< MoguciNajranijiPocetakDana ->
			NajranijiPocetakDana = PocetakUmetaneStavke
			;
			NajranijiPocetakDana = MoguciNajranijiPocetakDana
		)
		;
		(
		DanUmetaneStavke == Dan ->
			NajranijiPocetakDana = PocetakUmetaneStavke
			;
			true
		)
	),
	(
	nonvar(NajranijiPocetakDana), NajranijiPocetakDana \\<= NepreferiraniPocetak ->
		BrojPreranihDana is PrethodniBrojPreranihDana + 1,
		BrojUzastopnoPreranihDana is PrethodniBrojUzastopnoPreranihDana + 1,
		(
		PrethodniNajveciBrojUzastopnoPreranihDana < BrojUzastopnoPreranihDana ->
			NajveciBrojUzastopnoPreranihDana = BrojUzastopnoPreranihDana
			;
			NajveciBrojUzastopnoPreranihDana = PrethodniNajveciBrojUzastopnoPreranihDana
		)
		;
		BrojPreranihDana = PrethodniBrojPreranihDana,
		BrojUzastopnoPreranihDana = 0,
		NajveciBrojUzastopnoPreranihDana = PrethodniNajveciBrojUzastopnoPreranihDana
	)
.

/**
 * prebrojiPredugeDane(+DaniZaProvjeru:list<atom>, +NepreferiranoTrajanje:trajanje/2, +DanUmetaneStavke:atom, +NovoUkupnoTrajanjeDana:integer, -BrojPredugihDana:integer, -BrojUzastopnoPredugihDana:integer, -NajveciBrojUzastopnoPredugihDana:integer) is det.
 *
 * Predikat koji za svaki dan u tjednu (odnosno za svaki element liste =|DaniZaProvjeru|=) provjerava traje li nastava na taj dan duže od trajanja vezanog uz varijablu =|NepreferiranoTrajanje|= i u tom slučaju se inkrementira sadržaj 5. i 6. varijable-parametra. Relevantni podaci o danu umetanog termina nastave (=|DanUmetaneStavke|= i =|NovoUkupnoTrajanjeDana|=) se unose zato što u činjenici trajanjeNastavePoDanima/2 u bazi znanja se nalazi trajanje nastave na taj dan bez uključenog trajanja nastave umetanog termina nastave.
 * @param DaniZaProvjeru					Lista naziva dana u tjednu koja je kod svakog rekurzivnog poziva za jedan element kraća
 * @param NepreferiranoTrajanje				Trajanje nastave kojim se definira da za svaki provjeravani dan iz liste =|DaniZaProvjeru|= na koji nastava traje duže od tog trajanja se inkrementira sadržaj 5. i 6. varijable-parametra
 * @param DanUmetaneStavke					Dan na koji se odnosi umetani termin nastave
 * @param NovoUkupnoTrajanjeDana			Trajanje nastave na dan naziva =|DanUmetaneStavke|= uključujući umetani termin nastave
 * @param BrojPredugihDana					Do sada izbrojani broj dana kada nastava traje predugo
 * @param BrojUzastopnoPredugihDana			Do sada izbrojani broj uzastopnih dana kada nastava traje predugo (resetira se na 0 kada se obrađuje dan iz liste =|DaniZaProvjeru|= na koji nastava ne traje duže od trajanja =|NepreferiranoTrajanje|=)
 * @param NajveciBrojUzastopnoPredugihDana	Do sada najveći izbrojani broj uzastopnih dana, odnosno najveća do sada vrijednost varijable-parametra =|BrojUzastopnoPredugihDana|=
 */
% Baza predikata prebrojiPreraneDane/7
prebrojiPredugeDane([], _, _, _, 0, 0, 0).

% Rekurzivni korak predikata prebrojiPreraneDane/7
prebrojiPredugeDane([Dan|PreostaliDaniZaProvjeru], NepreferiranoTrajanje, DanUmetaneStavke, NovoUkupnoTrajanjeDana, BrojPredugihDana, BrojUzastopnoPredugihDana, NajveciBrojUzastopnoPredugihDana) :-
	prebrojiPredugeDane(PreostaliDaniZaProvjeru, NepreferiranoTrajanje, DanUmetaneStavke, NovoUkupnoTrajanjeDana, PrethodniBrojPredugihDana, PrethodniBrojUzastopnoPredugihDana, PrethodniNajveciBrojUzastopnoPredugihDana),
	(
	DanUmetaneStavke == Dan ->
		TrajanjeNastave = NovoUkupnoTrajanjeDana
		;
		trajanjeNastavePoDanima(Dan, TrajanjeNastave)
	),
	(
	NepreferiranoTrajanje \\<= TrajanjeNastave ->
		BrojPredugihDana is PrethodniBrojPredugihDana + 1,
		BrojUzastopnoPredugihDana is PrethodniBrojUzastopnoPredugihDana + 1,
		(
		PrethodniNajveciBrojUzastopnoPredugihDana < BrojUzastopnoPredugihDana ->
			NajveciBrojUzastopnoPredugihDana = BrojUzastopnoPredugihDana
			;
			NajveciBrojUzastopnoPredugihDana = PrethodniNajveciBrojUzastopnoPredugihDana
		)
		;
		BrojPredugihDana = PrethodniBrojPredugihDana,
		BrojUzastopnoPredugihDana = 0,
		NajveciBrojUzastopnoPredugihDana = PrethodniNajveciBrojUzastopnoPredugihDana
	)
.

/**
 * trajePrecestoPredugo(+DanUmetaneStavke:atom, +NovoUkupnoTrajanje:trajanje/2) is semidet.
 *
 * Predikat koji provjerava traje li nastava prečesto predugo, odnosno postoji li više dana od vrijednosti 1. argumenta, takvih u kojima je trajanje nastave duže od vrijednosti 2. argumenta činjenice maxBrojDanaDugoTrajanjeNastave/2 iz baze znanja.
 * @param DanUmetaneStavke		Dan na koji se odnosi umetani termin nastave
 * @param NovoUkupnoTrajanje	Trajanje nastave na dan naziva =|DanUmetaneStavke|= uključujući umetani termin nastave
 */
trajePrecestoPredugo(DanUmetaneStavke, NovoUkupnoTrajanje) :-
	findall(NazivDana, dan(_, NazivDana, _), Dani),
	maxBrojDanaDugoTrajanjeNastave(MaxBrojDana, NepreferiranoTrajanje),
	prebrojiPredugeDane(Dani, NepreferiranoTrajanje, DanUmetaneStavke, NovoUkupnoTrajanje, BrojPredugihDana, _, _),
	MaxBrojDana < BrojPredugihDana
.

/**
 * trajePrecestoPredugoUzastopno(+DanUmetaneStavke:atom, +NovoUkupnoTrajanje:trajanje/2) is semidet.
 * 
 * Predikat koji provjerava traje li nastava prečesto uzastopno predugo, odnosno postoji li više dana za redom od vrijednosti 1. argumenta, takvih u kojima je trajanje nastave duže od vrijednosti 2. argumenta činjenice maxBrojUzastopnihDanaDugoTrajanjeNastave/2 iz baze znanja.
 * @param DanUmetaneStavke		Dan na koji se odnosi umetani termin nastave
 * @param NovoUkupnoTrajanje	Trajanje nastave na dan naziva =|DanUmetaneStavke|= uključujući umetani termin nastave
 */
trajePrecestoPredugoUzastopno(DanUmetaneStavke, NovoUkupnoTrajanje) :-
	findall(NazivDana, dan(_, NazivDana, _), Dani),
	maxBrojUzastopnihDanaDugoTrajanjeNastave(MaxBrojUzastopnihDana, NepreferiranoTrajanje),
	prebrojiPredugeDane(Dani, NepreferiranoTrajanje, DanUmetaneStavke, NovoUkupnoTrajanje, _, _, NajveciBrojUzastopnoPredugihDana),
	MaxBrojUzastopnihDana < NajveciBrojUzastopnoPredugihDana
.

/**
 * pocinjePrecestoPrerano(+DanUmetaneStavke:atom, +PocetakUmetaneStavke:vrijeme/2) is semidet.
 *
 * Predikat koji provjerava počinje li nastava prečesto prerano, odnosno postoji li više dana od vrijednosti 1. argumenta, takvih u kojima je vrijeme početka ranije od vrijednosti 2. argumenta činjenice maxBrojDanaRaniPocetak/2 iz baze znanja.
 * @param DanUmetaneStavke			Dan na koji se odnosi umetani termin nastave
 * @param PocetakUmetaneStavke		Vrijeme početka umetanog termina nastave na dan naziva =|DanUmetaneStavke|= koji bi na taj dan mogao predstavljati vrijeme početka nastave
 */
pocinjePrecestoPrerano(DanUmetaneStavke, MoguciNoviPocetak) :-
	findall(NazivDana, dan(_, NazivDana, _), Dani),
	maxBrojDanaRaniPocetak(MaxBrojDana, NepreferiraniPocetak),
	prebrojiPreraneDane(Dani, NepreferiraniPocetak, DanUmetaneStavke, MoguciNoviPocetak, BrojPreranihDana, _, _),
	MaxBrojDana < BrojPreranihDana
.

/**
 * pocinjePrecestoPrerano(+DanUmetaneStavke:atom, +PocetakUmetaneStavke:vrijeme/2) is semidet.
 *
 * Predikat koji provjerava počinje li nastava prečesto prerano, odnosno postoji li više dana od vrijednosti 1. argumenta, takvih u kojima je vrijeme početka ranije od vrijednosti 2. argumenta činjenice maxBrojUzastopnihDanaRaniPocetak/2 iz baze znanja.
 * @param DanUmetaneStavke			Dan na koji se odnosi umetani termin nastave
 * @param PocetakUmetaneStavke		Vrijeme početka umetanog termina nastave na dan naziva =|DanUmetaneStavke|= koji bi na taj dan mogao predstavljati vrijeme početka nastave
 */
pocinjePrecestoPreranoUzastopno(DanUmetaneStavke, MoguciNoviPocetak) :-
	findall(NazivDana, dan(_, NazivDana, _), Dani),
	maxBrojUzastopnihDanaRaniPocetak(MaxBrojUzastopnihDana, NepreferiraniPocetak),
	prebrojiPreraneDane(Dani, NepreferiraniPocetak, DanUmetaneStavke, MoguciNoviPocetak, _, _, NajveciBrojUzastopnoPreranihDana),
	MaxBrojUzastopnihDana < NajveciBrojUzastopnoPreranihDana
.
