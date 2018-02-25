<?php
date_default_timezone_set('UTC');   // ne koristi ljetno vrijeme zbog čega nema komplikacija zbog otežane razlike proteklog vremena između 2 datuma kada je jedan u ljetnom razdoblju, a drugi u zimskom
//$studij = 2831;     // 2831 je šifra DS INF smjera
$zimskiSemestarPocetak = strtotime('22.09.' . date('Y'));
$zimskiSemestarPocetak = strtotime( '+' . (7 - date('N', $zimskiSemestarPocetak) + 1) . ' day' , $zimskiSemestarPocetak );
if (time() < $zimskiSemestarPocetak) {
    $zimskiSemestarPocetak = strtotime('22.09.' . (date('Y') - 1));
    $zimskiSemestarPocetak = strtotime( '+' . (7 - date('N', $zimskiSemestarPocetak) + 1) . ' day' , $zimskiSemestarPocetak);
}
$ljetniSemestarPocetak = strtotime('+154 day', $zimskiSemestarPocetak);
$trajanjeZimskihPraznikaTjedni = 2;
$akademskaGodinaPocetak = date('Y', $zimskiSemestarPocetak);
$akademskaGodinaKraj = date('Y', $ljetniSemestarPocetak);

$trenutnoZimskiSemestar = time() < $ljetniSemestarPocetak;
$nazivTrenutnogSemestra = $trenutnoZimskiSemestar ? 'zimski' : 'ljetni';
$pocetakTrenutnogSemestra = $trenutnoZimskiSemestar ? $zimskiSemestarPocetak : $ljetniSemestarPocetak;

$nazivDatoteke = "raspored_{$akademskaGodinaPocetak}_{$akademskaGodinaKraj}_{$nazivTrenutnogSemestra}_$studij.json";
if (file_exists($nazivDatoteke)) {
    $sadrzaj = file_get_contents($nazivDatoteke);
    if ($sadrzaj !== false) {
        $rasporedi = json_decode($sadrzaj, true);
        return;
    }
}

$libXmlInfo = `php --ri libxml`;
foreach (explode("\n", $libXmlInfo) as $line) {
    if (strpos($line, 'Compiled Version') !== false) {
        $libXmlVersion = explode(' => ', $line)[1];
        $novaVerzijaLibXml = !version_compare($libXmlVersion, '2.9.5') >= 0;
        break;
    }
}

$jestWindowsLjuska = explode(' ', php_uname(), 2)[0] === 'Windows';

error_reporting(E_ERROR | E_PARSE);

//header('Content-type: text/json; charset=utf-8');
$doc = new DomDocument;

// We need to validate our document before refering to the id
$doc->validateOnParse = true;

$ch = curl_init("http://nastava.foi.hr/public/study?study=$studij&academicYear=$akademskaGodinaPocetak%2F$akademskaGodinaKraj");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$doc->loadHTML(curl_exec($ch));
curl_close($ch);

$sifreKolegija = [];

