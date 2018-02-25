:- encoding(utf8).

:- use_module(library(http/http_open)). % treba biti uključeno da bi predikat open_any/5 mogao pročitati udaljenu datoteku (u pozadini zapravo rabi predikat http_open/3, no za nju nije moguće postaviti encoding)
:- use_module(library(http/json)).

/*
upisano('Baze znanja i semantički Web').
upisano('ERP sustavi').
upisano('Inteligentni sustavi').
upisano('Uzorci dizajna').
upisano('Kvaliteta i mjerenja u informatici').
upisano('Logičko programiranje').
*/

/*
obveznost(bzsw, p).
obveznost(bzsw, s).
obveznost(bzsw,lv).
obveznost(erp, p).
obveznost(erp, lv).

%problem ako su obvezna predavanja npr. iz PI-ja kojih ima 2x2 sata tjedno i to za obje grupe
raspored(bzsw, p, termin(utorak, 8, 30, 10, 0), lokacija('FOI1', 'D 3')).
raspored(bzsw, s, termin(srijeda, 10, 15, 11, 45), lokacija('FOI1', 'D 6')).
raspored(bzsw, lv, termin(utorak, 14, 30, 16, 00), lokacija('FOI1', 'D 13')).
raspored(bzsw, lv, termin(utorak, 16, 00, 17, 30), lokacija('FOI1', 'D 13')).
raspored(bzsw, lv, termin(utorak, 17, 30, 19, 00), lokacija('FOI1', 'D 13')).
raspored(bzsw, lv, termin(utorak, 19, 00, 20, 30), lokacija('FOI1', 'D 13')).
raspored(erp, p, termin(srijeda, 08, 30, 10, 00), lokacija('FOI2', 'D 2')).
raspored(erp, lv, termin(srijeda, 10, 15, 11, 45), lokacija('FOI2', 'D 5')).
raspored(erp, lv, termin(srijeda, 11, 45, 13, 15), lokacija('FOI2', 'D 5')).
raspored(erp, lv, termin(srijeda, 13, 15, 14, 45), lokacija('FOI2', 'D 5')).

odrzavanje(bzsw, p, 0, 17).
odrzavanje(bzsw, s, 7, 17).
odrzavanje(bzsw, lv, 10, 16).
odrzavanje(erp, p, 0, 17).
odrzavanje(erp, lv, 0, 17).
*/

dohvatiCinjenice(UriResursa) :-
	setup_call_cleanup(
		open_any(UriResursa, read, Stream, Close, [encoding(utf8)]),
		json_read(Stream, Sadrzaj),
		close_any(Close)
	),
	member(json(Clan), Sadrzaj),
	member('naziv' = Naziv, Clan),
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
	/*dajVremenskeKomponente(PocVrijeme, VremenskeKompPoc),
	nth0(0, VremenskeKompPoc, HpocetakStr),
	nth0(1, VremenskeKompPoc, MpocetakStr),*/
	atom_number(HpocetakStr, Hpocetak),
	atom_number(MpocetakStr, Mpocetak),
	atomic_list_concat([HkrajStr, MkrajStr|_], ':', ZavVrijeme),
	/*dajVremenskeKomponente(ZavVrijeme, VremenskeKompZav),
	nth0(0, VremenskeKompZav, HkrajStr),
	nth0(1, VremenskeKompZav, MkrajStr),*/
	atom_number(HkrajStr, Hkraj),
	atom_number(MkrajStr, Mkraj),
