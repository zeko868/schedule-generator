<?php
    function dohvati_rasporede_za_ispis($rasporedi) {
        global $boje, $sifrePredmeta, $akademskaGodinaPocetak, $pocetakTrenutnogSemestra, $trajanjeTjedna, $trajanjeDana, $trenutnoZimskiSemestar, $jezik;
        $kodoviSvihRasporeda = [];
        foreach ($rasporedi as $raspored) {
            $kodRasporeda = [];
            foreach ($raspored as $stavka) {
                $sifraPredmeta = $stavka['subject'];
                $naziviPredmeta = $sifrePredmeta[$sifraPredmeta];
                $pocetniTjedan = $stavka['period']['start'];
                $trajanjePredmeta = $stavka['period']['end'] - $pocetniTjedan + 1;
                $pocetakZimskihPraznika = strtotime("24.12.$akademskaGodinaPocetak");
                $pomakOdPocetkaTjedna = $stavka['timeslot']['weekday'] - 1;
                $odrzavanje = $pocetakTrenutnogSemestra + ($pocetniTjedan - 1)*$trajanjeTjedna + $pomakOdPocetkaTjedna*$trajanjeDana;
                $vrijemePocetka = $stavka['timeslot']['start'];
                $vrijemeZavrsetka = $stavka['timeslot']['end'];
                $boja = $boje[$stavka['type']];
                $obradjeniZimskiPraznici = false;
                for ($tjedan = 0; $tjedan < $trajanjePredmeta; $tjedan++) {
                    if ($trenutnoZimskiSemestar && !$obradjeniZimskiPraznici && $odrzavanje >= $pocetakZimskihPraznika) {
                        $odrzavanje += 2*$trajanjeTjedna;
                        $obradjeniZimskiPraznici = true;
                    }
                    $datumOdrzavanja = date('Y-m-d', $odrzavanje);
                    $lokacija = $stavka['location'];
                    $kodRasporeda[] = "{\"title\":\"$naziviPredmeta[$jezik]\\n$lokacija[building] > $lokacija[room]\",\"start\":\"{$datumOdrzavanja}T{$vrijemePocetka}:00\",\"end\":\"{$datumOdrzavanja}T{$vrijemeZavrsetka}:00\",\"color\":\"$boja\"}";
                    $odrzavanje += $trajanjeTjedna;   // uzrokuje problem s prelaska ljetnog vremena na zimsko kad jedan dan traje 25 sati i zbog D.M.Y 00:00 postane D.M.Y+6D 23:00 umjesto D.M.Y+7D 00:00
                    //$odrzavanje = strtotime("+1 week", $odrzavanje);  // bila bi alternativa za rješavanje problema ljetnog vremena da se ne koristi poziv funkcije date_default_timezone_set('UTC')
                }
            }
            $kodoviSvihRasporeda[] = '[' . implode(',', $kodRasporeda) . ']';
        }
        return '[' . implode(',', $kodoviSvihRasporeda) . ']';
    }
?>
