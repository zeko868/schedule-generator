<?php
/*  // otkomentirati sljedeće linije u slučaju da se skripta želi koristiti samostalno za generiranje podataka o terminima nastave
date_default_timezone_set('UTC');   // ne koristi ljetno vrijeme zbog čega nema komplikacija zbog otežane razlike proteklog vremena između 2 datuma kada je jedan u ljetnom razdoblju, a drugi u zimskom
$studij = 2831;     // 2831 je šifra DS INF smjera
*/
$boje = [
    'p' => '#CE003D',
    's' => '#006A8D',
    'av' => '#00A4A7',
    'lv' => '#641A45',
    'v' => '#5F6062'
];
$vrsteNastavePoBojama = array_flip($boje);
$trajanjeTjedna = 7*24*60*60;
$trajanjeDana = 24*60*60;
$trajanjeZimskihPraznikaTjedni = 2;
if (isset($akademskaGodina) && isset($semestar)) {
    list($akademskaGodinaPocetak, $akademskaGodinaKraj) = explode('/', $akademskaGodina);
    $zimskiSemestarPocetak = strtotime('22.09.' . $akademskaGodinaPocetak);
    $zimskiSemestarPocetak = strtotime( '+' . (7 - date('N', $zimskiSemestarPocetak) + 1) . ' day' , $zimskiSemestarPocetak );
    $ljetniSemestarPocetak = strtotime('+154 day', $zimskiSemestarPocetak);
    
    $nazivTrenutnogSemestra = $semestar;
    $trenutnoZimskiSemestar = 'winter' === $nazivTrenutnogSemestra;
}
else {
    $zimskiSemestarPocetak = strtotime('22.09.' . date('Y'));
    $zimskiSemestarPocetak = strtotime( '+' . (7 - date('N', $zimskiSemestarPocetak) + 1) . ' day' , $zimskiSemestarPocetak );
    if (time() < $zimskiSemestarPocetak) {
        $zimskiSemestarPocetak = strtotime('22.09.' . (date('Y') - 1));
        $zimskiSemestarPocetak = strtotime( '+' . (7 - date('N', $zimskiSemestarPocetak) + 1) . ' day' , $zimskiSemestarPocetak);
    }
    $ljetniSemestarPocetak = strtotime('+154 day', $zimskiSemestarPocetak);
    $akademskaGodinaPocetak = date('Y', $zimskiSemestarPocetak);
    $akademskaGodinaKraj = date('Y', $ljetniSemestarPocetak);
    
    $trenutnoZimskiSemestar = time() < $ljetniSemestarPocetak;
    $nazivTrenutnogSemestra = $trenutnoZimskiSemestar ? 'winter' : 'summer';
}
$pocetakTrenutnogSemestra = $trenutnoZimskiSemestar ? $zimskiSemestarPocetak : $ljetniSemestarPocetak;

$nazivDatotekeRasporeda = 'data' . DIRECTORY_SEPARATOR . "schedule_{$akademskaGodinaPocetak}_{$akademskaGodinaKraj}_{$nazivTrenutnogSemestra}_{$studij}.json";
$nazivDatotekePredmeta = 'data' . DIRECTORY_SEPARATOR . "subjects_{$nazivTrenutnogSemestra}_{$studij}.json";

$jestWindowsLjuska = explode(' ', php_uname(), 2)[0] === 'Windows';

if (file_exists('shared-' . $nazivDatotekeRasporeda)) {
    $nazivDatotekeRasporeda = 'shared-' . $nazivDatotekeRasporeda;
}
if (file_exists($nazivDatotekeRasporeda)) {
    $sadrzaj = file_get_contents($nazivDatotekeRasporeda);
    if ($sadrzaj !== false) {
        $termini = json_decode($sadrzaj, true);
        if (file_exists('shared-' . $nazivDatotekePredmeta)) {
            $nazivDatotekePredmeta = 'shared-' . $nazivDatotekePredmeta;
        }
        $sifrePredmeta = json_decode(file_get_contents($nazivDatotekePredmeta), true);
        return true;
    }
}

$novaVerzijaLibXml = version_compare(phpversion('libxml'), '2.9.5') >= 0;

error_reporting(E_ERROR | E_PARSE);
if (!class_exists('DomDocument')) {     // check if php-xmlreader is installed
    return false;
}
$doc = new DomDocument;

// We need to validate our document before refering to the id
$doc->validateOnParse = true;

$ch = curl_init("https://nastava.foi.hr/public/study?study=$studij&academicYear=$akademskaGodinaPocetak%2F$akademskaGodinaKraj");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$doc->loadHTML(curl_exec($ch));
curl_close($ch);

$sifrePredmeta = [];

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
            $indeksPrvogRetka = 1;
        }
        else {
            $inkrement = 1;
            $indeksPrvogRetka = 0;
        }
        for ($i=$indeksPrvogRetka; $i<$trNum; $i+=$inkrement) {
            $tr = $trElems[$i];
            if ($novaVerzijaLibXml) {
                $sifra = $tr->childNodes[1]->textContent;
                $sifrePredmeta[$sifra] = [ 'id' => $sifra, 'croatian' => $tr->childNodes[3]->childNodes[1]->textContent ];
            }
            else {
                $sifra = $tr->childNodes[0]->textContent;
                $sifrePredmeta[$sifra] = [ 'id' => $sifra, 'croatian' => $tr->childNodes[2]->childNodes[1]->textContent ];
            }
        }
        //}
    }
    $godine++;
}
$godine--;
$hrvatskiNaziviPredmeta = [];   // radi bržeg dohvaćanja identifikatora predmeta iz pripadajućeg naziva
$termini = [];
$obveznostNastavePoPredmetima = [];
foreach ($sifrePredmeta as $sifra => &$naziviPredmeta) {
    $ch = curl_init("https://nastava.foi.hr/public/course?study=$studij&course=$sifra&academicYear=$akademskaGodinaPocetak%2F$akademskaGodinaKraj");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $doc->loadHTML(curl_exec($ch));
    curl_close($ch);

    $obveznostPredmeta = [];
    $informacijeDiv = $doc->getElementById('informacije');
    $naziviPredmeta['english'] = $informacijeDiv->childNodes[0]->childNodes[1]->childNodes[1]->childNodes[3]->textContent;
    $hrvatskiNaziviPredmeta[$naziviPredmeta['croatian']] = &$naziviPredmeta;
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
                        break 2;
                    }
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
    $obveznostNastavePoPredmetima[$sifra] = $obveznostPredmeta;
}
unset($naziviPredmeta); // preporučeno nakon korištenja reference ključa i/ili vrijednosti u foreach petlji

