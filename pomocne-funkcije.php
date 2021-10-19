<?php
function dodajStavkuMedjuTermineRasporeda() {
    global $prethodniId, $danUTjednu, $vrijemePocetka, $vrijemeZavrsetka, $trenutnoZimskiSemestar, $zimskiSemestarPocetak, $ljetniSemestarPocetak, $trajanjeZimskihPraznikaTjedni, $sifraPredmeta, $vrstaNastave, $pocetakRazdoblja, $termini, $akademskaGodinaKraj, $zgrada, $prostorija;
    //$obveznostPredmeta = $obveznostNastavePoPredmetima[$nazivPredmeta];
    $danUTjednu = (int) date('N', $vrijemePocetka);
    $pocetakTjedna = strtotime('-' . ($danUTjednu - 1) . ' day', $vrijemePocetka);
    $pocetakTjedna -= $pocetakTjedna % (60*60*24);
    if ($trenutnoZimskiSemestar) {
        $zavrsetakRazdoblja = ($pocetakTjedna - $zimskiSemestarPocetak)/(7*24*60*60) + 1;
        if ($vrijemePocetka >= strtotime("07.01.$akademskaGodinaKraj")) {
            $zavrsetakRazdoblja -= $trajanjeZimskihPraznikaTjedni;
        }
    }
    else {
        $zavrsetakRazdoblja = ($pocetakTjedna - $ljetniSemestarPocetak)/(7*24*60*60) + 1;
    }
    if ($pocetakRazdoblja !== $zavrsetakRazdoblja) {    // vjerojatno je riječ o nadoknadi ako se nešto izvodi samo jedanput
        //$termini[$prethodniId] =
        $stavkaZaDodavanje =
            [
                'subject' => $sifraPredmeta,
                'type' => $vrstaNastave,
                //'mandatory' => $obveznostPredmeta==='all' || in_array($vrstaNastave, $obveznostPredmeta),
                'mandatory' => false,
                'period' => [    // tjedni održavanja nastave
                    'start' => $pocetakRazdoblja,
                    'end' => $zavrsetakRazdoblja
                ],
                'timeslot' => [
                    'weekday' => $danUTjednu,
                    'start' => date('H:i', $vrijemePocetka),
                    'end' => date('H:i', $vrijemeZavrsetka)
                ],
                'location' => [
                    'building' => $zgrada,
                    'room' => $prostorija
                ]
            ];
        if (!isset($termini[$sifraPredmeta][$vrstaNastave]) || !in_array($stavkaZaDodavanje, $termini[$sifraPredmeta][$vrstaNastave])) {
            $termini[$sifraPredmeta][$vrstaNastave][$prethodniId] = $stavkaZaDodavanje;
        }
    }
}

function pronadjiDetaljeOObveznostiNastave($ispitivaniTekst) {
    global $obveznostPredmeta;
    if (preg_match('/(?:(?:prisustv?o|prisut(?:st)?vo)(?:vanje)?|prisutnost|dola(?:znost|sci)|nazočnost|izostan(?:aka?|ka|ci))(?:(?:.*?(?:(predavanj(?:(?:im)?a|u))|(seminar(?:ima|e|a|u)|(?:sem\.|seminarsk(?:im|e|ih|oj)) (?:vježb(?:ama|e|i|a)|nastav(?:i|e)))|(auditorij(?:ima|e|a)|(?:aud\.|auditorn(?:im|e|ih|oj)) (?:vježb(?:ama|e|i|a)|nastav(?:i|e)))|(labos(?:e|ima|a)|(?:laboratorijsk(?:im|e|ih|oj)|lab\.) (?:vježb(?:ama|e|i|a)|nastav(?:i|e)))|(vježb(?:ama|e|i|a))))+|(.*nastav(?:i|e)))/i', $ispitivaniTekst, $rezultat)) {
        /*
        foreach ([4, 8] as $stupacGranice) {
            $tr->childNodes[$stupacGranice]->textContent;
        }
        */
        if (!empty($rezultat[6])) {
            $obveznostPredmeta = 'all';
            return true;   // nema daljnje potrebe za provjerom
        }
        else {
            if (!empty($rezultat[1])) {
                $obveznostPredmeta[] = 'p';
            }
            if (!empty($rezultat[2])) {
                $obveznostPredmeta[] = 's';
            }
            if (!empty($rezultat[3])) {
                $obveznostPredmeta[] = 'av';
            }
            if (!empty($rezultat[4])) {
                $obveznostPredmeta[] = 'lv';
            }
            if (!empty($rezultat[5])) {
                $obveznostPredmeta[] = 'v'; // tzk i jezici
            }
        }
    }
}

function dohvatiStavkeRasporeda($termini) {
    $rezultat = [];
    foreach (array_values($termini) as $terminiPredmeta) {
        foreach ($terminiPredmeta as $vrsteNastave) {
            foreach ($vrsteNastave as $terminiNastave) {
                $rezultat[]= $terminiNastave;
            }
        }
    }
    return $rezultat;
}