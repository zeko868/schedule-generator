<?php
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

require __DIR__ . '/vendor/autoload.php';
require 'pomocne-funkcije.php';
require 'dohvati-rasporede-za-ispis.php';

define('PERIOD_SLANJA', getenv('WEBSOCKETS_RECENT_SOLUTIONS_SEND_PERIOD') ?: 0.2);

    class PosiljateljRasporeda implements MessageComponentInterface {

        private $loop;
        private $dohvatiteljiRasporeda;
        private $nizoviPotrebnihPodataka;
        private $timer;
        private $jestWindowsLjuska;

        public function __construct() {
            $this->jestWindowsLjuska = explode(' ', php_uname(), 2)[0] === 'Windows';
            $this->dohvatiteljiRasporeda = [];
            $this->nizoviPotrebnihPodataka = [];
        }

        public function setLoop($loop) {
            $this->loop = $loop;
        }

        public function onOpen(ConnectionInterface $conn) {
            $this->timer = $this->loop->addPeriodicTimer(PERIOD_SLANJA, function() use (&$conn) {
                $this->posalji_rezultate_klijentu($conn);
            });
            $this->dohvatiteljiRasporeda[$conn->resourceId] = new DohvatiteljRasporeda($this->jestWindowsLjuska);
        }

        public function onMessage(ConnectionInterface $from, $msg) {
            parse_str($msg, $requestBody);
            $studij = $requestBody['study_id'];
            $akademskaGodina = $requestBody['academic_year'];
            $semestar = $requestBody['semester'];
            $jezik = $requestBody['language'];

            $tekst = loadI18nFileContent($jezik);
            $naziviDana = $tekst->daysOfTheWeek;

            require 'dohvat-informacija-predmeta.php';

            $this->nizoviPotrebnihPodataka[$from->resourceId] = array($boje, $sifrePredmeta, $akademskaGodinaPocetak, $pocetakTrenutnogSemestra, $trajanjeTjedna, $trajanjeDana, $trenutnoZimskiSemestar, $jezik);

            $cmdUnosPredmetaTeOgranicenja = '';
            foreach ($requestBody['upisano'] as $sifraPredmeta) {
                $cmdUnosPredmetaTeOgranicenja .= "asserta(upisano('$sifraPredmeta')),";
            }
            $cmdTrazi = 'dohvatiRaspored(\'false\')';
            if (isset($requestBody['ogranicenja'])) {
                $cmdZadnjaOgranicenja = '';
                $prioritetniRedSPravilimaPohadjanjaNastave = [[],[],[],[]];
                $odabraniTermini = [];
                $zabranjeniTermini = [];
                foreach ($requestBody['ogranicenja'] as $ogranicenje) {
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
            $lokacijaDatoteke = $nazivDatotekeRasporeda;
            $cmd = "$cmdUnosDana ignore(dohvatiCinjenice('$lokacijaDatoteke')), $cmdUnosPredmetaTeOgranicenja ignore(inicijalizirajTrajanjaNastavePoDanima()), ignore(inicijalizirajTrajanjaPredmetaPoDanima()), $cmdTrazi, halt().";    // na Windowsima radi ako naredba završava s "false. halt().", no na Linuxu proces Prolog interpretera nikada ne završava ako se proslijedi više naredbi - svrha jest kako bi kraj rezultata izvođenja uvijek završio "neuspješno" te bi se znalo kad više ne treba pozvati fread funkciju koja je blokirajuća
            if ($this->jestWindowsLjuska) {
                $cmd = iconv('utf-8', 'windows-1250', $cmd);
            }

            $dohvatiteljRasporeda = &$this->dohvatiteljiRasporeda[$from->resourceId];
            $dohvatiteljRasporeda->setPrologCommand($cmd);
            $dohvatiteljRasporeda->start();
        }

        public function onClose(ConnectionInterface $conn) {
            $this->loop->cancelTimer($this->timer);
            $dohvatiteljRasporeda = &$this->dohvatiteljiRasporeda[$conn->resourceId];
            fclose($dohvatiteljRasporeda->stdoutPipe);
            fclose($dohvatiteljRasporeda->stderrPipe);
            proc_close($dohvatiteljRasporeda->process);
            unset($dohvatiteljRasporeda);
            unset($this->nizoviPotrebnihPodataka[$conn->resourceId]);
        }

        public function onError(ConnectionInterface $conn, \Exception $e) {
            echo "An error has occurred: {$e->getMessage()}\n";

            $conn->close();
        }

        private function posalji_rezultate_klijentu($conn) {
            $dohvatiteljRasporeda = &$this->dohvatiteljiRasporeda[$conn->resourceId];
            global $boje, $sifrePredmeta, $akademskaGodinaPocetak, $pocetakTrenutnogSemestra, $trajanjeTjedna, $trajanjeDana, $trenutnoZimskiSemestar, $jezik;
            list($boje, $sifrePredmeta, $akademskaGodinaPocetak, $pocetakTrenutnogSemestra, $trajanjeTjedna, $trajanjeDana, $trenutnoZimskiSemestar, $jezik) = $this->nizoviPotrebnihPodataka[$conn->resourceId];
            $rasporedi = $dohvatiteljRasporeda->rasporedi->synchronized(function() use (&$end, &$dohvatiteljRasporeda) {
                $rasporedi = [];
                while ($raspored = $dohvatiteljRasporeda->rasporedi->shift()) {
                    $rasporedi[] = $raspored;
                }
                $end = $raspored === false;  // if there are no more results, it should be false, otherwise null
                return $rasporedi;
            });
            if (!empty($rasporedi)) {
                $conn->send(dohvati_rasporede_za_ispis($rasporedi));
            }
            if ($end) {
                $conn->close();
            }
        }
    }

    class DohvatiteljRasporeda extends Thread {
        public $process;
        public $stdinPipe;
        public $stdoutPipe;
        public $stderrPipe;
        public $rasporedi;
        private $prologCommand;
        private $jestWindowsLjuska;

        public function __construct() {
            // prije poziva SWI-Prolog interpretera potrebno je osigurati da se putanja njegovog direktorija nalazi u varijabli okoline
            $lokacijaPrologSkripte = 'pronalazak-rasporeda.pl';
            $descriptorspec = array(
                array('pipe', 'r'),
                array('pipe', 'w'),
                array('pipe', 'w')
            );
            $this->process = proc_open("swipl -s $lokacijaPrologSkripte", $descriptorspec, $pipes);
            list($this->stdinPipe, $this->stdoutPipe, $this->stderrPipe) = $pipes;
            $this->rasporedi = new Threaded();
        }

        public function setPrologCommand($prologCommand) {
            $this->prologCommand = $prologCommand;
        }

        public function run() {
            fwrite($this->stdinPipe, $this->prologCommand . "\n");
            fclose($this->stdinPipe);
            $prethodniNedovrseniRaspored = '';
            while ($rezultat = fread($this->stdoutPipe, 512)) {
                if ($this->jestWindowsLjuska) {
                    $rezultat = iconv('windows-1250', 'utf-8', $rezultat);
                }
                $prevRetVal = 0;
                $offset = 0;
                while (true) {
                    $retVal = strpos($rezultat, "\n", $offset);
                    if ($retVal === false) {
                        $prethodniNedovrseniRaspored .= substr($rezultat, $prevRetVal);
                        break;
                    }
                    else {
                        $serijaliziraniRaspored = substr($rezultat, $prevRetVal, $retVal - $prevRetVal);
                        if (!empty($prethodniNedovrseniRaspored)) {
                            $serijaliziraniRaspored = $prethodniNedovrseniRaspored . $serijaliziraniRaspored;
                            $prethodniNedovrseniRaspored = '';
                        }
                        $raspored = json_decode($serijaliziraniRaspored, true);
                        $this->rasporedi->synchronized(function() use (&$raspored) {
                            $this->rasporedi[] = (array) $raspored;
                        });
                        $prevRetVal = $retVal;
                        $offset = $prevRetVal + 1;
                    }
                }
            }

            $this->rasporedi->synchronized(function() {
                $this->rasporedi[] = false;
            });
        }
    }

    if ($argc === 3) {
        ini_set('memory_limit', -1);
        set_time_limit(0);
        date_default_timezone_set('UTC');
        $myIpAddress = $argv[1];
        $port = $argv[2];

        $posiljateljRasporeda = new PosiljateljRasporeda();
        $server = IoServer::factory(
            new HttpServer(
                new WsServer(
                    $posiljateljRasporeda
                )
            ),
            $port,
            $myIpAddress
        );

        fclose(STDOUT);
        fclose(STDERR);

        $posiljateljRasporeda->setLoop($server->loop);
        $server->run();
    }
?>