$godine = 1;
$semestarPosition = ($trenutnoZimskiSemestar ? 3 : 7);
while (true) {
    $predmetiDiv = $doc->getElementById("nastavnagod_$godine");
    if ($predmetiDiv === null) {
        break;
    }
    else {
        //foreach ([3,7] as $semestarPosition) {
        if ($novaVerzijaLibXml) {
            $trElems = $predmetiDiv->childNodes[$semestarPosition]->childNodes[1]->childNodes[3]->childNodes;
        }
        else {
            $trElems = $predmetiDiv->childNodes[$semestarPosition]->childNodes[1]->childNodes[1]->childNodes;
        }
        $trNum = $trElems->length;
        if ($novaVerzijaLibXml) {
            $inkrement = 2;
        }
        else {
            $inkrement = 1;
        }
        for ($i=1; $i<$trNum; $i+=$inkrement) {
            $tr = $trElems[$i];
            if ($novaVerzijaLibXml) {
                $sifreKolegija[$tr->childNodes[1]->textContent] = $tr->childNodes[3]->childNodes[1]->textContent;
            }
            else {
                $sifreKolegija[$tr->childNodes[0]->textContent] = $tr->childNodes[2]->childNodes[1]->textContent;
            }
        }
        //}
    }
    $godine++;
}
$godine--;
$rasporedi = [];
$obveznostNastavePoPredmetima = [];
foreach ($sifreKolegija as $sifra => $nazivPredmeta) {
    $ch = curl_init("http://nastava.foi.hr/public/course?study=$studij&course=$sifra&academicYear=$akademskaGodinaPocetak%2F$akademskaGodinaKraj");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $doc->loadHTML(curl_exec($ch));
    curl_close($ch);

    $obveznostPredmeta = [];
    $modelPracenjaDiv = $doc->getElementById('model_pracenja');
    if ($modelPracenjaDiv !== null) {   // zbog predmeta poput stručne prakse i diplomskog rada
        $redovniModelPracenjaDiv = $modelPracenjaDiv->childNodes[1]->childNodes[1]->childNodes[1]->childNodes[1];
        foreach ($redovniModelPracenjaDiv->getElementsByTagName('h3') as $h3) {
            if (preg_match('/Opis elemenata praćenja.*/', $h3->textContent)) {
                $sekcijaUvjeti = $h3->nextSibling->nextSibling;
                if ($sekcijaUvjeti === null/* || get_class($sekcijaUvjeti) !== 'DOMElement'*/) {
                    continue;
                }
                foreach ($sekcijaUvjeti->getElementsByTagName('tr') as $tr) {
                    if ($novaVerzijaLibXml) {
                        $nazivElementaPracenja = $tr->childNodes[1]->textContent;
                    }
                    else {
                        $nazivElementaPracenja = $tr->childNodes[0]->textContent;
                    }
                    if (pronadjiDetaljeOObveznostiNastave($nazivElementaPracenja) === true) {
                        break;
                    }
                }
                if ($obveznostPredmeta === 'all') {
                    break;
                }
            }
        }
        foreach ($redovniModelPracenjaDiv->getElementsByTagName('p') as $p) {
            if ($obveznostPredmeta === 'all') {
                break;
            }
            else {
                pronadjiDetaljeOObveznostiNastave($p->textContent);
            }
        }
    }
    $obveznostNastavePoPredmetima[$nazivPredmeta] = $obveznostPredmeta;
}

$ch = curl_init('http://nastava.foi.hr/public/schedule');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, 1);
$doc->loadHTML(curl_exec($ch));
curl_close($ch);

foreach ($doc->getElementById('academicYear')->getElementsByTagName('option') as $optionAkademskaGodina) {
    //if (!empty($optionAkademskaGodina->getAttribute('selected'))) {
    if ($optionAkademskaGodina->textContent === "$akademskaGodinaPocetak/$akademskaGodinaKraj") {   // na ovaj način je moguće vršiti rad s rasporedima iz prijašnjih godina tako da korisnik na svom operacijskom sustavu promijeni vrijeme ili se ovdje ručno promijeni stanje varijabli $akademskaGodinaPocetak i $akademskaGodinaKraj
        $sifraAkademskeGodine = $optionAkademskaGodina->getAttribute('value');
        break;
    }
}