/*
	write(Hpocetak),
	write(':'),
	write(Mpocetak),
	write('-'),
	write(Hkraj),
	write(':'),
	write(Mkraj),
	nl(),
*/
	Obveznost = @(ObveznostVal),	% JSON parser boolean vrijednosti (kao i null) pohranjuje u term @(BoolVal)
	(
	ObveznostVal == true, not(obveznost(Naziv, Vrsta)) ->
		asserta(obveznost(Naziv, Vrsta))
		;
		true
	),
	(
	/*	% BZSW je primjer kolegija koji se održava u 9. tjednu i od 11. pa 17. - cilj je učiniti da održavanje onda bude zabilježeno kao 9-17
	not(odrzavanje(Naziv, Vrsta, PocTjedan, ZavTjedan)) ->
		asserta(odrzavanje(Naziv, Vrsta, PocTjedan, ZavTjedan))
		;
		true
	*/
	odrzavanje(Naziv, Vrsta, PocTjedan2, ZavTjedan2) ->
		(
		PocTjedan == PocTjedan2, ZavTjedan == ZavTjedan2 ->
			true
			;
			retract(odrzavanje(Naziv, Vrsta, PocTjedan2, ZavTjedan2)),
			NoviPocTjedan is min(PocTjedan, PocTjedan2),
			NoviZavTjedan is max(ZavTjedan, ZavTjedan2),
			asserta(odrzavanje(Naziv, Vrsta, NoviPocTjedan, NoviZavTjedan))
		)
		;
		asserta(odrzavanje(Naziv, Vrsta, PocTjedan, ZavTjedan))
	),
	dan(Dan, NazivDana),
	(
	not(raspored(Naziv, Vrsta, termin(NazivDana, vrijeme(Hpocetak, Mpocetak), vrijeme(Hkraj, Mkraj)), lokacija(Zgrada, Prostorija))) ->
		asserta(raspored(Naziv, Vrsta, termin(NazivDana, vrijeme(Hpocetak, Mpocetak), vrijeme(Hkraj, Mkraj)), lokacija(Zgrada, Prostorija)))
		;
		true
	),
	false
.

:- dynamic
	obveznost/2,
	raspored/4,
	odrzavanje/4,
	generiraniRaspored/4,
	pocetciPoDanima/2,
	zavrsetciPoDanima/2,
	trajanjeNastavePoDanima/2,
	trajanjePredmetaPoDanima/3,
	najranijiPocetak/2,
	najkasnijiZavrsetak/2,
	maxTrajanjeRupe/2,
	definicijaRupe/2,
	maxBrojRupa/2,
	maxTrajanjeNastave/2,
	minTrajanjeNastave/2,
	maxTrajanjeBoravkaNaFaksu/2,
	maxSatiPredmeta/2,
	maxBrojDanaNajranijiPocetak/2,
	maxBrojDanaMaxTrajanjeNastave/2,
	maxBrojUzastopnihDanaNajranijiPocetak/2,
	maxBrojUzastopnihDanaMaxTrajanjeNastave/2,
	minBrojDanaBezNastave/1,	% postoji i istoimeni predikat arnosti 2 koji definira činjenicu s ovimd termom
	bezNastaveNaDan/1,
	brojRadnihDana/1,
	trajanjePutovanjaDoDrugeZgrade/1,
	upisano/1
.

inicijalizirajTrajanjaNastavePoDanima() :-	%time se dobiva fleksibilnost u slučaju da se nastava počinje izvoditi i subotom, a ne inicijaliziramo prije pokretanja da je trajanje nastave subotom 0
	dan(_, NazivDana),
	asserta(trajanjeNastavePoDanima(NazivDana, trajanje(0, 0))),
	false
.

inicijalizirajTrajanjaPredmetaPoDanima() :-
	%upisano(Predmet),	% jer se u PHP skripti Prolog interpreteru prvo vrši poziv ovog predikata pa se tek onda proslijeđuju upisani predmeti
	raspored(Predmet, _, _, _),
	dan(_, NazivDana),
	not(trajanjePredmetaPoDanima(NazivDana, Predmet, _)),	% ova provjera je potrebna ako se predmeti inicijaliziraju iz baze znanja u termu raspored, a ne u termu upisano
	asserta(trajanjePredmetaPoDanima(NazivDana, Predmet, trajanje(0, 0))),
	false
.

/*
dajVremenskeKomponente(Vrijeme, Li) :-
	atom_chars(Vrijeme, Lu),
	dajVremenskeKomponente(Lu, Preostali, Izlaz),
	(
	Preostali \== [] ->
		atomic_list_concat(Preostali, ZadnjaKomp),
		Li = [ZadnjaKomp|Izlaz]
		;
		Li = Izlaz
	)
.

dajVremenskeKomponente([], [], []).
dajVremenskeKomponente([Gu|Ru], Lbuffer, Li) :-
	dajVremenskeKomponente(Ru, LprevBuffer, OldLi),
	(
	Gu \== ':' ->
		Lbuffer = [Gu|LprevBuffer],
		Li = OldLi
		;
		atomic_list_concat(LprevBuffer, ZadnjaKomp),
		Lbuffer = [],
		Li = [ZadnjaKomp|OldLi]
	)
.*/