$ch = curl_init('https://nastava.foi.hr/public/schedule');
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
    $ch = curl_init('https://nastava.foi.hr/public/ajaxScheduleGetGroups');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['study' => $studij, 'year' => $godina, 'semester' => $semestar, 'academicYear' => $sifraAkademskeGodine]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-Requested-With: XMLHttpRequest', 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8']);
    $xmlAjax = simplexml_load_string(curl_exec($ch));
    curl_close($ch);

    foreach ($xmlAjax->option as $optionGrupa) {
        $sifraGrupe = (string) $optionGrupa['value'];
        $ch = curl_init('https://nastava.foi.hr/public/schedule');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['study.id' => $studij, 'year' => $godina, 'semester' => $semestar, 'studentGroup' => $sifraGrupe, 'academicYear.id' => $sifraAkademskeGodine]));
        $doc->loadHTML(curl_exec($ch));
        curl_close($ch);

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
            $tmpJsCodeFilename = 'kod-za-konverziju-js-koda-u-json.js';
            file_put_contents($tmpJsCodeFilename, <<<EOS
            console.log(
                JSON.stringify(
                    $malformedJson
                )
            );
EOS
            );
            $validJson = `node $tmpJsCodeFilename`;// shell_exec("node $tmpJsCodeFilename");
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
                    $sifraPredmeta = $hrvatskiNaziviPredmeta[$nazivPredmeta]['id'];
                    $vrstaNastave = $vrsteNastavePoBojama[$stavka->color];
                    if ($vrstaNastave === null) {
                        $ignorirajUnos = true;
                        continue;   // proskoči termine ostalih oblika nastave poput ispita, nadoknada i demonstratura
                    }
                    if (isset($termini[$sifraPredmeta][$vrstaNastave][$prethodniId])) {   // termin nastave koji je predviđen za studente iz više grupa treba imatu jedan zajednički identifikator, a ne da za svaku grupu je poseban - taj problem se rješava u metodi dodaj_u_raspored()
                        $ignorirajUnos = true;
                    }
                    else {
                        $ignorirajUnos = false;
                        $vrijemePocetka = strtotime($stavka->start);
                        $vrijemeZavrsetka = strtotime($stavka->end);
                        $danUTjednu = (int) date('N', $vrijemePocetka);
                        $pocetakTjedna = strtotime('-' . ($danUTjednu - 1) . ' day', $vrijemePocetka);
                        $pocetakTjedna -= $pocetakTjedna % (24*60*60);
                        $pocetakRazdoblja = ($pocetakTjedna - ($trenutnoZimskiSemestar ? $zimskiSemestarPocetak : $ljetniSemestarPocetak))/(7*24*60*60) + 1;
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

foreach ($obveznostNastavePoPredmetima as $sifraPredmeta => $obveznostNastave) {
    if ($obveznostNastave === 'all') {
        foreach (array_keys($termini[$sifraPredmeta]) as $vrstaNastave) {
            foreach (array_keys($termini[$sifraPredmeta][$vrstaNastave]) as $scheduleId) {
                $termini[$sifraPredmeta][$vrstaNastave][$scheduleId]['mandatory'] = true;
            }
        }
    }
    else {
        $notFound = [];
        $found = [];
        foreach ($obveznostNastave as $obveznaVrsta) {
            if (array_key_exists($obveznaVrsta, $termini[$sifraPredmeta])) {
                $found[]= $obveznaVrsta;
                foreach (array_keys($termini[$sifraPredmeta][$obveznaVrsta]) as $scheduleId) {
                    $termini[$sifraPredmeta][$obveznaVrsta][$scheduleId]['mandatory'] = true;
                }
            }
            else {
                $notFound[]= $obveznaVrsta;
            }
        }
        if (!empty($notFound)) {
            $josNeobvezni = array_diff(array_keys($termini[$sifraPredmeta]), $found);
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
                    foreach (array_keys($termini[$sifraPredmeta][$substitut]) as $scheduleId) {
                        $termini[$sifraPredmeta][$substitut][$scheduleId]['mandatory'] = true;
                    }
                }
            }
        }
    }
}


//echo json_encode(array_values($termini), JSON_UNESCAPED_UNICODE);

file_put_contents($nazivDatotekeRasporeda, json_encode($termini = dohvatiStavkeRasporeda($termini), JSON_UNESCAPED_UNICODE));

if (!file_exists($nazivDatotekePredmeta)) {
    file_put_contents($nazivDatotekePredmeta, json_encode($sifrePredmeta = array_map(function($detaljiPredmeta){unset($detaljiPredmeta['id']); return $detaljiPredmeta;}, $sifrePredmeta), JSON_UNESCAPED_UNICODE));
}
else {
    $sifrePredmeta = json_decode(file_get_contents($nazivDatotekePredmeta), true);
}
?>