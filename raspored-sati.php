<?php
    function loadI18nFileContent($languageName) {
        $nazivDatoteke = "data/i18n_$languageName.json";
        if (file_exists('shared-' . $nazivDatoteke)) {
            $nazivDatoteke = 'shared-' . $nazivDatoteke;
        }
        $result = json_decode(file_get_contents($nazivDatoteke));
        return $result;
    }

    date_default_timezone_set('UTC');   // ne koristi ljetno vrijeme zbog čega nema komplikacija zbog otežane razlike proteklog vremena između 2 datuma kada je jedan u ljetnom razdoblju, a drugi u zimskom
    session_start();
    if (isset($_GET['language'])) {
        $jezik = $_SESSION['language'] = $_GET['language'];
    }
    else {
        if (isset($_SESSION['language'])) {
            $jezik = $_SESSION['language'];
        }
        else {
            $jezik = 'croatian';
        }
    }
    $tekst = loadI18nFileContent($jezik);
    if ($tekst === null) {
        die('File with translation strings of requested language cannot be found or does not contain valid JSON data!');
    }
    $naziviDana = $tekst->daysOfTheWeek;
    $akademskeGodine = [];
    $trenutnaGodina = date('Y');
    if (date('m') >= 9) {
        $pocetakTrenutneAkademskeGodine = $trenutnaGodina;
        $krajTrenutneAkademskeGodine = $trenutnaGodina + 1;
        $akademskeGodine[]= "$pocetakTrenutneAkademskeGodine/$krajTrenutneAkademskeGodine";
    }
    for ($i=1; $i<=10; $i++) {
        $pocetakAkademskeGodine = $trenutnaGodina - $i;
        $krajAkademskeGodine = $pocetakAkademskeGodine + 1;
        $akademskeGodine[]= "$pocetakAkademskeGodine/$krajAkademskeGodine";
    }
