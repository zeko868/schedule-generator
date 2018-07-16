<?php
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

require __DIR__ . '/vendor/autoload.php';

const PERIOD_SLANJA = 1;

$fromClient = null;

    class PosiljateljRasporeda implements MessageComponentInterface {
    
        public function __construct() {
        }
    
        public function onOpen(ConnectionInterface $client) {
        }
    
        public function onMessage(ConnectionInterface $from, $msg) {
            global $jezik, $myIpAddress, $studij, $prologCommand, $boje, $sifrePredmeta, $fromClient, $rasporedi, $pocetakTrenutnogSemestra, $trajanjeTjedna, $trajanjeDana, $trenutnoZimskiSemestar;
            $fromClient = $from;
            require 'dohvat-informacija-predmeta.php';
            require 'dohvati-rasporede-za-ispis.php';
    
            $descriptorspec = array(
                array('pipe', 'r'),
                array('pipe', 'w'),
                array('pipe', 'w')
            );
            $lokacijaPrologSkripte = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'pronalazak-rasporeda.pl';
            // prije poziva SWI-Prolog interpretera potrebno je osigurati da se putanja njegovog direktorija nalazi u varijabli okoline
            $jestWindowsLjuska = explode(' ', php_uname(), 2)[0] === 'Windows';
            if ($jestWindowsLjuska) {
                $env = null;
            }
            else {
                $env = array(
                    'LANG' => 'hr_HR.utf-8'     // taj locale bi trebao biti prethodno instaliran na sustavu: sudo locale-gen hr_HR; sudo locale-gen hr_HR.UTF-8; sudo update-locale
                );
            }
            $process = proc_open("swipl -s $lokacijaPrologSkripte", $descriptorspec, $pipes, null, $env);
            fwrite($pipes[0], $prologCommand);
            fclose($pipes[0]);
            $rasporedi = [];
            $brojKombinacijaRasporeda = 0;
            pcntl_alarm(PERIOD_SLANJA);
            pcntl_signal(SIGALRM, 'posalji_rezultate_klijentu', false);
            while ($rezultat = stream_get_contents($pipes[1], 512)) {
                if ($jestWindowsLjuska) {
                    $rezultat = iconv('windows-1250', 'utf-8', $rezultat);
                }
                foreach (explode("\n", $rezultat) as $serijaliziraniRaspored) {
                    if (isset($prethodniNedovrseniRaspored)) {
                        $serijaliziraniRaspored = $prethodniNedovrseniRaspored . $serijaliziraniRaspored;
                    }
                    if (empty($serijaliziraniRaspored)) {
                        continue;   // prazni redak je nekada samo kraj trenutnog chunka, a kada nije pronađen nijedan rezultat, tada se nalazi ispred finalne riječi false.
                    }
                    else if (preg_match('/^false\./', $serijaliziraniRaspored)) {
                        break 2;
                    }
                    $raspored = json_decode($serijaliziraniRaspored, true);
                    if (isset($raspored)) {
                        $rasporedi[] = $raspored;
                        $prethodniNedovrseniRaspored = null;
                    }
                    else {
                        $prethodniNedovrseniRaspored = $serijaliziraniRaspored;
                    }
                }
                pcntl_signal_dispatch();
            }
            pcntl_signal(SIGALRM, function() {}, false);
            posalji_rezultate_klijentu();
            fclose($pipes[1]);
            fclose($pipes[2]);
            proc_close($process);
            $fromClient->close();
        }
    
        public function onClose(ConnectionInterface $conn) {
            exit();
        }
    
        public function onError(ConnectionInterface $conn, \Exception $e) {
            echo "An error has occurred: {$e->getMessage()}\n";
    
            $conn->close();
        }
    }

function posalji_rezultate_klijentu() {
    global $rasporedi, $fromClient;
    if (!empty($rasporedi)) {
        $fromClient->send(dohvati_rasporede_za_ispis($rasporedi));
        $rasporedi = [];
    }
    pcntl_alarm(PERIOD_SLANJA);
}

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

    if ($argc === 5) {
        ini_set('memory_limit', -1);
        set_time_limit(0);
        $jezik = $argv[1];
        $myIpAddress = $argv[2];
        $studij = $argv[3];
        $prologCommand = $argv[4];
        
        while (true) {
            try {
                $server = IoServer::factory(
                    new HttpServer(
                        new WsServer(
                            new PosiljateljRasporeda()
                        )
                    ),
                    $port = 1024 + rand() % (65535-1024)
                );
                break;
            }
            catch (Exception $e) {
            }
        }
        echo $port;
        fclose(STDOUT);
    
        $server->run();
    }
?>