for ($godina=1; $godina<=$godine; $godina++) {
    //foreach ([1, 2] as $semestar) {
    $semestar = ($trenutnoZimskiSemestar ? 1 : 2);
    $ch = curl_init('http://nastava.foi.hr/public/ajaxScheduleGetGroups');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['study' => $studij, 'year' => $godina, 'semester' => $semestar, 'academicYear' => $sifraAkademskeGodine]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-Requested-With: XMLHttpRequest', 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8']);
    $xmlAjax = simplexml_load_string(curl_exec($ch));
    curl_close($ch);

    foreach ($xmlAjax->option as $optionGrupa) {
        $sifraGrupe = (string) $optionGrupa['value'];
        $ch = curl_init('http://nastava.foi.hr/public/schedule');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['study.id' => $studij, 'year' => $godina, 'semester' => $semestar, 'studentGroup' => $sifraGrupe, 'academicYear.id' => $sifraAkademskeGodine]));
        $doc->loadHTML(curl_exec($ch));
        curl_close($ch);

        $jestZimskiSemestar = ($semestar === 1);
        foreach ($doc->getElementsByTagName('script') as $scriptBlok) {
            if (empty($scriptBlok->getAttribute('src'))) {
                break;
            }
        }
        $jsCode = $scriptBlok->textContent;
        $beginIndicator = 'events: ';
        $beginPosition = strpos($jsCode, $beginIndicator) + strlen($beginIndicator);
        $endPosition = strrpos($jsCode, '],') + 1;
        $malformedJson = substr($jsCode, $beginPosition, $endPosition-$beginPosition);  // kvazi-JSON ili točnije kôd valjanog JavaScript objekta
        if ($jestWindowsLjuska) {   // problem na windowsima jer shell dozvoljava do 8000 znakova, dok distribucije linuxa dozvoljavaju mnogo više
            $nameOfThisFile = basename(__FILE__, '.php');
            $tmpJsCodeFilename = $nameOfThisFile . '_kod_za_konverziju_js_koda_u_json.js';
            $validJsonFilename = $nameOfThisFile . '_ispravan_raspored.json';
            file_put_contents($tmpJsCodeFilename, <<<EOS
            var fs = require('fs');
            fs.writeFile('$validJsonFilename', 
                JSON.stringify(
                    $malformedJson
                )
            );
EOS
            );
            shell_exec("node $tmpJsCodeFilename");
            $validJson = file_get_contents($validJsonFilename);
        }
        else {
            $validJson = `nodejs -e "console.log(JSON.stringify($malformedJson));"`;
        }
        $raspored = json_decode($validJson);
        $prethodniId = null;
        $ignorirajUnos = false;
        foreach ($raspored as $stavka) {
            if (isset($stavka->scheduleId)) {   // ako stavka nije događaj poput nekog praznika
                if ($prethodniId !== $stavka->scheduleId) {
                    if ($prethodniId !== null && !$ignorirajUnos) {
                        dodaj_u_raspored();
                    }
                    $prethodniId = $stavka->scheduleId;
                    list($nazivPredmeta, $lokacija) = explode("\n", $stavka->title, -1);    // -1 označava da se zadnji element briše
                    switch ($stavka->color) {
                        case '#641A45':
                            $vrstaNastave = 'lv';
                            break;
                        case '#CE003D':
                            $vrstaNastave = 'p';
                            break;
                        case '#006A8D':
                            $vrstaNastave = 's';
                            break;
                        case '#00A4A7':
                            $vrstaNastave = 'av';
                            break;
                        case '#5F6062':
                            $vrstaNastave = 'v';
                            break;
                        default:
                            $ignorirajUnos = true;
                            continue 2;   // proskoči termine ostalih oblika nastave poput ispita, nadoknada i demonstratura
                    }
                    if (isset($rasporedi[$nazivPredmeta][$vrstaNastave][$prethodniId])) {   // termin nastave koji je predviđen za studente iz više grupa treba imatu jedan zajednički identifikator, a ne da za svaku grupu je poseban - taj problem se rješava u metodi dodaj_u_raspored()
                        $ignorirajUnos = true;
                    }
                    else {
                        $ignorirajUnos = false;
                        $vrijemePocetka = strtotime($stavka->start);
                        $vrijemeZavrsetka = strtotime($stavka->end);
                        $danUTjednu = (int) date('N', $vrijemePocetka);
                        $pocetakTjedna = strtotime('-' . ($danUTjednu - 1) . ' day', $vrijemePocetka);
                        $pocetakTjedna -= $pocetakTjedna % (24*60*60);
                        $pocetakRazdoblja = ($pocetakTjedna - ($jestZimskiSemestar ? $zimskiSemestarPocetak : $ljetniSemestarPocetak))/(7*24*60*60) + 1;
                        if ($pocetakRazdoblja >= 1 && $pocetakRazdoblja <= 17) {   // inače ne bi trebalo da su podaci na stranici točni - primjerice, za predmete Uzorci dizajna i Strategijski menadžment su ispitni rokovi naznačeni istom bojom kojima su označena regularna predavanja što bi ih bez ove provjere tretiralo kao normalne termine predavanja - s obzirom da su ispiti van kontinuiranog praćenja, tjedni u kojem se nalaze su izvan raspona 1 i 17 (npr. -2)
                            list($zgrada, $prostorija) = explode(' > ', $lokacija);
                        }
                        else {
                            $ignorirajUnos = true;
                        }
                    }
                }
                else {
                    if (!$ignorirajUnos) {
                        $vrijemePocetka = strtotime($stavka->start);
                    }
                }
            }
        }
        if ($prethodniId !== null && !$ignorirajUnos) {
            dodaj_u_raspored();
        }
    }
    //}
}