?>
<!DOCTYPE html>
<html>
    <head>
        <title><?= $tekst->title ?></title>
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
            if (isset($_GET['study_id'])) {
                $studij = $_GET['study_id'];
                $akademskaGodina = $_GET['academic_year'];
                $semestar = $_GET['semester'];
                ini_set('memory_limit', -1);
                set_time_limit(0);
                $jestWindowsLjuska = explode(' ', php_uname(), 2)[0] === 'Windows';
                try {
                    $odabirDostupanZaRad = !!(include_once 'dohvat-informacija-predmeta.php');
                } catch (Error $e) {
                    $odabirDostupanZaRad = false;
                }
                $momentJsLanguageCode = $tekst->momentJsLanguageCode;
            }
            if (isset($odabirDostupanZaRad) && $odabirDostupanZaRad) {
        ?>
        <script type="text/javascript">
            var googleMapsApiKey = "<?= getenv('GOOGLE_MAPS_API_KEY') ?>";
            var initialMapCenterGeocoordinates = "<?= getenv('INITIAL_MAP_CENTER_GEOCOORDINATES') ?: '45,16' ?>";
            var initialMapZoomLevel = <?= getenv('INITIAL_MAP_ZOOM_LEVEL') ?: 7 ?>;
            var naziviDana = <?= json_encode($naziviDana) ?>;
            var naziviVrsta = <?= json_encode($tekst->typeOfClasses) ?>;
            var tekst = <?= json_encode($tekst->other) ?>;
            var momentJsLanguageCode = "<?= $momentJsLanguageCode ?>";
            var fullCalendarDefaultDate = "<?= new DateTime() >= new DateTime($pocetakTrenutnogSemestra) && new DateTime() < (new DateTime($pocetakTrenutnogSemestra))->modify("+154 days") ? date('Y-m-d') : date('Y-m-d', $pocetakTrenutnogSemestra) ?>";
            <?php
                if (isset($_POST['upisano'])) {
                    $cmdUnosPredmetaTeOgranicenja = '';
                    foreach ($_POST['upisano'] as $sifraPredmeta) {
                        $cmdUnosPredmetaTeOgranicenja .= "asserta(upisano('$sifraPredmeta')),";
                    }
                    $cmdTrazi = 'dohvatiRaspored(\'false\')';
                    if (isset($_POST['ogranicenja'])) {
                        $cmdZadnjaOgranicenja = '';
                        $prioritetniRedSPravilimaPohadjanjaNastave = [[],[],[],[]];
                        $odabraniTermini = [];
                        $zabranjeniTermini = [];
                        foreach ($_POST['ogranicenja'] as $ogranicenje) {
                            if (preg_match('/^dohvatiRaspored\(\'(true|false)\'\)$/', $ogranicenje)) {
                                $cmdTrazi = $ogranicenje;
                            }
                            else if (preg_match('/^pohadjanjeNastave\((\d+|\'\'),\'(any|[^\']*)\'/', $ogranicenje, $matches)) {
                                $biloKojiPredmet = $matches[1] === "''";
                                $biloKojaVrsta = $matches[2] === 'any';
                                if ($biloKojiPredmet && $biloKojaVrsta) {
                                    $prioritet = 0;
                                }
                                else if ($biloKojaVrsta) {
                                    $prioritet = 1;
                                }
                                else if ($biloKojiPredmet) {
                                    $prioritet = 2;
                                }
                                else {
                                    $prioritet = 3;
                                }
                                $prioritetniRedSPravilimaPohadjanjaNastave[$prioritet][] = "ignore($ogranicenje)";
                            }
                            else {
                                $ogranicenje = preg_replace("/,''|'',/", '', $ogranicenje, -1, $brojZamjena);
                                if ($brojZamjena === 0) {
                                    $cmdUnosPredmetaTeOgranicenja .= "(clause($ogranicenje, _) -> ignore($ogranicenje) ; asserta($ogranicenje)),";
                                }
                                else {
                                    $cmdZadnjaOgranicenja .= "ignore($ogranicenje),";
                                }
                            }
                        }
                        for ($i=0; $i<4; $i++) {
                            if (!empty($prioritetniRedSPravilimaPohadjanjaNastave[$i])) {
                                $cmdZadnjaOgranicenja .= implode(',', $prioritetniRedSPravilimaPohadjanjaNastave[$i]) . ',';
                            }
                        }
                        $cmdUnosPredmetaTeOgranicenja .= $cmdZadnjaOgranicenja;
                    }
                    $cmdTrazi = "ignore($cmdTrazi)";
                    $cmdUnosDana = '';
                    for ($i=1; $i<=5; $i++) {
                        $nazivDana = $naziviDana[$i-1];
                        $cmdUnosDana .= "assertz(dan({$i}, '$nazivDana', true)),";
                    }
                    for ($i=6; $i<=7; $i++) {
                        $nazivDana = $naziviDana[$i-1];
                        $cmdUnosDana .= "assertz(dan({$i}, '$nazivDana', false)),";
                    }
                    $putanja = dirname($_SERVER['PHP_SELF']);
                    $lokacijaDatoteke = "$_SERVER[REQUEST_SCHEME]://$_SERVER[SERVER_NAME]:$_SERVER[SERVER_PORT]$putanja/$nazivDatotekeRasporeda";
                    $cmd = "$cmdUnosDana ignore(dohvatiCinjenice('$lokacijaDatoteke')), $cmdUnosPredmetaTeOgranicenja ignore(inicijalizirajTrajanjaNastavePoDanima()), ignore(inicijalizirajTrajanjaPredmetaPoDanima()), $cmdTrazi, halt().";    // na Windowsima radi ako naredba završava s "false. halt().", no na Linuxu proces Prolog interpretera nikada ne završava ako se proslijedi više naredbi - svrha jest kako bi kraj rezultata izvođenja uvijek završio "neuspješno" te bi se znalo kad više ne treba pozvati fread funkciju koja je blokirajuća
                    if ($jestWindowsLjuska) {
                        $cmd = iconv('utf-8', 'windows-1250', $cmd);
                    }
                    $descriptorspec = array(
                        1 => array('pipe', 'w'),
                        2 => array('pipe', '')
                    );
                    $lokacijaSkripteDaemona = 'pronalazak-rasporeda.php';
                    $params = [
                        $jezik,
                        '127.0.0.1',
                        $studij,
                        $akademskaGodina,
                        $semestar,
                        $cmd
                    ];
                    $phpScriptArgs = implode(' ', array_map('escapeshellarg', $params));
                    if ($jestWindowsLjuska) {
                        $process = proc_open("start /B php -f $lokacijaSkripteDaemona -- $phpScriptArgs", $descriptorspec, $pipes);
                    }
                    else {
                        $process = proc_open("nohup php -f $lokacijaSkripteDaemona -- $phpScriptArgs &", $descriptorspec, $pipes);
                    }
                    if (is_resource($process)) {
                        $daemonPort = stream_get_contents($pipes[1]);
                        //$daemonPort = fread($pipes[1], 5);
                    }
                    echo 'var kodoviRasporeda = [];';
                }
                else {
                    $terminiPoVrstamaPoPredmetima = [];
                    $zgrade = [];
                    foreach ($termini as $stavka) {
                        $predmet = $stavka['subject'];
                        $vrsta = $stavka['type'];
                        $termin = $stavka['timeslot'];
                        $nazivDana = $naziviDana[$termin['weekday']-1];
                        $skraceniNazivDana = substr($nazivDana, 0, 3);
                        $vrijemePocetka = $termin['start'];
                        $vrijemePocetkaSaZarezom = str_replace(':', ',', $vrijemePocetka);
                        $vrijemeZavrsetka = $termin['end'];
                        $vrijemeZavrsetkaSaZarezom = str_replace(':', ',', $vrijemeZavrsetka);
                        $lokacija = $stavka['location'];
                        $zgrada = $lokacija['building'];
                        $prostorija = $lokacija['room'];
                        $terminiPoVrstamaPoPredmetima[$predmet][$vrsta][] = ["terminILokacija(termin('$nazivDana',vrijeme($vrijemePocetkaSaZarezom),vrijeme($vrijemeZavrsetkaSaZarezom)),lokacija('$zgrada','$prostorija'))" => "$skraceniNazivDana $vrijemePocetka-$vrijemeZavrsetka, $zgrada > $prostorija"];
                        $zgrade[] = $zgrada;
                    }
                    $zgrade = array_values(array_unique($zgrade));
                    sort($zgrade);
                    $serijaliziraneZgrade = json_encode($zgrade, JSON_UNESCAPED_UNICODE);
                    foreach (array_keys($boje) as $vrsta) {
                        $terminiPoVrstamaPoPredmetima[''][$vrsta] = [];
                    }
                    $serijaliziraniTerminiPoVrstamaPoPredmetima = json_encode($terminiPoVrstamaPoPredmetima, JSON_UNESCAPED_UNICODE | JSON_FORCE_OBJECT);
                    $rasporedi = [&$termini];
                    require 'dohvati-rasporede-za-ispis.php';
                    echo 'var kodoviRasporeda = ' . dohvati_rasporede_za_ispis($rasporedi) . ';';
                }
                if (!empty($daemonPort)) {
                    echo 'var daemonPort =' . $daemonPort . ';';
                }
                else {
                    echo 'var daemonPort = false;';
                }
                if (!isset($serijaliziraniTerminiPoVrstamaPoPredmetima)) {
                    $serijaliziraniTerminiPoVrstamaPoPredmetima = $_POST['serijalizirani-termini-po-vrstama-po-predmetima'];
                }
                echo "var serijaliziraniTerminiPoVrstamaPoPredmetima = $serijaliziraniTerminiPoVrstamaPoPredmetima;";
                if (!isset($serijaliziraneZgrade)) {
                    $serijaliziraneZgrade = $_POST['zgrade'];
                }
                if (isset($_POST['lokacije-zgrada'])) {
                    echo "var lokacijeZgrada = {$_POST['lokacije-zgrada']};";
                }
                else {
                    echo 'var lokacijeZgrada = [];';
                }
                echo "var zgrade = $serijaliziraneZgrade;";
            ?>
        </script>

        <form action="<?= "$_SERVER[PHP_SELF]?study_id=$studij&semester=$semestar&academic_year=$akademskaGodina"?>" method="POST" id="odabir-predmeta">
            <div class="left">
                <label for="dostupni"><?= $tekst->availableCourses ?></label>
                <br/>
                <select size="12" multiple="multiple" name="dostupno[]" id="dostupni">
                    <?php
                        if (isset($_POST['dostupno'])) {
                            foreach ($_POST['dostupno'] as $sifraPredmeta) {
                                $naziviPredmeta = $sifrePredmeta[$sifraPredmeta];
                                echo "<option value=\"$sifraPredmeta\">$naziviPredmeta[$jezik]</option>";
                            }
                        }
                        else {
                            foreach ($sifrePredmeta as $sifraPredmeta => $naziviPredmeta) {
                                echo "<option value=\"$sifraPredmeta\">$naziviPredmeta[$jezik]</option>";
                            }
                        }
                    ?>
                </select>
            </div>
            <div class="middle">
                <button type="submit" class="ui-button ui-corner-all ui-widget"><?= $tekst->generateResults ?></button>
                <br/>
                <button type="button" id="makni" class="ui-button ui-corner-all ui-widget">&lt;</button>
                <button type="button" id="makni-sve" class="ui-button ui-corner-all ui-widget">&lt;&lt;</button>
                <button type="button" id="dodaj-sve" class="ui-button ui-corner-all ui-widget">&gt;&gt;</button>
                <button type="button" id="dodaj" class="ui-button ui-corner-all ui-widget">&gt;</button>
                <br/>
                <button type="button" id="tipka-ogranicenja" class="ui-button ui-corner-all ui-widget"><?= $tekst->constraints ?></button>
                <br/>
                <?php
                    if (isset($_POST['upisano'])) {
                ?>
                <nav>
                    <button type="button" id="prvi" class="ui-button ui-corner-all ui-widget">&lt;&lt;</button>
                    <button type="button" id="prethodni" class="ui-button ui-corner-all ui-widget">&lt;</button>
                    <span id="trenutna-kombinacija">0</span> <?= $tekst->outOf ?> <span id="ukupno-kombinacija">0</span></span>
                    <button type="button" id="sljedeci" class="ui-button ui-corner-all ui-widget">&gt;</button>
                    <button type="button" id="posljedni" class="ui-button ui-corner-all ui-widget">&gt;&gt;</button>
                    <br/>
                    <span id="possible-incompleteness-note"><?= $tekst->soFar ?></span>
                </nav>
                <?php
                    }
                    else {
                        if (isset($_POST['dostupno'])) {
                            echo "<span class=\"error\">$tekst->noEnrolledCoursesError</span>";
                        }
                    }
                ?>
            </div>
            <div class="right">
                <label for="upisani"><?= $tekst->enrolledCourses ?></label>
                <br/>
                <select size="12" multiple="multiple" name="upisano[]" id="upisani">
                    <?php
                    if (isset($_POST['upisano'])) {
                        foreach ($_POST['upisano'] as $sifraPredmeta) {
                            $naziviPredmeta = $sifrePredmeta[$sifraPredmeta];
                            echo "<option value=\"$sifraPredmeta\">$naziviPredmeta[$jezik]</option>";
                        }
                    }
                    ?>
                </select>
            </div>
            <select name="ogranicenja[]" id="ogranicenja" multiple="multiple"></select>
            <input type="hidden" name="serijalizirana-forma-ogranicenja" id="serijalizirana-forma-ogranicenja"/>
            <input type="hidden" name="serijalizirani-termini-po-vrstama-po-predmetima" id="serijalizirani-termini-po-vrstama-po-predmetima"/>
            <input type="hidden" name="zgrade" id="zgrade"/>
            <input type="hidden" name="lokacije-zgrada" id="lokacije-zgrada"/>
        </form>

        <div id="calendar"></div>

        <table id="legend">
            <tr>
                <?php
                    foreach ($tekst->typeOfClasses as $kraticaVrste => $nazivVrste) {
                        echo "<td><span class=\"color-name\">$nazivVrste</span><span class=\"color-box\" style=\"background-color: $boje[$kraticaVrste];\"></span></td>";
                    }
                ?>
            </tr>
        </table>

        <div id="constraints-dialog-form" title="<?= $tekst->constraints ?>" style="display: none;">
            <form id="forma-ogranicenja"><?php      // sadržaj form HTML elementa je ovako formatiran zato što bi se razdvajanjem <?php oznake u novi redak učinilo CSS selektor '#forma-ogranicenja:empty' neprimijenjivim čak i kada spomenuti HTML element ne bi sadržavao elemente-djecu (razlog tome jest što bi ipak sadržavao whitespaceve, a tek od CSS4 bi se trebali stilovi sa selektorom koji sadrži :empty pseudoklasom primijenjivati na takve elemente)
                if (isset($_POST['serijalizirana-forma-ogranicenja'])) {
                    echo $_POST['serijalizirana-forma-ogranicenja'];
                }
                ?></form>
            <span id="no-constraints-hint"><?= $tekst->noConstraintsHint ?></span>
        </div>

        <div id="geo-mapping-dialog-form" title="<?= $tekst->other->buildingLocationDefinition ?>" style="display: none;">
            <div id="map-canvas"></div>
            <div id="floating-panel">
                <form id="forma-pozicija-zgrada">
                    <label for="travel-mode"><?= $tekst->other->travelMode ?></label>
                    <select id="travel-mode">
                        <option value="DRIVING"><?= $tekst->other->driving ?></option>
                        <option value="WALKING"><?= $tekst->other->walking ?></option>
                        <option value="BICYCLING"><?= $tekst->other->bicycling ?></option>
                        <option value="TRANSIT"><?= $tekst->other->transit ?></option>
                        <option value="TWO_WHEELER"><?= $tekst->other->twoWheeler ?></option>
                    </select>
                    <table>
                        <caption><?= $tekst->other->buildingLocations ?></caption>
                        <thead>
                            <tr>
                                <th><?= $tekst->other->locationName ?></th>
                                <th><?= $tekst->other->locationAddress ?></th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                </form>
            </div>
        </div>

        <script type="text/javascript" src="https://polyfill.io/v3/polyfill.min.js?features=default"></script>
        <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
        <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js"></script>
		<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.20.1/moment.min.js"></script>
		<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/2.3.2/fullcalendar.min.js"></script>
        <script type="text/javascript" src="https://rawgit.com/datejs/Datejs/master/build/date-en-US.js"></script>
        <script type="text/javascript" src="https://rawgit.com/benscobie/jquery-timesetter/bc82f3b74ad039893ed8d700397e0cd96af21a60/js/jquery.timesetter.js"></script>
        <!-- Async script executes immediately and must be after any DOM elements used in callback. -->
        <?php
            if ($momentJsLanguageCode !== 'en') {
        ?>
        <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/2.3.2/lang/<?= $momentJsLanguageCode ?>.js"></script>
        <?php
            }
        ?>
        <script type="text/javascript">
            <?php
                if (isset($_POST['ogranicenja'])) {
                    $predikati = [];
                    $vrijednostiOstalihKontrola = [];
                    foreach ($_POST['ogranicenja'] as $ogranicenje) {
                        //if (preg_match('/^(?<predikat>.*?)\((?:(?:(?:vrijeme|trajanje)\((?<vrijemeIliTrajanje>.*?)\)|(?<predmetIliDan>\'.*?\')|(?<number>\d+)|(?<boolean>true|false))(?:\,|\)))*$/', $ogranicenje, $matches)) {   // ako bi koje ograničenje imalo više vremena/trajanja, tad bi trebalo doraditi ovaj dio
                        if (preg_match('/^(\S+?)\((?:(?:(?:vrijeme|trajanje)\((?<vrijeme>.*?)\)|(\'(?:p|s|lv|av|v|any)\')|(\'(?:true|false|da|ne|mozda)\')|(\'(?:\\\'|[^\'])*?\')(?:,(\'(?:\\\'|[^\'])*?\'))?|(\d+)|((?<slozeni_term>[^(]+\(.*\)(?=[^)]*\)))))(?:\,|\)))*$/', $ogranicenje, $matches, PREG_OFFSET_CAPTURE)) {
                            $brojIndeksiranihElemenata = 0;
                            foreach ($matches as $k => $v) {
                                if (is_integer($k)) {
                                    $brojIndeksiranihElemenata++;
                                }
                            }
                            $brojIndeksiranihMatchovaGrupaPrijePocetkaArgumenata = 2;   // jedan predstavlja rezultat cjelokupnog regexa, a drugi predstavlja naziv predikata
                            $brojIndeksiranihMatchovaGrupaArgumenataPredikata = $brojIndeksiranihElemenata - $brojIndeksiranihMatchovaGrupaPrijePocetkaArgumenata;
                            $nazivTrenutnogPredikata = $matches[1][0];
                            if (!isset($nazivPrethodnogPredikata) || !($nazivTrenutnogPredikata === 'trajanjePutovanjaIzmedjuZgrada' && $nazivPrethodnogPredikata === $nazivTrenutnogPredikata)) {
                                $predikati[] = '"' . $nazivTrenutnogPredikata . '"';
                            }
                            $nazivPrethodnogPredikata = $nazivTrenutnogPredikata;
                            $proslaPozicijaPronadjenog = -1;
                            for ($iteracija=0; $iteracija < $brojIndeksiranihMatchovaGrupaArgumenataPredikata; $iteracija++) {
                                $novaPozicijaPronadjenog = null;
                                $indeksPronadjenog = null;
                                for ($i=$brojIndeksiranihMatchovaGrupaPrijePocetkaArgumenata; $i<$brojIndeksiranihElemenata; $i++) {
                                    $trenutnaPozicija = $matches[$i][1];
                                    if ($trenutnaPozicija !== -1 && ($novaPozicijaPronadjenog === null || $trenutnaPozicija < $novaPozicijaPronadjenog) && $trenutnaPozicija > $proslaPozicijaPronadjenog) {
                                        $novaPozicijaPronadjenog = $trenutnaPozicija;
                                        $indeksPronadjenog = $i;
                                    }
                                }
                                if ($indeksPronadjenog !== null) {
                                    $pronadjenaVrijednost = $matches[$indeksPronadjenog][0];
                                    if (isset($matches['vrijeme']) && $matches['vrijeme'][1] === $novaPozicijaPronadjenog) {
                                        $pronadjenaVrijednost = '"' . str_replace(',', ':', $pronadjenaVrijednost) . '"';
                                    }
                                    else if (isset($matches['slozeni_term']) && $matches['slozeni_term'][1] === $novaPozicijaPronadjenog) {
                                        $pronadjenaVrijednost = '"' . str_replace('"', '\"', $pronadjenaVrijednost) . '"';
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
        <script type="text/javascript" src="js/obrada-dogadjaja.js"></script>
        <script src="https://maps.googleapis.com/maps/api/js?key=<?= getenv('GOOGLE_MAPS_API_KEY') ?>&libraries=places&v=weekly&callback=initializeDistCalc" async></script>
        <?php
            }
            else {
        ?>
        <div id="home">
            <?php
                $nazivDatotekeStudija = 'data/study_programmes.json';
                if (file_exists('shared-' . $nazivDatotekeStudija)) {
                    $nazivDatotekeRa = 'shared-' . $nazivDatotekeStudija;
                }
                if (file_exists($nazivDatotekeStudija)) {
                    $sadrzaj = json_decode(file_get_contents($nazivDatotekeStudija), true);

                    if ($sadrzaj !== false) {
                        $languages = array_keys(reset($sadrzaj['categories'])['translations']);
                    }
                }
                else {
                    die('File with study programmes does not exist!');
                }
                $translations = [];
                foreach ($languages as $language) {
                    $checkedAttribute = $language === $jezik ? 'checked="checked"' : '';
                    $translatedText = loadI18nFileContent($language);
                    if ($translatedText === null) {
                        echo "<script type='text/javascript'>alert('$tekst[languageFileNonExistentOrInvalid]: $language');</script>";
                    }
                    $translations[$language] = $translatedText->home;
                    echo "<label for='$language' class='language-selection'><img src='https://flagcdn.com/h40/$translatedText->flagCdnCountryCode.png' alt='$language' height='40'/></label>";
                    echo "<input type='radio' name='language' value='$language' id='$language' $checkedAttribute/>";
                }
                foreach ($languages as $language) {
                    $prijevodPocetne = $translations[$language];
                    $categories = array();
                    foreach ($sadrzaj['categories'] as $categoryId => $categoryDetails) {
                        $categories[$categoryId] = $categoryDetails['translations'][$language];
                    }
                    $programmes = array();
                    $programmeIdsByCategoryIds = array();
                    foreach ($sadrzaj['programmes'] as $programmeId => $programmeDetails) {
                        $programmeIdsByCategoryIds[$programmeDetails['category']][]= $programmeId;
                        $programmes[$programmeId] = $programmeDetails['translations'][$language];
                    }
            ?>
            <style type="text/css">
                #<?= $language ?>:checked ~ #<?= $language ?>-form {
                    display: block;
                }
            </style>
            <form action="<?= $_SERVER['PHP_SELF']?>" method="GET" id="<?= $language ?>-form">
                <input type="hidden" name="language" value="<?= $language ?>"/>
                <label><?= $prijevodPocetne->studyProgrammeSelection ?>
                    <br/>
                    <select name="study_id" size="16" style="overflow: hidden; scrollbar-width: none; text-align: left; padding: 0 10px">
                        <?php
                            foreach ($categories as $categoryId => $categoryName) {
                                echo "<optgroup label='$categoryName'>";
                                foreach ($programmeIdsByCategoryIds[$categoryId] as $programmeId) {
                                    $programmeName = $programmes[$programmeId];
                                    $selectedAttribute = isset($_GET['study_id']) && $_GET['study_id'] == $programmeId ? 'selected="selected"' : '';
                                    echo "<option value='$programmeId' $selectedAttribute>$programmeName</option>";
                                }
                                echo '</optgroup>';
                            }
                        ?>
                    </select>
                </label>
                <br/>
                <label><?= $prijevodPocetne->academicYearSelection ?>
                    <select name="academic_year">
                    <?php
                        foreach ($akademskeGodine as $akademskaGodina) {
                            $selectedAttribute = isset($_GET['academic_year']) && $_GET['academic_year'] === $akademskaGodina ? 'selected="selected"' : '';
                            echo "<option $selectedAttribute>$akademskaGodina</option>";
                        }
                    ?>
                    </select>
                </label>
                <br/>
                <fieldset>
                    <legend><?= $prijevodPocetne->semesterSelection ?></legend>
                    <?php
                        $firstSemesterInRow = true;
                        foreach ($prijevodPocetne->semesters as $semester => $translatedSemesterName) {
                            $checkedAttribute = isset($_GET['semester']) && $_GET['semester'] === $semester || !isset($_GET['semester']) && $firstSemesterInRow ? 'checked="checked"' : '';
                            $firstSemesterInRow = false;
                            echo "<label>$translatedSemesterName<input type='radio' name='semester' value='$semester' $checkedAttribute/></label>";
                        }
                    ?>
                </fieldset>
                <br/>
                <button type="submit" class="ui-button ui-corner-all ui-widget"><?= $prijevodPocetne->load ?></button>
            </form>
            <?php
                }
            ?>
        </div>
        <?php
            }
        ?>

        <div id="pageloader"></div>
        <script type="text/javascript">
            window.onsubmit = function() {
                document.getElementById("pageloader").style.visibility = "visible";
            }
            <?php
                if (isset($odabirDostupanZaRad) && !$odabirDostupanZaRad) {
                    echo "alert('{$tekst->home->timetablingUnavailableForGivenRequest}');";
                }
                else if (!empty($_GET) && empty($_GET['study_id'])) {
                    echo "alert('{$tekst->home->studyProgrammeNotSelected}');";
                }
            ?>
        </script>
    </body>
</html>
