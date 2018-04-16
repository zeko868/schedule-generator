<!DOCTYPE html>
<html>
    <head>
        <title>Raspored sati</title>
        <meta charset="UTF-8"/>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css" type="text/css"/>
        <link rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/themes/smoothness/jquery-ui.css" type="text/css"/>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/2.3.2/fullcalendar.min.css" type="text/css"/>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/2.3.2/fullcalendar.print.css" type="text/css" media="print"/>
        <link rel="stylesheet" href="https://rawgit.com/sandunangelo/jquery-timesetter/master/css/jquery.timesetter.min.css" type="text/css"/>
        <link rel="stylesheet" href="css/stil-aplikacije.css" type="text/css"/>
    </head>
    <body>
<?php
date_default_timezone_set('UTC');   // ne koristi ljetno vrijeme zbog čega nema komplikacija zbog otežane razlike proteklog vremena između 2 datuma kada je jedan u ljetnom razdoblju, a drugi u zimskom
if (isset($_GET['study_id'])) {
    $studij = $_GET['study_id'];
    ?>
        <script type="text/javascript">
            var kodoviRasporeda = [
            <?php
                $trajanjeTjedna = 7*24*60*60;
                $trajanjeDana = 24*60*60;
                $boje = [
                    'p' => '#CE003D',
                    's' => '#006A8D',
                    'av' => '#00A4A7',
                    'lv' => '#641A45',
                    'v' => '#5F6062'
                ];
                ini_set('memory_limit', -1);
                set_time_limit(0);
                $jestWindowsLjuska = explode(' ', php_uname(), 2)[0] === 'Windows';
                require 'dohvat-informacija-predmeta.php';
                if (isset($_POST['upisano'])) {
                    $descriptorspec = array(
                        array('pipe', 'r'),
                        array('pipe', 'w'),
                        array('pipe', 'w')
                    );
                    $lokacijaPrologSkripte = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'pronalazak-rasporeda.pl';
                    // prije poziva SWI-Prolog interpretera potrebno je osigurati da se putanja njegovog direktorija nalazi u varijabli okoline
                    if ($jestWindowsLjuska) {
                        $process = proc_open("swipl -s $lokacijaPrologSkripte", $descriptorspec, $pipes);
                    }
                    else {
                        $env = array(
                            'LANG' => 'hr_HR.utf-8'     // taj locale bi trebao biti prethodno instaliran na sustavu: sudo locale-gen hr_HR; sudo locale-gen hr_HR.UTF-8; sudo update-locale
                        );
                        $process = proc_open("swipl -s $lokacijaPrologSkripte", $descriptorspec, $pipes, NULL, $env);
                    }
                    $cmdUnosPredmetaTeOgranicenja = '';
                    foreach ($_POST['upisano'] as $nazivPredmeta) {
                        $cmdUnosPredmetaTeOgranicenja .= "asserta(upisano('$nazivPredmeta')),";
                    }
                    $cmdTrazi = 'dohvatiRaspored(false)';
                    if (isset($_POST['ogranicenja'])) {
                        $cmdZadnjaOgranicenja = '';
                        foreach ($_POST['ogranicenja'] as $ogranicenje) {
                            if (preg_match('/^dohvatiRaspored\((true|false)\)$/', $ogranicenje)) {
                                $cmdTrazi = $ogranicenje;
                            }
                            else {
                                $ogranicenje = preg_replace("/,''|'',/", '', $ogranicenje, -1, $brojZamjena);
                                if ($brojZamjena === 0) {
                                    $cmdUnosPredmetaTeOgranicenja .= "(clause($ogranicenje, _) -> $ogranicenje ; asserta($ogranicenje)),";
                                }
                                else {
                                    $cmdZadnjaOgranicenja .= "ignore($ogranicenje),";
                                }
                            }
                        }
                        $cmdUnosPredmetaTeOgranicenja .= $cmdZadnjaOgranicenja;
                    }
                    $cmdTrazi = "ignore($cmdTrazi)";
                    $putanja = dirname($_SERVER['PHP_SELF']);
                    $lokacijaDatoteke = "$_SERVER[REQUEST_SCHEME]://$_SERVER[SERVER_NAME]:$_SERVER[SERVER_PORT]$putanja/$nazivDatoteke";
                    $cmd = "ignore(dohvatiCinjenice('$lokacijaDatoteke')), $cmdUnosPredmetaTeOgranicenja ignore(inicijalizirajTrajanjaNastavePoDanima()), ignore(inicijalizirajTrajanjaPredmetaPoDanima()), $cmdTrazi, writeln(\"false.\"), halt().";    // na Windowsima radi ako naredba završava s "false. halt().", no na Linuxu proces Prolog interpretera nikada ne završava ako se proslijedi više naredbi - svrha jest kako bi kraj rezultata izvođenja uvijek završio "neuspješno" te bi se znalo kad više ne treba pozvati fread funkciju koja je blokirajuća
                    if ($jestWindowsLjuska) {
                        $cmd = iconv('utf-8', 'windows-1250', $cmd);
                    }
                    fwrite($pipes[0], $cmd);
                    fclose($pipes[0]);
                    $rasporedi = [];
                    $brojKombinacijaRasporeda = 0;
                    while ($rezultat = fread($pipes[1], 8192)) {
                        if ($jestWindowsLjuska) {
                            $rezultat = iconv('windows-1250', 'utf-8', $rezultat);
                        }
                        foreach (explode("\r\n", $rezultat) as $serijaliziraniRaspored) {
                            if (empty($serijaliziraniRaspored)) {
                                continue;   // prazni redak je nekada samo kraj trenutnog chunka, a kada nije pronađen nijedan rezultat, tada se nalazi ispred finalne riječi false.
                            }
                            else if (preg_match('/^false\./', $serijaliziraniRaspored)) {
                                break 2;
                            }
                            $rasporedi[] = json_decode($serijaliziraniRaspored, true);
                            $brojKombinacijaRasporeda++;
                        }
                    }
                    fclose($pipes[1]);
                    fclose($pipes[2]);
                    proc_close($process);
                }
                else {
                    $rasporedi = [$rasporedi];
                }
                $skupPredmeta = [];
                foreach ($rasporedi as $raspored) {
                    $kodRasporeda = '';
                    foreach ($raspored as $stavka) {
                        $nazivPredmeta = $stavka['predmet'];
                        $skupPredmeta[$nazivPredmeta] = null;
                        $pocetniTjedan = $stavka['razdoblje']['start'];
                        $trajanjePredmeta = $stavka['razdoblje']['kraj'] - $pocetniTjedan + 1;
                        $pocetakZimskihPraznika = strtotime("24.12.$akademskaGodinaPocetak");
                        $pomakOdPocetkaTjedna = $stavka['termin']['dan'] - 1;
                        $odrzavanje = $pocetakTrenutnogSemestra + ($pocetniTjedan - 1)*$trajanjeTjedna + $pomakOdPocetkaTjedna*$trajanjeDana;
                        $vrijemePocetka = $stavka['termin']['start'];
                        $vrijemeZavrsetka = $stavka['termin']['kraj'];
                        $boja = $boje[$stavka['vrsta']];
                        $obradjeniZimskiPraznici = false;
                        for ($tjedan = 0; $tjedan < $trajanjePredmeta; $tjedan++) {
                            if ($trenutnoZimskiSemestar && !$obradjeniZimskiPraznici && $odrzavanje >= $pocetakZimskihPraznika) {
                                $odrzavanje += 2*$trajanjeTjedna;
                                $obradjeniZimskiPraznici = true;
                            }
                            $datumOdrzavanja = date('Y-m-d', $odrzavanje);
                            $lokacija = $stavka['lokacija'];
                            $kodRasporeda .= "{title: '$nazivPredmeta\\n$lokacija[zgrada] > $lokacija[prostorija]', start: '{$datumOdrzavanja}T{$vrijemePocetka}:00', end: '{$datumOdrzavanja}T{$vrijemeZavrsetka}:00', color: '$boja'},";
                            $odrzavanje += $trajanjeTjedna;   // uzrokuje problem s prelaska ljetnog vremena na zimsko kad jedan dan traje 25 sati i zbog D.M.Y 00:00 postane D.M.Y+6D 23:00 umjesto D.M.Y+7D 00:00
                            //$odrzavanje = strtotime("+1 week", $odrzavanje);  // bila bi alternativa za rješavanje problema ljetnog vremena da se ne koristi poziv funkcije date_default_timezone_set('UTC')
                        }
                    }
                    echo '[';
                    echo $kodRasporeda;
                    echo '],';
                }
            ?>
            ];
            <?php
            if (isset($brojKombinacijaRasporeda)) {
                echo "var brojKombinacijaRasporeda = $brojKombinacijaRasporeda;";
            }
            ?>
        </script>
        <form action="<?php echo "$_SERVER[PHP_SELF]?study_id=$studij";?>" method="POST" id="odabir-predmeta">
            <div class="left">
                <label for="dostupni">Dostupni predmeti:</label>
                <br/>
                <select size="12" multiple="multiple" name="dostupno[]" id="dostupni">
                    <?php
                        foreach ((isset($_POST['dostupno']) ? $_POST['dostupno'] : array_keys($skupPredmeta)) as $nazivPredmeta) {
                            echo "<option value=\"$nazivPredmeta\">$nazivPredmeta</option>";
                        }
                    ?>
                </select>
            </div>
            <div class="middle">
                <button type="submit" class="ui-button ui-corner-all ui-widget">Učitaj kombinacije</button>
                <br/>
                <button type="button" id="makni" class="ui-button ui-corner-all ui-widget">&lt;</button>
                <button type="button" id="makni-sve" class="ui-button ui-corner-all ui-widget">&lt;&lt;</button>
                <button type="button" id="dodaj-sve" class="ui-button ui-corner-all ui-widget">&gt;&gt;</button>
                <button type="button" id="dodaj" class="ui-button ui-corner-all ui-widget">&gt;</button>
                <br/>
                <button type="button" id="tipka-ogranicenja" class="ui-button ui-corner-all ui-widget">Ograničenja</button>
                <br/>
                <?php
                if (isset($brojKombinacijaRasporeda)) {
                    if ($brojKombinacijaRasporeda>0) {
                ?>
                <nav>
                    <button type="button" id="prvi" class="ui-button ui-corner-all ui-widget">&lt;&lt;</button>
                    <button type="button" id="prethodni" class="ui-button ui-corner-all ui-widget">&lt;</button>
                    <span><span id="trenutna-kombinacija">1</span> od <?php echo $brojKombinacijaRasporeda;?></span>
                    <button type="button" id="sljedeci" class="ui-button ui-corner-all ui-widget">&gt;</button>
                    <button type="button" id="posljedni" class="ui-button ui-corner-all ui-widget">&gt;&gt;</button>
                </nav>
                <?php
                    }
                    else {
                        echo '<p class="error">Ne postoji zadovoljavajući raspored</p>';
                    }
                }
                else {
                    if (isset($_POST['dostupno']) && empty($_POST['upisano'])) {
                        echo '<p class="error">Odaberite predmete koje pohađate</p>';
                    }
                }
                ?>
            </div>
            <div class="right">
                <label for="upisani">Upisani predmeti:</label>
                <br/>
                <select size="12" multiple="multiple" name="upisano[]" id="upisani">
                    <?php
                    if (isset($_POST['upisano'])) {
                        foreach ($_POST['upisano'] as $nazivPredmeta) {
                            echo "<option value=\"$nazivPredmeta\">$nazivPredmeta</option>";
                        }
                    }
                    ?>
                </select>
            </div>
            <select name="ogranicenja[]" id="ogranicenja" multiple="multiple"></select>
            <input type="hidden" name="serijalizirana-forma-ogranicenja" id="serijalizirana-forma-ogranicenja"/>
        </form>
        <div id="calendar"></div>
        <div id="dialog-form" title="Ograničenja">
            <form id="forma-ogranicenja">
                <?php
                if (isset($_POST['serijalizirana-forma-ogranicenja'])) {
                    echo $_POST['serijalizirana-forma-ogranicenja'];
                }
                ?>
            </form>
        </div>
        <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
        <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js"></script>
		<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.20.1/moment.min.js"></script>
		<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/2.3.2/fullcalendar.min.js"></script>
        <script type="text/javascript" src="https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/datejs/date.js"></script>
        <script type="text/javascript" src="https://rawgit.com/benscobie/jquery-timesetter/bc82f3b74ad039893ed8d700397e0cd96af21a60/js/jquery.timesetter.js"></script>
        <script type="text/javascript" src="js/hr.js"></script>
        <script type="text/javascript" src="js/obrada-dogadjaja.js"></script>
        <script type="text/javascript">
            <?php
                if (isset($_POST['ogranicenja'])) {
                    $predikati = [];
                    $vrijednostiOstalihKontrola = [];
                    foreach ($_POST['ogranicenja'] as $ogranicenje) {
                        //if (preg_match('/^(?<predikat>.*?)\((?:(?:(?:vrijeme|trajanje)\((?<vrijemeIliTrajanje>.*?)\)|(?<predmetIliDan>\'.*?\')|(?<number>\d+)|(?<boolean>true|false))(?:\,|\)))*$/', $ogranicenje, $matches)) {   // ako bi koje ograničenje imalo više vremena/trajanja, tad bi trebalo doraditi ovaj dio
                        if (preg_match('/^(.*?)\((?:(?:(?:vrijeme|trajanje)\((?<vrijeme>.*?)\)|(\'.*?\')|(\d+)|(true|false))(?:\,|\)))*$/', $ogranicenje, $matches, PREG_OFFSET_CAPTURE)) {
                            $brojStavki = count($matches) - 3;
                            $predikati[] = '"' . $matches[1][0] . '"';
                            $proslaPozicijaPronadjenog = -1;
                            $zadnjiElement = 2 + $brojStavki;
                            for ($iteracija=0; $iteracija<$brojStavki; $iteracija++) {
                                $novaPozicijaPronadjenog = null;
                                $indeksPronadjenog = null;
                                for ($i=2; $i<$zadnjiElement; $i++) {
                                    $trenutnaPozicija = $matches[$i][1];
                                    if (($trenutnaPozicija !== -1 && ($novaPozicijaPronadjenog === null || $trenutnaPozicija < $novaPozicijaPronadjenog) && $trenutnaPozicija > $proslaPozicijaPronadjenog)) {
                                        $novaPozicijaPronadjenog = $trenutnaPozicija;
                                        $indeksPronadjenog = $i;
                                    }
                                }
                                if ($indeksPronadjenog !== null) {
                                    $pronadjenaVrijednost = $matches[$indeksPronadjenog][0];
                                    if ($matches['vrijeme'][1] === $novaPozicijaPronadjenog) {
                                        $pronadjenaVrijednost = '"' . str_replace(',', ':', $pronadjenaVrijednost) . '"';
                                    }
                                    $vrijednostiOstalihKontrola[]= $pronadjenaVrijednost;
                                    $proslaPozicijaPronadjenog = $novaPozicijaPronadjenog;
                                }
                            }
                        }
                    }
                    echo 'var predikati = [';
                    echo implode(',', $predikati);
                    echo '];';
                    echo 'var vrijednostiOstalihKontrola = [';
                    echo implode(',', $vrijednostiOstalihKontrola);
                    echo '];';
                }
            ?>
        </script>
    <?php
}
else {
    ?>
        <form action="<?php echo $_SERVER['PHP_SELF'];?>" method="GET">
    <?php
    $doc = new DomDocument;

    // We need to validate our document before refering to the id
    $doc->validateOnParse = true;

    $ch = curl_init('https://nastava.foi.hr/public/schedule');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    error_reporting(E_ERROR | E_PARSE);
    $doc->loadHTML(curl_exec($ch));
    curl_close($ch);

    $select = $doc->getElementById('study');
    $optNum = $select->getElementsByTagName('option')->length;
    $select->setAttribute('size', $optNum);
    echo $doc->saveHTML($select);
    ?>
            <br/>
            <button type="submit" class="ui-button ui-corner-all ui-widget">Učitaj</button>
        </form>
    <?php
}
?>
    </body>
</html>