dan(1, 'ponedjeljak').
dan(2, 'utorak').
dan(3, 'srijeda').
dan(4, 'četvrtak').
dan(5, 'petak').
dan(6, 'subota').
dan(7, 'nedjelja').
brojDanaKojiCineVikend(2).

obvezniUpisaniPredmetiPoVrstama(Predmet, Vrsta) :- upisano(Predmet), obveznost(Predmet, Vrsta).

dohvatiLijeniRaspored() :-
	findall(stavka(Predmet, Vrsta), obvezniUpisaniPredmetiPoVrstama(Predmet, Vrsta), Lista),
	nadjiRaspored(Lista)
.

sviPredmeti(Predmet, Vrsta) :- upisano(Predmet), raspored(Predmet, Vrsta, _, _).

dohvatiNadobudniRaspored() :-
	setof(stavka(Predmet, Vrsta), sviPredmeti(Predmet, Vrsta), Lista),
	nadjiRaspored(Lista)
.

string_list_concat(Lista, Separator, Rezultat) :-
	string_list_concat(Lista, Separator, "", Rezultat)
.

string_list_concat([ZadnjaStavka], _, Rezultat, KonacniRezultat) :-
	string_concat(Rezultat, ZadnjaStavka, KonacniRezultat)
.

string_list_concat([Stavka|Preostale], Separator, Rezultat, KonacniRezultat) :-
	string_concat(Rezultat, Stavka, NoviRezultatTmp),
	string_concat(NoviRezultatTmp, Separator, NoviRezultat),
	string_list_concat(Preostale, Separator, NoviRezultat, KonacniRezultat)
.

serijalizirajUJson(SerijaliziraniObjekt) :-
	generiraniRaspored(Naziv, Vrsta, termin(NazivDana, vrijeme(Hstart, Mstart), vrijeme(Hkraj, Mkraj)), lokacija(Zgrada, Prostorija)),
	format(string(Pocetak), '~|~`0t~d~2+:~|~`0t~d~2+', [Hstart, Mstart]),
	format(atom(Kraj), '~|~`0t~d~2+:~|~`0t~d~2+', [Hkraj, Mkraj]),
	(
	obveznost(Naziv, Vrsta) ->
		Obveznost = @(true)
		;
		Obveznost = @(false)
	),
	odrzavanje(Naziv, Vrsta, Wstart, Wkraj),
	dan(RedniBrojDana, NazivDana),
	with_output_to(string(SerijaliziraniObjekt), json_write(current_output, json{naziv:Naziv,vrsta:Vrsta,obveznost:Obveznost,razdoblje:json{start:Wstart,kraj:Wkraj},termin:json{dan:RedniBrojDana,start:Pocetak,kraj:Kraj},lokacija:json{zgrada:Zgrada,prostorija:Prostorija}}, [width(0)]))	%bolje performanse daje korištenje terma string/1 umjesto atom/1, ali rezultat kasnije zahtijeva izradu vlastite varijante atomic_list_concat/3 predikata za stringove
.

/*	% prikaz rasporeda iz prologa u tabličnom obliku
nadjiRaspored([]) :- %findall(stavka(Predmet, Vrsta, NazivDana, Hpocetak, Mpocetak, Hkraj, Mkraj),
	format(atom(Zaglavlje), "~n|~a~t~40||~t~a~t~4+|~t~a~t~12+|~t~a~t~8+|~t~a~t~8+|~t~a~t~12+|~n", ['naziv predmeta', 'tip', 'dan', 'pocetak', 'kraj', 'lokacija']),
	write(Zaglavlje),
	generiraniRaspored(Predmet, Vrsta, termin(NazivDana, vrijeme(Hpocetak, Mpocetak), vrijeme(Hkraj, Mkraj)), lokacija(Zgrada, Prostorija)),
	%findall([Predmet, Vrsta, NazivDana, Hpocetak, Mpocetak, Hkraj, Mkraj], generiraniRaspored(Predmet, Vrsta, NazivDana, Hpocetak, Mpocetak, Hkraj, Mkraj), Stavke),
	%member(Stavka, Stavke),
	format(atom(Redak), "|~a~t~40||~t~a~t~4+|~t~a~t~12+|~t~d:~d~t~8+|~t~d:~d~t~8+|~t~a > ~a~t~12+|~n", [Predmet, Vrsta, NazivDana, Hpocetak, Mpocetak, Hkraj, Mkraj, Zgrada, Prostorija]),
	%format(atom(Redak), "|~a~t~40||~t~a~t~4+|~t~a~t~12+|~t~d:~d~t~8+|~t~d:~d~t~8+|~n", Stavka),
	write(Redak),
	false
.
*/

