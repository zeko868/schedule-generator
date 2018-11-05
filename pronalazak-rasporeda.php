<?php
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

require __DIR__ . '/vendor/autoload.php';

const PERIOD_SLANJA = 1;

    class PosiljateljRasporeda implements MessageComponentInterface {

        private $loop;
        private $dohvatiteljRasporeda;
        private $timer;
        private $client;
        private $prologCommand;
        private $jestWindowsLjuska;
    
        public function __construct($prologCommand) {
            $this->prologCommand = $prologCommand;
        }

        public function setLoop($loop) {
            $this->loop = $loop;
        }

        public function setShellType($jestWindowsLjuska) {
            $this->jestWindowsLjuska = $jestWindowsLjuska;
        }
    
        public function onOpen(ConnectionInterface $client) {
            $this->client = $client;
            $this->timer = $this->loop->addPeriodicTimer(PERIOD_SLANJA, function() {
                $this->posalji_rezultate_klijentu();
            });
            $this->dohvatiteljRasporeda = new DohvatiteljRasporeda($this->prologCommand, $this->jestWindowsLjuska);
            $this->dohvatiteljRasporeda->start();
        }
    
        public function onMessage(ConnectionInterface $from, $msg) {
        }
    
        public function onClose(ConnectionInterface $conn) {
            $this->loop->cancelTimer($this->timer);
            fclose($this->dohvatiteljRasporeda->stdoutPipe);
            fclose($this->dohvatiteljRasporeda->stderrPipe);
            proc_close($this->dohvatiteljRasporeda->process);
            exit();
        }
    
        public function onError(ConnectionInterface $conn, \Exception $e) {
            echo "An error has occurred: {$e->getMessage()}\n";
    
            $conn->close();
        }

        private function posalji_rezultate_klijentu() {
            $rasporedi = $this->dohvatiteljRasporeda->rasporedi->synchronized(function() use (&$end) {
                $rasporedi = [];
                while ($raspored = $this->dohvatiteljRasporeda->rasporedi->shift()) {
                    $rasporedi[] = $raspored;
                }
                $end = $raspored === false;  // if there are no more results, it should be false, otherwise null
                return $rasporedi;
            });
            if (!empty($rasporedi)) {
                $this->client->send(dohvati_rasporede_za_ispis($rasporedi));
            }
            if ($end) {
                $this->client->close();
            }
        }
    }

    class DohvatiteljRasporeda extends Thread {
        public $process;
        public $stdoutPipe;
        public $stderrPipe;
        public $rasporedi;
        private $jestWindowsLjuska;

        public function __construct($prologCommand, $jestWindowsLjuska) {
            $this->jestWindowsLjuska = $jestWindowsLjuska;
            // prije poziva SWI-Prolog interpretera potrebno je osigurati da se putanja njegovog direktorija nalazi u varijabli okoline
            $lokacijaPrologSkripte = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'pronalazak-rasporeda.pl';
            $descriptorspec = array(
                array('pipe', 'r'),
                array('pipe', 'w'),
                array('pipe', 'w')
            );
            if ($this->jestWindowsLjuska) {
                $env = null;
            }
            else {
                $env = array(
                    'LANG' => 'hr_HR.utf-8'     // taj locale bi trebao biti prethodno instaliran na sustavu: sudo locale-gen hr_HR; sudo locale-gen hr_HR.UTF-8; sudo update-locale
                );
            }
            $this->process = proc_open("swipl -s $lokacijaPrologSkripte", $descriptorspec, $pipes, null, $env);
            list($stdin, $this->stdoutPipe, $this->stderrPipe) = $pipes;
            fwrite($stdin, $prologCommand . "\n");
            fclose($stdin);
            $this->rasporedi = new Threaded();
        }

        public function run() {
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

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

    if ($argc === 5) {
        ini_set('memory_limit', -1);
        set_time_limit(0);
        date_default_timezone_set('UTC');
        $jezik = $argv[1];
        $myIpAddress = $argv[2];
        $studij = $argv[3];
        $prologCommand = $argv[4];
                
        $posiljateljRasporeda = new PosiljateljRasporeda($prologCommand);
        while (true) {
            try {
                $server = IoServer::factory(
                    new HttpServer(
                        new WsServer(
                            $posiljateljRasporeda
                        )
                    ),
                    $port = 1024 + rand() % (65535-1024),
                    $myIpAddress
                );
                break;
            }
            catch (Exception $e) {
            }
        }
        echo $port;
        fclose(STDOUT);

        require_once 'dohvat-informacija-predmeta.php';
        require_once 'dohvati-rasporede-za-ispis.php';
        
        $posiljateljRasporeda->setShellType($jestWindowsLjuska);
        $posiljateljRasporeda->setLoop($server->loop);    
        $server->run();
    }
?>