function dodaj_u_raspored() {
    global $prethodniId;
    global $danUTjednu;
    global $vrijemePocetka;
    global $vrijemeZavrsetka;
    global $jestZimskiSemestar;
    global $zimskiSemestarPocetak;
    global $ljetniSemestarPocetak;
    global $trajanjeZimskihPraznikaTjedni;
    global $nazivPredmeta;
    global $vrstaNastave;
    //global $obveznostNastavePoPredmetima;
    global $pocetakRazdoblja;
    global $rasporedi;
    global $akademskaGodinaKraj;
    global $zgrada;
    global $prostorija;
    //$obveznostPredmeta = $obveznostNastavePoPredmetima[$nazivPredmeta];
    $danUTjednu = (int) date('N', $vrijemePocetka);
    $pocetakTjedna = strtotime('-' . ($danUTjednu - 1) . ' day', $vrijemePocetka);
    $pocetakTjedna -= $pocetakTjedna % (60*60*24);
    if ($jestZimskiSemestar) {
        $zavrsetakRazdoblja = ($pocetakTjedna - $zimskiSemestarPocetak)/(7*24*60*60) + 1;
        if ($vrijemePocetka >= strtotime("07.01.$akademskaGodinaKraj")) {
            $zavrsetakRazdoblja -= $trajanjeZimskihPraznikaTjedni;
        }
    }
    else {
        $zavrsetakRazdoblja = ($pocetakTjedna - $ljetniSemestarPocetak)/(7*24*60*60) + 1;
    }
    if ($pocetakRazdoblja !== $zavrsetakRazdoblja) {    // vjerojatno je riječ o nadoknadi ako se nešto izvodi samo jedanput
        //$rasporedi[$prethodniId] =
        $stavkaZaDodavanje =
            [
                'naziv' => $nazivPredmeta,
                'vrsta' => $vrstaNastave,
                //'obveznost' => $obveznostPredmeta==='all' || in_array($vrstaNastave, $obveznostPredmeta),
                'obveznost' => false,
                'razdoblje' => [    // tjedni održavanja nastave
                    'start' => $pocetakRazdoblja,
                    'kraj' => $zavrsetakRazdoblja
                ],
                'termin' => [
                    'dan' => $danUTjednu,
                    'start' => date('H:i', $vrijemePocetka),
                    'kraj' => date('H:i', $vrijemeZavrsetka)
                ],
                'lokacija' => [
                    'zgrada' => $zgrada,
                    'prostorija' => $prostorija
                ]
            ];
        if (!isset($rasporedi[$nazivPredmeta][$vrstaNastave]) || !in_array($stavkaZaDodavanje, $rasporedi[$nazivPredmeta][$vrstaNastave])) {
            $rasporedi[$nazivPredmeta][$vrstaNastave][$prethodniId] = $stavkaZaDodavanje;
        }
    }
}