nadjiRaspored([]) :-
	findall(Objekt, serijalizirajUJson(Objekt), NizSerijaliziranihObjekata),
	%atomic_list_concat(NizSerijaliziranihObjekata, ',', SerijaliziraniObjekti),
	string_list_concat(NizSerijaliziranihObjekata, ",", SerijaliziraniObjekti),
	write("["), write(SerijaliziraniObjekti), write("]"), nl()
.%

nadjiRaspored([stavka(Predmet, Vrsta)|Preostali]) :-
	(
	not(obveznost(Predmet, Vrsta)) ->
		ignore(nadjiRaspored(Preostali))
		;
		true
	),
	%write(Predmet), write(' '), write(Vrsta), nl(),
	%findall(rez(Predmet2,Dan,Hpocetak,Mpocetak), generiraniRaspored(Predmet2,_,Dan,Hpocetak,Mpocetak,_,_), Rezultat),
	%write(Rezultat), nl(),
	raspored(Predmet, Vrsta, Termin, Lokacija),
	odrzavanje(Predmet, Vrsta, Wpocetak, Wkraj),
	%write(Predmet), write(NazivDana), write(Hpocetak), write(':'), write(Mpocetak),nl(),
	%not(generiraniRaspored(Predmet, Vrsta, _, _, _, _, _)) ->
	(
	%write(Preklapanja),
	not(pristajeURaspored(Termin, Wpocetak, Wkraj, Lokacija)),	%not(member(true, Preklapanja)),
	termin(NazivDana, Pocetak, Kraj) = Termin,
	trajanjeNastavePoDanima(NazivDana, DosadasnjeTrajanjeNastave),
	trajanjePredmetaPoDanima(NazivDana, Predmet, DosadasnjeTrajanjePredmeta),
	(
	pocetciPoDanima(NazivDana, DosadMinDolazak) ->
		(
		jestManje(Pocetak, DosadMinDolazak) ->
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
		not(jestManjeIliJednako(Kraj, DosadMaxOdlazak)) ->
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
		%write(b),
		%halt(),
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
		%write(aa),
		true
		%write(cccccccccccccccccccccccccccccccccccccccccc)
		/*,halt()*/
	),
	false
.%

pristajeURaspored(termin(NazivDana, Pocetak, Kraj), Wpocetak, Wkraj, Zgrada) :-
	generiraniRaspored(Predmet2, Vrsta2, termin(NazivDana, Pocetak2, Kraj2), lokacija(Zgrada2, _)),
	odrzavanje(Predmet2, Vrsta2, Wpocetak2, Wkraj2),
	%write('usporedba: '), write('sth ('), write(NazivDana), write(Hpocetak), write(':'), write(Mpocetak), write(')'), write('  -  '), write(Predmet2), write(' ('), write(NazivDana), write(Hpocetak2), write(':'), write(Mpocetak2), write(')'), nl(),
	postojiPreklapanje(termin(Pocetak, Kraj), Wpocetak, Wkraj, Zgrada, termin(Pocetak2, Kraj2), Wpocetak2, Wkraj2, Zgrada2)		% prvi argument terma termin je u ovom slučaju potpuno nepotreban, ali se koristi radi konzistentnosti
.%

dajSatiIMinute(VrijemeIliTrajanje, H, M) :-
	arg(1, VrijemeIliTrajanje, H),
	arg(2, VrijemeIliTrajanje, M)
.

jestManje(VrijemeIliTrajanje1, VrijemeIliTrajanje2) :-
	dajSatiIMinute(VrijemeIliTrajanje1, H1, M1),
	dajSatiIMinute(VrijemeIliTrajanje2, H2, M2),
	jestManje(H1, M1, H2, M2)
.

jestManjeIliJednako(VrijemeIliTrajanje1, VrijemeIliTrajanje2) :-
	dajSatiIMinute(VrijemeIliTrajanje1, H1, M1),
	dajSatiIMinute(VrijemeIliTrajanje2, H2, M2),
	jestManjeIliJednako(H1, M1, H2, M2)
.

jestManje(H1, M1, H2, M2) :-
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
.

jestManjeIliJednako(H1, M1, H2, M2) :-
	H1 == H2, M1 == M2 ->
		true
		;
		jestManje(H1, M1, H2, M2)
.

postojiPreklapanje(termin(Pocetak1, Kraj1), Wstart1, Wkraj1, Zgrada1, termin(Pocetak2, Kraj2), Wstart2, Wkraj2, Zgrada2) :-
	jestManje(Pocetak1, Kraj2),
	not(jestManjeIliJednako(Kraj1, Pocetak2)),
	Wstart1 < Wkraj2,
	Wkraj1 > Wstart2 ->
		true
		;
		Zgrada1 \== Zgrada2,
		trajanjePutovanjaDoDrugeZgrade(TrajanjePutovanja),
		dajRazlikuVremena(Kraj1, Pocetak2, Razlika1),
		dajRazlikuVremena(Kraj2, Pocetak1, Razlika2),
		(
		jestManje(Razlika1, TrajanjePutovanja)
		;
		jestManje(Razlika2, TrajanjePutovanja)
		)
.

dajRazlikuVremena(vrijeme(H1, M1), vrijeme(H2, M2), Rezultat) :-
	jestManjeIliJednako(H1, M1, H2, M2) ->
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
	dajRazlikuVremena(vrijeme(H2, M2), vrijeme(H1, M1), Rezultat)
.

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

/*
dajTrajanjeNastave([], trajanje(0, 0)).
dajTrajanjeNastave([termin(Pocetak, Kraj)|Preostali], Rezultat) :-
	dajTrajanjeNastave(Preostali, StariRezultat),
	dajRazlikuVremena(Pocetak, Kraj, Trajanje),
	dajZbrojTrajanja(StariRezultat, Trajanje, Rezultat)
.

dajTrajanjeNastaveNaDan(NazivDana, Trajanje) :-
	findall(termin(Pocetak, Kraj), generiraniRaspored(_, _, termin(NazivDana, Pocetak, Kraj)), Lista),
	dajTrajanjeNastave(Lista, Trajanje)
.

dajTrajanjePredmetaNaDan(NazivDana, Predmet, Trajanje) :-
	findall(termin(Pocetak, Kraj), generiraniRaspored(Predmet, _, termin(NazivDana, Pocetak, Kraj)), Lista),
	dajTrajanjeNastave(Lista, Trajanje)
.
*/

jestRanije(Rezultat, termin(Pocetak1, _), termin(Pocetak2, _)) :-
	jestManje(Pocetak1, Pocetak2) ->
		Rezultat = <
		;
		Rezultat = >
.

dajSortiranaVremenaNastaveNaDan(NazivDana, NoviTermin, Rezultat) :-
	findall(termin(Pocetak, Kraj), generiraniRaspored(_, _, termin(NazivDana, Pocetak, Kraj), _), VremenaNastave),
	predsort(jestRanije, [NoviTermin|VremenaNastave], Rezultat)
.%

dajRazmakeIzmedjuPredmeta([termin(Pocetak, _)], _, Pocetak, 0, trajanje(0, 0)).
dajRazmakeIzmedjuPredmeta([termin(Pocetak, Kraj)|Preostali], MinTrajanjeRupe, SljedeciPocetak, BrojRupa, NajvecaRupa) :-
	dajRazmakeIzmedjuPredmeta(Preostali, MinTrajanjeRupe, DosadasnjiSljedeciPocetak, DosadasnjiBrojRupa, DosadasnjaNajvecaRupa),
	dajRazlikuVremena(DosadasnjiSljedeciPocetak, Kraj, Razmak),
	(
	nonvar(MinTrajanjeRupe), jestManjeIliJednako(MinTrajanjeRupe, Razmak) ->
		BrojRupa is DosadasnjiBrojRupa + 1
		;
		BrojRupa = DosadasnjiBrojRupa
	),
	(
	jestManje(DosadasnjaNajvecaRupa, Razmak) ->
		NajvecaRupa = Razmak
		;
		NajvecaRupa = DosadasnjaNajvecaRupa
	),
	SljedeciPocetak = Pocetak
.

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
		dajRazmakeIzmedjuPredmeta(VremenaNastave, MinTrajanjeRupe, _, BrojRupa, TrajanjeNajveceRupe),
		(
		nonvar(MaxBrojRupa) ->
			MaxBrojRupa >= BrojRupa
			;
			true
		),
		(
		nonvar(MaxTrajanjeRupe) ->
			jestManjeIliJednako(TrajanjeNajveceRupe, MaxTrajanjeRupe)
			;
			true
		)
		;
		true
	)
.%

zadovoljavaIndividualneUvjete(Predmet, termin(NazivDana, Pocetak, Kraj), StaroUkupnoTrajanje, StaroUkupnoTrajanjePredmeta, DolazakNaDan, OdlazakNaDan) :-
%zadovoljavaIndividualneUvjete(Predmet, termin(NazivDana, Pocetak, Kraj)) :-
	not(bezNastaveNaDan(NazivDana)),
	(
	najranijiPocetak(NazivDana, MinPocetak) ->
		not(jestManje(Pocetak, MinPocetak))
		;
		true
	),
	(
	najkasnijiZavrsetak(NazivDana, MaxKraj) ->
		jestManjeIliJednako(Kraj, MaxKraj)
		;
		true
	),

	(
	maxTrajanjeBoravkaNaFaksu(NazivDana, MaxTrajanjeBoravka) ->
		dajRazlikuVremena(OdlazakNaDan, DolazakNaDan, TrajanjeBoravka),
		jestManjeIliJednako(TrajanjeBoravka, MaxTrajanjeBoravka)
		;
		true
	),
	%dajTrajanjeNastaveNaDan(NazivDana, StaroUkupnoTrajanje),	% nepotrebno bi se svaki put pregledavali do sada uvršeni predmet u generirani raspored te računalo njihovo ukupno trajanje što daje lošije performanse
	dajRazlikuVremena(Pocetak, Kraj, OvoTrajanje),
	dajZbrojTrajanja(StaroUkupnoTrajanje, OvoTrajanje, NovoUkupnoTrajanje),
	(
	maxTrajanjeNastave(NazivDana, MaxTrajanje) ->
		jestManjeIliJednako(NovoUkupnoTrajanje, MaxTrajanje)
		;
		true
	),
	(
	minTrajanjeNastave(NazivDana, MinTrajanje) ->
		not(jestManje(NovoUkupnoTrajanje, MinTrajanje))
		;
		true
	),
	
	%dajTrajanjePredmetaNaDan(NazivDana, Predmet, StaroUkupnoTrajanjePredmeta),	% ista stvar kao i gore
	dajZbrojTrajanja(StaroUkupnoTrajanjePredmeta, OvoTrajanje, NovoUkupnoTrajanjePredmeta),
	(
	maxSatiPredmeta(Predmet, MaxTrajanjePredmeta) ->
		jestManjeIliJednako(NovoUkupnoTrajanjePredmeta, MaxTrajanjePredmeta)
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
		brojRadnihDana(BrojRadnihDana),
		BrojDanaBezNastave is BrojRadnihDana - BrojDanaSNastavom,
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

minBrojDanaBezNastave(MinBrojDanaBezNastave, IskljucujuciVikende) :-
	aggregate_all(count, dan(_, _), BrojDanaUTjednu),
	brojDanaKojiCineVikend(BrojDanaKojiCineVikend),
	(
	IskljucujuciVikende == true ->
		BrojRadnihDana is BrojDanaUTjednu - BrojDanaKojiCineVikend
		;
		BrojRadnihDana = BrojDanaUTjednu
	),
	asserta(brojRadnihDana(BrojRadnihDana)),
	asserta(minBrojDanaBezNastave(MinBrojDanaBezNastave))
.


%najranijiPocetak(ponedjeljak, vrijeme(8, 0)).	%done
%najranijiPocetak(utorak, vrijeme(8, 0)).
%najranijiPocetak(srijeda, vrijeme(8, 0)).

%najkasnijiZavrsetak(utorak, vrijeme(18, 0)).		%done

%maxTrajanjeRupe(srijeda, trajanje(1, 15)).	%done

%definicijaRupe(srijeda, trajanje(3, 0)).	%done

%maxBrojRupa(srijeda, 1).	%done

%maxTrajanjeNastave(srijeda, trajanje(8, 0)).	%done

%minTrajanjeNastave(utorak, trajanje(1, 0)).		%done

%maxTrajanjeBoravkaNaFaksu(ponedjeljak, trajanje(5, 0)).	%done

%maxSatiPredmeta('Uzorci dizajna', trajanje(3, 0)).	%done

%maxBrojDanaNajranijiPocetak(3, vrijeme(8, 0)).	%done & mult (kao i svi ostali al nisam navodil)

%maxBrojDanaMaxTrajanjeNastave(2, trajanje(5, 0)).	%done & mult

%maxBrojUzastopnihDanaNajranijiPocetak(2, vrijeme(8, 0)).	%done & mult

%maxBrojUzastopnihDanaMaxTrajanjeNastave(2, trajanje(5, 0)).	%done & mult

%trajanjePutovanjaDoDrugeZgrade(trajanje(0, 7)).	%done

%:- call(minBrojDanaBezNastave(1, true)). % true...isključujući vikende - kod prosljeđivanja u komandnu liniju, call nije potreban

%bezNastaveNaDan(petak).

najranijiPocetak(Vrijeme) :-
	dan(_, NazivDana),
	asserta(najranijiPocetak(NazivDana, Vrijeme))
.

najkasnijiZavrsetak(Vrijeme) :-
	dan(_, NazivDana),
	asserta(najkasnijiZavrsetak(NazivDana, Vrijeme))
.

maxTrajanjeRupe(Trajanje) :-
	dan(_, NazivDana),
	asserta(maxTrajanjeRupe(NazivDana, Trajanje))
.

definicijaRupe(Trajanje) :-
	dan(_, NazivDana),
	asserta(definicijaRupe(NazivDana, Trajanje))
.

maxBrojRupa(Kolicina) :-
	dan(_, NazivDana),
	asserta(maxBrojRupa(NazivDana, Kolicina))
.

maxTrajanjeNastave(Trajanje) :-
	dan(_, NazivDana),
	asserta(maxTrajanjeNastave(NazivDana, Trajanje))
.

minTrajanjeNastave(Trajanje) :-
	dan(_, NazivDana),
	asserta(minTrajanjeNastave(NazivDana, Trajanje))
.

maxTrajanjeBoravkaNaFaksu(Trajanje) :-
	dan(_, NazivDana),
	asserta(maxTrajanjeBoravkaNaFaksu(NazivDana, Trajanje))
.

maxSatiPredmeta(Trajanje) :-
	upisano(Predmet),
	asserta(maxSatiPredmeta(Predmet, Trajanje))
.

pocinjePrecestoPrerano([], _, _, _, 0, 0, 0).
pocinjePrecestoPrerano([Dan|PreostaliDaniZaProvjeru], NepreferiraniPocetak, DanUmetaneStavke, MoguciNajranijiPocetakDana, BrojPreranihDana, BrojUzastopnoPreranihDana, NajveciBrojUzastopnoPreranihDana) :-
	pocinjePrecestoPrerano(PreostaliDaniZaProvjeru, NepreferiraniPocetak, DanUmetaneStavke, MoguciNajranijiPocetakDana, PrethodniBrojPreranihDana, PrethodniBrojUzastopnoPreranihDana, PrethodniNajveciBrojUzastopnoPreranihDana),
	(
	pocetciPoDanima(Dan, VrijemePocetkaTmp) ->
		(
		DanUmetaneStavke == Dan, jestManje(MoguciNajranijiPocetakDana, VrijemePocetkaTmp) ->
			VrijemePocetka = MoguciNajranijiPocetakDana
			;
			VrijemePocetka = VrijemePocetkaTmp
		)
		;
		(
		DanUmetaneStavke == Dan ->
			VrijemePocetka = MoguciNajranijiPocetakDana
			;
			true
		)
	),
	(
	nonvar(VrijemePocetka), jestManjeIliJednako(VrijemePocetka, NepreferiraniPocetak) ->
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
.%

trajePrecestoPredugo([], _, _, _, 0, 0, 0).
trajePrecestoPredugo([Dan|PreostaliDaniZaProvjeru], NepreferiranoTrajanje, DanUmetaneStavke, NovoUkupnoTrajanjeDana, BrojPredugihDana, BrojUzastopnoPredugihDana, NajveciBrojUzastopnoPredugihDana) :-
	trajePrecestoPredugo(PreostaliDaniZaProvjeru, NepreferiranoTrajanje, DanUmetaneStavke, NovoUkupnoTrajanjeDana, PrethodniBrojPredugihDana, PrethodniBrojUzastopnoPredugihDana, PrethodniNajveciBrojUzastopnoPredugihDana),
	(
	DanUmetaneStavke == Dan ->
		TrajanjeNastave = NovoUkupnoTrajanjeDana
		;
		trajanjeNastavePoDanima(Dan, TrajanjeNastave)
	),
	(
	jestManjeIliJednako(NepreferiranoTrajanje, TrajanjeNastave) ->
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
.%

trajePrecestoPredugo(DanUmetaneStavke, NovoUkupnoTrajanje) :-
	findall(NazivDana, dan(_, NazivDana), Dani),
	maxBrojDanaMaxTrajanjeNastave(MaxBrojDana, NepreferiranoTrajanje),
	trajePrecestoPredugo(Dani, NepreferiranoTrajanje, DanUmetaneStavke, NovoUkupnoTrajanje, BrojPredugihDana, _, _),
	MaxBrojDana < BrojPredugihDana
.%

trajePrecestoPredugoUzastopno(DanUmetaneStavke, NovoUkupnoTrajanje) :-
	findall(NazivDana, dan(_, NazivDana), Dani),
	maxBrojUzastopnihDanaMaxTrajanjeNastave(MaxBrojUzastopnihDana, NepreferiranoTrajanje),
	trajePrecestoPredugo(Dani, NepreferiranoTrajanje, DanUmetaneStavke, NovoUkupnoTrajanje, _, _, NajveciBrojUzastopnoPredugihDana),
	MaxBrojUzastopnihDana < NajveciBrojUzastopnoPredugihDana
.%

pocinjePrecestoPrerano(DanUmetaneStavke, MoguciNoviPocetak) :-
	findall(NazivDana, dan(_, NazivDana), Dani),
	maxBrojDanaNajranijiPocetak(MaxBrojDana, NepreferiraniPocetak),
	pocinjePrecestoPrerano(Dani, NepreferiraniPocetak, DanUmetaneStavke, MoguciNoviPocetak, BrojPreranihDana, _, _),
	MaxBrojDana < BrojPreranihDana
.%

pocinjePrecestoPreranoUzastopno(DanUmetaneStavke, MoguciNoviPocetak) :-
	findall(NazivDana, dan(_, NazivDana), Dani),
	maxBrojUzastopnihDanaNajranijiPocetak(MaxBrojUzastopnihDana, NepreferiraniPocetak),
	pocinjePrecestoPrerano(Dani, NepreferiraniPocetak, DanUmetaneStavke, MoguciNoviPocetak, _, _, NajveciBrojUzastopnoPreranihDana),
	MaxBrojUzastopnihDana < NajveciBrojUzastopnoPreranihDana
.%

/*	% kako bi se moglo pokrenuti direktno preko Prolog interpretera bez da se potom moraju ručno pozvati sljedeće naredbe
:- call(ignore(dohvatiCinjenice('http://localhost/LP/raspored_2017_2018_zimski_2831.json'))).
:- call(ignore(inicijalizirajTrajanjaNastavePoDanima())).
:- call(ignore(inicijalizirajTrajanjaPredmetaPoDanima())).
*/