function pronadjiDetaljeOObveznostiNastave($ispitivaniTekst) {
    global $obveznostPredmeta;
    if (preg_match('/(?:(?:prisustv?o|prisut(?:st)?vo)(?:vanje)?|prisutnost|dola(?:znost|sci)|nazočnost|izostan(?:aka?|ka|ci))(?:(.*nastav(?:i|e))|(?:.*?(?:(predavanj(?:im)?a)|(seminar(?:ima|e|a)|(?:sem\.|seminarsk(?:im|e|ih)) vježb(?:ama|e|i|a))|(auditorij(?:ima|e|a)|(?:aud\.|auditorn(?:im|e|ih)) vježb(?:ama|e|i|a))|(labos(?:e|ima|a)|(?:laboratorijsk(?:im|e|ih)|lab\.) vježb(?:ama|e|i|a))|(vježb(?:ama|e|i|a))))+)/i', $ispitivaniTekst, $rezultat)) {
        /*
        foreach ([4, 8] as $stupacGranice) {
            $tr->childNodes[$stupacGranice]->textContent;
        }
        */
        if (!empty($rezultat[1])) {
            $obveznostPredmeta = 'all';
            return true;   // nema daljnje potrebe za provjerom
        }
        else {
            if (!empty($rezultat[2])) {
                $obveznostPredmeta[] = 'p';
            }
            if (!empty($rezultat[3])) {
                $obveznostPredmeta[] = 's';
            }
            if (!empty($rezultat[4])) {
                $obveznostPredmeta[] = 'av';
            }
            if (!empty($rezultat[5])) {
                $obveznostPredmeta[] = 'lv';
            }
            if (!empty($rezultat[6])) {
                $obveznostPredmeta[] = 'v'; // tzk i jezici
            }
        }
    }
}

foreach ($obveznostNastavePoPredmetima as $nazivPredmeta => $obveznostNastave) {
    if ($obveznostNastave === 'all') {
        foreach (array_keys($rasporedi[$nazivPredmeta]) as $vrstaNastave) {
            foreach (array_keys($rasporedi[$nazivPredmeta][$vrstaNastave]) as $scheduleId) {
                $rasporedi[$nazivPredmeta][$vrstaNastave][$scheduleId]['obveznost'] = true;
            }
        }
    }
    else {
        $notFound = [];
        $found = [];
        foreach ($obveznostNastave as $obveznaVrsta) {
            if (array_key_exists($obveznaVrsta, $rasporedi[$nazivPredmeta])) {
                $found[]= $obveznaVrsta;
                foreach (array_keys($rasporedi[$nazivPredmeta][$obveznaVrsta]) as $scheduleId) {
                    $rasporedi[$nazivPredmeta][$obveznaVrsta][$scheduleId]['obveznost'] = true;
                }
            }
            else {
                $notFound[]= $obveznaVrsta;
            }
        }
        if (!empty($notFound)) {
            $josNeobvezni = array_diff(array_keys($rasporedi[$nazivPredmeta]), $found);
            foreach ($notFound as $nedodijeljenaVrsta) {
                $substitut = null;
                switch ($nedodijeljenaVrsta) {
                    case 'v':
                        if (in_array('lv', $josNeobvezni)) {
                            $substitut = 'lv';
                        }
                        else if (in_array('av', $josNeobvezni)) {
                            $substitut = 'av';
                        }
                        else if (in_array('s', $josNeobvezni)) {
                            $substitut = 's';
                        }
                        break;
                    case 's':
                        if (in_array('v', $josNeobvezni)) {
                            $substitut = 'v';
                        }
                        else if (in_array('av', $josNeobvezni)) {
                            $substitut = 'av';
                        }
                        else if (in_array('lv', $josNeobvezni)) {
                            $substitut = 'lv';
                        }
                    break;
                }
                if (isset($substitut)) {
                    unset($josNeobvezni[array_search($substitut, $josNeobvezni)]);
                    foreach (array_keys($rasporedi[$nazivPredmeta][$substitut]) as $scheduleId) {
                        $rasporedi[$nazivPredmeta][$substitut][$scheduleId]['obveznost'] = true;
                    }
                }
            }
        }
    }
}
function dohvatiStavkeRasporeda($rasporedi) {
    $rezultat = [];
    foreach (array_values($rasporedi) as $rasporediPredmeta) {
        foreach ($rasporediPredmeta as $vrsteNastave) {
            foreach ($vrsteNastave as $rasporediNastave) {
                $rezultat[]= $rasporediNastave;
            }
        }
    }
    return $rezultat;
}


//echo json_encode(array_values($rasporedi), JSON_UNESCAPED_UNICODE);

file_put_contents($nazivDatoteke, json_encode($rasporedi = dohvatiStavkeRasporeda($rasporedi), JSON_UNESCAPED_UNICODE));

?>